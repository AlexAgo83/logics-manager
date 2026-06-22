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
from .config import ConfigError, find_repo_root
from .lint import lint_payload
from .release import load_release_context, release_reset_payload, release_status_payload
from .sync import update_workflow_indicators_payload
from .update_check import get_update_info
from .viewer_lan import (
    _PAIRING_MAX_ATTEMPTS,
    _PAIRING_PIN_TTL_SECONDS,
    _PairedDevice,
    _PendingPairing,
    _hash_device_token,
    LanDeviceRegistry,
    LanPairingBroker,
)
from .viewer_workshop import (
    _WORKSHOP_SESSION_BUFFER_MAX,
    _WORKSHOP_SESSION_TTL_SECONDS,
    _WORKSHOP_TERMINAL_BUFFER_MAX,
    _WORKSHOP_TERMINAL_TTL_SECONDS,
    _default_workshop_shell,
    _derive_cdx_session_name,
    _discover_package_json_scripts,
    _discover_pyproject_scripts,
    _workshop_command_id,
    WORKSHOP_COMMAND_MAX,
    WorkshopCommandSession,
    WorkshopSessionRegistry,
    WorkshopTerminalRegistry,
    WorkshopTerminalSession,
    workshop_commands_payload,
    workshop_terminal_default_command,
    workshop_terminals_available,
)


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
VIEWER_STATUS_OPTIONS_BY_STAGE = {
    "request": ("Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"),
    "backlog": ("Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"),
    "task": ("Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"),
    "product": ("Draft", "Proposed", "Active", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"),
    "architecture": ("Draft", "Proposed", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"),
    "spec": ("Draft", "Ready", "In progress", "Done", "Validated", "Settled", "Archived"),
}
CDX_MISSION_STRENGTHS = {
    "standard": {"id": "standard", "label": "Standard", "timeout": 180, "reasoningEffort": "medium", "power": "medium"},
    "deep": {"id": "deep", "label": "Deep", "timeout": 300, "reasoningEffort": "high", "power": "high"},
    "max": {"id": "max", "label": "Max", "timeout": 600, "reasoningEffort": "high", "power": "high"},
}
CDX_MISSION_LEVELS = {"minimal", "low", "medium", "high", "xhigh"}
CDX_MISSION_PARENT_TIMEOUT_GRACE_SECONDS = 90
CDX_WRITABLE_MISSION_MIN_TIMEOUT_SECONDS = 600
CDX_MISSION_CATALOG = {
    "full-audit": {
        "id": "full-audit",
        "title": "Full audit",
        "description": "Audit the repository, always draft a Logics request, and optionally apply fixes with a full request→item→task chain.",
        "scope": "repository",
        "requiresReleaseTag": False,
        "requiresPlanConfirmation": False,
        "supportsFileWrites": True,
        "requiresFileWrites": True,
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
        "description": "Review changes since the latest release, always draft a Logics request, and optionally apply fixes with a full request→item→task chain.",
        "scope": "latest-release",
        "requiresReleaseTag": True,
        "requiresPlanConfirmation": False,
        "supportsFileWrites": True,
        "requiresFileWrites": True,
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
# Hard safety ceiling applied when the operator explicitly forces a full load
# ("load anyway"); keeps the browser from choking on pathological files.
PREVIEW_FORCE_MAX_BYTES = 5_000_000
PREVIEW_FORCE_MAX_CHARS = 5_000_000
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
    if raw.startswith("~"):
        raise ValueError("Focus target must be a workflow ref or repo-relative Logics path.")
    if raw.startswith(("/", "\\")) or re.match(r"^[A-Za-z]:", raw):
        absolute = Path(raw).expanduser().resolve()
        root = repo_root.resolve()
        if root != absolute and root not in absolute.parents:
            raise ValueError("Focus target must be a workflow ref or repo-relative Logics path.")
        raw = absolute.relative_to(root).as_posix()
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
