from __future__ import annotations

import argparse
import errno
import functools
import hashlib
import hmac
import json
import secrets
import mimetypes
import os
import re
import shlex
import shutil
import socket
import ssl
import subprocess
import sys
import threading
import time
import tomllib
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, quote, unquote, urlparse
from .audit import audit_payload
from . import viewer_cdx_routes, viewer_diagnostics, viewer_workshop_routes
from .bootstrap import bootstrap_payload
from .cdx_memory import cdx_memory_payload
from .chain_graph import resolve_request_chain, resolve_runbook_library_graph
from .config import ConfigError, find_repo_root, holds_corpus
from .insights import health_payload, status_payload
from .lint import lint_payload
from .path_utils import PathEscapesRoot, has_symlink_segment, relative_to_root
from .release import load_release_context, release_reset_payload, release_status_payload
from .sync import RUNBOOK_MATCH_LIMIT, list_active_runbooks_payload, match_runbooks_payload, update_workflow_indicators_payload
from .viewer_preferences import (
    fleet_roots,
    read_preferences as read_viewer_preferences,
    update_preferences as update_viewer_preferences,
)
from .update_check import current_version as package_current_version, get_update_info
from .viewer_docs import (
    DOC_FAMILIES,
    _infer_stage,
    _read_text,
    build_viewer_url,
    collect_viewer_items,
    normalize_viewer_focus_target,
)
from .viewer_lan import (
    _PAIRING_MAX_ATTEMPTS,
    _PAIRING_PIN_TTL_SECONDS,
    _PairedDevice,
    _PendingPairing,
    _hash_device_token,
    LanDeviceRegistry,
    LanPairingBroker,
)
from .viewer_registry import claim_or_reuse, fleet_projects, register_fleet_project
from . import viewer_project_tools
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
VIEWER_STATUS_OPTIONS_BY_STAGE = {
    "request": ("Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"),
    "backlog": ("Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"),
    "task": ("Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"),
    "product": ("Draft", "Proposed", "Active", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"),
    "roadmap": ("Draft", "Proposed", "Active", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"),
    "architecture": ("Draft", "Proposed", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"),
    "spec": ("Draft", "Ready", "In progress", "Done", "Validated", "Settled", "Archived"),
    "runbook": ("Draft", "Active", "Archived"),
}
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
def _resolve_asset_root(repo_candidate: Path, packaged_candidate: Path, marker: str = "") -> Path:
    """Prefer the live repo source tree; fall back to the packaged viewer_assets
    mirror shipped in the wheel. ``marker`` is a child that must exist for the
    repo candidate to count (empty = the directory itself). This keeps a fresh
    clone serving from clients/ without a build, while a pip install (no repo
    tree) serves the packaged mirror."""
    probe = repo_candidate / marker if marker else repo_candidate
    return repo_candidate if probe.exists() else packaged_candidate


VIEWER_ROOT = _resolve_asset_root(
    REPO_ROOT / "clients" / "viewer", PACKAGE_VIEWER_ASSETS_ROOT / "viewer", marker="index.html"
)
SHARED_MEDIA_ROOT = _resolve_asset_root(
    REPO_ROOT / "clients" / "shared-web" / "media", PACKAGE_VIEWER_ASSETS_ROOT / "media"
)
DIST_VENDOR_ROOT = REPO_ROOT / "dist" / "vendor"
PACKAGE_VENDOR_ROOT = PACKAGE_VIEWER_ASSETS_ROOT / "vendor"
NODE_MERMAID_ROOT = REPO_ROOT / "node_modules" / "mermaid" / "dist"


def _current_version() -> str:
    return package_current_version()


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
    bootstrap_warning = viewer_bootstrap_warning(active_root) if has_logics else None
    return {
        "root": str(active_root),
        "projectId": _viewer_project_id(active_root),
        "repoName": active_root.name,
        "repository": {
            "root": str(active_root),
            "githubUrl": github_repo_url(repo_root),
            **repository_provider_payload(repo_root),
        },
        "capabilities": capabilities,
        "projects": projects if projects is not None else viewer_project_registry(repo_root),
        "autoRefreshIntervalSeconds": auto_refresh_interval_seconds,
        "autoRefreshIntervalForced": auto_refresh_interval_forced,
        "items": collect_viewer_items(repo_root),
        "updateInfo": _viewer_update_info(),
        "cdxUpdateInfo": cdx_update_info_payload(repo_root),
        "selectedId": selected_id,
        "changedPaths": [],
        "canResetProjectRoot": False,
        "canBootstrapLogics": True,
        "shouldPromptBootstrapLogics": not has_logics,
        "bootstrapLogicsTitle": "Bootstrap Logics in this project." if not has_logics else "Refresh Logics bootstrap files.",
        "canLaunchCodex": False,
        "canLaunchClaude": False,
        "canRepairLogicsKit": False,
        "canPublishRelease": False,
        "shouldRecommendCheckEnvironment": False,
        "bootstrapWarning": bootstrap_warning,
        "environmentWarning": viewer_environment_warning(active_root),
    }


def _viewer_update_info() -> dict[str, Any]:
    """Update state, plus which install the viewer is actually running.

    A shadowing duplicate install has broken updates twice in the field. The CLI
    detects it, but an operator working in the viewer had no way to see it
    without opening a terminal.
    """
    payload = get_update_info(_current_version()).to_payload()
    try:
        from .cli import detect_running_manager, shadowing_executables

        manager, executable = detect_running_manager()
        duplicates = shadowing_executables(executable)
    except Exception:  # noqa: BLE001 - install introspection must never break the viewer
        return payload
    payload["manager"] = manager
    payload["executablePath"] = str(executable) if executable else None
    payload["shadowingExecutables"] = duplicates
    return payload


def _viewer_project_id(repo_root: Path) -> str:
    normalized = str(repo_root.resolve())
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:12]


def _looks_like_viewer_project(path: Path) -> bool:
    if not path.is_dir():
        return False
    # Deliberately broader than holds_corpus: the switcher also offers projects
    # with no corpus yet, so they can be bootstrapped from the viewer.
    return holds_corpus(path) or any(
        (path / marker).exists() for marker in (".git", "package.json", "pyproject.toml", "logics.yaml")
    )


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
    has_logics = holds_corpus(root)
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


# --- Dev-only demo corpus -------------------------------------------------
# A synthetic project the project switcher can offer in a dev checkout, so the
# board can be inspected against every card state (stages, statuses, progress
# fills, done-dimming, promotion, and each attention/health signal) without a
# real corpus. Generated into a temp dir; never shipped in the pip package.
DEMO_PROJECT_DIRNAME = "logics-manager-demo-corpus"
DEMO_PROJECT_NAME = "✨ Demo board (all states)"


def _is_dev_checkout() -> bool:
    return (REPO_ROOT / "clients" / "shared-web" / "media").is_dir()


def demo_corpus_root() -> Path:
    import tempfile

    return Path(tempfile.gettempdir()) / DEMO_PROJECT_DIRNAME


def _demo_doc(
    doc_id: str,
    title: str,
    status: str,
    progress: int | None,
    *,
    backlog: list[str] | None = None,
    references: list[str] | None = None,
    related: list[tuple[str, str]] | None = None,
) -> str:
    lines = [
        f"## {doc_id} - {title}",
        "> From version: 0.0.0-demo",
        f"> Status: {status}",
    ]
    if progress is not None:
        lines.append(f"> Progress: {progress}")
    lines += [
        "> Understanding: 80",
        "> Confidence: 75",
        "> Complexity: Medium",
        "> Theme: Demo",
    ]
    for key, ref in related or []:
        lines.append(f"> {key}: `{ref}`")
    lines += ["", "# Overview", f"- Demo fixture for the **{status}** state."]
    if backlog:
        lines += ["", "# Backlog", *[f"- `{ref}`" for ref in backlog]]
    if references:
        lines += ["", "# References", *[f"- `{ref}`" for ref in references]]
    return "\n".join(lines) + "\n"


def _demo_corpus_docs() -> list[tuple[str, str]]:
    # Two clean chains (active + done) plus standalone cards that each trigger a
    # distinct status / progress / attention state.
    return [
        # Clean active chain (teal progress fills, promoted request + usedBy).
        ("logics/request/req_demo_auth_login.md", _demo_doc("req_demo_auth_login", "Sign-in with passkeys", "In progress", 80, backlog=["item_demo_auth_login"])),
        ("logics/backlog/item_demo_auth_login.md", _demo_doc("item_demo_auth_login", "Passkey ceremony slice", "In progress", 60, references=["req_demo_auth_login"])),
        ("logics/tasks/task_demo_auth_login.md", _demo_doc("task_demo_auth_login", "Wire the passkey endpoint", "In progress", 35, references=["item_demo_auth_login"])),
        # Done chain (green + dimmed).
        ("logics/request/req_demo_export.md", _demo_doc("req_demo_export", "CSV data export", "Done", 100, backlog=["item_demo_export"])),
        ("logics/backlog/item_demo_export.md", _demo_doc("item_demo_export", "Export streaming writer", "Done", 100, references=["req_demo_export"])),
        ("logics/tasks/task_demo_export.md", _demo_doc("task_demo_export", "Stream rows to the client", "Done", 100, references=["item_demo_export"])),
        # Standalone state / attention cards.
        ("logics/request/req_demo_draft.md", _demo_doc("req_demo_draft", "Offline mode (idea)", "Draft", 0, backlog=["item_demo_ready"])),
        ("logics/request/req_demo_blocked.md", _demo_doc("req_demo_blocked", "Third-party SSO", "Blocked", 40, backlog=["item_demo_blocked"])),
        ("logics/request/req_demo_mismatch.md", _demo_doc("req_demo_mismatch", "Search re-index", "In progress", 100, backlog=["item_demo_ready"])),
        ("logics/request/req_demo_unpromoted.md", _demo_doc("req_demo_unpromoted", "Dark theme polish", "Ready", 10)),
        ("logics/backlog/item_demo_ready.md", _demo_doc("item_demo_ready", "Ready-to-start slice", "Ready", 0, references=["req_demo_draft"])),
        ("logics/backlog/item_demo_blocked.md", _demo_doc("item_demo_blocked", "Blocked on vendor API", "Blocked", 50, references=["req_demo_blocked"])),
        ("logics/tasks/task_demo_ready.md", _demo_doc("task_demo_ready", "Queued implementation task", "Ready", 0)),
        # Supporting docs: one linked (clean), one orphaned (attention).
        ("logics/product/prod_demo_linked.md", _demo_doc("prod_demo_linked", "Auth product brief", "Settled", None, related=[("Related backlog", "item_demo_auth_login")])),
        ("logics/roadmap/road_demo_auth.md", _demo_doc("road_demo_auth", "Auth roadmap", "Active", None, references=["prod_demo_linked"], related=[("Related product", "prod_demo_linked")])),
        ("logics/product/prod_demo_orphan.md", _demo_doc("prod_demo_orphan", "Unlinked product brief", "Proposed", None)),
        ("logics/architecture/adr_demo_linked.md", _demo_doc("adr_demo_linked", "Passkey storage decision", "Accepted", None, related=[("Related task", "task_demo_auth_login")])),
        ("logics/specs/spec_demo_auth.md", _demo_doc("spec_demo_auth", "Passkey ceremony spec", "Validated", None, references=["req_demo_auth_login"])),
    ]


def ensure_demo_corpus(root: Path) -> Path:
    """(Re)write the synthetic demo corpus under ``root`` and return it resolved."""
    logics_dir = root / "logics"
    if logics_dir.exists():
        shutil.rmtree(logics_dir, ignore_errors=True)
    for rel_path, content in _demo_corpus_docs():
        target = root / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    return root.resolve()


def ensure_demo_corpus_if_dev() -> Path | None:
    """In a dev checkout, materialize the demo corpus and return its root."""
    if not _is_dev_checkout():
        return None
    try:
        return ensure_demo_corpus(demo_corpus_root())
    except OSError:
        return None


def _viewer_capability(state: str, *, available: bool, message: str, detail: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "state": state,
        "available": available,
        "message": message,
    }
    if detail:
        payload["detail"] = detail
    return payload


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

    repository_provider: dict[str, str] = {}
    if not git_path:
        git = _viewer_capability("unavailable", available=False, message="Git executable is not available.")
    else:
        is_repo = _git_is_repository(repo_root, runner=git_runner)
        if is_repo is True:
            git = _viewer_capability("ready", available=True, message="Git repository detected.")
            repository_provider = repository_provider_payload(repo_root, runner=git_runner, which=which_command)
        elif is_repo is False:
            git = _viewer_capability("missing", available=False, message="Project is not a Git repository.")
        else:
            git = _viewer_capability("error", available=False, message="Unable to inspect Git repository state.")

    provider = repository_provider.get("provider", "")
    web_url = repository_provider.get("webUrl", "")
    if provider == "github":
        if not _has_github_actions_workflows(repo_root):
            ci = _viewer_capability("hidden", available=False, message="No GitHub Actions workflows detected for this project.")
        elif not which_command("gh"):
            ci = _viewer_capability("unavailable", available=False, message="GitHub CLI is not available.")
        else:
            ci = _viewer_capability(
                "ready",
                available=True,
                message="GitHub Actions can be inspected.",
                detail={"provider": "github", "repositoryUrl": web_url, "githubUrl": web_url},
            )
    elif provider == "gitlab":
        if not _has_gitlab_ci_config(repo_root):
            ci = _viewer_capability("hidden", available=False, message="No GitLab CI config detected for this project.")
        elif not which_command("glab"):
            ci = _viewer_capability("unavailable", available=False, message="GitLab CLI is not available.")
        else:
            ci = _viewer_capability(
                "ready",
                available=True,
                message="GitLab CI can be inspected.",
                detail={"provider": "gitlab", "repositoryUrl": web_url, "gitlabUrl": web_url},
            )
    else:
        ci = _viewer_capability("hidden", available=False, message="No GitHub or GitLab remote detected for this project.")

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
        **viewer_project_tools.detect_project_tools(repo_root),
    }


def read_doc_payload(repo_root: Path, rel_path: str) -> dict[str, Any]:
    normalized, absolute = _resolve_repo_doc_path(repo_root, rel_path)
    return {
        "path": normalized,
        "content": _read_text(absolute),
    }


def _resolve_repo_doc_path(repo_root: Path, rel_path: str) -> tuple[str, Path]:
    normalized = unquote(rel_path).replace("\\", "/").lstrip("/")
    root = repo_root.resolve()
    absolute = (repo_root / normalized).resolve()
    try:
        relative_to_root(absolute, root)
    except PathEscapesRoot as exc:
        raise ValueError("Document path escapes repository root.") from exc
    if has_symlink_segment(root, Path(normalized)):
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
    try:
        absolute = _resolve_openable_file_path(repo_root, file_path)
    except ValueError:
        absolute = _resolve_cdx_artifact_path(repo_root, file_path)
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


def open_system_terminal_payload(repo_root: Path, body: dict[str, Any], *, launcher: Any | None = None) -> dict[str, Any]:
    command_override = body.get("command")
    label = str(body.get("label") or "terminal")
    command = command_override if isinstance(command_override, list) and command_override and all(isinstance(p, str) and p for p in command_override) else workshop_terminal_default_command()
    root = repo_root.resolve()
    terminal_ref = f"external-{secrets.token_hex(8)}"
    shell_command = f"cd {shlex.quote(str(root))} && exec {shlex.join(command)}"
    if sys.platform == "darwin":
        iterm_script = 'tell application "iTerm"\n  activate\n' + f'  if (count of windows) = 0 then\n    set targetWindow to (create window with default profile)\n    set targetSession to current session of targetWindow\n  else\n    set targetTab to (create tab with default profile current window)\n    set targetSession to current session of targetTab\n  end if\n  tell targetSession to write text {json.dumps(shell_command)}\n  return id of targetSession\n' + "end tell"
        terminal_script = 'tell application "Terminal"\n  activate\n' + f'  do script {json.dumps(shell_command)}\n' + "end tell"
        terminal, native_ref = "iTerm", None
        try:
            native_ref = _run_osascript(iterm_script, launcher=launcher) or None
        except (OSError, subprocess.SubprocessError):
            terminal = "Terminal"
            _run_osascript(terminal_script, launcher=launcher)
        return {"label": label, "command": command, "terminal": terminal, "terminalRef": terminal_ref, "nativeRef": native_ref}
    if os.name == "nt":
        cmd_command = command[2] if command[:2] == ["sh", "-lc"] and len(command) == 3 else subprocess.list2cmdline(command)
        launch = ["cmd.exe", "/c", "start", "", "/D", str(root), "cmd.exe", "/k", cmd_command]
        _dispatch_system_open(launch, root, launcher=launcher)
        return {"label": label, "command": command, "terminal": "cmd.exe", "terminalRef": terminal_ref, "nativeRef": None}
    linux_terminal = _linux_system_terminal_command(root, shell_command)
    if linux_terminal is None:
        raise ValueError("No supported system terminal found.")
    terminal, launch = linux_terminal
    _dispatch_system_open(launch, root, launcher=launcher)
    return {"label": label, "command": command, "terminal": terminal, "terminalRef": terminal_ref, "nativeRef": None}


def _linux_system_terminal_command(root: Path, shell_command: str) -> tuple[str, list[str]] | None:
    candidates = (("x-terminal-emulator", ["x-terminal-emulator", "-e", "sh", "-lc", shell_command]), ("gnome-terminal", ["gnome-terminal", "--working-directory", str(root), "--", "sh", "-lc", shell_command]), ("konsole", ["konsole", "--workdir", str(root), "-e", "sh", "-lc", shell_command]), ("xfce4-terminal", ["xfce4-terminal", "--working-directory", str(root), "-e", "sh", "-lc", shell_command]), ("xterm", ["xterm", "-e", "sh", "-lc", shell_command]))
    return next(((terminal, command) for terminal, command in candidates if shutil.which(terminal)), None)


def _run_osascript(script: str, *, launcher: Any | None = None) -> str:
    command = ["osascript", "-e", script]
    if launcher is not None:
        result = launcher(command)
    else:
        result = subprocess.run(command, capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=10, check=False)
    returncode = getattr(result, "returncode", 0)
    if returncode:
        stderr = str(getattr(result, "stderr", "") or "").strip()
        raise OSError(stderr or "osascript failed")
    return str(getattr(result, "stdout", "") or "").strip()


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
            stdin=subprocess.DEVNULL,
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


def viewer_bootstrap_warning(repo_root: Path) -> dict[str, object] | None:
    """Surface a non-blocking warning when generated bootstrap files are stale."""
    try:
        payload = bootstrap_payload(repo_root, check=True)
    except Exception:
        return None
    if payload.get("ok") is True:
        return None
    paths = [str(path) for path in payload.get("missing_paths", []) if isinstance(path, str)]
    local_instruction_paths = {
        "LOGICS.md",
        "AGENTS.md",
        ".gitignore",
        "logics/instructions.md",
    }
    stale_paths = [path for path in paths if path in local_instruction_paths]
    if not stale_paths:
        return None
    path_summary = ", ".join(stale_paths[:4])
    return {
        "severity": "warning",
        "title": "Logics bootstrap refresh recommended",
        "message": f"Refresh generated Logics assistant instructions with Bootstrap Logics or `logics-manager bootstrap` ({path_summary}).",
        "paths": stale_paths,
        "action": "bootstrap-logics",
    }


def _run_logics_flow(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["logics-manager", "flow", *args]
    flow_runner = runner or subprocess.run
    return flow_runner(command, cwd=repo_root, text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=_scaled_timeout(repo_root, 30))


def _run_logics_command(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["logics-manager", *args]
    logics_runner = runner or subprocess.run
    return logics_runner(command, cwd=repo_root, text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=_scaled_timeout(repo_root, 30))


def _run_read_only_gh(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["gh", *args]
    gh_runner = runner or subprocess.run
    return gh_runner(command, cwd=repo_root, text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=_scaled_timeout(repo_root, 8))


def _run_read_only_glab(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["glab", *args]
    glab_runner = runner or subprocess.run
    return glab_runner(command, cwd=repo_root, text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=_scaled_timeout(repo_root, 8))


def _logics_doc_type(rel_path: str) -> str:
    normalized = rel_path.replace("\\", "/").lstrip("/")
    for family in DOC_FAMILIES:
        if normalized.startswith(f"{family.directory}/"):
            return family.stage
    return ""


def _remote_provider_candidates(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> list[tuple[int, dict[str, str]]]:
    git_which = which or shutil.which
    if not git_which("git"):
        return []
    try:
        remotes = _run_read_only_git(repo_root, ["remote", "-v"], runner=runner)
    except (OSError, subprocess.SubprocessError):
        return []
    if remotes.returncode != 0:
        return []

    candidates: list[tuple[int, dict[str, str]]] = []
    seen: set[tuple[str, str]] = set()
    for line in remotes.stdout.splitlines():
        parts = line.split()
        if len(parts) < 2:
            continue
        remote_name, remote_url = parts[0], parts[1]
        web_url = _github_web_url_from_remote(remote_url)
        provider = "github" if web_url else ""
        if not web_url:
            web_url = _gitlab_web_url_from_remote(remote_url)
            provider = "gitlab" if web_url else ""
        if not web_url or not provider:
            continue
        key = (provider, web_url)
        if key in seen:
            continue
        seen.add(key)
        candidates.append(
            (
                0 if remote_name == "origin" else 1,
                {
                    "provider": provider,
                    "webUrl": web_url,
                    "remoteName": remote_name,
                    "githubUrl": web_url if provider == "github" else "",
                    "gitlabUrl": web_url if provider == "gitlab" else "",
                },
            )
        )
    return sorted(candidates, key=lambda entry: entry[0])


def repository_provider_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, str]:
    candidates = _remote_provider_candidates(repo_root, runner=runner, which=which)
    if not candidates:
        return {"provider": "", "webUrl": "", "remoteName": "", "githubUrl": "", "gitlabUrl": ""}
    return candidates[0][1]


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


def project_picker_tree_payload(base_root: Path, rel_path: str = "", *, max_entries: int = WORKSPACE_TREE_MAX_ENTRIES) -> dict[str, Any]:
    base = base_root.expanduser().resolve()
    normalized = _normalize_workspace_path(rel_path)
    target = (base / normalized).resolve()
    try:
        target.relative_to(base)
    except ValueError as exc:
        raise ValueError("Project picker path escapes root.") from exc
    if not target.exists():
        return {"state": "missing", "path": normalized, "root": str(base), "message": "Folder does not exist."}
    if not target.is_dir():
        return {"state": "not-directory", "path": normalized, "root": str(base), "message": "Path is not a folder."}
    entries: list[dict[str, Any]] = []
    truncated = False
    try:
        children = sorted((child for child in target.iterdir() if child.is_dir()), key=lambda path: path.name.lower())
    except OSError as exc:
        return {"state": "error", "path": normalized, "root": str(base), "message": f"Unable to list folders: {exc}"}
    for child in children:
        if len(entries) >= max_entries:
            truncated = True
            break
        rel = child.relative_to(base).as_posix()
        entries.append({
            "name": child.name,
            "path": rel,
            "hasLogics": holds_corpus(child),
        })
    return {
        "state": "ok",
        "root": str(base),
        "path": normalized,
        "selectedPath": str(target),
        "parentPath": "/".join(normalized.split("/")[:-1]) if normalized else "",
        "entries": entries,
        "truncated": truncated,
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


def workspace_preview_payload(
    repo_root: Path,
    rel_path: str,
    *,
    max_bytes: int = WORKSPACE_PREVIEW_MAX_BYTES,
    max_chars: int = WORKSPACE_PREVIEW_MAX_CHARS,
    full: bool = False,
) -> dict[str, Any]:
    # When the operator forces a full load, raise the caps to the hard ceiling so
    # large-but-reasonable files load while pathological files still stay bounded.
    hard_cap_hit = False
    if full:
        max_bytes = PREVIEW_FORCE_MAX_BYTES
        max_chars = PREVIEW_FORCE_MAX_CHARS
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
            "limit": max_bytes,
            # Only offer "load anyway" when a forced full load could actually fit.
            "canForce": (not full) and size <= PREVIEW_FORCE_MAX_BYTES,
            "message": (
                f"File is {size} bytes; even a forced load is capped at {PREVIEW_FORCE_MAX_BYTES} bytes."
                if full or size > PREVIEW_FORCE_MAX_BYTES
                else f"File preview is limited to {max_bytes} bytes; this file is {size} bytes."
            ),
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
        hard_cap_hit = full
    # Editor convention: a trailing newline does not add a blank final line.
    line_count = content.count("\n") + (0 if (not content or content.endswith("\n")) else 1)
    return {
        "state": "ok",
        "path": normalized,
        "name": target.name,
        "kind": "file",
        "size": size,
        "contentType": content_type or "text/plain",
        "content": content,
        "truncated": truncated,
        # "canForce" tells the client a "load anyway" can raise the cap; once a
        # forced load still truncates, "hardCapHit" signals the ceiling was hit.
        "canForce": truncated and not full,
        "hardCapHit": hard_cap_hit,
        "lineCount": line_count,
        "logicsType": _logics_doc_type(normalized),
        "message": "",
    }


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


CI_RECENT_RUNS_LIMIT = 8

def _recent_ci_runs(runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """req_274: compact recent runs (all workflows on the current branch, newest first)
    for the Recent activity feed, built from the runs ci_status_payload already fetched."""
    recent: list[dict[str, Any]] = []
    for run in runs[:CI_RECENT_RUNS_LIMIT]:
        parsed = _parse_github_actions_run(run, match_source="recent")
        recent.append(
            {
                "id": parsed.get("id"),
                "workflowName": parsed.get("workflowName"),
                "badgeState": parsed.get("badgeState"),
                "updatedAt": parsed.get("updatedAt") or parsed.get("createdAt"),
                "url": parsed.get("htmlUrl"),
                "headSha": parsed.get("headSha"),
                "title": parsed.get("commitMessage") or parsed.get("workflowName"),
            }
        )
    return recent


def ci_status_payload(
    repo_root: Path,
    *,
    git_runner: Any | None = None,
    gh_runner: Any | None = None,
    glab_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    git_which = which or shutil.which
    provider = repository_provider_payload(repo_root, runner=git_runner, which=git_which)
    if provider.get("provider") == "github":
        github_url = provider.get("webUrl", "")
        if not _has_github_actions_workflows(repo_root):
            return {"state": "hidden", "visible": False, "message": "No GitHub Actions workflows detected.", "provider": "github", "repositoryUrl": github_url}
        if not git_which("gh"):
            return {
                "state": "unavailable",
                "visible": True,
                "message": "GitHub CLI is not available on PATH.",
                "provider": "github",
                "repositoryUrl": github_url,
                "badgeState": "unavailable",
            }
        payload = _github_ci_status_payload(repo_root, github_url, git_runner=git_runner, gh_runner=gh_runner)
        payload.setdefault("provider", "github")
        return payload
    if provider.get("provider") == "gitlab":
        gitlab_url = provider.get("webUrl", "")
        if not _has_gitlab_ci_config(repo_root):
            return {"state": "hidden", "visible": False, "message": "No GitLab CI config detected.", "provider": "gitlab", "repositoryUrl": gitlab_url}
        if not git_which("glab"):
            return {
                "state": "unavailable",
                "visible": True,
                "message": "GitLab CLI is not available on PATH.",
                "provider": "gitlab",
                "repositoryUrl": gitlab_url,
                "badgeState": "unavailable",
            }
        return _gitlab_ci_status_payload(repo_root, gitlab_url, git_runner=git_runner, glab_runner=glab_runner)
    return {"state": "hidden", "visible": False, "message": "No GitHub or GitLab remote detected.", "provider": ""}
def release_runs_payload(
    repo_root: Path,
    *,
    git_runner: Any | None = None,
    gh_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    """Status of the GitHub Actions Release workflow runs (tag-triggered).

    Mirrors :func:`ci_status_payload` but targets the Release workflow file
    directly. GitLab is not covered in this surface yet and stays hidden.
    """
    git_which = which or shutil.which
    provider = repository_provider_payload(repo_root, runner=git_runner, which=git_which)
    if provider.get("provider") != "github":
        return {"state": "hidden", "visible": False, "message": "Release run tracking requires a GitHub remote.", "provider": provider.get("provider", "")}
    github_url = provider.get("webUrl", "")
    workflow_file = _github_release_workflow_file(repo_root)
    if not workflow_file:
        return {"state": "hidden", "visible": False, "message": "No release workflow detected.", "provider": "github", "repositoryUrl": github_url}
    if not git_which("gh"):
        return {
            "state": "unavailable",
            "visible": True,
            "message": "GitHub CLI is not available on PATH.",
            "provider": "github",
            "repositoryUrl": github_url,
            "badgeState": "unavailable",
        }
    payload = _github_release_runs_payload(repo_root, github_url, workflow_file, gh_runner=gh_runner)
    payload.setdefault("provider", "github")
    return payload


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


def _mission_prompt_override(body: dict[str, Any], *, max_chars: int = 12000) -> str:
    """Read an operator-edited prompt verbatim, preserving newlines and bounding length."""
    raw = body.get("promptOverride")
    if not isinstance(raw, str):
        return ""
    return raw.strip()[:max_chars]


def _mission_bool_input(body: dict[str, Any], key: str) -> bool:
    value = body.get(key)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _release_contract_prompt_block(repo_root: Path) -> str:
    """Summarise the active release contract so the pre-release mission stays
    aligned with the project's release surfaces instead of hard-coded guesses."""
    try:
        context = load_release_context(repo_root)
    except Exception:
        return ""
    if context.contract is None:
        return "\n".join([
            "No active release contract exists at logics/release/contract.json.",
            "Infer a release contract draft from local sources first (VERSION, pyproject.toml, package.json, README.md, .github/workflows/, changelogs/). Use neighboring projects only as comparison evidence after inspecting local release surfaces.",
        ])
    contract = context.contract
    lines: list[str] = [
        "Use the project release contract (logics/release/contract.json) as the single source of truth for this pre-release.",
    ]
    version_sources = contract.get("version_sources") if isinstance(contract.get("version_sources"), list) else []
    src_descs: list[str] = []
    for src in version_sources:
        if not isinstance(src, dict):
            continue
        path = src.get("path")
        if not path:
            continue
        selector = src.get("selector")
        src_descs.append(f"{path}{f' ({selector})' if selector else ''}")
    if src_descs:
        lines.append("Update exactly these version sources to the target version: " + "; ".join(src_descs) + ".")
    changelog = contract.get("changelog") if isinstance(contract.get("changelog"), dict) else {}
    cl_paths = [entry.get("path") for entry in (changelog.get("paths") or []) if isinstance(entry, dict) and entry.get("path")]
    if cl_paths:
        heading = " A version heading is required." if changelog.get("version_heading_required") else ""
        lines.append("Create or update the changelog at: " + "; ".join(cl_paths) + "." + heading)
    validation = contract.get("validation_commands") if isinstance(contract.get("validation_commands"), list) else []
    cmd_descs: list[str] = []
    for entry in validation:
        if isinstance(entry, dict) and isinstance(entry.get("command"), list) and entry["command"]:
            cmd_descs.append(" ".join(str(part) for part in entry["command"]))
    if cmd_descs:
        lines.append("Project validation commands: " + "; ".join(cmd_descs) + ".")
    git = contract.get("git") if isinstance(contract.get("git"), dict) else {}
    tag_policy = git.get("tag_policy") if isinstance(git.get("tag_policy"), dict) else {}
    git_bits: list[str] = []
    if git.get("allowed_branches"):
        git_bits.append("allowed branches: " + ", ".join(str(branch) for branch in git["allowed_branches"]))
    if tag_policy.get("pattern"):
        git_bits.append(f"release tag pattern: {tag_policy['pattern']}")
    if git_bits:
        lines.append("Git policy — " + "; ".join(git_bits) + ".")
    for intent in (contract.get("operator_intents") if isinstance(contract.get("operator_intents"), list) else []):
        if isinstance(intent, dict) and intent.get("utterance") == "prepare release" and intent.get("boundary"):
            lines.append(f"Operator-intent boundary for preparing a release: {intent['boundary']}")
            break
    try:
        status = release_status_payload(repo_root)
    except Exception:
        status = {}
    if isinstance(status, dict) and status.get("configured"):
        if status.get("target_version"):
            lines.append(f"Current version detected across sources: {status['target_version']}.")
        if status.get("state"):
            lines.append(f"Current release state: {status['state']}.")
    return "\n".join(lines)


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
                result_text = parsed.get("result")
                if isinstance(result_text, str) and result_text.strip():
                    nested = _parse_json_from_text(result_text)
                    if nested:
                        return nested
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


def _bounded_process_text(value: str, limit: int = 12000) -> str:
    text = value.strip()
    if len(text) <= limit:
        return text
    return f"{text[:limit]}\n... truncated ..."


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


def create_request_from_viewer_draft(repo_root: Path, draft: dict[str, Any]) -> dict[str, Any]:
    title = str(draft.get("title") or "").strip()
    intent = str(draft.get("intent") or draft.get("need") or "").strip()
    context = str(draft.get("context") or "").strip()
    if not intent:
        raise ValueError("Need is required.")
    if not title:
        title = intent.splitlines()[0].strip()[:80] or "New request"
    ref = _next_viewer_request_ref(repo_root, title)
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True, exist_ok=True)
    rel_path = f"logics/request/{ref}.md"
    path = repo_root / rel_path
    context_lines = [f"- {line.strip()}" for line in context.splitlines() if line.strip()]
    if not context_lines:
        context_lines = ["- Add constraints, links, scope notes, or acceptance hints before triage."]
    text = "\n".join([
        f"## {ref} - {title}",
        "> Status: Draft",
        "> Understanding: 50%",
        "> Confidence: 50%",
        "> Complexity: Medium",
        "> Theme: Viewer request",
        "",
        "# Needs",
        f"- {intent}",
        "",
        "# Context",
        *context_lines,
        "",
        "# Authoring note",
        "- This request was created directly by the user from the viewer.",
        "- If an assistant reads this request, it may reformat it, translate it to English, and improve clarity while preserving the user's intent.",
        "",
        "# Acceptance Criteria",
        "- AC1: The request has been reviewed and clarified enough to triage.",
        "- AC2: Follow-up backlog items preserve the need and relevant context.",
        "",
    ])
    path.write_text(text, encoding="utf-8")
    return {"id": ref, "path": rel_path, "title": title}


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")


def _tree_latest_mtime_ns(root: Path, *, suffixes: tuple[str, ...] = (".md",)) -> int:
    if not root.is_dir():
        return 0
    latest = 0
    try:
        for path in root.rglob("*"):
            if not path.is_file() or (suffixes and path.suffix.lower() not in suffixes):
                continue
            try:
                latest = max(latest, path.stat().st_mtime_ns)
            except OSError:
                continue
    except OSError:
        return latest
    return latest


def _stable_json_signature(value: Any) -> str:
    return hashlib.sha1(json.dumps(value, sort_keys=True, default=str).encode("utf-8")).hexdigest()
STATUS_CACHE_TTL_SECONDS = 2.0
REMOTE_STATUS_CACHE_TTL_SECONDS = 60.0
VIEWER_EVENT_POLL_SECONDS = 1.0
VIEWER_EVENT_REMOTE_POLL_SECONDS = 5.0


def _status_cache_ttl_seconds(name: str) -> float:
    if name in {"ci", "ci-status", "releaseRuns", "release-runs"}:
        return REMOTE_STATUS_CACHE_TTL_SECONDS
    if name in {"cdxDisk", "cdx-disk"}:
        # Disk scans walk every profile directory; don't redo them on every poll.
        return 300.0
    if name == "projectState":
        # Scanning every sibling corpus takes seconds; the switcher opens often
        # and the numbers move on the scale of a commit, not a keystroke.
        return 120.0
    return STATUS_CACHE_TTL_SECONDS


VIEWER_MUTATING_ROUTES = frozenset(
    {
        "/api/edit",
        "/api/git-commit",
        "/api/git-fetch",
        "/api/open-file",
        "/api/open-repo-folder",
        "/api/bootstrap-logics",
        "/api/new-request",
        "/api/restart-viewer",
        "/api/stop-viewer",
        "/api/switch-project",
        "/api/select-project-root",
        "/api/select-fleet-root",
        "/api/remove-fleet-root",
        "/api/preferences",
        "/api/select-project-root-path",
        "/api/cdx-report-request",
        "/api/cdx-mission-run",
        "/api/cdx-mission-apply-plan",
        "/api/workshop-command-start",
        "/api/workshop-command-stop",
        "/api/workshop-terminal-start",
        "/api/workshop-terminal-external-start",
        "/api/workshop-terminal-stop",
        "/api/workshop-terminal-input",
        "/api/workshop-terminal-resize",
        "/api/workshop-terminal-rename",
        "/api/cdx-import",
        "/api/cdx-export",
        "/api/cdx-toggle",
        "/api/cdx-permission",
        "/api/cdx-config",
        "/api/cdx-remove",
        "/api/cdx-reset",
        "/api/release-reset",
        "/api/update-status",
        "/api/apply-fixes",
        "/api/mcp-connector",
        *viewer_project_tools.MUTATING_ROUTES,
        "/api/lan/devices/revoke",
    }
)


class LogicsViewerServer(ThreadingHTTPServer):
    daemon_threads = True
    block_on_close = False
    # http.server.HTTPServer sets allow_reuse_address = 1 unconditionally.
    # On POSIX, SO_REUSEADDR only helps rebind a port stuck in TIME_WAIT; a
    # port with a live listener still correctly fails. On Windows, Winsock's
    # SO_REUSEADDR is permissive enough to let a second bind onto a port with
    # an active listener succeed silently - confirmed for real on a Windows
    # machine: test_server_port_collisions.py's collision test never raised
    # at all there, so the EADDRINUSE handling below never ran. Disabling it
    # trades away instant-restart-after-crash convenience for the one-viewer-
    # per-port guarantee actually holding on every platform.
    allow_reuse_address = False

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
        fleet: bool = False,
        include_launch_project: bool = True,
    ):
        self.launch_repo_root = repo_root.resolve()
        self.fleet = fleet
        roots = fleet_roots() if fleet else []
        self.project_roots = (
            [project for root in roots for project in root.iterdir() if project.is_dir() and _looks_like_viewer_project(project)]
            if fleet else discover_viewer_project_roots(self.launch_repo_root)
        )
        if include_launch_project and self.launch_repo_root not in self.project_roots:
            self.project_roots.append(self.launch_repo_root)
        # Dev-only: offer a synthetic "all states" board in the project switcher.
        self.demo_project_root = ensure_demo_corpus_if_dev()
        if self.demo_project_root is not None and self.demo_project_root not in self.project_roots:
            self.project_roots.append(self.demo_project_root)
        self.project_root_by_id = {_viewer_project_id(root): root.resolve() for root in self.project_roots}
        self.active_project_id = _viewer_project_id(self.launch_repo_root)
        self._request_context = threading.local()
        self.project_picker_base_root = Path.home().resolve()
        try:
            self.project_picker_initial_path = self.launch_repo_root.parent.relative_to(self.project_picker_base_root).as_posix()
        except ValueError:
            self.project_picker_base_root = self.launch_repo_root.parent
            self.project_picker_initial_path = ""
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
        self.restart_requested = False
        self.mcp_connector: subprocess.Popen[str] | None = None
        self.mcp_connector_url = ""
        self.mcp_connector_token = ""
        self.mcp_connector_error = ""
        self.mcp_connector_lock = threading.RLock()
        # Cache of (monotonic_ts, etag, body_bytes) keyed by "<route>::<repo_root>".
        self.status_cache: dict[str, tuple[float, str, bytes]] = {}
        # Cache of (monotonic_ts, payload) keyed by "<component>::<repo_root>",
        # shared between the individual status endpoints and the consolidated
        # /api/status so an open screen and the badge refresh in the same tick
        # do not each recompute the same component.
        self.status_components: dict[str, tuple[float, Any]] = {}
        self.status_cache_lock = threading.Lock()
        self.event_seq = 0
        super().__init__(server_address, LogicsViewerRequestHandler)
        if tls_context is not None:
            self.socket = tls_context.wrap_socket(self.socket, server_side=True)

    @property
    def repo_root(self) -> Path:
        return getattr(self._request_context, "repo_root", self.launch_repo_root)

    def set_request_project(self, project_id: str | None) -> Path:
        if not project_id:
            target = self.launch_repo_root
        else:
            target = self.project_root_by_id.get(project_id)
            if target is None:
                for project in fleet_projects():
                    if _viewer_project_id(project) == project_id:
                        self.project_roots.append(project)
                        self.project_root_by_id[project_id] = project
                        target = project
                        break
            if target is None or not target.is_dir():
                raise ValueError("Unknown project id.")
        self._request_context.repo_root = target
        return target

    @property
    def url_scheme(self) -> str:
        return "https" if self.tls_enabled else "http"

    def server_close(self) -> None:
        try:
            self.stop_mcp_connector()
            self.workshop_sessions.shutdown()
        finally:
            try:
                self.workshop_terminals.shutdown()
            finally:
                super().server_close()

    def mcp_connector_payload(self) -> dict[str, Any]:
        with self.mcp_connector_lock:
            running = self.mcp_connector is not None and self.mcp_connector.poll() is None
            return {"running": running, "url": self.mcp_connector_url if running else "", "token": self.mcp_connector_token if running else "", "error": self.mcp_connector_error if not running else ""}

    def start_mcp_connector(self) -> dict[str, Any]:
        with self.mcp_connector_lock:
            if self.mcp_connector is not None and self.mcp_connector.poll() is None:
                return self.mcp_connector_payload()
            self.mcp_connector_url = ""
            self.mcp_connector_token = ""
            self.mcp_connector_error = ""
            command = [sys.executable, "-m", "logics_manager", "mcp", "tunnel", "--repo-root", self.repo_root.as_posix()]
            self.mcp_connector = subprocess.Popen(command, cwd=self.repo_root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            process = self.mcp_connector
        def capture() -> None:
            assert process.stdout is not None
            for line in process.stdout:
                match = re.search(r"ChatGPT developer-mode MCP URL:\s*(https://\S+)", line)
                if match:
                    with self.mcp_connector_lock: self.mcp_connector_url = match.group(1)
                token_match = re.search(r"Authorization header:\s*Bearer\s+(\S+)", line)
                if token_match:
                    with self.mcp_connector_lock: self.mcp_connector_token = token_match.group(1)
            with self.mcp_connector_lock:
                if not self.mcp_connector_url and process.returncode:
                    self.mcp_connector_error = "MCP connector stopped before publishing an HTTPS URL."
        threading.Thread(target=capture, daemon=True).start()
        return self.mcp_connector_payload()

    def stop_mcp_connector(self) -> None:
        with self.mcp_connector_lock:
            process = self.mcp_connector
            self.mcp_connector = None
            self.mcp_connector_url = ""
            self.mcp_connector_token = ""
            self.mcp_connector_error = ""
        if process is not None and process.poll() is None:
            process.terminate()

    def project_registry_payload(self) -> list[dict[str, Any]]:
        registry = viewer_project_registry(self.repo_root, project_roots=self.project_roots)
        if self.demo_project_root is not None:
            demo_id = _viewer_project_id(self.demo_project_root)
            for entry in registry:
                if entry.get("id") == demo_id:
                    entry["name"] = DEMO_PROJECT_NAME
                    entry["message"] = "Synthetic dev-only corpus covering every board card state."
        return registry

    def add_fleet_root(self, root: Path) -> None:
        root = root.resolve()
        if not root.is_dir():
            raise FileNotFoundError(str(root))
        roots = fleet_roots()
        if root not in roots:
            update_viewer_preferences(self.launch_repo_root, {"fleetRoots": [str(item) for item in [*roots, root]]})
        try:
            candidates = [item.resolve() for item in root.iterdir() if item.is_dir() and _looks_like_viewer_project(item)]
        except OSError:
            candidates = []
        for project in candidates:
            project_id = _viewer_project_id(project)
            if project_id not in self.project_root_by_id:
                self.project_roots.append(project)
                self.project_root_by_id[project_id] = project

    def remove_fleet_root(self, root: Path) -> None:
        root = root.resolve()
        roots = fleet_roots()
        if root not in roots:
            raise ValueError("Unknown fleet root.")
        update_viewer_preferences(self.launch_repo_root, {"fleetRoots": [str(item) for item in roots if item != root]})
        retained = [project for project in self.project_roots if project == self.launch_repo_root or root not in project.parents]
        self.project_roots = retained
        self.project_root_by_id = {_viewer_project_id(project): project for project in retained}

    def project_state_payload(self, *, force: bool = False) -> dict[str, Any]:
        """Open-work and issue counts per listed project, cached.

        Reuses the per-repository reports the fleet command already aggregates,
        rather than adding a third aggregation. A project that fails is reported
        with its error so the others still render.

        Cached through the same mechanism as the git, CI, and session panels:
        the scan measured about six seconds across thirty-three sibling corpora
        and used to re-run on every menu open.
        """
        return self.status_component("projectState", self._build_project_state, force=force)

    def _build_project_state(self) -> dict[str, Any]:
        projects: dict[str, Any] = {}
        for entry in self.project_registry_payload():
            root = Path(str(entry["root"]))
            if not entry.get("hasLogics"):
                projects[str(entry["id"])] = {"ok": True, "hasLogics": False}
                continue
            try:
                status = status_payload(root, limit=1)
                health = health_payload(root, limit=1)
            except (ConfigError, OSError, ValueError) as exc:
                projects[str(entry["id"])] = {"ok": False, "error": str(exc)}
                continue
            projects[str(entry["id"])] = {
                "ok": True,
                "hasLogics": True,
                "openCount": status.get("open_count", 0),
                "issueCount": health.get("issue_count", 0),
                "staleCount": health.get("stale_doc_count", 0),
                "nextActions": status.get("next_actions", []),
            }
        return {"projects": projects}

    def status_component(self, name: str, producer: Any, *, force: bool = False) -> Any:
        """Return a status component payload, recomputing at most once per TTL.

        Shared by the individual status endpoints and the consolidated
        /api/status so concurrent consumers reuse a single computation.
        """
        key = f"{name}::{self.repo_root}"
        now = time.monotonic()
        if not force:
            with self.status_cache_lock:
                entry = self.status_components.get(key)
                if entry is not None and (now - entry[0]) < _status_cache_ttl_seconds(name):
                    return entry[1]
        value = producer()
        with self.status_cache_lock:
            self.status_components[key] = (time.monotonic(), value)
        return value

    def invalidate_status_components(self, names: set[str] | None = None) -> None:
        with self.status_cache_lock:
            if names is None:
                self.status_cache.clear()
                self.status_components.clear()
                return
            route_names = {
                "git": {"git-status", "status"},
                "ci": {"ci-status", "status"},
                "releaseRuns": {"release-runs", "status"},
                "cdx": {"cdx-status", "cdx-runs", "cdx-history", "status"},
                "cdxRuns": {"cdx-runs", "status"},
                "cdxHistory": {"cdx-history"},
                "cdxDisk": {"cdx-disk"},
                "cdxMemory": {"cdx-memory", "status"},
            }
            component_names = set(names)
            cache_names: set[str] = set()
            for name in component_names:
                cache_names.update(route_names.get(name, {name, "status"}))
            for key in list(self.status_components):
                if key.split("::", 1)[0] in component_names:
                    self.status_components.pop(key, None)
            for key in list(self.status_cache):
                if key.split("::", 1)[0] in cache_names:
                    self.status_cache.pop(key, None)

    def next_event_seq(self) -> int:
        with self.status_cache_lock:
            self.event_seq += 1
            return self.event_seq

    def viewer_payload(
        self,
        *,
        selected_id: str | None = None,
        project_id: str | None = None,
        fleet_home: bool = False,
    ) -> dict[str, Any]:
        repo_root = self.set_request_project(project_id) if project_id is not None else self.repo_root
        payload = viewer_data_payload(
            repo_root,
            selected_id=selected_id,
            auto_refresh_interval_seconds=self.auto_refresh_interval_seconds,
            auto_refresh_interval_forced=self.auto_refresh_interval_forced,
            projects=self.project_registry_payload(),
        )
        payload["lanMode"] = bool(self.lan_mode)
        payload["fleet"] = self.fleet
        payload["fleetHome"] = bool(fleet_home)
        payload["fleetRoots"] = [str(root) for root in fleet_roots()]
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
        return self.viewer_payload(project_id=project_id)

    def switch_project_root(self, project_root: Path) -> dict[str, Any]:
        target = project_root.expanduser().resolve()
        if not target.is_dir():
            raise FileNotFoundError(str(target))
        project_id = _viewer_project_id(target)
        if project_id not in self.project_root_by_id:
            self.project_roots.append(target)
            self.project_root_by_id[project_id] = target
        return self.switch_project(project_id)

    def _shutdown_soon(self) -> None:
        def run() -> None:
            time.sleep(0.2)
            self.shutdown()

        threading.Thread(target=run, daemon=True).start()

    def request_restart(self) -> None:
        if self.restart_requested:
            return
        self.restart_requested = True
        self._shutdown_soon()

    def request_stop(self) -> None:
        # Same path as restart but without arming restart_requested, so
        # serve_forever returns and main exits instead of re-exec'ing.
        self._shutdown_soon()


# Status GET routes: path -> (response label, status component name).
_STATUS_ROUTE_TABLE: dict[str, tuple[str, str]] = {
    "/api/git-status": ("git-status", "git"),
    "/api/ci-status": ("ci-status", "ci"),
    "/api/release-status": ("release-status", "release"),
    "/api/release-runs": ("release-runs", "releaseRuns"),
    "/api/cdx-status": ("cdx-status", "cdx"),
    "/api/cdx-runs": ("cdx-runs", "cdxRuns"),
    "/api/cdx-history": ("cdx-history", "cdxHistory"),
    "/api/cdx-disk": ("cdx-disk", "cdxDisk"),
    "/api/cdx-memory": ("cdx-memory", "cdxMemory"),
}


class LogicsViewerRequestHandler(BaseHTTPRequestHandler):
    server: LogicsViewerServer

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send_bytes(
        self,
        content: bytes,
        *,
        status: int = 200,
        content_type: str = "application/octet-stream",
        etag: str = "",
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        if etag:
            # no-cache (not no-store) keeps the response in the browser cache
            # but forces revalidation, so fetch() transparently sends
            # If-None-Match and we can answer 304 when nothing changed.
            self.send_header("Cache-Control", "no-cache")
            self.send_header("ETag", etag)
        else:
            self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        try:
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _send_json(self, payload: Any, *, status: int = 200) -> None:
        self._send_bytes(_json_bytes(payload), status=status, content_type="application/json; charset=utf-8")

    def _status_component(self, name: str, *, force: bool = False) -> Any:
        repo_root = self.server.repo_root
        producers = {
            "git": lambda: git_status_payload(repo_root),
            "ci": lambda: ci_status_payload(repo_root),
            "release": lambda: release_status_payload(repo_root),
            "releaseRuns": lambda: release_runs_payload(repo_root),
            "cdx": lambda: cdx_status_payload(repo_root),
            "cdxRuns": lambda: cdx_runs_payload(repo_root),
            "cdxHistory": lambda: cdx_history_payload(repo_root),
            "cdxDisk": lambda: cdx_disk_payload(repo_root),
            "cdxMemory": lambda: cdx_memory_payload(repo_root),
        }
        return self.server.status_component(name, producers[name], force=force)

    def _send_status_json(self, cache_key: str, producer: Any) -> None:
        """Serve a status payload with a short TTL cache and ETag revalidation.

        `producer` is a zero-arg callable returning the inner payload dict; it
        is only invoked on a cache miss. Identical back-to-back polls (and the
        several badge fetches each auto-refresh fires) reuse the cached body.
        """
        server = self.server
        full_key = f"{cache_key}::{server.repo_root}"
        now = time.monotonic()
        request_cache_control = self.headers.get("Cache-Control", "")
        force = "no-store" in request_cache_control or "no-cache" in request_cache_control or self.headers.get("Pragma", "") == "no-cache"
        cached: tuple[float, str, bytes] | None = None
        if not force:
            with server.status_cache_lock:
                entry = server.status_cache.get(full_key)
                if entry is not None and (now - entry[0]) < _status_cache_ttl_seconds(cache_key):
                    cached = entry
        if cached is None:
            body = _json_bytes({"ok": True, "payload": producer(force=force)})
            etag = '"%s"' % hashlib.sha1(body).hexdigest()
            with server.status_cache_lock:
                server.status_cache[full_key] = (now, etag, body)
        else:
            _, etag, body = cached
        if etag and self.headers.get("If-None-Match", "") == etag:
            self.send_response(HTTPStatus.NOT_MODIFIED.value)
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            return
        self._send_bytes(body, content_type="application/json; charset=utf-8", etag=etag)

    def _send_error_json(self, status: HTTPStatus, message: str) -> None:
        self._send_json({"ok": False, "error": message}, status=status.value)

    def _read_json_body_strict(self) -> Any:
        """Parse Content-Length and the JSON body, raising JSONDecodeError on
        malformed input (bad header or bad JSON) so callers' existing
        ``except json.JSONDecodeError`` turns it into a clean 400."""
        raw_length = self.headers.get("Content-Length", "0") or "0"
        try:
            length = int(raw_length)
        except ValueError as exc:
            raise json.JSONDecodeError("Invalid Content-Length", raw_length, 0) from exc
        raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        return json.loads(raw_body or "{}")

    def _read_json_body(self) -> dict[str, Any]:
        try:
            payload = self._read_json_body_strict()
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    def _set_project_context(self, parsed: Any) -> bool:
        project_id = parse_qs(parsed.query).get("project", [None])[0]
        try:
            self.server.set_request_project(project_id)
        except ValueError as exc:
            self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return False
        return True

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
        paired_device = self._paired_device_for_request(parsed)
        if not self._client_is_loopback() and (paired_device is None or paired_device.id != device_id):
            self._send_error_json(HTTPStatus.FORBIDDEN, "Device can only revoke its own pairing.")
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

    def _stream_sse_events(self, session: Any, parsed: Any, *, render_item: Any, event_name: str, sleep_delay: float) -> None:
        """Shared SSE loop for the workshop terminal and command streamers.

        ``render_item(seq, item)`` produces the per-item ``event: <event_name>``
        block; everything else (since parsing, headers, end event, keep-alives)
        is identical across both callers.
        """
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
                    for seq, item in snapshot:
                        last_seq = seq
                        try:
                            payload = json.dumps(render_item(seq, item))
                            self.wfile.write(f"event: {event_name}\ndata: {payload}\n\n".encode("utf-8"))
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
                _time.sleep(sleep_delay)
        except (BrokenPipeError, ConnectionResetError):
            return

    def _stream_workshop_terminal(self, session: "WorkshopTerminalSession", parsed: Any) -> None:
        self._stream_sse_events(
            session,
            parsed,
            render_item=lambda seq, chunk: {"seq": seq, "data": chunk},
            event_name="data",
            sleep_delay=0.1,
        )

    def _stream_workshop_session(self, session: "WorkshopCommandSession", parsed: Any) -> None:
        def render_item(seq: int, line: str) -> dict[str, Any]:
            channel, _, text = line.partition("\t")
            return {"seq": seq, "channel": channel, "line": text}

        self._stream_sse_events(session, parsed, render_item=render_item, event_name="line", sleep_delay=0.2)

    def _viewer_event_snapshot(self, *, include_remote: bool = False) -> dict[str, Any]:
        repo_root = self.server.repo_root
        snapshot: dict[str, Any] = {
            "corpus": _tree_latest_mtime_ns(repo_root / "logics"),
            "git": _git_event_signature(repo_root),
        }
        if include_remote:
            snapshot["ci"] = _stable_json_signature(self._status_component("ci"))
            snapshot["releaseRuns"] = _stable_json_signature(self._status_component("releaseRuns"))
            snapshot["cdx"] = _stable_json_signature({
                "status": self._status_component("cdx"),
                "runs": self._status_component("cdxRuns"),
            })
        return snapshot

    def _stream_viewer_events(self) -> None:
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError):
            return
        try:
            baseline = self._viewer_event_snapshot(include_remote=True)
            payload = json.dumps({"seq": self.server.next_event_seq(), "components": []})
            self.wfile.write(f"event: ready\ndata: {payload}\n\n".encode("utf-8"))
            self.wfile.flush()
            remote_due_at = time.monotonic() + VIEWER_EVENT_REMOTE_POLL_SECONDS
            idle_ticks = 0
            while True:
                now = time.monotonic()
                include_remote = now >= remote_due_at
                current = self._viewer_event_snapshot(include_remote=include_remote)
                if include_remote:
                    remote_due_at = now + VIEWER_EVENT_REMOTE_POLL_SECONDS
                else:
                    for name in ("ci", "releaseRuns", "cdx"):
                        if name in baseline:
                            current[name] = baseline[name]
                changed = sorted(name for name, value in current.items() if baseline.get(name) != value)
                if changed:
                    baseline = current
                    self.server.invalidate_status_components(set(changed))
                    payload = json.dumps({"seq": self.server.next_event_seq(), "components": changed})
                    self.wfile.write(f"event: changed\ndata: {payload}\n\n".encode("utf-8"))
                    self.wfile.flush()
                    idle_ticks = 0
                else:
                    idle_ticks += 1
                    if idle_ticks >= 30:
                        self.wfile.write(b": keep-alive\n\n")
                        self.wfile.flush()
                        idle_ticks = 0
                time.sleep(VIEWER_EVENT_POLL_SECONDS)
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

    def _handle_chain_graph_get(self, parsed: Any) -> bool:
        if parsed.path != "/api/chain-graph":
            return False
        ref = parse_qs(parsed.query).get("ref", [""])[0]
        if not ref:
            self._send_error_json(HTTPStatus.BAD_REQUEST, "Missing required 'ref' query parameter.")
            return True
        self._send_json({"ok": True, "payload": resolve_request_chain(self.server.repo_root, ref)})
        return True

    def _handle_runbook_graph_get(self, parsed: Any) -> bool:
        if parsed.path != "/api/runbook-graph":
            return False
        self._send_json({"ok": True, "payload": resolve_runbook_library_graph(self.server.repo_root)})
        return True

    def _handle_runbooks_get(self, parsed: Any) -> bool:
        if parsed.path != "/api/runbooks":
            return False
        query = parse_qs(parsed.query).get("q", [""])[0].strip()
        include_hidden = parse_qs(parsed.query).get("includeHidden", [""])[0].lower() in {"1", "true", "yes"}
        payload = (
            match_runbooks_payload(self.server.repo_root, query, limit=RUNBOOK_MATCH_LIMIT, include_hidden=include_hidden)
            if query
            else list_active_runbooks_payload(self.server.repo_root, limit=10, include_hidden=include_hidden)
        )
        self._send_json({"ok": True, "payload": payload})
        return True

    def _handle_mcp_connector_post(self, parsed: Any) -> bool:
        if parsed.path != "/api/mcp-connector":
            return False
        try:
            body = self._read_json_body_strict()
            action = str(body.get("action") or "")
            payload = self.server.start_mcp_connector() if action == "start" else self.server.stop_mcp_connector() or self.server.mcp_connector_payload()
            self._send_json({"ok": True, "payload": payload})
        except (ValueError, OSError) as exc:
            self._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
        return True

    def _handle_apply_fixes_post(self, parsed: Any) -> bool:
        if parsed.path != "/api/apply-fixes":
            return False
        # req_321/item_664: reuses the exact same repair logic CLI and MCP already call.
        try:
            result = audit_payload(
                self.server.repo_root,
                autofix_structure=True,
                autofix_ac_traceability=True,
                group_by_doc=True,
            )
            self._send_json({"ok": True, "payload": self.server.viewer_payload(), "audit": result})
        except OSError as exc:
            self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
        return True

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if not self._lan_auth_passes(parsed, method="GET"):
            self._send_lan_unauthorized()
            return
        if not self._set_project_context(parsed):
            return
        route = parsed.path
        if viewer_diagnostics.handle_get(self, route):
            return
        if route == "/api/lan/devices":
            registry = self.server.device_registry
            payload = registry.list_payload() if registry is not None else []
            self._send_json({"ok": True, "payload": payload})
            return
        if route == "/":
            self._serve_file(VIEWER_ROOT / "index.html", root=VIEWER_ROOT)
            return
        if route in {"/browser-host.js", "/browser-host.js.map"}:
            self._serve_file(VIEWER_ROOT / route.removeprefix("/"), root=VIEWER_ROOT)
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
            rel_media = unquote(route.removeprefix("/media/")).replace("\\", "/").lstrip("/")
            media_path = (SHARED_MEDIA_ROOT / rel_media).resolve()
            if SHARED_MEDIA_ROOT.resolve() != media_path and SHARED_MEDIA_ROOT.resolve() not in media_path.parents:
                self._send_error_json(HTTPStatus.NOT_FOUND, "Not found")
                return
            self._serve_file(media_path, root=SHARED_MEDIA_ROOT)
            return
        if route == "/api/items":
            project_id = parse_qs(parsed.query).get("project", [""])[0]
            self._send_json(
                {
                    "ok": True,
                    "payload": self.server.viewer_payload(fleet_home=bool(self.server.fleet and not project_id)),
                }
            )
            return
        if route == "/api/projects":
            self._send_json({"ok": True, "payload": {"projects": self.server.project_registry_payload()}})
            return
        if route == "/api/projects-state":
            # Loaded on demand, when the switcher opens: the switcher listed
            # projects with no state at all, so finding where work was blocked
            # meant switching into each one in turn.
            self._send_json({"ok": True, "payload": self.server.project_state_payload()})
            return
        if route == "/api/live":
            return self._send_json({"ok": True})
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
        if route == "/api/health":
            # The health screen was built from lint and audit alone, so blocked
            # documents, backlog items with no task, and stale documents were
            # reported by the CLI and invisible here.
            try:
                payload = health_payload(self.server.repo_root)
            except (ConfigError, OSError, ValueError) as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
                return
            self._send_json({"ok": True, "payload": payload})
            return
        if route == "/api/preferences":
            self._send_json({"ok": True, "payload": read_viewer_preferences(self.server.repo_root)})
            return
        if route == "/api/capabilities":
            self._send_json({"ok": True, "payload": viewer_project_capabilities(self.server.repo_root)})
            return
        if viewer_project_tools.handle_get(self, route): return
        if route == "/api/events":
            self._stream_viewer_events()
            return
        if viewer_cdx_routes.handle_get(self, route, parsed):
            return
        status_route = _STATUS_ROUTE_TABLE.get(route)
        if status_route is not None:
            label, component = status_route
            self._send_status_json(label, lambda *, force=False: self._status_component(component, force=force))
            return
        if route == "/api/status":
            self._send_status_json(
                "status",
                lambda *, force=False: {
                    "git": self._status_component("git", force=force),
                    "ci": self._status_component("ci", force=force),
                    "releaseRuns": self._status_component("releaseRuns", force=force),
                    "cdx": self._status_component("cdx", force=force),
                    "cdxRuns": self._status_component("cdxRuns", force=force),
                },
            )
            return
        if route == "/api/git-diff":
            params = parse_qs(parsed.query)
            rel_path = params.get("path", [""])[0]
            cached = params.get("cached", [""])[0].lower() in {"1", "true", "yes"}
            self._send_json({"ok": True, "payload": git_diff_payload(self.server.repo_root, rel_path, cached=cached)})
            return
        if route == "/api/git-commit-diff":
            ref = parse_qs(parsed.query).get("ref", [""])[0]
            self._send_json({"ok": True, "payload": git_commit_diff_payload(self.server.repo_root, ref)})
            return
        if route == "/api/git-file-preview":
            params = parse_qs(parsed.query)
            rel_path = params.get("path", [""])[0]
            full = params.get("full", [""])[0].lower() in {"1", "true", "yes"}
            self._send_json({"ok": True, "payload": git_file_preview_payload(self.server.repo_root, rel_path, full=full)})
            return
        if self._handle_chain_graph_get(parsed):
            return
        if self._handle_runbook_graph_get(parsed):
            return
        if self._handle_runbooks_get(parsed):
            return
        if route == "/api/mcp-connector":
            self._send_json({"ok": True, "payload": self.server.mcp_connector_payload()})
            return
        if route == "/api/workspace-tree":
            rel_path = parse_qs(parsed.query).get("path", [""])[0]
            try:
                self._send_json({"ok": True, "payload": workspace_tree_payload(self.server.repo_root, rel_path)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if route == "/api/workspace-preview":
            params = parse_qs(parsed.query)
            rel_path = params.get("path", [""])[0]
            full = params.get("full", [""])[0].lower() in {"1", "true", "yes"}
            try:
                self._send_json({"ok": True, "payload": workspace_preview_payload(self.server.repo_root, rel_path, full=full)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if route == "/api/project-picker-tree":
            params = parse_qs(parsed.query, keep_blank_values=True)
            rel_path = params.get("path", [self.server.project_picker_initial_path])[0]
            try:
                self._send_json({"ok": True, "payload": project_picker_tree_payload(self.server.project_picker_base_root, rel_path)})
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if viewer_workshop_routes.handle_get(self, route, parsed):
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

    def _handle_preferences_post(self) -> None:
        try:
            body = self._read_json_body_strict()
        except (OSError, ValueError) as exc:
            self._send_error_json(HTTPStatus.BAD_REQUEST, f"Invalid preference payload: {exc}")
            return
        patch = body.get("preferences") if isinstance(body.get("preferences"), dict) else {}
        removed = body.get("removed") if isinstance(body.get("removed"), dict) else {}
        try:
            payload = update_viewer_preferences(self.server.repo_root, patch, removed=removed)
        except OSError as exc:
            self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, f"Unable to store preferences: {exc}")
            return
        self._send_json({"ok": True, "payload": payload})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if not self._origin_check_passes():
            self._send_cross_origin_forbidden()
            return
        if not self._lan_auth_passes(parsed, method="POST"):
            self._send_lan_unauthorized()
            return
        if not self._set_project_context(parsed):
            return
        if viewer_diagnostics.handle_post(self, parsed.path):
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
        if parsed.path == "/api/preferences":
            self._handle_preferences_post()
            return
        if parsed.path == "/api/refresh":
            self._send_json(
                {
                    "ok": True,
                    "payload": self.server.viewer_payload(),
                }
            )
            return
        if parsed.path == "/api/release-reset":
            try:
                self._send_json({"ok": True, "payload": release_reset_payload(self.server.repo_root)})
            except (OSError, ValueError) as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, f"Unable to reset release evidence: {exc}")
            return
        if parsed.path == "/api/git-commit":
            try:
                body = self._read_json_body_strict()
                files = body.get("files")
                message = str(body.get("message") or "")
                if not isinstance(files, list) or not all(isinstance(item, str) for item in files):
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "Files must be a list of paths.")
                    return
                payload = git_commit_payload(self.server.repo_root, files, message)
                if payload.get("state") == "ok":
                    self.server.invalidate_status_components({"git"})
                    self._send_json({"ok": True, "payload": payload})
                else:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, str(payload.get("message") or "Git commit failed."))
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return
        if parsed.path == "/api/git-fetch":
            payload = git_fetch_payload(self.server.repo_root)
            if payload.get("state") == "ok":
                self.server.invalidate_status_components({"git"})
                self._send_json({"ok": True, "payload": payload})
            else:
                self._send_error_json(HTTPStatus.BAD_REQUEST, str(payload.get("message") or "Git fetch failed."))
            return
        if parsed.path == "/api/switch-project":
            try:
                body = self._read_json_body_strict()
                project_id = str(body.get("projectId") or "")
                self._send_json({"ok": True, "payload": self.server.switch_project(project_id)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            except FileNotFoundError as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if parsed.path == "/api/select-project-root":
            try:
                selected = select_project_root_with_native_dialog(self.server.repo_root)
                if selected is None:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "No folder selected.")
                    return
                self._send_json({"ok": True, "payload": self.server.switch_project_root(selected)})
            except RuntimeError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            except FileNotFoundError as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if parsed.path == "/api/select-fleet-root":
            try:
                selected = select_project_root_with_native_dialog(Path.home())
                if selected is None:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "No folder selected.")
                    return
                self.server.add_fleet_root(selected)
                self._send_json({"ok": True, "payload": self.server.viewer_payload(fleet_home=True)})
            except RuntimeError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            except FileNotFoundError as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if parsed.path == "/api/remove-fleet-root":
            try:
                body = self._read_json_body_strict()
                self.server.remove_fleet_root(Path(str(body.get("root") or "")).expanduser())
                self._send_json({"ok": True, "payload": self.server.viewer_payload(fleet_home=True)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            return
        if parsed.path == "/api/select-project-root-path":
            try:
                body = self._read_json_body_strict()
                rel_path = str(body.get("path") or "")
                normalized = _normalize_workspace_path(rel_path)
                base = self.server.project_picker_base_root.resolve()
                selected = (base / normalized).resolve()
                try:
                    selected.relative_to(base)
                except ValueError as exc:
                    raise ValueError("Selected project path escapes root.") from exc
                self._send_json({"ok": True, "payload": self.server.switch_project_root(selected)})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
            except FileNotFoundError as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            return
        if viewer_workshop_routes.handle_post(self, parsed):
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
        if self._handle_apply_fixes_post(parsed):
            return
        if self._handle_mcp_connector_post(parsed):
            return
        if parsed.path == "/api/new-request":
            try:
                body = self._read_json_body_strict()
                if not isinstance(body, dict):
                    raise ValueError("Request body must be a JSON object.")
                draft = body.get("draft") if isinstance(body.get("draft"), dict) else body
                created = create_request_from_viewer_draft(self.server.repo_root, draft)
                self._send_json({"ok": True, "created": created, "payload": self.server.viewer_payload(selected_id=created["id"])})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except ValueError as exc:
                self._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
            return
        if viewer_project_tools.handle_post(self, parsed.path): return
        if parsed.path == "/api/restart-viewer":
            self.server.request_restart()
            self._send_json({"ok": True, "message": "Viewer server restarting."})
            return
        if parsed.path == "/api/stop-viewer":
            self.server.request_stop()
            self._send_json({"ok": True, "message": "Viewer server stopping."})
            return
        if viewer_cdx_routes.handle_post(self, parsed):
            return
        if parsed.path == "/api/update-status":
            try:
                body = self._read_json_body_strict()
                rel_path = normalize_viewer_focus_target(self.server.repo_root, str(body.get("path") or body.get("ref") or ""))
                status = " ".join(str(body.get("status") or "").split())
                stage = _infer_stage(rel_path, Path(rel_path).stem)
                allowed = VIEWER_STATUS_OPTIONS_BY_STAGE.get(stage, ())
                if not status:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, "Missing status.")
                    return
                matched_status = next((entry for entry in allowed if entry.lower() == status.lower()), "")
                if not matched_status:
                    self._send_error_json(HTTPStatus.BAD_REQUEST, f"Unsupported status for {stage}: {status}.")
                    return
                payload = update_workflow_indicators_payload(self.server.repo_root, rel_path, {"Status": matched_status})
                self._send_json({"ok": True, "payload": payload, "viewer": self.server.viewer_payload(selected_id=str(payload.get("ref") or ""))})
            except json.JSONDecodeError:
                self._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            except (FileNotFoundError, ValueError) as exc:
                self._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
            except SystemExit as exc:
                self._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
            except OSError as exc:
                self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
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
                body = self._read_json_body_strict()
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
                body = self._read_json_body_strict()
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
    fleet: bool = False,
    include_launch_project: bool = True,
) -> LogicsViewerServer:
    try:
        return LogicsViewerServer(
            (host, port),
            repo_root,
            auto_refresh_interval_seconds=auto_refresh_interval_seconds,
            auto_refresh_interval_forced=auto_refresh_interval_forced,
            lan_mode=lan_mode,
            lan_rw_mode=lan_rw_mode,
            tls_context=tls_context,
            fleet=fleet,
            include_launch_project=include_launch_project,
        )
    except OSError as exc:
        if exc.errno == errno.EADDRINUSE:
            raise SystemExit(
                f"Port {port} on {host} is already in use — another logics-manager viewer or "
                f"MCP server is likely running against this (or another) repo. Pass --port 0 to "
                f"pick a free port automatically, or --port <n> for a specific one."
            ) from exc
        raise


def select_project_root_with_native_dialog(initial_dir: Path) -> Path | None:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Native folder picker is not available in this environment.") from exc
    root = None
    try:
        root = tk.Tk()
        root.withdraw()
        try:
            root.attributes("-topmost", True)
        except Exception:
            pass
        selected = filedialog.askdirectory(
            parent=root,
            initialdir=str(initial_dir if initial_dir.is_dir() else Path.cwd()),
            title="Select Logics project folder",
            mustexist=True,
        )
        return Path(selected).expanduser().resolve() if selected else None
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Unable to open the native folder picker.") from exc
    finally:
        if root is not None:
            try:
                root.destroy()
            except Exception:
                pass


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
        subprocess.run(cmd, check=True, capture_output=True, text=True, stdin=subprocess.DEVNULL)
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


_ANSI = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "dim": "\033[2m",
    "cyan": "\033[36m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "red": "\033[31m",
}


def _supports_banner_style() -> bool:
    """True when the start banner should be rendered with box + ANSI color.

    Styling is reserved for interactive terminals so piped/redirected output
    (logs, CI, `| cat`) stays plain, greppable, and copy-paste friendly.
    Honors the NO_COLOR convention and TERM=dumb.
    """
    if os.environ.get("NO_COLOR") is not None:
        return False
    if os.environ.get("TERM") == "dumb":
        return False
    try:
        return bool(sys.stdout.isatty())
    except (ValueError, AttributeError):
        return False


def _display_width(text: str) -> int:
    """Visible column width of text, accounting for wide/combining glyphs."""
    import unicodedata

    width = 0
    for ch in text:
        if unicodedata.combining(ch):
            continue
        width += 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1
    return width


def _render_styled_start_status(
    url: str,
    repo_root: Path,
    *,
    mode_label: str,
    transport_label: str,
    bind_host: str,
    auto_refresh_interval_seconds: int,
    network_url: str | None,
    focus: str | None,
    version: str | None,
    lan_mode: bool,
    lan_rw_mode: bool,
    lan_token: str | None,
    lan_url: str | None,
    qr_lines: list[str] | None,
) -> str:
    a = _ANSI

    def paint(text: str, *codes: str) -> str:
        return "".join(a[c] for c in codes) + text + a["reset"]

    # Each row is (plain_text, colored_text); width is measured on the plain
    # text so ANSI escapes never disturb box alignment.
    rows: list[tuple[str, str]] = []
    arrow = "➜"
    rows.append((f"{arrow}  {url}", f"{paint(arrow, 'green', 'bold')}  {paint(url, 'cyan', 'bold')}"))
    rows.append(("", ""))

    def field(label: str, value: str, *value_codes: str) -> None:
        plain = f"{label:<10}{value}"
        colored = paint(f"{label:<10}", "dim") + (paint(value, *value_codes) if value_codes else value)
        rows.append((plain, colored))

    field("Repo", repo_root.name, "bold")
    field("Mode", mode_label)
    field("Transport", transport_label)
    field("Bind", bind_host)
    if network_url:
        field("Network", network_url, "cyan")
    field("Refresh", f"⟳ {auto_refresh_interval_seconds}s")
    if focus:
        field("Focus", focus, "yellow")

    content_w = max(_display_width(plain) for plain, _ in rows)

    title = "Logics viewer"
    version_text = f"v{version}" if version else ""
    # Top border: ╭─ <title> <dashes> <version> ─╮  (─╮ / ─ tail = 3 cols).
    # Left run "╭─ <title> " = 3 + width(title) + 1; tail with version =
    # 1(space) + width(version) + 3("  ─╮" -> " ─╮"=3). Reserve >=1 dash.
    left_run = 3 + _display_width(title) + 1
    tail_run = (1 + _display_width(version_text) + 3) if version_text else 3
    box_width = max(content_w + 7, left_run + 1 + tail_run)
    content_w = box_width - 7

    dashes = box_width - left_run - tail_run
    border = lambda s: paint(s, "dim")  # noqa: E731
    if version_text:
        top = (
            border("╭─ ") + paint(title, "green", "bold") + " "
            + border("─" * dashes) + " " + paint(version_text, "dim") + border(" ─╮")
        )
    else:
        top = border("╭─ ") + paint(title, "green", "bold") + " " + border("─" * dashes) + border(" ─╮")
    bottom = border("╰" + "─" * (box_width - 2) + "╯")

    out: list[str] = [top, border("│") + " " * (box_width - 2) + border("│")]
    for plain, colored in rows:
        pad = content_w - _display_width(plain)
        out.append(border("│") + "   " + colored + " " * pad + "  " + border("│"))
    out.append(border("│") + " " * (box_width - 2) + border("│"))
    out.append(bottom)

    if lan_mode:
        out.append("")
        if lan_rw_mode:
            out.append(paint("LAN read/write active", "yellow", "bold") + paint(" — token + PIN-paired device required to mutate state.", "yellow"))
        else:
            out.append(paint("LAN read-only active", "yellow", "bold") + paint(" — mutating endpoints refused; non-loopback clients need the token.", "yellow"))
        if lan_url:
            out.append(paint("Share URL  ", "dim") + paint(lan_url, "cyan"))
        if lan_token:
            out.append(paint("Token      ", "dim") + lan_token)
        if qr_lines:
            out.append("")
            out.extend(qr_lines)
    return "\n".join(out)


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
    version: str | None = None,
    styled: bool | None = None,
) -> str:
    if lan_rw_mode:
        mode_label = "LAN read/write (token + paired device required)"
    elif lan_mode:
        mode_label = "LAN read-only (token required)"
    else:
        mode_label = "read-only"
    transport_label = "HTTPS (self-signed)" if tls_enabled else "HTTP"

    if styled is None:
        styled = _supports_banner_style()
    if styled:
        return _render_styled_start_status(
            url,
            repo_root,
            mode_label=mode_label,
            transport_label=transport_label,
            bind_host=bind_host,
            auto_refresh_interval_seconds=auto_refresh_interval_seconds,
            network_url=network_url,
            focus=focus,
            version=version,
            lan_mode=lan_mode,
            lan_rw_mode=lan_rw_mode,
            lan_token=lan_token,
            lan_url=lan_url,
            qr_lines=qr_lines,
        )

    header = "Logics viewer running:" if not version else f"Logics viewer running (v{version}):"
    lines = [
        header,
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
        help="Allow paired devices to write over LAN, which includes running commands under your account: the workshop terminal takes its command from the request. Devices must complete a PIN handshake first (PIN is printed on the host's stdout). Grant it only on a network you trust, or over a private tunnel. Implies --lan.",
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
    parser.add_argument("--fleet", action="store_true", help="Open the operator's bounded fleet home from any directory.")
    parser.add_argument("--read", action="store_true", help="Open the focused item in the read preview. Requires --focus.")
    parser.add_argument("--open", action="store_true", help="Open the viewer in the default browser.")
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser. This is the default.")
    parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Skip the confirmation prompt when launching in a location without a Logics corpus.",
    )
    return parser


def _confirm_launch_without_corpus(repo_root: Path, *, assume_yes: bool) -> bool:
    """Confirm before launching the viewer where no `logics/` corpus exists.

    Guards against launching in the wrong directory. When the prompt cannot be
    answered interactively (no TTY, e.g. spawned by a wrapper), the launch
    proceeds in bootstrap onboarding mode — preserving the prior behavior.
    """
    message = (
        f"No Logics corpus ('logics/' directory) found at {repo_root}.\n"
        "The viewer will start in bootstrap onboarding mode for this location."
    )
    print(message)
    if assume_yes or not sys.stdin.isatty():
        return True
    try:
        answer = input("Start the viewer here anyway? [y/N] ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        print()
        return False
    return answer in {"y", "yes"}


def _resolve_viewer_root(start: Path) -> Path:
    """Locate the repo root, falling back to a bootstrap root when none exists.

    Normally the viewer requires a `logics/` corpus (find_repo_root). To let the
    viewer launch in a not-yet-bootstrapped repo and offer the in-app bootstrap
    onboarding (canBootstrapLogics), fall back to the git toplevel (if any), then
    the current directory, when no `logics/` directory is found upward.
    """
    try:
        return find_repo_root(start)
    except ConfigError:
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                cwd=start,
                capture_output=True,
                stdin=subprocess.DEVNULL,
                text=True,
                timeout=5,
            )
            if result.returncode == 0 and result.stdout.strip():
                return Path(result.stdout.strip()).resolve()
        except (OSError, subprocess.SubprocessError):
            pass
        return start.resolve()


def main(argv: list[str]) -> int:
    args = build_parser().parse_args(argv)
    repo_root = _resolve_viewer_root(Path.cwd())
    launch_is_project = _looks_like_viewer_project(repo_root)
    include_launch_project = not args.fleet or launch_is_project
    if include_launch_project:
        register_fleet_project(repo_root)
    if not args.fleet and not holds_corpus(repo_root):
        if not _confirm_launch_without_corpus(repo_root, assume_yes=args.yes):
            print("Aborted.")
            return 0
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
    claim = claim_or_reuse(
        repo_root,
        bind_host,
        bind=lambda: create_viewer_server(
            repo_root,
            host=bind_host,
            port=args.port,
            auto_refresh_interval_seconds=refresh_interval,
            auto_refresh_interval_forced=refresh_interval_forced,
            lan_mode=lan_enabled,
            lan_rw_mode=bool(args.lan_rw),
            tls_context=tls_context,
            fleet=True,
            include_launch_project=include_launch_project,
        ),
        key="fleet",
    )
    project_param = _viewer_project_id(repo_root) if (not args.fleet or args.focus) else None
    if claim.reused:
        reused_url = build_viewer_url(bind_host, claim.port, focus=focus, read=bool(args.read), project=project_param, scheme=claim.scheme)
        print(f"Reusing the viewer already running for {repo_root} at {reused_url}", flush=True)
        if args.open and not args.no_open:
            webbrowser.open(reused_url)
        return 0
    server = claim.server
    host, port = server.server_address[:2]
    scheme = server.url_scheme
    url = build_viewer_url(str(host), int(port), focus=focus, read=bool(args.read), project=project_param, scheme=scheme)
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
            version=_current_version(),
        ),
        flush=True,
    )
    if args.open and not args.no_open:
        webbrowser.open(url)

    # Install explicit shutdown handlers so the server stops cleanly on
    # SIGINT (Ctrl+C) and SIGTERM (kill). Relying solely on serve_forever()
    # raising KeyboardInterrupt is fragile: when the process is launched in
    # the background or via a wrapper (node/cdx launcher, nohup, &), it
    # inherits SIGINT as SIG_IGN, so Python never installs its default
    # handler, KeyboardInterrupt is never raised, and Ctrl+C appears to
    # freeze. Setting the handler here overrides any inherited SIG_IGN and
    # turns SIGTERM into a graceful shutdown (closing workshop terminals)
    # instead of an abrupt kill. shutdown() must run off the serve_forever
    # thread, so dispatch it to a short-lived thread.
    #
    # Belt-and-suspenders: a long-lived SSE handler thread (an open browser on
    # /api/events) or a wedged child can keep the graceful path from completing.
    # After requesting shutdown we arm a watchdog that force-exits the process
    # if the clean path has not returned within a short grace window, so Ctrl+C
    # is guaranteed to kill the server. A second signal exits immediately.
    import signal as _signal

    _SHUTDOWN_GRACE_SECONDS = 3.0
    _shutdown_state: dict[str, Any] = {"requested": False}

    def _exit_code_for_signal(signum: int) -> int:
        return 143 if signum == _signal.SIGTERM else 130

    def _force_exit_after_grace(signum: int) -> None:
        time.sleep(_SHUTDOWN_GRACE_SECONDS)
        # Reaching here means the clean path is still stuck: the process would
        # already be gone otherwise. Force the exit so Ctrl+C never hangs.
        os._exit(_exit_code_for_signal(signum))

    def _request_shutdown(_signum: int, _frame: Any) -> None:
        if _shutdown_state["requested"]:
            # Impatient second Ctrl+C: don't wait for the grace window.
            os._exit(_exit_code_for_signal(_signum))
        _shutdown_state["requested"] = True
        threading.Thread(target=server.shutdown, daemon=True).start()
        threading.Thread(
            target=_force_exit_after_grace, args=(_signum,), daemon=True
        ).start()

    for _sig in (_signal.SIGINT, _signal.SIGTERM):
        try:
            _signal.signal(_sig, _request_shutdown)
        except (ValueError, OSError):
            # Not in the main thread or signal unavailable on this platform;
            # fall back to the KeyboardInterrupt path below.
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        try:
            server.server_close()
        except KeyboardInterrupt:
            pass
    if getattr(server, "restart_requested", False):
        command = [sys.executable, *sys.argv]
        os.execv(command[0], command)
    return 0


from .viewer_cdx import (  # noqa: E402,F401  (re-exported for backward compatibility)
    CDX_DEFAULT_MISSION_ID,
    CDX_MISSION_CATALOG,
    CDX_MISSION_LEVELS,
    CDX_MISSION_PARENT_TIMEOUT_GRACE_SECONDS,
    CDX_MISSION_STRENGTHS,
    CDX_UPDATE_CHECK_INTERVAL_SECONDS,
    CDX_WRITABLE_MISSION_MIN_TIMEOUT_SECONDS,
    _cdx_mission_command,
    _cdx_mission_permission,
    _cdx_mission_prompt,
    _cdx_mission_timeout,
    _cdx_status_sessions,
    _cdx_supports_passphrase_stdin,
    _enrich_cdx_launch_settings,
    _enrich_cdx_resume_status,
    _extract_cdx_permission_denials,
    _extract_cdx_usage,
    _merge_cdx_mission_output,
    _normalize_cdx_session,
    _read_cdx_output_path,
    _resolve_cdx_artifact_path,
    _run_cdx_mission,
    _run_read_only_cdx,
    cdx_artifact_preview_payload,
    cdx_config_payload,
    cdx_disk_payload,
    cdx_export_payload,
    cdx_history_payload,
    cdx_import_payload,
    cdx_mission_apply_plan_payload,
    cdx_mission_catalog_payload,
    cdx_mission_plan_payload,
    cdx_mission_run_payload,
    cdx_permission_payload,
    cdx_remove_payload,
    cdx_reset_payload,
    cdx_run_report_payload,
    cdx_runs_payload,
    cdx_status_payload,
    cdx_toggle_payload,
    cdx_update_info_payload,
    create_request_from_cdx_report,
)


from .viewer_git import (  # noqa: E402,F401  (re-exported for backward compatibility)
    GIT_FILE_PREVIEW_MAX_BYTES,
    GIT_FILE_PREVIEW_MAX_CHARS,
    GIT_HISTORY_DISPLAY_LIMIT,
    GIT_HISTORY_FETCH_LIMIT,
    _attach_git_change_stats,
    _count_unique_git_status_paths,
    _current_git_ci_context,
    _first_git_error_line,
    _git_dir,
    _git_event_signature,
    _git_is_repository,
    _git_unpushed_commit_count,
    _github_ci_status_payload,
    _github_owner_repo_from_web_url,
    _github_release_runs_payload,
    _github_release_workflow_file,
    _github_web_url_from_remote,
    _gitlab_ci_badge_state,
    _gitlab_ci_status_payload,
    _gitlab_project_path_from_web_url,
    _gitlab_web_url_from_remote,
    _has_github_actions_workflows,
    _has_gitlab_ci_config,
    _normalize_git_file_path,
    _parse_git_branch_line,
    _parse_git_numstat,
    _parse_github_actions_jobs,
    _parse_github_actions_run,
    _parse_gitlab_jobs,
    _parse_gitlab_pipeline_run,
    _parse_recent_git_commits,
    _run_git_mutation,
    _run_read_only_git,
    _sanitize_git_ref,
    _select_github_actions_run,
    _select_gitlab_pipeline,
    git_commit_diff_payload,
    git_commit_payload,
    git_diff_payload,
    git_fetch_payload,
    git_file_preview_payload,
    git_status_payload,
    github_repo_url,
    gitlab_repo_url,
)
