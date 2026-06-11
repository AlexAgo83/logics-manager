from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import shutil
import socket
import subprocess
import sys
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
    "standard": {"id": "standard", "label": "Standard", "timeout": 180},
    "deep": {"id": "deep", "label": "Deep", "timeout": 300},
    "max": {"id": "max", "label": "Max", "timeout": 600},
}
CDX_MISSION_CATALOG = {
    "full-audit": {
        "id": "full-audit",
        "title": "Audit complet",
        "description": "Inspecte le repository complet avec un rapport CDX exploitable.",
        "scope": "repository",
        "requiresReleaseTag": False,
        "requiresPlanConfirmation": False,
    },
    "release-review": {
        "id": "release-review",
        "title": "Review depuis derniere release",
        "description": "Compare l'etat courant avec le dernier tag de version disponible.",
        "scope": "latest-release",
        "requiresReleaseTag": True,
        "requiresPlanConfirmation": False,
    },
    "corpus-ready": {
        "id": "corpus-ready",
        "title": "Preparer le corpus pret a dev",
        "description": "Produit un plan corpus avant toute application Logics deterministe.",
        "scope": "open-logics-workflow",
        "requiresReleaseTag": False,
        "requiresPlanConfirmation": True,
    },
}
CDX_DEFAULT_MISSION_ID = "full-audit"
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


def build_viewer_url(host: str, port: int, *, focus: str | None = None, read: bool = False) -> str:
    url = f"http://{host}:{port}"
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

    return {
        "logics": logics,
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
    runner = launcher or subprocess.Popen
    runner(command)
    return {
        "path": normalized,
        "command": command[0],
    }


def open_repo_folder_payload(repo_root: Path, *, launcher: Any | None = None) -> dict[str, str]:
    root = repo_root.resolve()
    command = _system_editor_command(root)
    runner = launcher or subprocess.Popen
    runner(command)
    return {
        "path": str(root),
        "command": command[0],
    }


def _system_editor_command(path: Path) -> list[str]:
    if sys.platform == "darwin":
        return ["open", str(path)]
    if os.name == "nt":
        return ["cmd", "/c", "start", "", str(path)]
    return ["xdg-open", str(path)]


def _run_read_only_git(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["git", *args]
    git_runner = runner or subprocess.run
    return git_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=5)


def _run_read_only_cdx(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["cdx", *args]
    cdx_runner = runner or subprocess.run
    return cdx_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=5)


def _run_cdx_mission(repo_root: Path, args: list[str], *, timeout: int, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["cdx", *args]
    cdx_runner = runner or subprocess.run
    return cdx_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=timeout)


def _run_logics_flow(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["logics-manager", "flow", *args]
    flow_runner = runner or subprocess.run
    return flow_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=30)


def _run_read_only_gh(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["gh", *args]
    gh_runner = runner or subprocess.run
    return gh_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=8)


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
    normalized = unquote(rel_path).replace("\\", "/").lstrip("/")
    if not normalized or normalized.startswith("~") or normalized.startswith("/") or ".." in normalized.split("/"):
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


def _parse_github_actions_run(run: dict[str, Any], *, match_source: str) -> dict[str, Any]:
    status = str(run.get("status") or "")
    conclusion = str(run.get("conclusion") or "")
    commit = run.get("head_commit") if isinstance(run.get("head_commit"), dict) else {}
    author = commit.get("author") if isinstance(commit.get("author"), dict) else {}
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
        "commitMessage": str(commit.get("message") or run.get("display_title") or "").splitlines()[0][:240],
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
    endpoint = f"repos/{owner}/{repo}/actions/runs?per_page=10"
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

    selected = next((run for run in runs if head_sha and str(run.get("head_sha") or "") == head_sha), None)
    match_source = "head" if selected else "branch-latest"
    if selected is None:
        selected = runs[0]
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
    return {"state": "ok", "message": "", "runs": [run for run in runs if isinstance(run, dict)]}


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


def _cdx_mission_command(mission_id: str, *, session: str, strength: str, release_tag: str = "") -> list[str]:
    base = ["run", "--json", "--session", session, "--strength", strength]
    if mission_id == "full-audit":
        return [*base, "--mission", "full-audit", "--scope", "repository"]
    if mission_id == "release-review":
        return [*base, "--mission", "release-review", "--since", release_tag]
    if mission_id == "corpus-ready":
        return [*base, "--mission", "corpus-ready-plan", "--scope", "open-logics-workflow", "--plan-only"]
    raise ValueError("Unknown CDX mission.")


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
    if mission.get("requiresReleaseTag"):
        release_tag = _latest_release_tag(repo_root, runner=git_runner, which=which)
        if not release_tag:
            return {"state": "error", "message": "No release tag was found for this mission.", "plan": None, "status": status_payload}
    if status_payload.get("state") != "ok":
        warnings.append(str(status_payload.get("message") or "CDX status could not be confirmed."))

    command = _cdx_mission_command(mission_id, session=session, strength=strength, release_tag=release_tag)
    plan = {
        "mission": mission,
        "missionId": mission_id,
        "sessionId": session,
        "strength": strength_def,
        "strengthId": strength,
        "scope": mission["scope"],
        "releaseTag": release_tag,
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
    timeout = int(plan["strength"].get("timeout") or 180)
    try:
        result = _run_cdx_mission(repo_root, list(plan["arguments"]), timeout=timeout, runner=cdx_runner)
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
        "promote-request-to-backlog": ["request", "backlog"],
        "promote-backlog-to-task": ["backlog", "task"],
        "refresh-corpus-context": ["corpus", "prepare"],
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
        if target:
            if not re.match(r"^[A-Za-z0-9_.:/-]{1,160}$", target):
                return {"state": "error", "message": "Invalid corpus plan action target.", "results": results}
            args.append(target)
        try:
            result = _run_logics_flow(repo_root, args, runner=runner)
        except subprocess.TimeoutExpired:
            return {"state": "timeout", "message": "Logics corpus plan application timed out.", "results": results}
        except (OSError, subprocess.SubprocessError) as exc:
            return {"state": "error", "message": f"Unable to apply corpus plan action: {exc}", "results": results}
        item = {
            "type": action_type,
            "target": target,
            "command": ["logics-manager", "flow", *args],
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
    run_id = str(run.get("run_id") or task_report.get("run_id") or "unknown")
    findings = task_report.get("findings") if isinstance(task_report.get("findings"), list) else []
    title = f"Address CDX code review findings for {run_id}"
    ref = _next_viewer_request_ref(repo_root, title)
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True, exist_ok=True)
    rel_path = f"logics/request/{ref}.md"
    path = repo_root / rel_path
    finding_lines = []
    for index, finding in enumerate(findings, start=1):
        if not isinstance(finding, dict):
            continue
        location = finding.get("path") or finding.get("file") or "unknown path"
        if finding.get("line"):
            location = f"{location}:{finding['line']}"
        severity = finding.get("severity") or "unknown"
        message = finding.get("message") or finding.get("title") or "Review finding"
        finding_lines.append(f"- F{index} [{severity}] `{location}`: {message}")
    if not finding_lines:
        finding_lines.append("- No structured findings were reported. Review the CDX artifacts linked below.")
    text = "\n".join([
        f"## {ref} - {title}",
        "> Status: Draft",
        "> Understanding: 70%",
        "> Confidence: 70%",
        "> Complexity: Medium",
        "> Theme: Code review follow-up",
        "",
        "# Needs",
        f"- Follow up on CDX code-review run `{run_id}`.",
        f"- Summary: {task_report.get('summary') or 'No structured summary provided.'}",
        "",
        "# Findings",
        *finding_lines,
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


class LogicsViewerServer(ThreadingHTTPServer):
    def __init__(
        self,
        server_address: tuple[str, int],
        repo_root: Path,
        *,
        auto_refresh_interval_seconds: int = 15,
    ):
        self.launch_repo_root = repo_root.resolve()
        self.project_roots = discover_viewer_project_roots(self.launch_repo_root)
        self.project_root_by_id = {_viewer_project_id(root): root.resolve() for root in self.project_roots}
        self.active_project_id = _viewer_project_id(self.launch_repo_root)
        self.repo_root = self.launch_repo_root
        self.auto_refresh_interval_seconds = auto_refresh_interval_seconds
        super().__init__(server_address, LogicsViewerRequestHandler)

    def project_registry_payload(self) -> list[dict[str, Any]]:
        return viewer_project_registry(self.repo_root, project_roots=self.project_roots)

    def viewer_payload(self, *, selected_id: str | None = None) -> dict[str, Any]:
        return viewer_data_payload(
            self.repo_root,
            selected_id=selected_id,
            auto_refresh_interval_seconds=self.auto_refresh_interval_seconds,
            projects=self.project_registry_payload(),
        )

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

    def _serve_file(self, path: Path) -> None:
        if not path.is_file():
            self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
            return
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or path.suffix in {".js", ".css", ".html"}:
            content_type = f"{content_type}; charset=utf-8"
        self._send_bytes(path.read_bytes(), content_type=content_type)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        route = parsed.path
        if route == "/":
            self._serve_file(VIEWER_ROOT / "index.html")
            return
        if route == "/browser-host.js":
            self._serve_file(VIEWER_ROOT / "browser-host.js")
            return
        if route == "/viewer.css":
            self._serve_file(VIEWER_ROOT / "viewer.css")
            return
        if route == "/vendor/mermaid.min.js":
            vendor_path = DIST_VENDOR_ROOT / "mermaid.min.js"
            if not vendor_path.is_file():
                vendor_path = NODE_MERMAID_ROOT / "mermaid.min.js"
            if not vendor_path.is_file():
                vendor_path = PACKAGE_VENDOR_ROOT / "mermaid.min.js"
            self._serve_file(vendor_path)
            return
        if route.startswith("/media/"):
            media_path = (SHARED_MEDIA_ROOT / route.removeprefix("/media/")).resolve()
            if SHARED_MEDIA_ROOT.resolve() != media_path and SHARED_MEDIA_ROOT.resolve() not in media_path.parents:
                self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
                return
            self._serve_file(media_path)
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
        self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
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
) -> LogicsViewerServer:
    return LogicsViewerServer(
        (host, port),
        repo_root,
        auto_refresh_interval_seconds=auto_refresh_interval_seconds,
    )


def _network_viewer_url(host: str, port: int, *, focus: str | None = None, read: bool = False) -> str | None:
    if host not in {"0.0.0.0", "::", ""}:
        return None
    try:
        candidate = socket.gethostbyname(socket.gethostname())
    except OSError:
        return None
    if not candidate or candidate.startswith("127."):
        return None
    return build_viewer_url(candidate, port, focus=focus, read=read)


def render_start_status(
    url: str,
    repo_root: Path,
    *,
    focus: str | None = None,
    network_url: str | None = None,
    bind_host: str = "localhost",
    auto_refresh_interval_seconds: int = 15,
) -> str:
    lines = [
        "Logics viewer running:",
        f"Local: {url}",
        "",
        f"Repo: {repo_root.name}",
        "Mode: read-only",
        f"Bind: {bind_host}",
        f"Auto refresh: {auto_refresh_interval_seconds}s",
    ]
    if network_url:
        lines.insert(2, f"Network: {network_url}")
    if focus:
        lines.append(f"Focus: {focus}")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="logics-manager view", description="Start the local read-only Logics browser viewer.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host. Defaults to 127.0.0.1.")
    parser.add_argument("--port", type=int, default=8765, help="Bind port. Use 0 to select an available port.")
    parser.add_argument(
        "--refresh-interval",
        type=int,
        default=15,
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
    if args.refresh_interval <= 0:
        raise SystemExit("--refresh-interval must be a positive number of seconds.")
    if args.read and not args.focus:
        raise SystemExit("--read requires --focus.")
    try:
        focus = normalize_viewer_focus_target(repo_root, args.focus) if args.focus else None
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    server = create_viewer_server(
        repo_root,
        host=args.host,
        port=args.port,
        auto_refresh_interval_seconds=args.refresh_interval,
    )
    host, port = server.server_address[:2]
    url = build_viewer_url(str(host), int(port), focus=focus, read=bool(args.read))
    network_url = _network_viewer_url(str(host), int(port), focus=focus, read=bool(args.read))
    print(
        render_start_status(
            url,
            repo_root,
            focus=focus,
            network_url=network_url,
            bind_host=str(host),
            auto_refresh_interval_seconds=args.refresh_interval,
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
