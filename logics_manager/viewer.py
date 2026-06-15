from __future__ import annotations

import argparse
import functools
import hashlib
import hmac
import json
import secrets
import mimetypes
import os
import re
import shutil
import socket
import ssl
import subprocess
import sys
import threading
import time
import tomllib
import webbrowser
from dataclasses import dataclass
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from importlib import metadata
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote, unquote, urlencode, urlparse

from .audit import audit_payload
from .bootstrap import bootstrap_payload
from .config import find_repo_root
from .lint import lint_payload
from .update_check import get_update_info


@dataclass(frozen=True)
class ViewerDocFamily:
    stage: str
    directory: str
    prefixes: tuple[str, ...]


DOC_FAMILIES = (
    ViewerDocFamily("request", "logics/request", ("req_",)),
    ViewerDocFamily("backlog", "logics/backlog", ("item_",)),
    ViewerDocFamily("task", "logics/tasks", ("task_",)),
    ViewerDocFamily("product", "logics/product", ("prod_",)),
    ViewerDocFamily("architecture", "logics/architecture", ("adr_",)),
    ViewerDocFamily("spec", "logics/specs", ("spec_", "req_")),
)

STAGE_ORDER = {family.stage: index for index, family in enumerate(DOC_FAMILIES)}
CDX_MISSION_STRENGTHS = {
    "standard": {"id": "standard", "label": "Standard", "timeout": 180, "reasoningEffort": "medium", "power": "medium"},
    "deep": {"id": "deep", "label": "Deep", "timeout": 300, "reasoningEffort": "high", "power": "high"},
    "max": {"id": "max", "label": "Max", "timeout": 600, "reasoningEffort": "high", "power": "high"},
}
CDX_MISSION_PARENT_TIMEOUT_GRACE_SECONDS = 90
CDX_WRITABLE_MISSION_MIN_TIMEOUT_SECONDS = 600
CDX_MISSION_CATALOG = {
    "full-audit": {
        "id": "full-audit",
        "title": "Full audit",
        "description": "Audit the repository and optionally apply safe, validated fixes.",
        "scope": "repository",
        "requiresReleaseTag": False,
        "requiresPlanConfirmation": False,
        "supportsFileWrites": True,
        "inputFields": [
            {
                "id": "directFixes",
                "label": "Fix directly",
                "type": "checkbox",
                "required": False,
            }
        ],
    },
    "release-review": {
        "id": "release-review",
        "title": "Review since latest release",
        "description": "Review changes since the latest release and optionally apply safe fixes.",
        "scope": "latest-release",
        "requiresReleaseTag": True,
        "requiresPlanConfirmation": False,
        "supportsFileWrites": True,
        "inputFields": [
            {
                "id": "directFixes",
                "label": "Fix directly",
                "type": "checkbox",
                "required": False,
            }
        ],
    },
    "corpus-ready": {
        "id": "corpus-ready",
        "title": "Prepare dev-ready corpus",
        "description": "Produce a corpus plan for explicit deterministic application.",
        "scope": "open-logics-workflow",
        "requiresReleaseTag": False,
        "requiresPlanConfirmation": True,
        "supportsFileWrites": False,
    },
    "wish-to-request": {
        "id": "wish-to-request",
        "title": "Wish to request",
        "description": "Create or draft a structured Logics request from a free-form wish.",
        "scope": "request-draft",
        "requiresReleaseTag": False,
        "requiresPlanConfirmation": False,
        "supportsFileWrites": True,
        "inputFields": [
            {
                "id": "wishText",
                "label": "Wish or intent",
                "type": "textarea",
                "placeholder": "Describe the workflow, feature, bug, or product intent to capture.",
                "required": True,
            }
        ],
    },
    "pre-release": {
        "id": "pre-release",
        "title": "Guarded pre-release",
        "description": "Prepare release metadata, changelog, validation, and fixes without tagging or publishing.",
        "scope": "pre-release-report",
        "requiresReleaseTag": False,
        "requiresPlanConfirmation": False,
        "supportsFileWrites": True,
        "inputFields": [
            {
                "id": "releaseVersion",
                "label": "Version",
                "type": "text",
                "placeholder": "vX.X.X",
                "required": True,
                "pattern": "^v\\d+\\.\\d+\\.\\d+$",
            },
            {
                "id": "runFullValidation",
                "label": "Run full validation and report fixes before pre-release",
                "type": "checkbox",
                "required": False,
            },
        ],
    },
}
CDX_DEFAULT_MISSION_ID = "full-audit"
GIT_FILE_PREVIEW_MAX_BYTES = 30000
GIT_FILE_PREVIEW_MAX_CHARS = 20000
FILE_PREVIEW_MAX_BYTES = 300000
FILE_PREVIEW_MAX_CHARS = 200000
WORKSPACE_TREE_MAX_ENTRIES = 250
WORKSPACE_PREVIEW_MAX_BYTES = 30000
WORKSPACE_PREVIEW_MAX_CHARS = 20000
WORKSPACE_IGNORED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo",
    ".venv",
    "venv",
}
REPO_ROOT = Path(__file__).resolve().parents[1]
PACKAGE_VIEWER_ASSETS_ROOT = Path(__file__).resolve().parent / "viewer_assets"
VIEWER_ROOT = REPO_ROOT / "clients" / "viewer"
if not (VIEWER_ROOT / "index.html").is_file():
    VIEWER_ROOT = PACKAGE_VIEWER_ASSETS_ROOT / "viewer"
SHARED_MEDIA_ROOT = REPO_ROOT / "clients" / "shared-web" / "media"
if not SHARED_MEDIA_ROOT.is_dir():
    SHARED_MEDIA_ROOT = PACKAGE_VIEWER_ASSETS_ROOT / "media"
DIST_VENDOR_ROOT = REPO_ROOT / "dist" / "vendor"
PACKAGE_VENDOR_ROOT = PACKAGE_VIEWER_ASSETS_ROOT / "vendor"
NODE_MERMAID_ROOT = REPO_ROOT / "node_modules" / "mermaid" / "dist"


def _current_version() -> str:
    try:
        version = (REPO_ROOT / "VERSION").read_text(encoding="utf-8").strip()
    except OSError:
        version = ""
    if version:
        return version
    try:
        return metadata.version("logics-manager")
    except metadata.PackageNotFoundError:
        return "0.0.0"


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _parse_title(lines: list[str], fallback: str) -> str:
    for line in lines:
        if not line.startswith("## "):
            continue
        raw = line[3:].strip()
        match = re.match(r"^\S+\s*-\s*(.+)$", raw)
        return (match.group(1) if match else raw).strip()
    return fallback


def _parse_indicators(lines: list[str]) -> dict[str, str]:
    indicators: dict[str, str] = {}
    for line in lines:
        if not line.startswith(">"):
            continue
        trimmed = re.sub(r"^>\s*", "", line).strip()
        if ":" not in trimmed:
            continue
        key, value = trimmed.split(":", 1)
        if key.strip() and value.strip():
            indicators[key.strip()] = value.strip()
    return indicators


def _extract_section_lines(content: str, section_title: str) -> list[str]:
    expected = f"# {section_title}".lower()
    collected: list[str] = []
    in_section = False
    for line in content.splitlines():
        if line.strip().lower() == expected:
            in_section = True
            continue
        if not in_section:
            continue
        if line.startswith("# "):
            break
        collected.append(line)
    return collected


def _summary_entries(content: str, section_title: str, limit: int) -> list[str]:
    entries: list[str] = []
    for raw_line in _extract_section_lines(content, section_title):
        line = raw_line.strip()
        if not line or line.startswith("```") or line.startswith("%%") or re.fullmatch(r"-+", line):
            continue
        bullet = re.match(r"^[-*]\s+(.*)$", line)
        value = bullet.group(1) if bullet else line
        if not value.startswith("#"):
            normalized = re.sub(r"\s+", " ", value.replace("> ", "")).strip()
            if normalized and normalized.lower() not in {entry.lower() for entry in entries}:
                entries.append(normalized)
        if len(entries) >= limit:
            break
    return entries


def _build_summary_points(content: str, fallback_title: str) -> list[str]:
    entries = [
        *_summary_entries(content, "Needs", 2),
        *_summary_entries(content, "Problem", 2),
        *_summary_entries(content, "Context", 2),
        *_summary_entries(content, "Scope", 2),
    ]
    deduped: list[str] = []
    for entry in entries:
        if entry.lower() not in {existing.lower() for existing in deduped}:
            deduped.append(entry)
    return deduped[:4] or [fallback_title]


def _collect_backticked_links(text: str) -> list[str]:
    return [match.group(1) for match in re.finditer(r"`([^`]+)`", text) if match.group(1)]


def _normalize_ref(value: str) -> str:
    normalized = value.replace("\\", "/").lstrip("./").strip()
    if "/" in normalized:
        return normalized
    bare_name = normalized[:-3] if normalized.endswith(".md") else normalized
    for family in DOC_FAMILIES:
        if bare_name.startswith(family.prefixes):
            return f"{family.directory}/{bare_name}.md"
    return normalized


def normalize_viewer_focus_target(repo_root: Path, value: str) -> str:
    raw = unquote(value).replace("\\", "/").strip()
    if not raw:
        raise ValueError("Focus target cannot be empty.")
    if raw.startswith("~") or raw.startswith(("/", "\\")) or re.match(r"^[A-Za-z]:", raw):
        raise ValueError("Focus target must be a workflow ref or repo-relative Logics path.")
    parts = [part for part in raw.split("/") if part]
    if any(part == ".." for part in parts):
        raise ValueError("Focus target cannot contain path traversal.")
    normalized = _normalize_ref(raw.lstrip("./")).lstrip("/")
    if "/" not in raw and normalized == raw:
        raise ValueError("Focus target must be a known workflow ref or repo-relative Logics path.")
    if "/" in normalized:
        absolute = (repo_root.resolve() / normalized).resolve()
        root = repo_root.resolve()
        if root != absolute and root not in absolute.parents:
            raise ValueError("Focus target escapes repository root.")
        allowed_prefixes = tuple(f"{family.directory}/" for family in DOC_FAMILIES)
        if not normalized.startswith(allowed_prefixes) or not normalized.endswith(".md"):
            raise ValueError("Focus target must point to a Logics Markdown document.")
    return normalized


def build_viewer_url(host: str, port: int, *, focus: str | None = None, read: bool = False, scheme: str = "http") -> str:
    url = f"{scheme}://{host}:{port}"
    query: dict[str, str] = {}
    if focus:
        query["focus"] = focus
    if read:
        query["read"] = "1"
    if query:
        url = f"{url}?{urlencode(query, quote_via=quote)}"
    return url


def _section_links(content: str, section_title: str) -> list[str]:
    links: list[str] = []
    for line in _extract_section_lines(content, section_title):
        if "(none yet)" in line:
            continue
        links.extend(_collect_backticked_links(line))
    return sorted({_normalize_ref(link) for link in links})


def _indicator_links(lines: list[str], keys: set[str]) -> list[str]:
    links: list[str] = []
    for line in lines:
        if not line.startswith(">"):
            continue
        trimmed = re.sub(r"^>\s*", "", line).strip()
        if ":" not in trimmed:
            continue
        key, value = trimmed.split(":", 1)
        if key.strip().lower() in keys:
            links.extend(_collect_backticked_links(value))
    return sorted({_normalize_ref(link) for link in links})


def _extract_references(content: str, lines: list[str]) -> list[dict[str, str]]:
    references: list[dict[str, str]] = []
    for label, pattern in (
        ("Promoted from", re.compile(r"Promoted from `([^`]+)`", re.IGNORECASE)),
        ("Derived from", re.compile(r"Derived from(?: [a-z][a-z ]+)? `([^`]+)`", re.IGNORECASE)),
    ):
        for match in pattern.finditer(content):
            references.append({"kind": "from", "label": label, "path": _normalize_ref(match.group(1))})
    for link in _section_links(content, "Backlog"):
        references.append({"kind": "backlog", "label": "Backlog", "path": link})
    manual_links = {
        *_section_links(content, "References"),
        *_indicator_links(lines, {"related request", "related backlog", "related task", "related architecture"}),
    }
    for link in sorted(manual_links):
        references.append({"kind": "manual", "label": "Reference", "path": link})
    return references


def _infer_stage(rel_path: str, doc_id: str) -> str:
    normalized = rel_path.replace("\\", "/").lower()
    for family in DOC_FAMILIES:
        if normalized.startswith(f"{family.directory}/") or doc_id.startswith(family.prefixes):
            return family.stage
    return "request"


def _to_usage(rel_path: str, items_by_rel_path: dict[str, dict[str, Any]]) -> dict[str, str]:
    normalized = _normalize_ref(rel_path)
    matched = items_by_rel_path.get(normalized)
    if matched:
        return {
            "id": str(matched["id"]),
            "title": str(matched["title"]),
            "stage": str(matched["stage"]),
            "relPath": str(matched["relPath"]),
        }
    doc_id = Path(normalized).stem
    return {
        "id": doc_id or normalized,
        "title": doc_id or normalized,
        "stage": _infer_stage(normalized, doc_id),
        "relPath": normalized,
    }


def collect_viewer_items(repo_root: Path) -> list[dict[str, Any]]:
    repo_root = repo_root.resolve()
    items: list[dict[str, Any]] = []
    promoted_sources: set[str] = set()
    usage_map: dict[str, list[dict[str, str]]] = {}
    manual_used_by: dict[str, list[str]] = {}

    for family in DOC_FAMILIES:
        directory = repo_root / family.directory
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            if not path.name.startswith(family.prefixes):
                continue
            content = _read_text(path)
            lines = content.splitlines()
            rel_path = path.relative_to(repo_root).as_posix()
            title = _parse_title(lines, path.stem)
            references = _extract_references(content, lines)
            manual_used_by[rel_path] = _section_links(content, "Used by")
            for ref in references:
                if ref["kind"] == "from":
                    promoted_sources.add(_normalize_ref(ref["path"]))
            stat = path.stat()
            items.append(
                {
                    "id": path.stem,
                    "title": title,
                    "stage": family.stage,
                    "path": str(path),
                    "relPath": rel_path,
                    "filename": path.name,
                    "updatedAt": stat.st_mtime_ns,
                    "indicators": _parse_indicators(lines),
                    "summaryPoints": _build_summary_points(content, title),
                    "acceptanceCriteria": _summary_entries(content, "Acceptance criteria", 6),
                    "lineCount": len(lines),
                    "charCount": len(content),
                    "isPromoted": False,
                    "references": references,
                    "usedBy": [],
                }
            )

    items_by_rel_path = {str(item["relPath"]): item for item in items}
    for item in items:
        rel_path = str(item["relPath"])
        item["isPromoted"] = rel_path in promoted_sources
        for ref in item["references"]:
            target = _normalize_ref(str(ref["path"]))
            if target in items_by_rel_path:
                usage_map.setdefault(target, []).append(
                    {
                        "id": str(item["id"]),
                        "title": str(item["title"]),
                        "stage": str(item["stage"]),
                        "relPath": rel_path,
                    }
                )

    for item in items:
        rel_path = str(item["relPath"])
        usages = usage_map.get(rel_path, [])
        for link in manual_used_by.get(rel_path, []):
            usage = _to_usage(link, items_by_rel_path)
            if not any(existing["relPath"] == usage["relPath"] for existing in usages):
                usages.append(usage)
        item["usedBy"] = sorted(usages, key=lambda usage: (STAGE_ORDER.get(usage["stage"], 99), usage["id"]))

    items.sort(key=lambda item: (STAGE_ORDER.get(str(item["stage"]), 99), str(item["id"])))
    for item in items:
        item["updatedAt"] = datetime.fromtimestamp(Path(str(item["path"])).stat().st_mtime).isoformat()
    return items


def viewer_data_payload(
    repo_root: Path,
    selected_id: str | None = None,
    *,
    auto_refresh_interval_seconds: int = 15,
    auto_refresh_interval_forced: bool = False,
    projects: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    capabilities = viewer_project_capabilities(repo_root)
    active_root = repo_root.resolve()
    has_logics = capabilities["logics"]["available"] is True
    return {
        "root": str(active_root),
        "repoName": active_root.name,
        "repository": {
            "root": str(active_root),
            "githubUrl": github_repo_url(repo_root),
        },
        "capabilities": capabilities,
        "projects": projects if projects is not None else viewer_project_registry(repo_root),
        "autoRefreshIntervalSeconds": auto_refresh_interval_seconds,
        "autoRefreshIntervalForced": auto_refresh_interval_forced,
        "items": collect_viewer_items(repo_root),
        "updateInfo": get_update_info(_current_version()).to_payload(),
        "selectedId": selected_id,
        "changedPaths": [],
        "canResetProjectRoot": False,
        "canBootstrapLogics": not has_logics,
        "bootstrapLogicsTitle": "Bootstrap Logics in this project." if not has_logics else "Logics is already bootstrapped.",
        "canLaunchCodex": False,
        "canLaunchClaude": False,
        "canRepairLogicsKit": False,
        "canPublishRelease": False,
        "shouldRecommendCheckEnvironment": False,
        "environmentWarning": viewer_environment_warning(active_root),
    }


def _viewer_project_id(repo_root: Path) -> str:
    normalized = str(repo_root.resolve())
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:12]


def _looks_like_viewer_project(path: Path) -> bool:
    if not path.is_dir():
        return False
    return any((path / marker).exists() for marker in ("logics", ".git", "package.json", "pyproject.toml", "logics.yaml"))


def discover_viewer_project_roots(repo_root: Path, *, max_projects: int = 40) -> list[Path]:
    active = repo_root.resolve()
    candidates: list[Path] = [active]
    parent = active.parent
    try:
        siblings = sorted(parent.iterdir(), key=lambda path: path.name.lower())
    except OSError:
        siblings = []
    for sibling in siblings:
        try:
            resolved = sibling.resolve()
        except OSError:
            continue
        if resolved == active or not _looks_like_viewer_project(resolved):
            continue
        candidates.append(resolved)
        if len(candidates) >= max_projects:
            break

    unique: dict[str, Path] = {}
    for candidate in candidates:
        unique[str(candidate)] = candidate
    return list(unique.values())


def viewer_project_entry(repo_root: Path, *, active_root: Path | None = None) -> dict[str, Any]:
    root = repo_root.resolve()
    active = active_root.resolve() if active_root else root
    has_logics = (root / "logics").is_dir()
    available = root.is_dir()
    return {
        "id": _viewer_project_id(root),
        "name": root.name,
        "root": str(root),
        "active": root == active,
        "available": available,
        "hasLogics": has_logics,
        "message": "Logics corpus found." if has_logics else "No Logics corpus found.",
    }


def viewer_project_registry(repo_root: Path, *, project_roots: list[Path] | None = None) -> list[dict[str, Any]]:
    active = repo_root.resolve()
    roots = project_roots if project_roots is not None else discover_viewer_project_roots(active)
    return [viewer_project_entry(root, active_root=active) for root in roots]


def _viewer_capability(state: str, *, available: bool, message: str, detail: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "state": state,
        "available": available,
        "message": message,
    }
    if detail:
        payload["detail"] = detail
    return payload


def _git_is_repository(repo_root: Path, *, runner: Any | None = None) -> bool | None:
    try:
        result = _run_read_only_git(repo_root, ["rev-parse", "--is-inside-work-tree"], runner=runner)
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return False
    return result.stdout.strip().lower() == "true"


def viewer_project_capabilities(
    repo_root: Path,
    *,
    git_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    which_command = which or shutil.which
    logics_dir = repo_root / "logics"
    has_logics = logics_dir.is_dir()
    git_path = which_command("git")
    cdx_path = which_command("cdx")

    if has_logics:
        logics = _viewer_capability("ready", available=True, message="Logics corpus found.")
    else:
        logics = _viewer_capability("missing", available=False, message="No Logics corpus found.")

    if not git_path:
        git = _viewer_capability("unavailable", available=False, message="Git executable is not available.")
        github_url = ""
        has_workflows = False
    else:
        is_repo = _git_is_repository(repo_root, runner=git_runner)
        if is_repo is True:
            git = _viewer_capability("ready", available=True, message="Git repository detected.")
            github_url = github_repo_url(repo_root, runner=git_runner, which=which_command)
            has_workflows = _has_github_actions_workflows(repo_root)
        elif is_repo is False:
            git = _viewer_capability("missing", available=False, message="Project is not a Git repository.")
            github_url = ""
            has_workflows = False
        else:
            git = _viewer_capability("error", available=False, message="Unable to inspect Git repository state.")
            github_url = ""
            has_workflows = False

    if not github_url:
        ci = _viewer_capability("hidden", available=False, message="No GitHub remote detected for this project.")
    elif not has_workflows:
        ci = _viewer_capability("hidden", available=False, message="No GitHub Actions workflows detected for this project.")
    elif not which_command("gh"):
        ci = _viewer_capability("unavailable", available=False, message="GitHub CLI is not available.")
    else:
        ci = _viewer_capability(
            "ready",
            available=True,
            message="GitHub Actions can be inspected.",
            detail={"githubUrl": github_url},
        )

    if cdx_path:
        cdx = _viewer_capability("ready", available=True, message="CDX executable detected.")
        cdx_runs = _viewer_capability(
            "unsupported",
            available=False,
            message="CDX assistant run registry is not available yet.",
        )
    else:
        cdx = _viewer_capability("missing", available=False, message="CDX executable is not available.")
        cdx_runs = _viewer_capability("missing", available=False, message="CDX is required before assistant runs can be tracked.")
    workspace = _viewer_capability(
        "ready" if repo_root.is_dir() else "missing",
        available=repo_root.is_dir(),
        message="Workspace root can be inspected." if repo_root.is_dir() else "Workspace root is unavailable.",
        detail={"root": str(repo_root.resolve())} if repo_root.is_dir() else {},
    )
    workshop_available = repo_root.is_dir()
    terminals_available = workshop_available and workshop_terminals_available()
    if terminals_available:
        workshop_message = "Workshop command runner and PTY terminals are available."
    elif workshop_available:
        workshop_message = "Workshop command runner is available; PTY terminals require a Unix host with stdlib pty support."
    else:
        workshop_message = "Workshop is not available without a workspace root."
    workshop = _viewer_capability(
        "ready" if workshop_available else "missing",
        available=workshop_available,
        message=workshop_message,
        detail={"terminalsAvailable": terminals_available, "commandsAvailable": workshop_available},
    )

    return {
        "logics": logics,
        "workspace": workspace,
        "workshop": workshop,
        "git": git,
        "ci": ci,
        "cdx": cdx,
        "cdxRuns": cdx_runs,
    }


def read_doc_payload(repo_root: Path, rel_path: str) -> dict[str, Any]:
    normalized, absolute = _resolve_repo_doc_path(repo_root, rel_path)
    return {
        "path": normalized,
        "content": _read_text(absolute),
    }


def _resolve_repo_doc_path(repo_root: Path, rel_path: str) -> tuple[str, Path]:
    normalized = unquote(rel_path).replace("\\", "/").lstrip("/")
    absolute = (repo_root / normalized).resolve()
    root = repo_root.resolve()
    if root != absolute and root not in absolute.parents:
        raise ValueError("Document path escapes repository root.")
    if not absolute.is_file():
        raise FileNotFoundError(normalized)
    return normalized, absolute


def edit_doc_payload(repo_root: Path, rel_path: str, *, launcher: Any | None = None) -> dict[str, str]:
    normalized, absolute = _resolve_repo_doc_path(repo_root, rel_path)
    command = _system_editor_command(absolute)
    _dispatch_system_open(command, absolute, launcher=launcher)
    return {
        "path": normalized,
        "command": command[0],
    }


def _resolve_openable_file_path(repo_root: Path, file_path: str) -> Path:
    raw_value = unquote(file_path).strip()
    if raw_value.startswith(("/", "\\")) or re.match(r"^[A-Za-z]:", raw_value):
        raise ValueError("File path escapes repository root.")
    normalized = raw_value.replace("\\", "/").lstrip("/")
    if not normalized:
        raise ValueError("Missing file path.")
    raw_parts = tuple(part for part in normalized.split("/") if part)
    if any(part == ".." for part in raw_parts):
        raise ValueError("File path escapes repository root.")
    candidate = repo_root.joinpath(*raw_parts)
    root = os.path.realpath(repo_root)
    absolute_name = os.path.realpath(candidate)
    try:
        common = os.path.commonpath([root, absolute_name])
    except ValueError as exc:
        raise ValueError("File path escapes repository root.") from exc
    if common != root:
        raise ValueError("File path escapes repository root.")
    absolute = Path(absolute_name)
    if not absolute.is_file():
        raise FileNotFoundError(str(candidate))
    return absolute


def open_file_payload(repo_root: Path, file_path: str, *, launcher: Any | None = None) -> dict[str, str]:
    absolute = _resolve_openable_file_path(repo_root, file_path)
    command = _system_editor_command(absolute)
    _dispatch_system_open(command, absolute, launcher=launcher)
    return {
        "path": str(absolute),
        "command": command[0],
    }


def file_preview_payload(
    repo_root: Path,
    file_path: str,
    *,
    max_bytes: int = FILE_PREVIEW_MAX_BYTES,
    max_chars: int = FILE_PREVIEW_MAX_CHARS,
) -> dict[str, Any]:
    absolute = _resolve_openable_file_path(repo_root, file_path)
    raw = absolute.read_bytes()
    truncated = len(raw) > max_bytes
    if truncated:
        raw = raw[-max_bytes:]
    content = raw.decode("utf-8", errors="replace")
    if len(content) > max_chars:
        content = content[-max_chars:]
        truncated = True
    return {
        "path": str(absolute),
        "name": absolute.name,
        "content": content,
        "truncated": truncated,
    }


def open_repo_folder_payload(repo_root: Path, *, launcher: Any | None = None) -> dict[str, str]:
    root = repo_root.resolve()
    command = _system_editor_command(root)
    _dispatch_system_open(command, root, launcher=launcher)
    return {
        "path": str(root),
        "command": command[0],
    }


def _is_wsl() -> bool:
    if os.name == "nt" or sys.platform == "darwin":
        return False
    if os.environ.get("WSL_DISTRO_NAME") or os.environ.get("WSL_INTEROP"):
        return True
    try:
        with open("/proc/version", encoding="utf-8", errors="ignore") as fh:
            return "microsoft" in fh.read().lower()
    except OSError:
        return False


def _wsl_translate_path(path: Path) -> str | None:
    try:
        result = subprocess.run(
            ["wslpath", "-w", str(path)],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    translated = result.stdout.strip()
    return translated or None


def _system_editor_command(path: Path) -> list[str]:
    if sys.platform == "darwin":
        return ["open", str(path)]
    if os.name == "nt":
        return ["explorer.exe", str(path)]
    if _is_wsl():
        translated = _wsl_translate_path(path)
        if translated:
            return ["explorer.exe", translated]
    return ["xdg-open", str(path)]


def _dispatch_system_open(
    command: list[str],
    path: Path,
    *,
    launcher: Any | None = None,
    spawner: Any | None = None,
) -> None:
    if launcher is not None:
        launcher(command)
        return
    spawn = spawner or subprocess.Popen
    try:
        spawn(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            close_fds=True,
        )
        return
    except (OSError, subprocess.SubprocessError):
        webbrowser.open(path.as_uri())


STATIC_CONTENT_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
}


def _path_on_windows_drive_mount(path: Path) -> bool:
    try:
        parts = path.resolve().parts
    except OSError:
        parts = path.parts
    return len(parts) >= 3 and parts[0] == "/" and parts[1] == "mnt" and len(parts[2]) == 1 and parts[2].isalpha()


@functools.lru_cache(maxsize=8)
def _subprocess_timeout_scale(repo_root_key: str) -> float:
    """Return a timeout multiplier for slow filesystems (WSL on /mnt/<drive>)."""
    if not _is_wsl():
        return 1.0
    try:
        if _path_on_windows_drive_mount(Path(repo_root_key)):
            return 6.0
    except (OSError, ValueError):
        pass
    return 2.0


def _scaled_timeout(repo_root: Path, base: float) -> float:
    return base * _subprocess_timeout_scale(str(repo_root))


def viewer_environment_warning(repo_root: Path) -> dict[str, str] | None:
    """Surface an environment warning when the repo lives on a slow filesystem."""
    if _is_wsl() and _path_on_windows_drive_mount(repo_root):
        return {
            "id": "wsl-windows-drive",
            "severity": "warning",
            "title": "Slow filesystem detected",
            "message": (
                "This repository lives on the Windows filesystem accessed from WSL "
                "(/mnt/<drive>). Subprocess timeouts have been scaled up, but git, "
                "cdx and insights operations will still be noticeably slower. "
                "Move the repo to the WSL filesystem (e.g. ~/) for ~10x faster access."
            ),
        }
    return None


def _run_read_only_git(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["git", *args]
    git_runner = runner or subprocess.run
    return git_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 5))


def _run_read_only_cdx(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["cdx", *args]
    cdx_runner = runner or subprocess.run
    return cdx_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 5))


def _run_cdx_mission(repo_root: Path, args: list[str], *, timeout: int, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["cdx", *args]
    cdx_runner = runner or subprocess.run
    return cdx_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, timeout))


def _run_logics_flow(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["logics-manager", "flow", *args]
    flow_runner = runner or subprocess.run
    return flow_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 30))


def _run_logics_command(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["logics-manager", *args]
    logics_runner = runner or subprocess.run
    return logics_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 30))


def _run_read_only_gh(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["gh", *args]
    gh_runner = runner or subprocess.run
    return gh_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 8))


def _logics_doc_type(rel_path: str) -> str:
    normalized = rel_path.replace("\\", "/").lstrip("/")
    for family in DOC_FAMILIES:
        if normalized.startswith(f"{family.directory}/"):
            return family.stage
    return ""


def _sanitize_git_ref(value: str) -> str:
    ref = value.strip()
    ref = re.sub(r"://[^/@\s]+@", "://", ref)
    ref = re.sub(r"^[^/@\s]+@", "", ref)
    return ref[:200]


def _github_web_url_from_remote(value: str) -> str:
    remote = value.strip()
    if not remote:
        return ""
    remote = re.sub(r"^git\+", "", remote)
    match = re.match(r"^(?:https://|http://)(?:[^/@\s]+@)?github\.com[:/]+([^/\s]+)/([^/\s]+?)(?:\.git)?/?$", remote)
    if not match:
        match = re.match(r"^(?:ssh://)?git@github\.com[:/]+([^/\s]+)/([^/\s]+?)(?:\.git)?/?$", remote)
    if not match:
        return ""
    owner, repo = match.groups()
    if not owner or not repo:
        return ""
    return f"https://github.com/{owner}/{repo}"


def _github_owner_repo_from_web_url(value: str) -> tuple[str, str] | None:
    match = re.match(r"^https://github\.com/([^/\s]+)/([^/\s]+?)/?$", value.strip())
    if not match:
        return None
    owner, repo = match.groups()
    return owner, repo


def github_repo_url(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> str:
    git_which = which or shutil.which
    if not git_which("git"):
        return ""
    try:
        remotes = _run_read_only_git(repo_root, ["remote", "-v"], runner=runner)
    except (OSError, subprocess.SubprocessError):
        return ""
    if remotes.returncode != 0:
        return ""

    candidates: list[tuple[int, str]] = []
    for line in remotes.stdout.splitlines():
        parts = line.split()
        if len(parts) < 2:
            continue
        name, url = parts[0], parts[1]
        web_url = _github_web_url_from_remote(url)
        if web_url:
            candidates.append((0 if name == "origin" else 1, web_url))
    if not candidates:
        return ""
    return sorted(candidates, key=lambda entry: entry[0])[0][1]


def _has_github_actions_workflows(repo_root: Path) -> bool:
    workflows_dir = repo_root / ".github" / "workflows"
    if not workflows_dir.is_dir():
        return False
    return any(path.is_file() and path.suffix.lower() in {".yml", ".yaml"} for path in workflows_dir.iterdir())


def _classify_porcelain_entry(line: str) -> tuple[str, dict[str, str]] | None:
    if not line or line.startswith("## "):
        return None
    if line.startswith("?? "):
        path = line[3:].strip()
        return "untracked", {"path": path, "logicsType": _logics_doc_type(path)}
    if len(line) < 4:
        return None
    staged = line[0]
    worktree = line[1]
    raw_path = line[3:].strip()
    if " -> " in raw_path:
        before, after = raw_path.split(" -> ", 1)
        path = after.strip()
        return "renamed", {"path": path, "from": before.strip(), "logicsType": _logics_doc_type(path)}
    if staged == "R":
        return "renamed", {"path": raw_path, "logicsType": _logics_doc_type(raw_path)}
    if staged not in {" ", "?", "!"}:
        return "staged", {"path": raw_path, "code": staged, "logicsType": _logics_doc_type(raw_path)}
    if worktree == "D":
        return "deleted", {"path": raw_path, "code": worktree, "logicsType": _logics_doc_type(raw_path)}
    if worktree not in {" ", "?", "!"}:
        return "modified", {"path": raw_path, "code": worktree, "logicsType": _logics_doc_type(raw_path)}
    return None


def _parse_git_branch_line(line: str) -> dict[str, Any]:
    branch = line[3:].strip() if line.startswith("## ") else ""
    tracking = ""
    ahead = 0
    behind = 0
    if "..." in branch:
        branch, tracking_part = branch.split("...", 1)
        if " [" in tracking_part:
            tracking, details = tracking_part.split(" [", 1)
            for detail in details.rstrip("]").split(", "):
                if detail.startswith("ahead "):
                    ahead = int(detail.removeprefix("ahead ") or "0")
                if detail.startswith("behind "):
                    behind = int(detail.removeprefix("behind ") or "0")
        else:
            tracking = tracking_part
    return {
        "branch": _sanitize_git_ref(branch or "HEAD"),
        "tracking": _sanitize_git_ref(tracking),
        "ahead": ahead,
        "behind": behind,
    }


GIT_HISTORY_DISPLAY_LIMIT = 50
GIT_HISTORY_FETCH_LIMIT = GIT_HISTORY_DISPLAY_LIMIT + 1


def _parse_recent_git_commits(output: str, *, limit: int | None = None) -> list[dict[str, str]]:
    commits: list[dict[str, str]] = []
    for line in output.splitlines():
        parts = line.split("\x1f")
        if len(parts) < 5:
            continue
        commit_hash, subject, author, date, refs = parts[:5]
        commits.append(
            {
                "hash": _sanitize_git_ref(commit_hash),
                "subject": subject.strip()[:240],
                "author": author.strip()[:120],
                "date": date.strip()[:40],
                "refs": _sanitize_git_ref(refs),
            }
        )
        if limit is not None and len(commits) >= limit:
            break
    return commits


def _parse_git_numstat(output: str) -> dict[str, dict[str, int]]:
    stats: dict[str, dict[str, int]] = {}
    for line in output.splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        raw_additions, raw_deletions, raw_path = parts[:3]
        try:
            additions = int(raw_additions)
            deletions = int(raw_deletions)
        except ValueError:
            continue
        path = raw_path.strip()
        if " => " in path:
            path = path.split(" => ", 1)[1].strip("{}")
        if path:
            stats[path] = {"additions": additions, "deletions": deletions}
    return stats


def _attach_git_change_stats(groups: dict[str, list[dict[str, Any]]], staged_stats: dict[str, dict[str, int]], worktree_stats: dict[str, dict[str, int]]) -> None:
    for key, entries in groups.items():
        stats_source = staged_stats if key == "staged" else worktree_stats
        for entry in entries:
            path = str(entry.get("path", ""))
            stats = stats_source.get(path) or staged_stats.get(path) or worktree_stats.get(path)
            if stats:
                entry["additions"] = stats["additions"]
                entry["deletions"] = stats["deletions"]


def _count_unique_git_status_paths(groups: dict[str, list[dict[str, Any]]]) -> int:
    paths: set[str] = set()
    for entries in groups.values():
        for entry in entries:
            path = entry.get("path", "").strip()
            if path:
                paths.add(path)
    return len(paths)


def _git_unpushed_commit_count(repo_root: Path, *, runner: Any | None = None) -> dict[str, Any]:
    try:
        upstream = _run_read_only_git(repo_root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"available": False, "count": 0, "message": f"Unable to inspect upstream: {exc}"}
    if upstream.returncode != 0:
        return {"available": False, "count": 0, "message": "No upstream branch detected."}

    tracking = _sanitize_git_ref(upstream.stdout.strip())
    try:
        unpushed = _run_read_only_git(repo_root, ["rev-list", "--count", "@{u}..HEAD"], runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"available": False, "count": 0, "tracking": tracking, "message": f"Unable to count unpushed commits: {exc}"}
    if unpushed.returncode != 0:
        message = (unpushed.stderr or unpushed.stdout or "Unable to count unpushed commits.").strip().splitlines()[0]
        return {"available": False, "count": 0, "tracking": tracking, "message": message}

    try:
        count = max(0, int(unpushed.stdout.strip() or "0"))
    except ValueError:
        count = 0
    return {"available": True, "count": count, "tracking": tracking, "message": ""}


def git_status_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    git_which = which or shutil.which
    if not git_which("git"):
        return {"state": "unavailable", "message": "Git is not available on PATH."}
    try:
        inside = _run_read_only_git(repo_root, ["rev-parse", "--is-inside-work-tree"], runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run Git status: {exc}"}
    if inside.returncode != 0 or inside.stdout.strip().lower() != "true":
        return {"state": "not-repository", "message": "This folder is not inside a Git worktree."}

    try:
        status = _run_read_only_git(repo_root, ["status", "--porcelain=v1", "-b"], runner=runner)
        staged_numstat = _run_read_only_git(repo_root, ["diff", "--no-ext-diff", "--numstat", "--cached"], runner=runner)
        worktree_numstat = _run_read_only_git(repo_root, ["diff", "--no-ext-diff", "--numstat"], runner=runner)
        commit = _run_read_only_git(repo_root, ["log", "-1", "--pretty=format:%h %s"], runner=runner)
        recent_commits = _run_read_only_git(
            repo_root,
            ["log", f"-{GIT_HISTORY_FETCH_LIMIT}", "--date=short", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"],
            runner=runner,
        )
        unpushed = _git_unpushed_commit_count(repo_root, runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to collect Git status: {exc}"}
    if status.returncode != 0:
        message = (status.stderr or status.stdout or "Git status failed.").strip().splitlines()[0]
        return {"state": "error", "message": message}

    lines = status.stdout.splitlines()
    branch_info = _parse_git_branch_line(lines[0]) if lines else {"branch": "HEAD", "tracking": "", "ahead": 0, "behind": 0}
    groups: dict[str, list[dict[str, Any]]] = {key: [] for key in ("staged", "modified", "deleted", "renamed", "untracked")}
    for line in lines[1:]:
        classified = _classify_porcelain_entry(line)
        if classified:
            group, entry = classified
            groups[group].append(entry)
    if staged_numstat.returncode == 0 or worktree_numstat.returncode == 0:
        _attach_git_change_stats(
            groups,
            _parse_git_numstat(staged_numstat.stdout if staged_numstat.returncode == 0 else ""),
            _parse_git_numstat(worktree_numstat.stdout if worktree_numstat.returncode == 0 else ""),
        )
    counts = {key: len(value) for key, value in groups.items()}
    uncommitted_files = _count_unique_git_status_paths(groups)
    dirty = any(counts.values())
    parsed_recent_commits = _parse_recent_git_commits(recent_commits.stdout, limit=GIT_HISTORY_FETCH_LIMIT) if recent_commits.returncode == 0 else []
    return {
        "state": "ok",
        **branch_info,
        "clean": not dirty,
        "dirty": dirty,
        "counts": counts,
        "badgeCounts": {
            "unpushedCommits": int(unpushed.get("count", 0)),
            "uncommittedFiles": uncommitted_files,
        },
        "badgeAvailability": {
            "unpushedCommits": bool(unpushed.get("available")),
            "uncommittedFiles": True,
        },
        "badgeMessages": {
            "unpushedCommits": str(unpushed.get("message", "")),
            "uncommittedFiles": "",
        },
        "groups": groups,
        "latestCommit": (commit.stdout.strip() if commit.returncode == 0 else "")[:300],
        "recentCommits": parsed_recent_commits[:GIT_HISTORY_DISPLAY_LIMIT],
        "recentCommitsHasMore": len(parsed_recent_commits) > GIT_HISTORY_DISPLAY_LIMIT,
    }


def _normalize_git_file_path(rel_path: str) -> str | None:
    normalized = unquote(rel_path).replace("\\", "/").lstrip("/")
    if not normalized or normalized.startswith("~") or normalized.startswith("/") or ".." in normalized.split("/"):
        return None
    return normalized


def git_diff_payload(
    repo_root: Path,
    rel_path: str,
    *,
    cached: bool = False,
    max_chars: int = 20000,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    git_which = which or shutil.which
    if not git_which("git"):
        return {"state": "unavailable", "message": "Git is not available on PATH."}
    normalized = _normalize_git_file_path(rel_path)
    if not normalized:
        return {"state": "error", "message": "Unsafe Git path."}
    try:
        inside = _run_read_only_git(repo_root, ["rev-parse", "--is-inside-work-tree"], runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run Git diff: {exc}"}
    if inside.returncode != 0 or inside.stdout.strip().lower() != "true":
        return {"state": "not-repository", "message": "This folder is not inside a Git worktree."}

    args = ["diff", "--no-ext-diff", "--unified=80"]
    if cached:
        args.append("--cached")
    args.extend(["--", normalized])
    try:
        diff = _run_read_only_git(repo_root, args, runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to collect Git diff: {exc}"}
    if diff.returncode != 0:
        message = (diff.stderr or diff.stdout or "Git diff failed.").strip().splitlines()[0]
        return {"state": "error", "message": message}
    content = diff.stdout
    truncated = len(content) > max_chars
    if truncated:
        content = content[:max_chars]
    return {
        "state": "ok",
        "path": normalized,
        "mode": "staged" if cached else "worktree",
        "diff": content,
        "truncated": truncated,
        "logicsType": _logics_doc_type(normalized),
        "message": "" if content else "No diff is available for this file in the selected mode.",
    }


def git_file_preview_payload(
    repo_root: Path,
    rel_path: str,
    *,
    max_bytes: int = GIT_FILE_PREVIEW_MAX_BYTES,
    max_chars: int = GIT_FILE_PREVIEW_MAX_CHARS,
) -> dict[str, Any]:
    normalized = _normalize_git_file_path(rel_path)
    if not normalized:
        return {"state": "error", "message": "Unsafe Git path."}
    target = (repo_root / normalized).resolve()
    try:
        target.relative_to(repo_root.resolve())
    except ValueError:
        return {"state": "error", "message": "Unsafe Git path."}
    if not target.exists() or not target.is_file():
        return {
            "state": "missing",
            "path": normalized,
            "message": "The current file is missing or deleted, so no file preview is available.",
        }
    try:
        size = target.stat().st_size
    except OSError as exc:
        return {"state": "error", "path": normalized, "message": f"Unable to inspect file: {exc}"}
    if size > max_bytes:
        return {
            "state": "oversized",
            "path": normalized,
            "size": size,
            "message": f"File preview is limited to {max_bytes} bytes; this file is {size} bytes.",
        }
    try:
        data = target.read_bytes()
    except OSError as exc:
        return {"state": "error", "path": normalized, "message": f"Unable to read file preview: {exc}"}
    if b"\x00" in data:
        return {
            "state": "unsupported",
            "path": normalized,
            "message": "Binary or unsupported file content cannot be previewed.",
        }
    try:
        content = data.decode("utf-8")
    except UnicodeDecodeError:
        return {
            "state": "unsupported",
            "path": normalized,
            "message": "Binary or unsupported file encoding cannot be previewed.",
        }
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    truncated = len(content) > max_chars
    if truncated:
        content = content[:max_chars]
    return {
        "state": "ok",
        "path": normalized,
        "mode": "file-preview",
        "content": content,
        "truncated": truncated,
        "logicsType": _logics_doc_type(normalized),
        "message": "",
    }


def _normalize_workspace_path(rel_path: str) -> str:
    normalized = unquote(rel_path or "").replace("\\", "/").strip()
    normalized = normalized.lstrip("/")
    if normalized in {"", "."}:
        return ""
    if normalized.startswith("~") or re.match(r"^[A-Za-z]:", normalized):
        raise ValueError("Unsafe workspace path.")
    parts = [part for part in normalized.split("/") if part not in {"", "."}]
    if any(part == ".." for part in parts):
        raise ValueError("Workspace path escapes root.")
    return "/".join(parts)


def _resolve_workspace_path(repo_root: Path, rel_path: str) -> tuple[str, Path]:
    normalized = _normalize_workspace_path(rel_path)
    root = repo_root.resolve()
    target = (root / normalized).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ValueError("Workspace path escapes root.") from exc
    return normalized, target


def _workspace_entry_payload(root: Path, path: Path) -> dict[str, Any]:
    try:
        stat = path.stat()
    except OSError:
        stat = None
    rel_path = path.relative_to(root).as_posix()
    is_dir = path.is_dir()
    ignored = is_dir and path.name in WORKSPACE_IGNORED_DIRS
    return {
        "name": path.name or root.name,
        "path": rel_path,
        "kind": "directory" if is_dir else "file",
        "size": stat.st_size if stat else 0,
        "ignored": ignored,
        "childrenAvailable": is_dir and not ignored,
    }


def workspace_tree_payload(
    repo_root: Path,
    rel_path: str = "",
    *,
    max_entries: int = WORKSPACE_TREE_MAX_ENTRIES,
) -> dict[str, Any]:
    normalized, target = _resolve_workspace_path(repo_root, rel_path)
    root = repo_root.resolve()
    if not target.exists():
        return {"state": "missing", "path": normalized, "message": "Workspace path does not exist."}
    if not target.is_dir():
        return {"state": "not-directory", "path": normalized, "message": "Workspace path is not a directory."}
    entries = []
    truncated = False
    try:
        children = sorted(target.iterdir(), key=lambda path: (not path.is_dir(), path.name.lower()))
    except OSError as exc:
        return {"state": "error", "path": normalized, "message": f"Unable to list workspace path: {exc}"}
    for child in children:
        if len(entries) >= max_entries:
            truncated = True
            break
        entries.append(_workspace_entry_payload(root, child))
    return {
        "state": "ok",
        "root": str(root),
        "path": normalized,
        "entries": entries,
        "truncated": truncated,
        "ignoredDirectories": sorted(WORKSPACE_IGNORED_DIRS),
    }


def workspace_preview_payload(
    repo_root: Path,
    rel_path: str,
    *,
    max_bytes: int = WORKSPACE_PREVIEW_MAX_BYTES,
    max_chars: int = WORKSPACE_PREVIEW_MAX_CHARS,
) -> dict[str, Any]:
    normalized, target = _resolve_workspace_path(repo_root, rel_path)
    if not target.exists():
        return {"state": "missing", "path": normalized, "message": "Workspace path does not exist."}
    if target.is_dir():
        try:
            count = sum(1 for _ in target.iterdir())
        except OSError:
            count = 0
        return {
            "state": "directory",
            "path": normalized,
            "name": target.name or repo_root.resolve().name,
            "kind": "directory",
            "message": f"{count} item(s)",
            "childrenAvailable": target.name not in WORKSPACE_IGNORED_DIRS,
        }
    if not target.is_file():
        return {"state": "unsupported", "path": normalized, "message": "Workspace object cannot be previewed."}
    try:
        size = target.stat().st_size
    except OSError as exc:
        return {"state": "error", "path": normalized, "message": f"Unable to inspect file: {exc}"}
    if size > max_bytes:
        return {
            "state": "oversized",
            "path": normalized,
            "name": target.name,
            "size": size,
            "message": f"File preview is limited to {max_bytes} bytes; this file is {size} bytes.",
        }
    try:
        data = target.read_bytes()
    except OSError as exc:
        return {"state": "error", "path": normalized, "message": f"Unable to read file preview: {exc}"}
    content_type = mimetypes.guess_type(target.name)[0] or ""
    if content_type.startswith("image/"):
        return {
            "state": "image",
            "path": normalized,
            "name": target.name,
            "size": size,
            "contentType": content_type,
            "message": "Image preview is available from the workspace file endpoint.",
        }
    if b"\x00" in data:
        return {
            "state": "unsupported",
            "path": normalized,
            "name": target.name,
            "size": size,
            "message": "Binary or unsupported file content cannot be previewed.",
        }
    try:
        content = data.decode("utf-8")
    except UnicodeDecodeError:
        return {
            "state": "unsupported",
            "path": normalized,
            "name": target.name,
            "size": size,
            "message": "Binary or unsupported file encoding cannot be previewed.",
        }
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    truncated = len(content) > max_chars
    if truncated:
        content = content[:max_chars]
    return {
        "state": "ok",
        "path": normalized,
        "name": target.name,
        "kind": "file",
        "size": size,
        "contentType": content_type or "text/plain",
        "content": content,
        "truncated": truncated,
        "logicsType": _logics_doc_type(normalized),
        "message": "",
    }


WORKSHOP_COMMAND_MAX = 200


def _workshop_command_id(group: str, name: str) -> str:
    safe = re.sub(r"[^a-z0-9._-]+", "-", f"{group}:{name}".lower()).strip("-") or "command"
    return safe[:80]


def _discover_package_json_scripts(repo_root: Path) -> list[dict[str, Any]]:
    target = repo_root / "package.json"
    if not target.is_file():
        return []
    try:
        with target.open("rb") as handle:
            payload = json.load(handle)
    except (OSError, ValueError):
        return []
    scripts = payload.get("scripts") if isinstance(payload, dict) else None
    if not isinstance(scripts, dict):
        return []
    entries: list[dict[str, Any]] = []
    for name, command in scripts.items():
        if not isinstance(name, str) or not isinstance(command, str):
            continue
        entries.append(
            {
                "id": _workshop_command_id("npm", name),
                "source": "package.json",
                "group": "npm scripts",
                "name": name,
                "command": command,
                "runner": ["npm", "run", name],
            }
        )
        if len(entries) >= WORKSHOP_COMMAND_MAX:
            break
    return entries


def _discover_pyproject_scripts(repo_root: Path) -> list[dict[str, Any]]:
    target = repo_root / "pyproject.toml"
    if not target.is_file():
        return []
    try:
        with target.open("rb") as handle:
            payload = tomllib.load(handle)
    except (OSError, tomllib.TOMLDecodeError):
        return []
    entries: list[dict[str, Any]] = []
    project_scripts = (payload.get("project") or {}).get("scripts")
    if isinstance(project_scripts, dict):
        for name, target_ref in project_scripts.items():
            if not isinstance(name, str) or not isinstance(target_ref, str):
                continue
            entries.append(
                {
                    "id": _workshop_command_id("pyproject", name),
                    "source": "pyproject.toml [project.scripts]",
                    "group": "Project scripts",
                    "name": name,
                    "command": target_ref,
                    "runner": [name],
                }
            )
            if len(entries) >= WORKSHOP_COMMAND_MAX:
                return entries
    poetry_scripts = (
        ((payload.get("tool") or {}).get("poetry") or {}).get("scripts")
        if isinstance(payload.get("tool"), dict)
        else None
    )
    if isinstance(poetry_scripts, dict):
        for name, target_ref in poetry_scripts.items():
            if not isinstance(name, str) or not isinstance(target_ref, str):
                continue
            entries.append(
                {
                    "id": _workshop_command_id("poetry", name),
                    "source": "pyproject.toml [tool.poetry.scripts]",
                    "group": "Poetry scripts",
                    "name": name,
                    "command": target_ref,
                    "runner": ["poetry", "run", name],
                }
            )
            if len(entries) >= WORKSHOP_COMMAND_MAX:
                break
    return entries


def workshop_commands_payload(repo_root: Path) -> dict[str, Any]:
    if not repo_root.is_dir():
        return {"state": "unavailable", "commands": [], "message": "Workspace root is unavailable."}
    commands: list[dict[str, Any]] = []
    commands.extend(_discover_package_json_scripts(repo_root))
    commands.extend(_discover_pyproject_scripts(repo_root))
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for entry in commands:
        if entry["id"] in seen:
            continue
        seen.add(entry["id"])
        deduped.append(entry)
    return {
        "state": "ok" if deduped else "empty",
        "commands": deduped,
        "message": "" if deduped else "No package.json or pyproject.toml entry points were found in the workspace root.",
    }


def _current_git_ci_context(repo_root: Path, *, runner: Any | None = None) -> dict[str, str]:
    context = {"branch": "", "headSha": "", "subject": "", "author": ""}
    commands = {
        "branch": ["rev-parse", "--abbrev-ref", "HEAD"],
        "headSha": ["rev-parse", "HEAD"],
        "subject": ["log", "-1", "--pretty=format:%s"],
        "author": ["log", "-1", "--pretty=format:%an"],
    }
    for key, args in commands.items():
        try:
            result = _run_read_only_git(repo_root, args, runner=runner)
        except (OSError, subprocess.SubprocessError):
            continue
        if result.returncode == 0:
            context[key] = result.stdout.strip()[:240]
    if context["branch"] == "HEAD":
        context["branch"] = ""
    return context


def _ci_badge_state(status: str, conclusion: str) -> str:
    normalized_status = status.strip().lower()
    normalized_conclusion = conclusion.strip().lower()
    if normalized_status in {"queued", "in_progress", "waiting", "requested", "pending"}:
        return "running" if normalized_status == "in_progress" else "queued"
    if normalized_conclusion == "success":
        return "passing"
    if normalized_conclusion in {"failure", "timed_out", "action_required"}:
        return "failing"
    if normalized_conclusion == "cancelled":
        return "cancelled"
    return "unknown"


def _is_active_ci_status(run: dict[str, Any]) -> bool:
    return str(run.get("status") or "").strip().lower() in {"queued", "in_progress", "waiting", "requested", "pending"}


def _select_github_actions_run(runs: list[dict[str, Any]], head_sha: str) -> tuple[dict[str, Any], str]:
    ci_runs = [run for run in runs if str(run.get("name") or "").strip().lower() == "ci"]
    candidate_runs = ci_runs or runs
    head_runs = [run for run in candidate_runs if head_sha and str(run.get("head_sha") or "") == head_sha]
    active_head_run = next((run for run in head_runs if _is_active_ci_status(run)), None)
    if active_head_run is not None:
        return active_head_run, "head-active"
    if head_runs:
        head_state = _ci_badge_state(str(head_runs[0].get("status") or ""), str(head_runs[0].get("conclusion") or ""))
        if head_state in {"failing", "cancelled", "unknown"}:
            return head_runs[0], f"head-{head_state}"
        return head_runs[0], "head"
    active_branch_run = next((run for run in candidate_runs if _is_active_ci_status(run)), None)
    if active_branch_run is not None:
        return active_branch_run, "branch-active"
    return candidate_runs[0], "branch-latest"


def _parse_github_actions_run(run: dict[str, Any], *, match_source: str) -> dict[str, Any]:
    status = str(run.get("status") or "")
    conclusion = str(run.get("conclusion") or "")
    commit = run.get("head_commit") if isinstance(run.get("head_commit"), dict) else {}
    author = commit.get("author") if isinstance(commit.get("author"), dict) else {}
    commit_lines = str(commit.get("message") or run.get("display_title") or "").splitlines()
    return {
        "id": run.get("id"),
        "name": str(run.get("name") or run.get("display_title") or "GitHub Actions"),
        "workflowName": str(run.get("name") or "GitHub Actions"),
        "status": status,
        "conclusion": conclusion,
        "badgeState": _ci_badge_state(status, conclusion),
        "branch": str(run.get("head_branch") or ""),
        "headSha": str(run.get("head_sha") or ""),
        "event": str(run.get("event") or ""),
        "htmlUrl": str(run.get("html_url") or ""),
        "createdAt": str(run.get("created_at") or ""),
        "updatedAt": str(run.get("updated_at") or ""),
        "runStartedAt": str(run.get("run_started_at") or ""),
        "commitMessage": commit_lines[0][:240] if commit_lines else "",
        "author": str(author.get("name") or ""),
        "matchSource": match_source,
    }


def _parse_github_actions_jobs(output: str) -> list[dict[str, str]]:
    try:
        parsed = json.loads(output or "{}")
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, dict):
        return []
    jobs = parsed.get("jobs")
    if not isinstance(jobs, list):
        return []
    rows: list[dict[str, str]] = []
    for job in jobs[:30]:
        if not isinstance(job, dict):
            continue
        rows.append(
            {
                "name": str(job.get("name") or "Job"),
                "status": str(job.get("status") or ""),
                "conclusion": str(job.get("conclusion") or ""),
                "htmlUrl": str(job.get("html_url") or ""),
                "startedAt": str(job.get("started_at") or ""),
                "completedAt": str(job.get("completed_at") or ""),
            }
        )
    return rows


def ci_status_payload(repo_root: Path, *, git_runner: Any | None = None, gh_runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    git_which = which or shutil.which
    github_url = github_repo_url(repo_root, runner=git_runner, which=git_which)
    if not github_url:
        return {"state": "hidden", "visible": False, "message": "No GitHub remote detected."}
    owner_repo = _github_owner_repo_from_web_url(github_url)
    if not owner_repo:
        return {"state": "hidden", "visible": False, "message": "GitHub remote could not be parsed."}
    if not _has_github_actions_workflows(repo_root):
        return {"state": "hidden", "visible": False, "message": "No GitHub Actions workflows detected."}
    if not git_which("gh"):
        return {
            "state": "unavailable",
            "visible": True,
            "message": "GitHub CLI is not available on PATH.",
            "repositoryUrl": github_url,
            "badgeState": "unavailable",
        }

    owner, repo = owner_repo
    context = _current_git_ci_context(repo_root, runner=git_runner)
    branch = context.get("branch", "")
    head_sha = context.get("headSha", "")
    endpoint = f"repos/{owner}/{repo}/actions/runs?per_page=30"
    if branch:
        endpoint = f"{endpoint}&branch={quote(branch, safe='')}"
    try:
        runs_result = _run_read_only_gh(repo_root, ["api", endpoint], runner=gh_runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "visible": True, "message": "GitHub Actions status timed out.", "repositoryUrl": github_url, **context, "badgeState": "unavailable"}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "visible": True, "message": f"Unable to collect GitHub Actions status: {exc}", "repositoryUrl": github_url, **context, "badgeState": "unavailable"}
    if runs_result.returncode != 0:
        message = (runs_result.stderr or runs_result.stdout or "GitHub Actions status failed.").strip().splitlines()[0]
        return {"state": "unavailable", "visible": True, "message": message, "repositoryUrl": github_url, **context, "badgeState": "unavailable"}

    try:
        parsed = json.loads(runs_result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "visible": True, "message": "GitHub Actions status returned invalid JSON.", "repositoryUrl": github_url, **context, "badgeState": "unavailable"}
    workflow_runs = parsed.get("workflow_runs") if isinstance(parsed, dict) else None
    runs = [run for run in workflow_runs if isinstance(run, dict)] if isinstance(workflow_runs, list) else []
    if not runs:
        return {"state": "ok", "visible": True, "message": "No GitHub Actions runs found for the current branch.", "repositoryUrl": github_url, **context, "badgeState": "unknown", "run": None, "jobs": []}

    selected, match_source = _select_github_actions_run(runs, head_sha)
    run_payload = _parse_github_actions_run(selected, match_source=match_source)
    jobs: list[dict[str, str]] = []
    run_id = run_payload.get("id")
    if run_id:
        try:
            jobs_result = _run_read_only_gh(repo_root, ["api", f"repos/{owner}/{repo}/actions/runs/{run_id}/jobs?per_page=100"], runner=gh_runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            jobs_result = None
        if jobs_result is not None and jobs_result.returncode == 0:
            jobs = _parse_github_actions_jobs(jobs_result.stdout)

    return {
        "state": "ok",
        "visible": True,
        "message": "",
        "repositoryUrl": github_url,
        **context,
        "badgeState": run_payload["badgeState"],
        "run": run_payload,
        "jobs": jobs,
    }


def cdx_status_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"state": "unavailable", "message": "CDX is not available on PATH.", "status": {}}

    try:
        status = _run_read_only_cdx(repo_root, ["status", "--json"], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX status timed out.", "status": {}}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX status: {exc}", "status": {}}

    if status.returncode != 0:
        message = (status.stderr or status.stdout or "CDX status failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "status": {}}

    try:
        parsed = json.loads(status.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "message": "CDX status returned invalid JSON.", "status": {}}
    if not isinstance(parsed, dict):
        return {"state": "invalid-json", "message": "CDX status JSON must be an object.", "status": {}}

    return {"state": "ok", "message": "", "status": parsed}


def cdx_runs_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"state": "unavailable", "message": "CDX executable is not available on PATH.", "runs": []}
    try:
        result = _run_read_only_cdx(repo_root, ["runs", "--json"], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX runs timed out.", "runs": []}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX runs: {exc}", "runs": []}
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "CDX runs failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "runs": []}
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "message": "CDX runs returned invalid JSON.", "runs": []}
    runs = parsed.get("runs") if isinstance(parsed, dict) else None
    if not isinstance(runs, list):
        return {"state": "invalid-json", "message": "CDX runs JSON must include a runs array.", "runs": []}
    normalized_runs: list[dict[str, Any]] = []
    for run in runs:
        if not isinstance(run, dict):
            continue
        item = dict(run)
        status = str(item.get("status") or item.get("state") or "").strip().lower()
        if status == "stale" and not item.get("ended_at") and not item.get("endedAt"):
            item["status"] = "running"
            item["status_detail"] = "CDX still marks this run active; no end timestamp has been reported yet."
            item["raw_status"] = "stale"
        normalized_runs.append(item)
    return {"state": "ok", "message": "", "runs": normalized_runs}


def cdx_run_report_payload(repo_root: Path, run_id: str, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not run_id:
        return {"state": "error", "message": "Missing CDX run id.", "report": None}
    if not cdx_which("cdx"):
        return {"state": "unavailable", "message": "CDX executable is not available on PATH.", "report": None}
    try:
        result = _run_read_only_cdx(repo_root, ["run-report", run_id, "--json"], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX run report timed out.", "report": None}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX run-report: {exc}", "report": None}
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "CDX run-report failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "report": None}
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "message": "CDX run-report returned invalid JSON.", "report": None}
    report = parsed.get("report") if isinstance(parsed, dict) else None
    if not isinstance(report, dict):
        return {"state": "invalid-json", "message": "CDX run-report JSON must include a report object.", "report": None}
    merged_report = _merge_cdx_mission_output(report)
    if merged_report:
        report = merged_report
    return {"state": "ok", "message": "", "report": report}


def cdx_mission_catalog_payload() -> dict[str, Any]:
    return {
        "missions": list(CDX_MISSION_CATALOG.values()),
        "strengths": list(CDX_MISSION_STRENGTHS.values()),
        "defaultMissionId": CDX_DEFAULT_MISSION_ID,
        "defaultStrengthId": "standard",
    }


def _cdx_status_sessions(status_payload: dict[str, Any]) -> list[str]:
    status = status_payload.get("status") if isinstance(status_payload.get("status"), dict) else {}
    sessions = status.get("sessions") if isinstance(status.get("sessions"), list) else []
    ids: list[str] = []
    for session in sessions:
        if not isinstance(session, dict):
            continue
        session_id = str(session.get("id") or session.get("name") or "").strip()
        if session_id:
            ids.append(session_id)
    return ids


def _normalize_cdx_session(value: Any, status_payload: dict[str, Any] | None = None) -> str:
    session = str(value or "").strip()
    if not re.match(r"^[A-Za-z0-9_.:@/-]{1,120}$", session):
        return ""
    if status_payload is None:
        return session
    known_sessions = _cdx_status_sessions(status_payload)
    if known_sessions and session not in known_sessions:
        return ""
    return session


def _latest_release_tag(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> str:
    git_which = which or shutil.which
    if not git_which("git"):
        return ""
    commands = [
        ["tag", "--sort=-version:refname", "--list", "v[0-9]*"],
        ["tag", "--sort=-version:refname", "--list", "[0-9]*"],
        ["describe", "--tags", "--abbrev=0"],
    ]
    for args in commands:
        try:
            result = _run_read_only_git(repo_root, args, runner=runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            continue
        if result.returncode != 0:
            continue
        tag = (result.stdout or "").strip().splitlines()[0] if (result.stdout or "").strip() else ""
        if tag:
            return tag[:200]
    return ""


def _mission_text_input(body: dict[str, Any], key: str, *, max_chars: int = 4000) -> str:
    raw = str(body.get(key) or "").strip()
    normalized = re.sub(r"\s+", " ", raw)
    return normalized[:max_chars]


def _mission_bool_input(body: dict[str, Any], key: str) -> bool:
    value = body.get(key)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _cdx_mission_prompt(
    mission_id: str,
    *,
    release_tag: str = "",
    wish_text: str = "",
    release_version: str = "",
    run_full_validation: bool = False,
    allow_file_writes: bool = False,
    direct_fixes: bool = False,
    commit_at_end: bool = False,
) -> str:
    write_guidance = (
        "File edits are allowed when they directly complete the selected mission mode. Keep changes scoped, run relevant validation, and report changed files."
        if allow_file_writes
        else "Do not modify files."
    )
    commit_guidance = (
        "At the end, if and only if files were added, deleted, or modified, create one scoped git commit that includes all mission changes. Do not push, tag, publish, upload assets, or create a GitHub release. Include the commit hash and message in the returned JSON when a commit is created."
        if commit_at_end
        else "Do not create git commits."
    )
    if mission_id == "full-audit":
        if direct_fixes:
            action_guidance = "Fix safe, scoped issues directly in repository files when you can validate them. Do not write a separate audit corpus/report artifact. Do not make broad refactors, release, tag, push, or publish."
            schema = "Return concise JSON with keys: summary, findings, directFixes, changedFiles, validationEvidence."
        elif allow_file_writes:
            action_guidance = "Create or update a bounded Logics request under logics/request/ for actionable full-audit follow-up. Do not write a separate audit corpus/report artifact. Do not directly modify product/source files to fix issues."
            schema = "Return concise JSON with keys: summary, findings, recommendations, requestFiles, validationEvidence."
        else:
            action_guidance = "Report only; do not write corpus files, fix issues, or modify files."
            schema = "Return concise JSON with keys: summary, findings, recommendations."
        return "\n".join([
            "Run a full repository audit for this Logics Manager checkout.",
            "Focus on correctness bugs, workflow risks, missing validation, stale documentation, and test gaps.",
            write_guidance,
            action_guidance,
            commit_guidance,
            schema,
        ])
    if mission_id == "release-review":
        if direct_fixes:
            action_guidance = "Fix safe, scoped release-readiness issues directly in repository files when you can validate them, such as stale documentation, missing release notes, or narrow test failures. Do not write a separate release-review corpus/report artifact. Do not bump versions unless explicitly requested, and do not tag, push, publish, upload assets, or create GitHub releases."
            schema = "Return concise JSON with keys: summary, findings, directFixes, changedFiles, validationEvidence."
        elif allow_file_writes:
            action_guidance = "Create or update a bounded Logics request under logics/request/ for actionable release-review follow-up. Do not write a separate release-review corpus/report artifact under logics/external. Do not directly modify product/source files to fix issues. Do not bump versions, tag, push, publish, upload assets, or create GitHub releases."
            schema = "Return concise JSON with keys: summary, findings, recommendations, requestFiles, validationEvidence."
        else:
            action_guidance = "Report only; do not update release files, write corpus files, fix issues, tag, push, publish, upload assets, or create GitHub releases."
            schema = "Return concise JSON with keys: summary, findings, recommendations."
        return "\n".join([
            f"Review repository changes since the latest release tag {release_tag}.",
            "Focus on regressions, incomplete release notes, migration risks, and missing tests.",
            write_guidance,
            action_guidance,
            commit_guidance,
            schema,
        ])
    if mission_id == "corpus-ready":
        return "\n".join([
            "Prepare the open Logics workflow corpus for development.",
            "Analyze requests, backlog items, tasks, docs, lint/audit state, and workflow consistency.",
            "Do not modify files directly. This mission is plan-first: return allowed actions for the viewer to apply explicitly.",
            "Do not run destructive commands.",
            "Return JSON only with this schema:",
            '{"summary":"...","actions":[{"type":"promote-request-to-backlog","target":"req_..."},{"type":"promote-backlog-to-task","target":"item_..."},{"type":"refresh-corpus-context","target":""}],"notes":["..."]}',
            "Allowed action types are exactly: promote-request-to-backlog, promote-backlog-to-task, refresh-corpus-context.",
            "Use only targets that exist in the repository. Omit actions that are not clearly justified.",
        ])
    if mission_id == "wish-to-request":
        request_guidance = (
            "Create the request draft file under logics/request/ using the next available req_ slug. Keep the file as a request draft only; do not promote backlog items and do not create tasks. Include the created path in generatedFiles."
            if allow_file_writes
            else "Do not create the request file; return the request draft and generatedFiles preview only."
        )
        return "\n".join([
            "Turn the following user wish into a structured Logics request draft.",
            write_guidance,
            request_guidance,
            commit_guidance,
            "Do not promote backlog items and do not create tasks.",
            "Return JSON only with this schema:",
            '{"summary":"...","requestDraft":{"title":"...","needs":["..."],"context":["..."],"acceptanceCriteria":["AC1: ..."],"definitionOfReady":{"problemExplicit":true,"scopeBounded":true,"criteriaTestable":true,"risksListed":true},"references":["..."],"questions":["..."],"openAssumptions":["..."]},"generatedFiles":[]}',
            "If the wish is underspecified, include concrete questions and open assumptions instead of inventing details.",
            "User wish:",
            wish_text,
        ])
    if mission_id == "pre-release":
        validation_mode = "Run the project-defined full validation path before finalizing the report, and include actionable fixes for any failures." if run_full_validation else "Do not run full validation; identify the validation commands that should be run before release."
        release_prep_guidance = (
            "Prepare release metadata files for the requested version when needed: update package.json, pyproject.toml, VERSION, and create or update the matching changelogs/CHANGELOGS_X_Y_Z.md. Do not create Git tags, push branches, publish packages, upload release assets, or create GitHub releases."
            if allow_file_writes
            else "Do not modify package versions, changelog files, create Git tags, push branches, publish packages, upload release assets, or create GitHub releases."
        )
        return "\n".join([
            f"Prepare a guarded pre-release for version {release_version}.",
            validation_mode,
            release_prep_guidance,
            write_guidance,
            commit_guidance,
            "Return JSON only with this schema:",
            '{"summary":"...","version":"vX.X.X","validationMode":"full|plan-only","validationEvidence":["..."],"actionableFixes":[{"title":"...","command":"...","risk":"..."}],"generatedFiles":[{"path":"...","purpose":"..."}],"releasePlan":["..."],"blocked":false}',
        ])
    raise ValueError("Unknown CDX mission.")


def _cdx_mission_timeout(strength: dict[str, Any], *, allow_file_writes: bool = False, commit_at_end: bool = False) -> int:
    timeout = int(strength.get("timeout") or 180)
    if allow_file_writes or commit_at_end:
        return max(timeout, CDX_WRITABLE_MISSION_MIN_TIMEOUT_SECONDS)
    return timeout


def _cdx_mission_command(
    repo_root: Path,
    mission_id: str,
    *,
    session: str,
    strength: dict[str, Any],
    release_tag: str = "",
    mission_inputs: dict[str, str] | None = None,
    allow_file_writes: bool = False,
    commit_at_end: bool = False,
) -> list[str]:
    mission_inputs = mission_inputs or {}
    prompt = _cdx_mission_prompt(
        mission_id,
        release_tag=release_tag,
        wish_text=mission_inputs.get("wishText", ""),
        release_version=mission_inputs.get("releaseVersion", ""),
        run_full_validation=mission_inputs.get("runFullValidation") == "true",
        allow_file_writes=allow_file_writes,
        direct_fixes=mission_inputs.get("directFixes") == "true",
        commit_at_end=commit_at_end,
    )
    timeout = _cdx_mission_timeout(strength, allow_file_writes=allow_file_writes, commit_at_end=commit_at_end)
    reasoning_effort = str(strength.get("reasoningEffort") or "medium")
    power = str(strength.get("power") or "medium")
    permission = "workspace-write" if allow_file_writes else "read-only"
    return [
        "run",
        session,
        "--cwd",
        str(repo_root),
        "--prompt",
        prompt,
        "--kind",
        "assistant",
        "--reasoning-effort",
        reasoning_effort,
        "--power",
        power,
        "--permission",
        permission,
        "--timeout-seconds",
        str(timeout),
        "--json",
    ]


def _parse_json_from_text(text: str) -> dict[str, Any] | None:
    raw = text.strip()
    if not raw:
        return None
    jsonl_candidates: list[str] = []
    for line in reversed(raw.splitlines()):
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(event, dict):
            continue
        item = event.get("item") if isinstance(event.get("item"), dict) else {}
        text_value = item.get("text") if item.get("type") == "agent_message" else event.get("text")
        if isinstance(text_value, str) and text_value.strip():
            jsonl_candidates.append(text_value.strip())
    candidates = [raw]
    candidates.extend(jsonl_candidates)
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", raw, re.IGNORECASE | re.DOTALL)
    if fence_match:
        candidates.insert(0, fence_match.group(1).strip())
    decoder = json.JSONDecoder()
    fallback: dict[str, Any] | None = None
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                if any(key in parsed for key in ("actions", "summary", "findings", "recommendations")):
                    return parsed
                fallback = fallback or parsed
        except json.JSONDecodeError:
            pass
        for index, char in enumerate(candidate):
            if char != "{":
                continue
            try:
                parsed, _end = decoder.raw_decode(candidate[index:])
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                if any(key in parsed for key in ("actions", "summary", "findings", "recommendations")):
                    return parsed
                fallback = fallback or parsed
    return fallback


def _read_cdx_output_path(parsed: dict[str, Any]) -> str:
    candidates = [
        parsed.get("stdout"),
        parsed.get("output"),
    ]
    artifacts = parsed.get("artifacts") if isinstance(parsed.get("artifacts"), dict) else {}
    candidates.extend([
        parsed.get("stdout_path"),
        parsed.get("stdoutPath"),
        artifacts.get("stdout_path"),
        artifacts.get("stdoutPath"),
    ])
    for candidate in candidates:
        if not isinstance(candidate, str) or not candidate.strip():
            continue
        value = candidate.strip()
        if "\n" in value or value.lstrip().startswith("{") or value.lstrip().startswith("```"):
            return value[:12000]
        path = Path(value).expanduser()
        if not path.is_file():
            continue
        try:
            with path.open("rb") as handle:
                size = path.stat().st_size
                if size > 60000:
                    handle.seek(size - 60000)
                return handle.read(60000).decode("utf-8", errors="replace")
        except OSError:
            continue
    return ""


def _merge_cdx_mission_output(parsed: Any) -> dict[str, Any] | None:
    if not isinstance(parsed, dict):
        return None
    merged = dict(parsed)
    embedded = _parse_json_from_text(_read_cdx_output_path(parsed))
    if embedded:
        merged["missionOutput"] = embedded
        if isinstance(embedded.get("actions"), list) and "actions" not in merged:
            merged["actions"] = embedded["actions"]
        if "summary" in embedded and "summary" not in merged:
            merged["summary"] = embedded["summary"]
    return merged


def _extract_cdx_usage(parsed: Any) -> dict[str, Any]:
    if not isinstance(parsed, dict):
        return {"available": False, "message": "CDX did not return structured usage."}
    candidates = [
        parsed.get("usage"),
        parsed.get("tokenUsage"),
        parsed.get("tokens"),
        (parsed.get("run") or {}).get("usage") if isinstance(parsed.get("run"), dict) else None,
        (parsed.get("result") or {}).get("usage") if isinstance(parsed.get("result"), dict) else None,
    ]
    usage = next((candidate for candidate in candidates if isinstance(candidate, dict)), None)
    if usage is None:
        return {"available": False, "message": "Token usage was not exposed by CDX for this run."}
    input_tokens = usage.get("input_tokens", usage.get("inputTokens", usage.get("prompt_tokens", usage.get("promptTokens"))))
    output_tokens = usage.get("output_tokens", usage.get("outputTokens", usage.get("completion_tokens", usage.get("completionTokens"))))
    total_tokens = usage.get("total_tokens", usage.get("totalTokens"))
    if total_tokens is None and isinstance(input_tokens, int) and isinstance(output_tokens, int):
        total_tokens = input_tokens + output_tokens
    return {
        "available": True,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "totalTokens": total_tokens,
        "raw": usage,
    }


def _bounded_process_text(value: str, limit: int = 12000) -> str:
    text = value.strip()
    if len(text) <= limit:
        return text
    return f"{text[:limit]}\n... truncated ..."


def cdx_mission_plan_payload(
    repo_root: Path,
    body: dict[str, Any],
    *,
    cdx_runner: Any | None = None,
    git_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    tool_which = which or shutil.which
    if not tool_which("cdx"):
        return {"state": "unavailable", "message": "CDX executable is not available on PATH.", "plan": None}
    mission_id = str(body.get("missionId") or CDX_DEFAULT_MISSION_ID)
    mission = CDX_MISSION_CATALOG.get(mission_id)
    if mission is None:
        return {"state": "error", "message": "Unknown CDX mission.", "plan": None}
    strength = str(body.get("strengthId") or "standard")
    strength_def = CDX_MISSION_STRENGTHS.get(strength)
    if strength_def is None:
        return {"state": "error", "message": "Unknown CDX mission strength.", "plan": None}

    status_payload = cdx_status_payload(repo_root, runner=cdx_runner, which=which)
    session = _normalize_cdx_session(body.get("sessionId"), status_payload if status_payload.get("state") == "ok" else None)
    if not session:
        sessions = _cdx_status_sessions(status_payload)
        session = sessions[0] if sessions else ""
    if not session:
        return {"state": "error", "message": "No usable CDX session is available.", "plan": None, "status": status_payload}

    release_tag = ""
    warnings: list[str] = []
    mission_inputs: dict[str, str] = {}
    if mission_id == "wish-to-request":
        wish_text = _mission_text_input(body, "wishText")
        if not wish_text:
            return {"state": "error", "message": "Enter a wish or intent before previewing this mission.", "plan": None, "catalog": cdx_mission_catalog_payload(), "status": status_payload}
        mission_inputs["wishText"] = wish_text
    if mission_id in {"full-audit", "release-review"}:
        mission_inputs["directFixes"] = "true" if _mission_bool_input(body, "directFixes") else "false"
    if mission_id == "pre-release":
        release_version = _mission_text_input(body, "releaseVersion", max_chars=40)
        if not re.fullmatch(r"v\d+\.\d+\.\d+", release_version):
            return {"state": "error", "message": "Enter a semantic version in vX.X.X format before previewing this mission.", "plan": None, "catalog": cdx_mission_catalog_payload(), "status": status_payload}
        mission_inputs["releaseVersion"] = release_version
        mission_inputs["runFullValidation"] = "true" if _mission_bool_input(body, "runFullValidation") else "false"
    if mission.get("requiresReleaseTag"):
        release_tag = _latest_release_tag(repo_root, runner=git_runner, which=which)
        if not release_tag:
            return {"state": "error", "message": "No release tag was found for this mission.", "plan": None, "status": status_payload}
    if status_payload.get("state") != "ok":
        warnings.append(str(status_payload.get("message") or "CDX status could not be confirmed."))

    requested_file_writes = _mission_bool_input(body, "allowFileWrites")
    requested_commit_at_end = _mission_bool_input(body, "commitAtEnd")
    direct_fixes = mission_inputs.get("directFixes") == "true"
    supports_file_writes = bool(mission.get("supportsFileWrites", True))
    allow_file_writes = (requested_file_writes or direct_fixes) and supports_file_writes
    commit_at_end = requested_commit_at_end and allow_file_writes
    if requested_file_writes and not supports_file_writes:
        warnings.append("This mission is plan-first; direct CDX file writes are disabled. Use Apply allowed actions after CDX returns actions.")
    if requested_commit_at_end and not allow_file_writes:
        warnings.append("Commit-at-end was requested but direct file writes are disabled for this mission.")
    permission = "workspace-write" if allow_file_writes else "read-only"
    command = _cdx_mission_command(
        repo_root,
        mission_id,
        session=session,
        strength=strength_def,
        release_tag=release_tag,
        mission_inputs=mission_inputs,
        allow_file_writes=allow_file_writes,
        commit_at_end=commit_at_end,
    )
    plan = {
        "mission": mission,
        "missionId": mission_id,
        "sessionId": session,
        "strength": strength_def,
        "strengthId": strength,
        "missionInputs": mission_inputs,
        "scope": mission["scope"],
        "releaseTag": release_tag,
        "allowFileWrites": allow_file_writes,
        "requestedFileWrites": requested_file_writes,
        "commitAtEnd": commit_at_end,
        "requestedCommitAtEnd": requested_commit_at_end,
        "supportsFileWrites": supports_file_writes,
        "permission": permission,
        "timeoutSeconds": _cdx_mission_timeout(strength_def, allow_file_writes=allow_file_writes, commit_at_end=commit_at_end),
        "command": ["cdx", *command],
        "arguments": command,
        "warnings": warnings,
        "requiresConfirmation": bool(mission.get("requiresPlanConfirmation")),
        "canRun": True,
    }
    if mission_id == "corpus-ready":
        plan["allowedPlanActions"] = [
            "promote-request-to-backlog",
            "promote-backlog-to-task",
            "refresh-corpus-context",
        ]
    return {"state": "ok", "message": "", "plan": plan, "catalog": cdx_mission_catalog_payload(), "status": status_payload}


def cdx_mission_run_payload(
    repo_root: Path,
    body: dict[str, Any],
    *,
    cdx_runner: Any | None = None,
    git_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    plan_payload = cdx_mission_plan_payload(repo_root, body, cdx_runner=cdx_runner, git_runner=git_runner, which=which)
    if plan_payload.get("state") != "ok":
        return {"state": plan_payload.get("state") or "error", "message": plan_payload.get("message") or "Unable to plan CDX mission.", "plan": plan_payload.get("plan"), "run": None}
    plan = plan_payload["plan"]
    timeout = int(plan.get("timeoutSeconds") or plan["strength"].get("timeout") or 180)
    process_timeout = timeout + CDX_MISSION_PARENT_TIMEOUT_GRACE_SECONDS
    try:
        result = _run_cdx_mission(repo_root, list(plan["arguments"]), timeout=process_timeout, runner=cdx_runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX mission timed out.", "plan": plan, "run": None}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX mission: {exc}", "plan": plan, "run": None}

    parsed: Any = None
    if result.stdout.strip():
        try:
            parsed = json.loads(result.stdout)
        except json.JSONDecodeError:
            parsed = None
    parsed = _merge_cdx_mission_output(parsed)
    usage = _extract_cdx_usage(parsed)
    run_id = ""
    if isinstance(parsed, dict):
        run = parsed.get("run") if isinstance(parsed.get("run"), dict) else {}
        run_id = str(parsed.get("run_id") or parsed.get("runId") or run.get("run_id") or run.get("runId") or "")
    run_payload = {
        "returnCode": result.returncode,
        "runId": run_id,
        "stdout": _bounded_process_text(result.stdout or ""),
        "stderr": _bounded_process_text(result.stderr or ""),
        "parsed": parsed if isinstance(parsed, dict) else None,
        "usage": usage,
    }
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "CDX mission failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "plan": plan, "run": run_payload}
    return {"state": "ok", "message": "", "plan": plan, "run": run_payload}


def cdx_mission_apply_plan_payload(repo_root: Path, body: dict[str, Any], *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    tool_which = which or shutil.which
    if not tool_which("logics-manager"):
        return {"state": "unavailable", "message": "logics-manager executable is not available on PATH.", "results": []}
    actions = body.get("actions") if isinstance(body.get("actions"), list) else []
    if not actions:
        return {"state": "error", "message": "No corpus plan actions were provided.", "results": []}

    allowed: dict[str, list[str]] = {
        "promote-request-to-backlog": ["flow", "promote", "request-to-backlog"],
        "promote-backlog-to-task": ["flow", "promote", "backlog-to-task"],
        "refresh-corpus-context": ["sync", "refresh-mermaid-signatures"],
    }
    results: list[dict[str, Any]] = []
    for action in actions:
        if not isinstance(action, dict):
            return {"state": "error", "message": "Corpus plan actions must be objects.", "results": results}
        action_type = str(action.get("type") or "")
        command = allowed.get(action_type)
        if command is None:
            return {"state": "error", "message": f"Unsupported corpus plan action: {action_type}", "results": results}
        target = str(action.get("target") or "").strip()
        args = [*command]
        if target and action_type != "refresh-corpus-context":
            if not re.match(r"^[A-Za-z0-9_.:/-]{1,160}$", target):
                return {"state": "error", "message": "Invalid corpus plan action target.", "results": results}
            args.append(target)
        try:
            result = _run_logics_command(repo_root, args, runner=runner)
        except subprocess.TimeoutExpired:
            return {"state": "timeout", "message": "Logics corpus plan application timed out.", "results": results}
        except (OSError, subprocess.SubprocessError) as exc:
            return {"state": "error", "message": f"Unable to apply corpus plan action: {exc}", "results": results}
        item = {
            "type": action_type,
            "target": target,
            "command": ["logics-manager", *args],
            "returnCode": result.returncode,
            "stdout": _bounded_process_text(result.stdout or "", 4000),
            "stderr": _bounded_process_text(result.stderr or "", 4000),
        }
        results.append(item)
        if result.returncode != 0:
            message = (result.stderr or result.stdout or "Corpus plan action failed.").strip().splitlines()[0]
            return {"state": "error", "message": message, "results": results}
    return {"state": "ok", "message": "", "results": results}


def _slugify_viewer_doc(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return slug[:80] or "cdx_code_review_findings"


def _next_viewer_request_ref(repo_root: Path, title: str) -> str:
    request_dir = repo_root / "logics" / "request"
    highest = -1
    if request_dir.is_dir():
        for path in request_dir.glob("req_*.md"):
            match = re.match(r"^req_(\d{3})_", path.stem)
            if match:
                highest = max(highest, int(match.group(1)))
    return f"req_{highest + 1:03d}_{_slugify_viewer_doc(title)}"


def create_request_from_cdx_report(repo_root: Path, report_payload: dict[str, Any]) -> dict[str, Any]:
    report = report_payload.get("report") if isinstance(report_payload.get("report"), dict) else report_payload
    run = report.get("run") if isinstance(report.get("run"), dict) else {}
    task_report = report.get("task_report") if isinstance(report.get("task_report"), dict) else {}
    parsed = report.get("parsed") if isinstance(report.get("parsed"), dict) else {}
    mission_output = next(
        (
            candidate
            for candidate in (
                report.get("missionOutput"),
                report.get("mission_output"),
                parsed.get("missionOutput"),
                parsed.get("mission_output"),
                run.get("missionOutput"),
                run.get("mission_output"),
                task_report.get("missionOutput"),
                task_report.get("mission_output"),
            )
            if isinstance(candidate, dict)
        ),
        {},
    )
    run_id = str(run.get("run_id") or task_report.get("run_id") or "unknown")
    task_kind = str(task_report.get("kind") or run.get("kind") or "assistant")
    findings = task_report.get("findings") if isinstance(task_report.get("findings"), list) else []
    if not findings and isinstance(mission_output.get("findings"), list):
        findings = mission_output["findings"]
    recommendations = mission_output.get("recommendations") if isinstance(mission_output.get("recommendations"), list) else []
    request_files = mission_output.get("requestFiles") if isinstance(mission_output.get("requestFiles"), list) else []
    actionable_fixes = mission_output.get("actionableFixes") if isinstance(mission_output.get("actionableFixes"), list) else []
    release_plan = mission_output.get("releasePlan") if isinstance(mission_output.get("releasePlan"), list) else []
    if task_kind == "code-review":
        title = f"Address CDX code review findings for {run_id}"
        theme = "Code review follow-up"
        need = f"Follow up on CDX code-review run `{run_id}`."
    elif task_kind == "full-audit":
        title = f"Address CDX audit findings for {run_id}"
        theme = "Audit follow-up"
        need = f"Follow up on CDX full-audit run `{run_id}`."
    else:
        title = f"Address CDX {task_kind} follow-up for {run_id}"
        theme = "CDX mission follow-up"
        need = f"Follow up on CDX `{task_kind}` run `{run_id}`."
    ref = _next_viewer_request_ref(repo_root, title)
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True, exist_ok=True)
    rel_path = f"logics/request/{ref}.md"
    path = repo_root / rel_path

    def _item_message(item: Any, fallback: str) -> str:
        if isinstance(item, dict):
            title_value = item.get("title") or item.get("message") or item.get("summary") or item.get("path") or fallback
            details = []
            if item.get("purpose"):
                details.append(f"purpose: {item['purpose']}")
            if item.get("command"):
                details.append(f"command: `{item['command']}`")
            if item.get("risk"):
                details.append(f"risk: {item['risk']}")
            return f"{title_value}" + (f" ({'; '.join(details)})" if details else "")
        return str(item or fallback)

    finding_lines = []
    for index, finding in enumerate(findings, start=1):
        if not isinstance(finding, dict):
            finding_lines.append(f"- F{index}: {finding}")
            continue
        location = finding.get("path") or finding.get("file") or "unknown path"
        if finding.get("line"):
            location = f"{location}:{finding['line']}"
        severity = finding.get("severity") or "unknown"
        message = finding.get("message") or finding.get("title") or "Review finding"
        finding_lines.append(f"- F{index} [{severity}] `{location}`: {message}")
    if not finding_lines:
        finding_lines.append("- No structured findings were reported. Review the CDX artifacts linked below.")
    follow_up_lines = []
    for label, values in (
        ("Recommendation", recommendations),
        ("Request file", request_files),
        ("Actionable fix", actionable_fixes),
        ("Release plan", release_plan),
    ):
        for index, value in enumerate(values, start=1):
            follow_up_lines.append(f"- {label} {index}: {_item_message(value, label)}")
    if not follow_up_lines:
        follow_up_lines.append("- Review CDX output and split any actionable follow-up into tasks before implementation.")
    summary = task_report.get("summary") or mission_output.get("summary") or "No structured summary provided."
    text = "\n".join([
        f"## {ref} - {title}",
        "> Status: Draft",
        "> Understanding: 70%",
        "> Confidence: 70%",
        "> Complexity: Medium",
        f"> Theme: {theme}",
        "",
        "# Needs",
        f"- {need}",
        f"- Summary: {summary}",
        "",
        "# Findings",
        *finding_lines,
        "",
        "# Follow-up",
        *follow_up_lines,
        "",
        "# Traceability",
        f"- CDX run id: `{run_id}`",
        f"- Transcript: `{(report.get('artifacts') or {}).get('transcript_path') or ''}`",
        f"- Stdout: `{(report.get('artifacts') or {}).get('stdout_path') or ''}`",
        "",
        "# Acceptance Criteria",
        "- AC1: Each actionable finding is reviewed and either fixed, documented as not applicable, or split into follow-up work.",
        "- AC2: Validation evidence is added before closing this request.",
        "",
    ])
    path.write_text(text, encoding="utf-8")
    return {"id": ref, "path": rel_path, "title": title}


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")


VIEWER_MUTATING_ROUTES = frozenset(
    {
        "/api/edit",
        "/api/open-file",
        "/api/open-repo-folder",
        "/api/bootstrap-logics",
        "/api/switch-project",
        "/api/cdx-report-request",
        "/api/cdx-mission-run",
        "/api/cdx-mission-apply-plan",
        "/api/workshop-command-start",
        "/api/workshop-command-stop",
        "/api/workshop-terminal-start",
        "/api/workshop-terminal-stop",
        "/api/workshop-terminal-input",
        "/api/workshop-terminal-resize",
    }
)


_WORKSHOP_SESSION_BUFFER_MAX = 4000
_WORKSHOP_SESSION_TTL_SECONDS = 600


class WorkshopCommandSession:
    """Sandboxed subprocess for a Workshop command run.

    Captures merged stdout+stderr into a ring buffer that SSE consumers can
    tail incrementally via a monotonically increasing sequence number. Stop
    delivers SIGTERM (Unix) or CTRL_BREAK_EVENT (Windows) to the process
    group and falls back to SIGKILL if the process refuses to exit.
    """

    def __init__(self, session_id: str, command_id: str, runner: list[str], cwd: Path):
        import collections
        import threading
        self.session_id = session_id
        self.command_id = command_id
        self.runner = list(runner)
        self.cwd = cwd
        self.started_at = ""
        self.finished_at = ""
        self.exit_code: int | None = None
        self.state = "starting"
        self.error: str = ""
        self._buffer: collections.deque[tuple[int, str]] = collections.deque(maxlen=_WORKSHOP_SESSION_BUFFER_MAX)
        self._seq = 0
        self._lock = threading.Lock()
        self._proc: subprocess.Popen[bytes] | None = None
        self._reader: threading.Thread | None = None
        self._waiter: threading.Thread | None = None
        self._created_at = self._now()
        self._last_activity = self._created_at

    @staticmethod
    def _now() -> float:
        import time
        return time.monotonic()

    @staticmethod
    def _iso_now() -> str:
        return datetime.utcnow().isoformat(timespec="seconds") + "Z"

    def append_line(self, channel: str, text: str) -> None:
        with self._lock:
            self._seq += 1
            self._buffer.append((self._seq, f"{channel}\t{text}"))
            self._last_activity = self._now()

    def tail(self, since_seq: int) -> tuple[int, list[tuple[int, str]]]:
        with self._lock:
            snapshot = [(seq, line) for (seq, line) in self._buffer if seq > since_seq]
            return self._seq, snapshot

    def status_payload(self) -> dict[str, Any]:
        with self._lock:
            return {
                "id": self.session_id,
                "commandId": self.command_id,
                "runner": list(self.runner),
                "state": self.state,
                "exitCode": self.exit_code,
                "startedAt": self.started_at,
                "finishedAt": self.finished_at,
                "lastSeq": self._seq,
                "error": self.error,
            }

    def is_expired(self, ttl_seconds: float = _WORKSHOP_SESSION_TTL_SECONDS) -> bool:
        if self.state in {"running", "starting"}:
            return False
        return (self._now() - self._last_activity) > ttl_seconds

    def start(self) -> None:
        import threading
        creation_flags = 0
        popen_kwargs: dict[str, Any] = {
            "cwd": str(self.cwd),
            "stdout": subprocess.PIPE,
            "stderr": subprocess.STDOUT,
            "stdin": subprocess.DEVNULL,
        }
        if sys.platform == "win32":
            creation_flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            popen_kwargs["creationflags"] = creation_flags
        else:
            popen_kwargs["start_new_session"] = True
        try:
            self._proc = subprocess.Popen(self.runner, **popen_kwargs)
        except (OSError, ValueError) as exc:
            self.state = "error"
            self.error = f"Unable to start command: {exc}"
            self.finished_at = self._iso_now()
            return
        self.started_at = self._iso_now()
        self.state = "running"
        self._reader = threading.Thread(target=self._read_loop, name=f"workshop-reader-{self.session_id}", daemon=True)
        self._reader.start()
        self._waiter = threading.Thread(target=self._wait_loop, name=f"workshop-waiter-{self.session_id}", daemon=True)
        self._waiter.start()

    def _read_loop(self) -> None:
        proc = self._proc
        if proc is None or proc.stdout is None:
            return
        try:
            for raw in iter(proc.stdout.readline, b""):
                try:
                    text = raw.decode("utf-8", errors="replace").rstrip("\r\n")
                except Exception:
                    continue
                self.append_line("stdout", text)
        except (OSError, ValueError):
            pass

    def _wait_loop(self) -> None:
        proc = self._proc
        if proc is None:
            return
        try:
            code = proc.wait()
        except Exception as exc:
            self.error = f"Wait failed: {exc}"
            code = -1
        with self._lock:
            self.exit_code = code
            self.finished_at = self._iso_now()
            self.state = "finished" if code == 0 else ("stopped" if code in (-15, 143, -9, 137) else "failed")
            self._last_activity = self._now()

    def stop(self, *, timeout: float = 5.0) -> None:
        proc = self._proc
        if proc is None or proc.poll() is not None:
            return
        try:
            if sys.platform == "win32":
                sig = getattr(__import__("signal"), "CTRL_BREAK_EVENT", None)
                if sig is not None:
                    proc.send_signal(sig)
                else:
                    proc.terminate()
            else:
                import os as _os
                import signal as _signal
                try:
                    _os.killpg(proc.pid, _signal.SIGTERM)
                except (OSError, ProcessLookupError):
                    proc.terminate()
        except Exception:
            proc.terminate()
        try:
            proc.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            try:
                if sys.platform == "win32":
                    proc.kill()
                else:
                    import os as _os
                    import signal as _signal
                    _os.killpg(proc.pid, _signal.SIGKILL)
            except Exception:
                proc.kill()


class WorkshopSessionRegistry:
    def __init__(self) -> None:
        import threading
        self._sessions: dict[str, WorkshopCommandSession] = {}
        self._lock = threading.Lock()
        self._counter = 0

    def create(self, command_entry: dict[str, Any], repo_root: Path) -> WorkshopCommandSession:
        runner = command_entry.get("runner")
        if not isinstance(runner, list) or not runner or not all(isinstance(part, str) and part for part in runner):
            raise ValueError("Command entry is missing a valid runner.")
        if not repo_root.is_dir():
            raise ValueError("Workspace root is unavailable.")
        with self._lock:
            self._counter += 1
            session_id = f"ws-{self._counter:06d}"
        session = WorkshopCommandSession(
            session_id=session_id,
            command_id=str(command_entry.get("id") or ""),
            runner=runner,
            cwd=repo_root,
        )
        with self._lock:
            self._prune_locked()
            self._sessions[session_id] = session
        session.start()
        return session

    def get(self, session_id: str) -> WorkshopCommandSession | None:
        with self._lock:
            return self._sessions.get(session_id)

    def list(self) -> list[dict[str, Any]]:
        with self._lock:
            self._prune_locked()
            return [session.status_payload() for session in self._sessions.values()]

    def _prune_locked(self) -> None:
        for sid in list(self._sessions.keys()):
            if self._sessions[sid].is_expired():
                del self._sessions[sid]

    def shutdown(self) -> None:
        with self._lock:
            sessions = list(self._sessions.values())
        for session in sessions:
            session.stop(timeout=1.0)


_WORKSHOP_TERMINAL_BUFFER_MAX = 8000
_WORKSHOP_TERMINAL_TTL_SECONDS = 1800
_WORKSHOP_TERMINAL_IDLE_KILL_SECONDS = 60.0


def workshop_terminals_available() -> bool:
    """True when the host can spawn PTY sessions through the stdlib backend."""
    if sys.platform == "win32":
        return False
    try:
        import pty  # noqa: F401
        import termios  # noqa: F401
    except ImportError:
        return False
    return True


def _default_workshop_shell() -> list[str]:
    candidate = os.environ.get("SHELL") or ""
    if candidate and os.access(candidate, os.X_OK):
        return [candidate, "-i"]
    for fallback in ("/bin/zsh", "/bin/bash", "/bin/sh"):
        if os.access(fallback, os.X_OK):
            return [fallback, "-i"]
    return ["/bin/sh"]


class WorkshopTerminalSession:
    """Interactive PTY-backed terminal session using stdlib `pty`.

    Reads from the master fd in a daemon thread, buffers output bytes
    (decoded utf-8 with replace) into a ring; writes from the client land
    on the master fd directly. Resize uses TIOCSWINSZ ioctl. Stop sends
    SIGTERM to the session leader and falls back to SIGKILL after a grace
    window. Unix-only: Windows callers must check
    workshop_terminals_available() before instantiating.
    """

    def __init__(self, session_id: str, command: list[str], cwd: Path, *, label: str = ""):
        import collections
        import threading
        self.session_id = session_id
        self.command = list(command)
        self.cwd = cwd
        self.label = label or (command[0] if command else "shell")
        self.started_at = ""
        self.finished_at = ""
        self.exit_code: int | None = None
        self.state = "starting"
        self.error: str = ""
        self._buffer: collections.deque[tuple[int, str]] = collections.deque(maxlen=_WORKSHOP_TERMINAL_BUFFER_MAX)
        self._seq = 0
        self._lock = threading.Lock()
        self._master_fd: int | None = None
        self._pid: int | None = None
        self._reader: threading.Thread | None = None
        self._reaper: threading.Thread | None = None
        self._created_at = self._now()
        self._last_activity = self._created_at
        self._listeners = 0
        self._idle_timer: threading.Timer | None = None
        self._idle_kill_seconds = _WORKSHOP_TERMINAL_IDLE_KILL_SECONDS

    @staticmethod
    def _now() -> float:
        import time
        return time.monotonic()

    @staticmethod
    def _iso_now() -> str:
        return datetime.utcnow().isoformat(timespec="seconds") + "Z"

    def _append(self, text: str) -> None:
        with self._lock:
            self._seq += 1
            self._buffer.append((self._seq, text))
            self._last_activity = self._now()

    def tail(self, since_seq: int) -> tuple[int, list[tuple[int, str]]]:
        with self._lock:
            snapshot = [(seq, chunk) for (seq, chunk) in self._buffer if seq > since_seq]
            return self._seq, snapshot

    def status_payload(self) -> dict[str, Any]:
        with self._lock:
            return {
                "id": self.session_id,
                "label": self.label,
                "command": list(self.command),
                "state": self.state,
                "exitCode": self.exit_code,
                "startedAt": self.started_at,
                "finishedAt": self.finished_at,
                "lastSeq": self._seq,
                "error": self.error,
            }

    def is_expired(self, ttl_seconds: float = _WORKSHOP_TERMINAL_TTL_SECONDS) -> bool:
        if self.state in {"running", "starting"}:
            return False
        return (self._now() - self._last_activity) > ttl_seconds

    def attach_listener(self) -> None:
        """Register a live SSE consumer for this session."""
        with self._lock:
            self._listeners += 1
            if self._idle_timer is not None:
                self._idle_timer.cancel()
                self._idle_timer = None

    def detach_listener(self) -> None:
        """Release an SSE consumer; arm the idle-kill timer if none remain."""
        import threading
        arm = False
        with self._lock:
            self._listeners = max(0, self._listeners - 1)
            if self._listeners == 0 and self.state in {"running", "starting"}:
                if self._idle_timer is not None:
                    self._idle_timer.cancel()
                self._idle_timer = threading.Timer(self._idle_kill_seconds, self._on_idle_timeout)
                self._idle_timer.daemon = True
                arm = True
        if arm and self._idle_timer is not None:
            self._idle_timer.start()

    def _on_idle_timeout(self) -> None:
        with self._lock:
            still_idle = self._listeners == 0 and self.state in {"running", "starting"}
            self._idle_timer = None
        if not still_idle:
            return
        # Best-effort: SIGTERM the session group, falling back to SIGKILL.
        self.stop(timeout=3.0)

    def start(self) -> None:
        import threading
        if not workshop_terminals_available():
            self.state = "error"
            self.error = "PTY backend is not available on this host."
            self.finished_at = self._iso_now()
            return
        import pty
        try:
            pid, master_fd = pty.fork()
        except (OSError, RuntimeError) as exc:
            self.state = "error"
            self.error = f"Unable to fork PTY: {exc}"
            self.finished_at = self._iso_now()
            return
        if pid == 0:
            try:
                os.chdir(str(self.cwd))
            except OSError:
                pass
            env = os.environ.copy()
            env.setdefault("TERM", "xterm-256color")
            env.setdefault("COLORTERM", "truecolor")
            try:
                os.execvpe(self.command[0], self.command, env)
            except Exception as exc:  # noqa: BLE001
                sys.stderr.write(f"Unable to exec {self.command[0]}: {exc}\n")
                os._exit(127)
        self._pid = pid
        self._master_fd = master_fd
        self.started_at = self._iso_now()
        self.state = "running"
        self._reader = threading.Thread(target=self._read_loop, name=f"workshop-pty-reader-{self.session_id}", daemon=True)
        self._reader.start()
        self._reaper = threading.Thread(target=self._reap_loop, name=f"workshop-pty-reaper-{self.session_id}", daemon=True)
        self._reaper.start()

    def write(self, data: str) -> None:
        if not data or self._master_fd is None:
            return
        try:
            os.write(self._master_fd, data.encode("utf-8"))
        except OSError as exc:
            self.error = f"Write failed: {exc}"

    def resize(self, rows: int, cols: int) -> None:
        if self._master_fd is None or rows <= 0 or cols <= 0:
            return
        try:
            import fcntl
            import struct
            import termios
            fcntl.ioctl(self._master_fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
        except (OSError, ImportError):
            return

    def _read_loop(self) -> None:
        fd = self._master_fd
        if fd is None:
            return
        try:
            while True:
                try:
                    chunk = os.read(fd, 4096)
                except OSError:
                    break
                if not chunk:
                    break
                try:
                    text = chunk.decode("utf-8", errors="replace")
                except Exception:  # noqa: BLE001
                    continue
                self._append(text)
        finally:
            try:
                os.close(fd)
            except OSError:
                pass

    def _reap_loop(self) -> None:
        pid = self._pid
        if pid is None:
            return
        try:
            _, status = os.waitpid(pid, 0)
        except OSError as exc:
            self.error = f"waitpid failed: {exc}"
            status = -1
        if isinstance(status, int):
            if os.WIFEXITED(status):
                code = os.WEXITSTATUS(status)
            elif os.WIFSIGNALED(status):
                code = -os.WTERMSIG(status)
            else:
                code = -1
        else:
            code = -1
        with self._lock:
            self.exit_code = code
            self.finished_at = self._iso_now()
            self.state = "finished" if code == 0 else ("stopped" if code in (-15, -9) else "failed")
            self._last_activity = self._now()
            if self._idle_timer is not None:
                self._idle_timer.cancel()
                self._idle_timer = None

    def stop(self, *, timeout: float = 3.0) -> None:
        pid = self._pid
        if pid is None:
            return
        import signal as _signal
        import time as _time
        try:
            os.killpg(os.getpgid(pid), _signal.SIGTERM)
        except (OSError, ProcessLookupError):
            try:
                os.kill(pid, _signal.SIGTERM)
            except OSError:
                return
        deadline = _time.monotonic() + timeout
        while _time.monotonic() < deadline:
            with self._lock:
                if self.state in {"finished", "failed", "stopped"}:
                    return
            _time.sleep(0.05)
        try:
            os.killpg(os.getpgid(pid), _signal.SIGKILL)
        except (OSError, ProcessLookupError):
            try:
                os.kill(pid, _signal.SIGKILL)
            except OSError:
                return


class WorkshopTerminalRegistry:
    def __init__(self) -> None:
        import threading
        self._sessions: dict[str, WorkshopTerminalSession] = {}
        self._lock = threading.Lock()
        self._counter = 0

    def create(self, command: list[str], cwd: Path, *, label: str = "") -> WorkshopTerminalSession:
        if not workshop_terminals_available():
            raise ValueError("PTY backend is not available on this host.")
        if not command or not isinstance(command, list):
            raise ValueError("Terminal command must be a non-empty list.")
        if not cwd.is_dir():
            raise ValueError("Workspace root is unavailable.")
        with self._lock:
            self._counter += 1
            session_id = f"wt-{self._counter:06d}"
        session = WorkshopTerminalSession(session_id=session_id, command=command, cwd=cwd, label=label)
        with self._lock:
            self._prune_locked()
            self._sessions[session_id] = session
        session.start()
        return session

    def get(self, session_id: str) -> WorkshopTerminalSession | None:
        with self._lock:
            return self._sessions.get(session_id)

    def list(self) -> list[dict[str, Any]]:
        with self._lock:
            self._prune_locked()
            return [session.status_payload() for session in self._sessions.values()]

    def _prune_locked(self) -> None:
        for sid in list(self._sessions.keys()):
            if self._sessions[sid].is_expired():
                del self._sessions[sid]

    def shutdown(self) -> None:
        with self._lock:
            sessions = list(self._sessions.values())
        for session in sessions:
            session.stop(timeout=1.0)


def workshop_terminal_default_command() -> list[str]:
    return _default_workshop_shell()


_PAIRING_PIN_TTL_SECONDS = 120
_PAIRING_MAX_ATTEMPTS = 5


def _hash_device_token(token: str) -> str:
    return "sha256:" + hashlib.sha256(token.encode("utf-8")).hexdigest()


def _iso_now() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


@dataclass
class _PairedDevice:
    id: str
    label: str
    token_hash: str
    created_at: str
    last_seen_at: str

    def to_payload(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "createdAt": self.created_at,
            "lastSeenAt": self.last_seen_at,
        }


class LanDeviceRegistry:
    """JSON-backed store of paired device tokens.

    Tokens are persisted only as SHA-256 hashes; the cleartext is shown to
    the device exactly once at pair-completion time. Every match uses
    hmac.compare_digest on the hash to keep comparisons constant-time.
    """

    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.RLock()
        self._devices: dict[str, _PairedDevice] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return
        for entry in raw.get("devices", []) or []:
            try:
                device = _PairedDevice(
                    id=str(entry["id"]),
                    label=str(entry.get("label") or ""),
                    token_hash=str(entry["tokenHash"]),
                    created_at=str(entry.get("createdAt") or _iso_now()),
                    last_seen_at=str(entry.get("lastSeenAt") or ""),
                )
            except KeyError:
                continue
            self._devices[device.id] = device

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"devices": [
            {
                "id": d.id,
                "label": d.label,
                "tokenHash": d.token_hash,
                "createdAt": d.created_at,
                "lastSeenAt": d.last_seen_at,
            }
            for d in self._devices.values()
        ]}
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        try:
            os.chmod(tmp, 0o600)
        except OSError:
            pass
        tmp.replace(self.path)

    def register(self, label: str, token: str) -> _PairedDevice:
        device_id = secrets.token_urlsafe(8)
        now = _iso_now()
        device = _PairedDevice(
            id=device_id,
            label=label or "device",
            token_hash=_hash_device_token(token),
            created_at=now,
            last_seen_at=now,
        )
        with self._lock:
            self._devices[device.id] = device
            self._save()
        return device

    def revoke(self, device_id: str) -> bool:
        with self._lock:
            removed = self._devices.pop(device_id, None) is not None
            if removed:
                self._save()
        return removed

    def list_payload(self) -> list[dict[str, Any]]:
        with self._lock:
            return [d.to_payload() for d in self._devices.values()]

    def find_matching(self, token: str) -> _PairedDevice | None:
        if not token:
            return None
        candidate_hash = _hash_device_token(token)
        match: _PairedDevice | None = None
        with self._lock:
            for device in self._devices.values():
                if hmac.compare_digest(candidate_hash, device.token_hash):
                    match = device
        if match is None:
            return None
        with self._lock:
            stored = self._devices.get(match.id)
            if stored is not None:
                stored.last_seen_at = _iso_now()
                try:
                    self._save()
                except OSError:
                    pass
        return match


@dataclass
class _PendingPairing:
    pairing_id: str
    pin: str
    label: str
    requester_ip: str
    created_at: float
    attempts: int = 0


class LanPairingBroker:
    """In-memory broker for active PIN pairings.

    A pairing is created when a device requests write access; the host CLI
    prints the PIN. The device must echo the PIN back within the TTL. PINs
    are single-use and rate-limited per pairing.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._pending: dict[str, _PendingPairing] = {}

    @staticmethod
    def _generate_pin() -> str:
        return f"{secrets.randbelow(1_000_000):06d}"

    def start(self, *, label: str, requester_ip: str) -> _PendingPairing:
        pairing_id = secrets.token_urlsafe(12)
        entry = _PendingPairing(
            pairing_id=pairing_id,
            pin=self._generate_pin(),
            label=label or "device",
            requester_ip=requester_ip,
            created_at=time.monotonic(),
        )
        with self._lock:
            self._purge_expired_locked()
            self._pending[pairing_id] = entry
        return entry

    def _purge_expired_locked(self) -> None:
        now = time.monotonic()
        expired = [pid for pid, entry in self._pending.items() if now - entry.created_at > _PAIRING_PIN_TTL_SECONDS]
        for pid in expired:
            self._pending.pop(pid, None)

    def try_complete(self, *, pairing_id: str, pin: str) -> tuple[str, _PendingPairing] | None:
        """Return ('ok', entry) on match. None means hard refusal (expired,
        unknown, or too many attempts). Wrong PIN increments attempts but
        leaves the entry alive until the cap or TTL is hit."""
        with self._lock:
            self._purge_expired_locked()
            entry = self._pending.get(pairing_id)
            if entry is None:
                return None
            entry.attempts += 1
            if entry.attempts > _PAIRING_MAX_ATTEMPTS:
                self._pending.pop(pairing_id, None)
                return None
            if hmac.compare_digest(entry.pin, pin or ""):
                self._pending.pop(pairing_id, None)
                return ("ok", entry)
            return ("wrong", entry)


class LogicsViewerServer(ThreadingHTTPServer):
    def __init__(
        self,
        server_address: tuple[str, int],
        repo_root: Path,
        *,
        auto_refresh_interval_seconds: int = 15,
        auto_refresh_interval_forced: bool = False,
        lan_mode: bool = False,
        lan_rw_mode: bool = False,
        tls_context: ssl.SSLContext | None = None,
    ):
        self.launch_repo_root = repo_root.resolve()
        self.project_roots = discover_viewer_project_roots(self.launch_repo_root)
        self.project_root_by_id = {_viewer_project_id(root): root.resolve() for root in self.project_roots}
        self.active_project_id = _viewer_project_id(self.launch_repo_root)
        self.repo_root = self.launch_repo_root
        self.auto_refresh_interval_seconds = auto_refresh_interval_seconds
        self.auto_refresh_interval_forced = auto_refresh_interval_forced
        self.lan_mode = bool(lan_mode)
        self.lan_rw_mode = bool(lan_rw_mode) and self.lan_mode
        self.lan_token = secrets.token_urlsafe(32) if self.lan_mode else ""
        self.tls_enabled = tls_context is not None
        self.device_registry = LanDeviceRegistry(_viewer_state_dir() / "devices.json") if self.lan_rw_mode else None
        self.pairing_broker = LanPairingBroker() if self.lan_rw_mode else None
        self.workshop_sessions = WorkshopSessionRegistry()
        self.workshop_terminals = WorkshopTerminalRegistry()
        super().__init__(server_address, LogicsViewerRequestHandler)
        if tls_context is not None:
            self.socket = tls_context.wrap_socket(self.socket, server_side=True)

    @property
    def url_scheme(self) -> str:
        return "https" if self.tls_enabled else "http"

    def server_close(self) -> None:
        try:
            self.workshop_sessions.shutdown()
        finally:
            try:
                self.workshop_terminals.shutdown()
            finally:
                super().server_close()

    def project_registry_payload(self) -> list[dict[str, Any]]:
        return viewer_project_registry(self.repo_root, project_roots=self.project_roots)

    def viewer_payload(self, *, selected_id: str | None = None) -> dict[str, Any]:
        payload = viewer_data_payload(
            self.repo_root,
            selected_id=selected_id,
            auto_refresh_interval_seconds=self.auto_refresh_interval_seconds,
            auto_refresh_interval_forced=self.auto_refresh_interval_forced,
            projects=self.project_registry_payload(),
        )
        payload["lanMode"] = bool(self.lan_mode)
        payload["lanRwMode"] = bool(self.lan_rw_mode)
        if self.lan_mode and self.lan_token:
            host, port = self.server_address[:2]
            lan_url = (
                _network_viewer_url(str(host), int(port), scheme=self.url_scheme)
                or build_viewer_url(str(host), int(port), scheme=self.url_scheme)
            )
            payload["lanShareUrl"] = _append_lan_token(lan_url, self.lan_token)
        else:
            payload["lanShareUrl"] = ""
        return payload

    def switch_project(self, project_id: str) -> dict[str, Any]:
        target = self.project_root_by_id.get(project_id)
        if target is None:
            raise ValueError("Unknown project id.")
        if not target.is_dir():
            raise FileNotFoundError(str(target))
        self.active_project_id = project_id
        self.repo_root = target
        return self.viewer_payload()


class LogicsViewerRequestHandler(BaseHTTPRequestHandler):
    server: LogicsViewerServer

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send_bytes(self, content: bytes, *, status: int = 200, content_type: str = "application/octet-stream") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _send_json(self, payload: Any, *, status: int = 200) -> None:
        self._send_bytes(_json_bytes(payload), status=status, content_type="application/json; charset=utf-8")

    def _send_error_json(self, status: HTTPStatus, message: str) -> None:
        self._send_json({"ok": False, "error": message}, status=status.value)

    def _read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(raw or "{}")
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    def _handle_pair_start(self) -> None:
        broker = self.server.pairing_broker
        if broker is None:
            self._send_error_json(HTTPStatus.FORBIDDEN, "Device pairing is disabled. Start the viewer with --lan-rw.")
            return
        body = self._read_json_body()
        label = str(body.get("label") or "").strip()[:64]
        requester_ip = self.client_address[0] if self.client_address else ""
        entry = broker.start(label=label or "device", requester_ip=requester_ip)
        # Emit the PIN on the host's stdout so the operator can read it
        # without having to keep the viewer UI in foreground.
        sys.stdout.write(
            f"[lan-pair] '{entry.label}' wants write access from {requester_ip or 'unknown'}.\n"
            f"[lan-pair] PIN: {entry.pin}  (valid {_PAIRING_PIN_TTL_SECONDS}s)\n"
        )
        sys.stdout.flush()
        self._send_json({
            "ok": True,
            "payload": {
                "pairingId": entry.pairing_id,
                "ttlSeconds": _PAIRING_PIN_TTL_SECONDS,
                "label": entry.label,
            },
        })

    def _handle_pair_complete(self) -> None:
        broker = self.server.pairing_broker
        registry = self.server.device_registry
        if broker is None or registry is None:
            self._send_error_json(HTTPStatus.FORBIDDEN, "Device pairing is disabled. Start the viewer with --lan-rw.")
            return
        body = self._read_json_body()
        pairing_id = str(body.get("pairingId") or "")
        pin = str(body.get("pin") or "")
        label_override = str(body.get("label") or "").strip()[:64]
        outcome = broker.try_complete(pairing_id=pairing_id, pin=pin)
        if outcome is None:
            self._send_error_json(HTTPStatus.UNAUTHORIZED, "Pairing expired, unknown, or too many attempts.")
            return
        status, entry = outcome
        if status != "ok":
            self._send_error_json(HTTPStatus.UNAUTHORIZED, "Wrong PIN.")
            return
        token = secrets.token_urlsafe(32)
        device = registry.register(label_override or entry.label, token)
        sys.stdout.write(f"[lan-pair] Approved '{device.label}' (id={device.id}).\n")
        sys.stdout.flush()
        self._send_json({
            "ok": True,
            "payload": {
                "deviceId": device.id,
                "deviceToken": token,
                "label": device.label,
            },
        })

    def _handle_device_revoke(self, parsed: Any) -> None:
        registry = self.server.device_registry
        if registry is None:
            self._send_error_json(HTTPStatus.FORBIDDEN, "Device pairing is disabled.")
            return
        body = self._read_json_body()
        device_id = str(body.get("deviceId") or "")
        if not device_id:
            self._send_error_json(HTTPStatus.BAD_REQUEST, "deviceId is required.")
            return
        removed = registry.revoke(device_id)
        if not removed:
            self._send_error_json(HTTPStatus.NOT_FOUND, "Device not found.")
            return
        sys.stdout.write(f"[lan-pair] Revoked device id={device_id}.\n")
        sys.stdout.flush()
        self._send_json({"ok": True, "payload": {"deviceId": device_id}})

    def _serve_file(self, path: Path, *, root: Path) -> None:
        root_name = os.path.realpath(root)
        absolute_name = os.path.realpath(path)
        try:
            common = os.path.commonpath([root_name, absolute_name])
        except ValueError:
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        if common != root_name:
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        absolute = Path(absolute_name)
        if not absolute.is_file():  # lgtm [py/path-injection]
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        content_type = STATIC_CONTENT_TYPES.get(absolute.suffix.lower(), "application/octet-stream")
        self._send_bytes(absolute.read_bytes(), content_type=content_type)  # lgtm [py/path-injection]

    def _stream_workshop_terminal(self, session: "WorkshopTerminalSession", parsed: Any) -> None:
        import time as _time
        try:
            since = int(parse_qs(parsed.query).get("since", ["0"])[0])
        except (TypeError, ValueError):
            since = 0
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError):
            return
        session.attach_listener()
        try:
            last_seq = since
            idle_ticks = 0
            while True:
                latest_seq, snapshot = session.tail(last_seq)
                if snapshot:
                    idle_ticks = 0
                    for seq, chunk in snapshot:
                        last_seq = seq
                        try:
                            payload = json.dumps({"seq": seq, "data": chunk})
                            self.wfile.write(f"event: data\ndata: {payload}\n\n".encode("utf-8"))
                            self.wfile.flush()
                        except (BrokenPipeError, ConnectionResetError):
                            return
                state = session.state
                if state in {"finished", "failed", "stopped", "error"} and last_seq >= latest_seq:
                    try:
                        payload = json.dumps(session.status_payload())
                        self.wfile.write(f"event: end\ndata: {payload}\n\n".encode("utf-8"))
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    return
                idle_ticks += 1
                if idle_ticks >= 30:
                    try:
                        self.wfile.write(b": keep-alive\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    idle_ticks = 0
                _time.sleep(0.1)
        except (BrokenPipeError, ConnectionResetError):
            return
        finally:
            session.detach_listener()

    def _stream_workshop_session(self, session: "WorkshopCommandSession", parsed: Any) -> None:
        import time as _time
        try:
            since = int(parse_qs(parsed.query).get("since", ["0"])[0])
        except (TypeError, ValueError):
            since = 0
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError):
            return
        last_seq = since
        idle_ticks = 0
        try:
            while True:
                latest_seq, snapshot = session.tail(last_seq)
                if snapshot:
                    idle_ticks = 0
                    for seq, line in snapshot:
                        last_seq = seq
                        try:
                            channel, _, text = line.partition("\t")
                            payload = json.dumps({"seq": seq, "channel": channel, "line": text})
                            self.wfile.write(f"event: line\ndata: {payload}\n\n".encode("utf-8"))
                            self.wfile.flush()
                        except (BrokenPipeError, ConnectionResetError):
                            return
                state = session.state
                if state in {"finished", "failed", "stopped", "error"} and last_seq >= latest_seq:
                    try:
                        payload = json.dumps(session.status_payload())
                        self.wfile.write(f"event: end\ndata: {payload}\n\n".encode("utf-8"))
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    return
                idle_ticks += 1
                if idle_ticks >= 30:
                    try:
                        self.wfile.write(b": keep-alive\n\n")
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    idle_ticks = 0
                _time.sleep(0.2)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _client_is_loopback(self) -> bool:
        try:
            host = self.client_address[0]
        except (IndexError, AttributeError):
            return False
        if not host:
            return False
        if host in {"127.0.0.1", "::1"}:
            return True
        if host.startswith("127."):
            return True
        if host.startswith("::ffff:127."):
            return True
        return False

    def _is_public_get_route(self, route: str) -> bool:
        """Static UI assets that must load before the JS can attach the bearer.

        Browsers do not auto-attach Authorization headers to <script src>,
        <link href>, or @font-face fetches, and we cannot put ?t= on every
        asset URL the page references. We let these routes through
        unauthenticated; they expose no repository data — every actual
        payload lives under /api/* which stays gated.
        """
        if route in {"/", "/browser-host.js", "/viewer.css", "/vendor/mermaid.min.js"}:
            return True
        if route.startswith("/media/"):
            return True
        return False

    def _allowed_origins(self) -> set[str]:
        """Origins the viewer is willing to accept mutating requests from.

        Built from the actual bound host/port plus the detected LAN IP and
        the canonical loopback names so the same set covers every URL the
        launch banner can hand out.
        """
        scheme = self.server.url_scheme
        port = int(self.server.server_address[1])
        hosts = {"127.0.0.1", "localhost", "::1", "[::1]"}
        bind_host = str(self.server.server_address[0])
        if bind_host and bind_host not in {"0.0.0.0", "::", ""}:
            hosts.add(bind_host)
        lan_ip = _detect_lan_ip()
        if lan_ip:
            hosts.add(lan_ip)
        return {f"{scheme}://{host}:{port}" for host in hosts}

    def _origin_check_passes(self) -> bool:
        """Reject cross-origin mutations.

        Loopback clients are trusted (the desktop UI itself, scripts, dev
        tools). For every other client we require Origin (or Referer
        fallback for redirects) to match one of the URLs the server hands
        out. This blocks CSRF: a malicious page on the user's phone cannot
        POST to the viewer's mutating endpoints because its Origin will
        not match.
        """
        if self._client_is_loopback():
            return True
        allowed = self._allowed_origins()
        origin = self.headers.get("Origin", "").strip()
        if origin:
            return origin in allowed
        referer = self.headers.get("Referer", "").strip()
        if referer:
            parsed_referer = urlparse(referer)
            referer_origin = f"{parsed_referer.scheme}://{parsed_referer.netloc}"
            return referer_origin in allowed
        # No Origin and no Referer from a non-loopback client: refuse. A
        # legitimate browser always sends one or the other on a POST.
        return False

    def _send_cross_origin_forbidden(self) -> None:
        body = _json_bytes({"ok": False, "error": "Cross-origin mutation refused."})
        try:
            self.send_response(HTTPStatus.FORBIDDEN)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _bearer_token(self, parsed: Any) -> str:
        header = self.headers.get("Authorization", "")
        if header.lower().startswith("bearer "):
            return header.split(" ", 1)[1].strip()
        return (parse_qs(parsed.query).get("t") or [""])[0]

    def _lan_auth_passes(self, parsed: Any, *, method: str = "GET") -> bool:
        token = self.server.lan_token
        if not token:
            return True
        if self._client_is_loopback():
            return True
        if method == "GET" and self._is_public_get_route(parsed.path):
            return True
        candidate = self._bearer_token(parsed)
        if candidate and hmac.compare_digest(candidate, token):
            return True
        if self.server.device_registry is not None and self.server.device_registry.find_matching(candidate) is not None:
            return True
        return False

    def _paired_device_for_request(self, parsed: Any) -> _PairedDevice | None:
        registry = self.server.device_registry
        if registry is None:
            return None
        candidate = self._bearer_token(parsed)
        if not candidate:
            return None
        return registry.find_matching(candidate)

    def _send_lan_unauthorized(self) -> None:
        body = _json_bytes({"ok": False, "error": "LAN viewer requires a bearer token. Open the share URL from the launch banner."})
        try:
            self.send_response(HTTPStatus.UNAUTHORIZED)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("WWW-Authenticate", 'Bearer realm="logics-viewer"')
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            return

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if not self._lan_auth_passes(parsed, method="GET"):
            self._send_lan_unauthorized()
            return
        route = parsed.path
        if route == "/api/lan/devices":
            registry = self.server.device_registry
            payload = registry.list_payload() if registry is not None else []
            self._send_json({"ok": True, "payload": payload})
            return
        if route == "/":
            self._serve_file(VIEWER_ROOT / "index.html", root=VIEWER_ROOT)
            return
        if route == "/browser-host.js":
            self._serve_file(VIEWER_ROOT / "browser-host.js", root=VIEWER_ROOT)
            return
        if route == "/viewer.css":
            self._serve_file(VIEWER_ROOT / "viewer.css", root=VIEWER_ROOT)
            return
        if route == "/vendor/mermaid.min.js":
            vendor_path = DIST_VENDOR_ROOT / "mermaid.min.js"
            vendor_root = DIST_VENDOR_ROOT
            if not vendor_path.is_file():
                vendor_path = NODE_MERMAID_ROOT / "mermaid.min.js"
                vendor_root = NODE_MERMAID_ROOT
            if not vendor_path.is_file():
                vendor_path = PACKAGE_VENDOR_ROOT / "mermaid.min.js"
                vendor_root = PACKAGE_VENDOR_ROOT
            self._serve_file(vendor_path, root=vendor_root)
            return
        if route.startswith("/media/"):
            media_path = (SHARED_MEDIA_ROOT / route.removeprefix("/media/")).resolve()
            if SHARED_MEDIA_ROOT.resolve() != media_path and SHARED_MEDIA_ROOT.resolve() not in media_path.parents:
                self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
                return
            self._serve_file(media_path, root=SHARED_MEDIA_ROOT)
            return
        if route == "/api/items":
            self._send_json(
                {
                    "ok": True,
                    "payload": self.server.viewer_payload(),
                }
            )
            return
        if route == "/api/projects":
            self._send_json({"ok": True, "payload": {"projects": self.server.project_registry_payload()}})
            return
        if route == "/api/doc":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "document": read_doc_payload(self.server.repo_root, rel_path)})
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if route == "/api/lint":
            self._send_json({"ok": True, "payload": lint_payload(self.server.repo_root)})
            return
        if route == "/api/audit":
            self._send_json({"ok": True, "payload": audit_payload(self.server.repo_root)})
            return
        if route == "/api/capabilities":
            self._send_json({"ok": True, "payload": viewer_project_capabilities(self.server.repo_root)})
            return
        if route == "/api/git-status":
            self._send_json({"ok": True, "payload": git_status_payload(self.server.repo_root)})
            return
        if route == "/api/ci-status":
            self._send_json({"ok": True, "payload": ci_status_payload(self.server.repo_root)})
            return
        if route == "/api/cdx-status":
            self._send_json({"ok": True, "payload": cdx_status_payload(self.server.repo_root)})
            return
        if route == "/api/cdx-runs":
            self._send_json({"ok": True, "payload": cdx_runs_payload(self.server.repo_root)})
            return
        if route == "/api/cdx-run-report":
            run_id = parse_qs(parsed.query).get("runId", [""])[0]
            self._send_json({"ok": True, "payload": cdx_run_report_payload(self.server.repo_root, run_id)})
            return
        if route == "/api/git-diff":
            params = parse_qs(parsed.query)
            rel_path = params.get("path", [""])[0]
            cached = params.get("cached", [""])[0].lower() in {"1", "true", "yes"}
            self._send_json({"ok": True, "payload": git_diff_payload(self.server.repo_root, rel_path, cached=cached)})
            return
        if route == "/api/git-file-preview":
            params = parse_qs(parsed.query)
            rel_path = params.get("path", [""])[0]
            self._send_json({"ok": True, "payload": git_file_preview_payload(self.server.repo_root, rel_path)})
            return
        if route == "/api/workspace-tree":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "payload": workspace_tree_payload(self.server.repo_root, rel_path)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if route == "/api/workspace-preview":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "payload": workspace_preview_payload(self.server.repo_root, rel_path)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if route == "/api/workshop-commands":
            try:
                self._send_json({"ok": True, "payload": workshop_commands_payload(self.server.repo_root)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if route == "/api/workshop-sessions":
            self._send_json({"ok": True, "payload": {"sessions": self.server.workshop_sessions.list()}})
            return
        if route == "/api/workshop-terminals":
            self._send_json({"ok": True, "payload": {"sessions": self.server.workshop_terminals.list(), "available": workshop_terminals_available()}})
            return
        if route.startswith("/api/workshop-terminal/"):
            tail = route[len("/api/workshop-terminal/"):]
            parts = tail.split("/", 1)
            session_id = parts[0]
            kind = parts[1] if len(parts) > 1 else "status"
            session = self.server.workshop_terminals.get(session_id)
            if session is None:
                self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                return
            if kind == "status":
                self._send_json({"ok": True, "payload": session.status_payload()})
                return
            if kind == "stream":
                self._stream_workshop_terminal(session, parsed)
                return
            self._send_error_json(HTTPStatus.NOT_FOUND, "Unknown terminal sub-resource.")
            return
        if route.startswith("/api/workshop-session/"):
            tail = route[len("/api/workshop-session/"):]
            parts = tail.split("/", 1)
            session_id = parts[0]
            kind = parts[1] if len(parts) > 1 else "status"
            session = self.server.workshop_sessions.get(session_id)
            if session is None:
                self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop session not found.")
                return
            if kind == "status":
                self._send_json({"ok": True, "payload": session.status_payload()})
                return
            if kind == "stream":
                self._stream_workshop_session(session, parsed)
                return
            self._send_error_json(HTTPStatus.NOT_FOUND, "Unknown session sub-resource.")
            return
        if route == "/api/workspace-file":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                payload = workspace_preview_payload(self.server.repo_root, rel_path)
                if payload.get("state") != "image":
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "Workspace file is not an image preview.")
                    return
                _normalized, absolute = _resolve_workspace_path(self.server.repo_root, rel_path)
                self._serve_file(absolute, root=self.server.repo_root)
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if not self._origin_check_passes():
            self._send_cross_origin_forbidden()
            return
        if not self._lan_auth_passes(parsed, method="POST"):
            self._send_lan_unauthorized()
            return
        if self.server.lan_mode and parsed.path in VIEWER_MUTATING_ROUTES:
            allow = False
            if self._client_is_loopback():
                allow = True
            elif self.server.lan_rw_mode and self._paired_device_for_request(parsed) is not None:
                allow = True
            if not allow:
                self._send_error_json(
                    HTTPStatus.FORBIDDEN,
                    "Mutating endpoint refused: pair this device first (see /api/lan/pair/start).",
                )
                return
        if parsed.path == "/api/lan/pair/start":
            self._handle_pair_start()
            return
        if parsed.path == "/api/lan/pair/complete":
            self._handle_pair_complete()
            return
        if parsed.path == "/api/lan/devices/revoke":
            self._handle_device_revoke(parsed)
            return
        if parsed.path == "/api/refresh":
            self._send_json(
                {
                    "ok": True,
                    "payload": self.server.viewer_payload(),
                }
            )
            return
        if parsed.path == "/api/switch-project":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                project_id = str(body.get("projectId") or "")
                self._send_json({"ok": True, "payload": self.server.switch_project(project_id)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            except FileNotFoundError as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if parsed.path == "/api/workshop-command-start":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                command_id = str(body.get("commandId") or "")
                if not command_id:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "Missing commandId.")
                    return
                catalog = workshop_commands_payload(self.server.repo_root)
                entry = next((c for c in catalog.get("commands", []) if c.get("id") == command_id), None)
                if entry is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Unknown command id.")
                    return
                session = self.server.workshop_sessions.create(entry, self.server.repo_root)
                self._send_json({"ok": True, "payload": session.status_payload()})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if parsed.path == "/api/workshop-terminal-start":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                command_override = body.get("command")
                label = str(body.get("label") or "")
                command = command_override if isinstance(command_override, list) and all(isinstance(p, str) for p in command_override) and command_override else workshop_terminal_default_command()
                session = self.server.workshop_terminals.create(command, self.server.repo_root, label=label)
                self._send_json({"ok": True, "payload": session.status_payload()})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if parsed.path == "/api/workshop-terminal-input":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                session_id = str(body.get("sessionId") or "")
                data = str(body.get("data") or "")
                session = self.server.workshop_terminals.get(session_id)
                if session is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                    return
                session.write(data)
                self._send_json({"ok": True})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/workshop-terminal-resize":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                session_id = str(body.get("sessionId") or "")
                rows = int(body.get("rows") or 0)
                cols = int(body.get("cols") or 0)
                session = self.server.workshop_terminals.get(session_id)
                if session is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                    return
                session.resize(rows, cols)
                self._send_json({"ok": True})
            except (json.JSONDecodeError, ValueError):
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid resize body.")
            return
        if parsed.path == "/api/workshop-terminal-stop":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                session_id = str(body.get("sessionId") or "")
                session = self.server.workshop_terminals.get(session_id)
                if session is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                    return
                session.stop()
                self._send_json({"ok": True, "payload": session.status_payload()})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/workshop-command-stop":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                session_id = str(body.get("sessionId") or "")
                session = self.server.workshop_sessions.get(session_id)
                if session is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "Workshop session not found.")
                    return
                session.stop()
                self._send_json({"ok": True, "payload": session.status_payload()})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/bootstrap-logics":
            try:
                bootstrap = bootstrap_payload(self.server.repo_root, check=False)
                self._send_json({"ok": True, "payload": self.server.viewer_payload(), "bootstrap": bootstrap})
            except SystemExit as exc:
                self._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/cdx-report-request":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                report_payload = cdx_run_report_payload(self.server.repo_root, str(body.get("runId") or ""))
                if report_payload.get("state") != "ok":
                    self._send_error_json(HTTPStatus.BAD_GATEWAY, str(report_payload.get("message") or "Unable to load CDX report."))
                    return
                created = create_request_from_cdx_report(self.server.repo_root, report_payload)
                self._send_json({"ok": True, "created": created, "payload": self.server.viewer_payload(selected_id=created["id"])})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/cdx-mission-plan":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": cdx_mission_plan_payload(self.server.repo_root, body)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/cdx-mission-run":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": cdx_mission_run_payload(self.server.repo_root, body)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/cdx-mission-apply-plan":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": cdx_mission_apply_plan_payload(self.server.repo_root, body)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/edit":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "document": edit_doc_payload(self.server.repo_root, rel_path)})
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/open-file":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": open_file_payload(self.server.repo_root, str(body.get("path", "")))})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/file-preview":
            try:
                length = int(self.headers.get("Content-Length", "0") or "0")
                raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
                body = json.loads(raw_body or "{}")
                self._send_json({"ok": True, "payload": file_preview_payload(self.server.repo_root, str(body.get("path", "")))})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if parsed.path == "/api/open-repo-folder":
            try:
                self._send_json({"ok": True, "payload": open_repo_folder_payload(self.server.repo_root)})
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")


def create_viewer_server(
    repo_root: Path,
    host: str = "127.0.0.1",
    port: int = 8765,
    *,
    auto_refresh_interval_seconds: int = 15,
    auto_refresh_interval_forced: bool = False,
    lan_mode: bool = False,
    lan_rw_mode: bool = False,
    tls_context: ssl.SSLContext | None = None,
) -> LogicsViewerServer:
    return LogicsViewerServer(
        (host, port),
        repo_root,
        auto_refresh_interval_seconds=auto_refresh_interval_seconds,
        auto_refresh_interval_forced=auto_refresh_interval_forced,
        lan_mode=lan_mode,
        lan_rw_mode=lan_rw_mode,
        tls_context=tls_context,
    )


def _render_qr_lines(url: str) -> list[str]:
    if not url:
        return []
    try:
        import segno  # type: ignore
    except ImportError:
        return [
            "+" + "-" * (len(url) + 2) + "+",
            "| " + url + " |",
            "+" + "-" * (len(url) + 2) + "+",
            "(Install the optional `segno` package to render a scannable QR matrix.)",
        ]
    try:
        qr = segno.make(url, error="m")
        buffer: list[str] = []
        qr.terminal(out=type("Buf", (), {"write": lambda self, value: buffer.append(value)})(), border=1)
        # segno's terminal output ends each line with newline; flatten back into lines.
        return ("".join(buffer)).splitlines() or [url]
    except Exception:
        return [url]


def _append_lan_token(url: str, token: str) -> str:
    if not url or not token:
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}t={quote(token, safe='')}"


def _detect_lan_ip() -> str:
    """Best-effort detection of the host's primary LAN IPv4 address.

    Uses the standard UDP-socket trick: open a non-blocking connection to a
    routable but unreachable target and read the local socket name. This
    yields the address the OS would use for outbound traffic, which is the
    one a phone on the same LAN should target.
    """
    candidate = ""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.setblocking(False)
        try:
            s.connect(("10.255.255.255", 1))
            candidate = s.getsockname()[0]
        except OSError:
            candidate = ""
    finally:
        s.close()
    if candidate and not candidate.startswith("127."):
        return candidate
    try:
        fallback = socket.gethostbyname(socket.gethostname())
    except OSError:
        return ""
    if fallback and not fallback.startswith("127."):
        return fallback
    return ""


def _network_viewer_url(host: str, port: int, *, focus: str | None = None, read: bool = False, scheme: str = "http") -> str | None:
    if host not in {"0.0.0.0", "::", ""}:
        return None
    candidate = _detect_lan_ip()
    if not candidate:
        return None
    return build_viewer_url(candidate, port, focus=focus, read=read, scheme=scheme)


def _viewer_state_dir() -> Path:
    """Persistent state directory for the viewer (TLS material, devices, ...)."""
    return Path.home() / ".cache" / "logics-manager"


def _ensure_tls_material(san_ips: list[str]) -> tuple[Path, Path]:
    """Return (cert_path, key_path), generating a self-signed pair if missing.

    The cert covers the loopback addresses plus any provided LAN IPs as
    subjectAltNames so iOS/Android accept it after a one-time trust prompt.
    Shells out to ``openssl`` because we deliberately do not add a heavy
    native dependency just to mint a self-signed cert.
    """
    state_dir = _viewer_state_dir() / "tls"
    state_dir.mkdir(parents=True, exist_ok=True)
    cert_path = state_dir / "viewer-cert.pem"
    key_path = state_dir / "viewer-key.pem"
    if cert_path.exists() and key_path.exists():
        return cert_path, key_path
    if shutil.which("openssl") is None:
        raise SystemExit(
            "--tls requires either an existing cert pair under "
            f"{state_dir} or the 'openssl' binary to auto-generate one."
        )
    san_entries = ["DNS:localhost", "IP:127.0.0.1", "IP:::1"]
    seen: set[str] = set()
    for ip in san_ips:
        if not ip or ip in seen or ip.startswith("127.") or ip in {"0.0.0.0", "::"}:
            continue
        seen.add(ip)
        san_entries.append(f"IP:{ip}")
    cmd = [
        "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
        "-days", "365",
        "-keyout", str(key_path),
        "-out", str(cert_path),
        "-subj", "/CN=logics-manager-viewer",
        "-addext", f"subjectAltName={','.join(san_entries)}",
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
    except (subprocess.CalledProcessError, OSError) as exc:
        raise SystemExit(f"Failed to generate TLS material via openssl: {exc}") from exc
    try:
        os.chmod(key_path, 0o600)
    except OSError:
        pass
    return cert_path, key_path


def _build_tls_context(cert_path: Path, key_path: Path) -> ssl.SSLContext:
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
    return context


def render_start_status(
    url: str,
    repo_root: Path,
    *,
    focus: str | None = None,
    network_url: str | None = None,
    bind_host: str = "localhost",
    auto_refresh_interval_seconds: int = 15,
    lan_mode: bool = False,
    lan_rw_mode: bool = False,
    lan_token: str | None = None,
    lan_url: str | None = None,
    qr_lines: list[str] | None = None,
    tls_enabled: bool = False,
) -> str:
    if lan_rw_mode:
        mode_label = "LAN read/write (token + paired device required)"
    elif lan_mode:
        mode_label = "LAN read-only (token required)"
    else:
        mode_label = "read-only"
    transport_label = "HTTPS (self-signed)" if tls_enabled else "HTTP"
    lines = [
        "Logics viewer running:",
        f"Local: {url}",
        "",
        f"Repo: {repo_root.name}",
        f"Mode: {mode_label}",
        f"Transport: {transport_label}",
        f"Bind: {bind_host}",
        f"Auto refresh: {auto_refresh_interval_seconds}s",
    ]
    if network_url:
        lines.insert(2, f"Network: {network_url}")
    if focus:
        lines.append(f"Focus: {focus}")
    if lan_mode:
        lines.append("")
        if lan_rw_mode:
            lines.append("LAN exposure is active in read/write mode. Devices need the session token AND a PIN-paired device token to mutate state.")
        else:
            lines.append("LAN exposure is active. Mutating endpoints are refused; non-loopback clients must present the session token below.")
        if lan_url:
            lines.append(f"Share URL: {lan_url}")
        if lan_token:
            lines.append(f"Token: {lan_token}")
        if qr_lines:
            lines.append("")
            lines.extend(qr_lines)
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="logics-manager view", description="Start the local read-only Logics browser viewer.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host. Defaults to 127.0.0.1.")
    parser.add_argument("--port", type=int, default=8765, help="Bind port. Use 0 to select an available port.")
    parser.add_argument(
        "--lan",
        action="store_true",
        help="Expose the viewer on the local network (0.0.0.0). Enforces read-only access and requires a per-session bearer token for non-loopback requests.",
    )
    parser.add_argument(
        "--lan-rw",
        action="store_true",
        help="Allow paired devices to mutate state over LAN. Devices must complete a PIN handshake first (PIN is printed on the host's stdout). Implies --lan.",
    )
    parser.add_argument(
        "--tls",
        action="store_true",
        help="Serve over HTTPS using a self-signed cert. Auto-generated under ~/.cache/logics-manager/tls/ on first use; needs `openssl` in PATH unless a cert pair is provided via --tls-cert / --tls-key.",
    )
    parser.add_argument(
        "--tls-cert",
        default=None,
        help="Path to a PEM-encoded TLS certificate. Implies --tls when set together with --tls-key.",
    )
    parser.add_argument(
        "--tls-key",
        default=None,
        help="Path to a PEM-encoded TLS private key. Implies --tls when set together with --tls-cert.",
    )
    parser.add_argument(
        "--refresh-interval",
        type=int,
        default=None,
        help="Automatic refresh interval in seconds. Defaults to 15; positive intervals are allowed.",
    )
    parser.add_argument("--focus", help="Open the viewer focused on a workflow ref or repo-relative Logics Markdown path.")
    parser.add_argument("--read", action="store_true", help="Open the focused item in the read preview. Requires --focus.")
    parser.add_argument("--open", action="store_true", help="Open the viewer in the default browser.")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser. This is the default.")
    return parser


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    repo_root = find_repo_root(Path.cwd())
    refresh_interval_forced = args.refresh_interval is not None
    refresh_interval = args.refresh_interval if args.refresh_interval is not None else 15
    if refresh_interval <= 0:
        raise SystemExit("--refresh-interval must be a positive number of seconds.")
    if args.read and not args.focus:
        raise SystemExit("--read requires --focus.")
    try:
        focus = normalize_viewer_focus_target(repo_root, args.focus) if args.focus else None
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    lan_enabled = bool(args.lan) or bool(args.lan_rw)
    bind_host = "0.0.0.0" if lan_enabled and args.host == "127.0.0.1" else args.host
    if args.lan_rw and not args.tls and not (args.tls_cert and args.tls_key):
        sys.stdout.write(
            "[warn] --lan-rw without --tls exposes device tokens over plain HTTP. "
            "Add --tls (or wrap the viewer in a Tailscale / VPN) before pairing real devices.\n"
        )
    tls_requested = bool(args.tls) or bool(args.tls_cert) or bool(args.tls_key)
    tls_context: ssl.SSLContext | None = None
    if tls_requested:
        if bool(args.tls_cert) ^ bool(args.tls_key):
            raise SystemExit("--tls-cert and --tls-key must be provided together.")
        if args.tls_cert and args.tls_key:
            cert_path = Path(args.tls_cert).expanduser().resolve()
            key_path = Path(args.tls_key).expanduser().resolve()
            if not cert_path.is_file() or not key_path.is_file():
                raise SystemExit("--tls-cert / --tls-key paths must point to existing files.")
        else:
            san_candidates: list[str] = []
            lan_ip = _detect_lan_ip()
            if lan_ip:
                san_candidates.append(lan_ip)
            cert_path, key_path = _ensure_tls_material(san_candidates)
        tls_context = _build_tls_context(cert_path, key_path)
    server = create_viewer_server(
        repo_root,
        host=bind_host,
        port=args.port,
        auto_refresh_interval_seconds=refresh_interval,
        auto_refresh_interval_forced=refresh_interval_forced,
        lan_mode=lan_enabled,
        lan_rw_mode=bool(args.lan_rw),
        tls_context=tls_context,
    )
    host, port = server.server_address[:2]
    scheme = server.url_scheme
    url = build_viewer_url(str(host), int(port), focus=focus, read=bool(args.read), scheme=scheme)
    network_url = _network_viewer_url(str(host), int(port), focus=focus, read=bool(args.read), scheme=scheme)
    lan_share_url = ""
    qr_lines: list[str] = []
    if lan_enabled and server.lan_token:
        base_for_lan = network_url or url
        lan_share_url = _append_lan_token(base_for_lan, server.lan_token)
        qr_lines = _render_qr_lines(lan_share_url)
    print(
        render_start_status(
            url,
            repo_root,
            focus=focus,
            network_url=network_url,
            bind_host=str(host),
            auto_refresh_interval_seconds=refresh_interval,
            lan_mode=lan_enabled,
            lan_rw_mode=server.lan_rw_mode,
            lan_token=server.lan_token if lan_enabled else None,
            lan_url=lan_share_url or None,
            qr_lines=qr_lines or None,
            tls_enabled=server.tls_enabled,
        ),
        flush=True,
    )
    if args.open and not args.no_open:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 0
    finally:
        server.server_close()
    return 0
