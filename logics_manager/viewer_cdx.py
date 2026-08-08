"""CDX runtime for the Logics viewer server.

Lifted out of ``viewer.py`` by req_311: cdx accounted for about a quarter of that file
while being its own sub-system, so reading either one meant opening both. All public names
are re-exported from ``logics_manager.viewer`` for backward compatibility, the way the
workshop runtime already is.

Helpers that belong to the viewer itself are reached through ``_viewer`` rather than
imported by name: the module object is bound at import time and its attributes are read
when a function runs, which is what keeps the two modules importable in either order.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

class _ViewerProxy:
    """Reaches the viewer at call time, not at import time.

    Binding the module directly made the pair importable only in one order: importing this
    module first pulled in the viewer, which re-exports these names, while this module had
    not finished defining them. Resolving on attribute access removes the cycle without
    touching a single call site.
    """

    def __getattr__(self, name: str) -> Any:
        from . import viewer

        return getattr(viewer, name)


_viewer = _ViewerProxy()

_CDX_UPDATE_INFO_CACHE: dict[str, tuple[int, dict[str, Any]]] = {}
from urllib.parse import unquote

from .config import find_repo_root


CDX_MISSION_STRENGTHS = {
    "standard": {"id": "standard", "label": "Standard", "timeout": 180, "reasoningEffort": "medium", "power": "medium"},
    "deep": {"id": "deep", "label": "Deep", "timeout": 300, "reasoningEffort": "high", "power": "high"},
    "max": {"id": "max", "label": "Max", "timeout": 600, "reasoningEffort": "high", "power": "high"},
}


CDX_MISSION_LEVELS = {"minimal", "low", "medium", "high", "xhigh"}


CDX_MISSION_PARENT_TIMEOUT_GRACE_SECONDS = 90


CDX_WRITABLE_MISSION_MIN_TIMEOUT_SECONDS = 600


CDX_UPDATE_CHECK_INTERVAL_SECONDS = 24 * 60 * 60


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


def _resolve_cdx_artifact_path(repo_root: Path, file_path: str) -> Path:
    raw_value = unquote(file_path).strip()
    if not raw_value:
        raise ValueError("Missing CDX artifact path.")
    expanded = Path(raw_value).expanduser()
    if not expanded.is_absolute():
        return _viewer._resolve_openable_file_path(repo_root, raw_value)

    candidate = Path(os.path.realpath(expanded))
    allowed_roots = [Path(os.path.realpath(repo_root)), Path(os.path.realpath(Path.home() / ".cdx"))]
    try:
        common_matches = [os.path.commonpath([str(root), str(candidate)]) == str(root) for root in allowed_roots]
    except ValueError as exc:
        raise ValueError("CDX artifact path is outside allowed locations.") from exc
    if not any(common_matches):
        raise ValueError("CDX artifact path is outside the repository and ~/.cdx.")
    if not candidate.is_file():
        raise FileNotFoundError(str(expanded))
    return candidate


def cdx_artifact_preview_payload(
    repo_root: Path,
    file_path: str,
    *,
    max_bytes: int | None = None,
    max_chars: int | None = None,
) -> dict[str, Any]:
    # Resolved here rather than in the signature: a default evaluates at import time, which
    # would reach for the viewer before either module has finished loading.
    max_bytes = _viewer.FILE_PREVIEW_MAX_BYTES if max_bytes is None else max_bytes
    max_chars = _viewer.FILE_PREVIEW_MAX_CHARS if max_chars is None else max_chars
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


def _run_read_only_cdx(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["cdx", *args]
    cdx_runner = runner or subprocess.run
    return cdx_runner(command, cwd=repo_root, text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=_viewer._scaled_timeout(repo_root, 5))


def _run_cdx_mission(repo_root: Path, args: list[str], *, timeout: int, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["cdx", *args]
    cdx_runner = runner or subprocess.run
    return cdx_runner(command, cwd=repo_root, text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=_viewer._scaled_timeout(repo_root, timeout))


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

    _enrich_cdx_resume_status(repo_root, parsed, runner=runner)
    _enrich_cdx_launch_settings(repo_root, parsed, runner=runner)
    return {"state": "ok", "message": "", "status": parsed}


def cdx_update_info_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {}
    cache_key = str(repo_root.resolve())
    now = int(time.time())
    cached = _CDX_UPDATE_INFO_CACHE.get(cache_key)
    if cached and cached[0] > now:
        return dict(cached[1])
    try:
        result = _run_read_only_cdx(repo_root, ["update", "--check", "--json"], runner=runner)
    except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
        return {}
    if result.returncode != 0:
        return {}
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return {}
    if not isinstance(parsed, dict) or parsed.get("update_available") is not True:
        _CDX_UPDATE_INFO_CACHE[cache_key] = (now + CDX_UPDATE_CHECK_INTERVAL_SECONDS, {})
        return {}
    latest = str(parsed.get("target_version") or parsed.get("latest_version") or "").strip()
    if not latest:
        _CDX_UPDATE_INFO_CACHE[cache_key] = (now + CDX_UPDATE_CHECK_INTERVAL_SECONDS, {})
        return {}
    payload = {
        "currentVersion": str(parsed.get("current_version") or "").strip() or None,
        "latestVersion": latest,
        "updateAvailable": True,
        "updateCommand": "cdx update",
        "source": "github",
    }
    _CDX_UPDATE_INFO_CACHE[cache_key] = (now + CDX_UPDATE_CHECK_INTERVAL_SECONDS, payload)
    return dict(payload)


def _enrich_cdx_launch_settings(repo_root: Path, status: dict[str, Any], *, runner: Any | None = None) -> None:
    """Attach the active launch settings (permission/power/fast/model) to rows.

    `cdx status --json` rows do not carry launch settings; they live under each
    session's launch config. Fetch them all in a single `cdx configs --json`
    call and map them onto the rows by session name so the viewer permission
    selector and the session config modal reflect the active values.
    """
    rows = status.get("rows")
    if not isinstance(rows, list):
        rows = status.get("sessions")
    if not isinstance(rows, list):
        return
    try:
        result = _run_read_only_cdx(repo_root, ["configs", "--json"], runner=runner)
    except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
        return
    if result.returncode != 0:
        return
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return
    sessions = parsed.get("sessions") if isinstance(parsed, dict) else None
    if not isinstance(sessions, list):
        return
    launch_by_name: dict[str, dict[str, Any]] = {}
    for entry in sessions:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or "").strip()
        launch = entry.get("launch")
        if name and isinstance(launch, dict):
            launch_by_name[name] = launch
    if not launch_by_name:
        return
    for row in rows:
        if not isinstance(row, dict):
            continue
        name = str(row.get("session_name") or row.get("name") or row.get("id") or "").strip()
        launch = launch_by_name.get(name)
        if not launch:
            continue
        permission = str(launch.get("permission") or "").strip()
        if permission:
            row["permission"] = permission
        power = str(launch.get("power") or "").strip()
        if power:
            row["power"] = power
        model = str(launch.get("model") or "").strip()
        if model:
            row["model"] = model
        if "fast" in launch:
            row["fast"] = bool(launch.get("fast"))


def _enrich_cdx_resume_status(repo_root: Path, status: dict[str, Any], *, runner: Any | None = None) -> None:
    rows = status.get("rows")
    if not isinstance(rows, list):
        rows = status.get("sessions")
    if not isinstance(rows, list):
        return
    for row in rows:
        if not isinstance(row, dict):
            continue
        session = str(row.get("session_name") or row.get("name") or row.get("id") or "").strip()
        if not session:
            continue
        try:
            result = _run_read_only_cdx(repo_root, ["can-resume", session, "--json"], runner=runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            row["resume_available"] = False
            continue
        if result.returncode != 0:
            row["resume_available"] = False
            continue
        try:
            parsed = json.loads(result.stdout or "{}")
        except json.JSONDecodeError:
            row["resume_available"] = False
            continue
        if isinstance(parsed, dict):
            row["resume_available"] = bool(parsed.get("resumable"))
            if parsed.get("reason"):
                row["resume_reason"] = str(parsed["reason"])
            if parsed.get("strategy"):
                row["resume_strategy"] = str(parsed["strategy"])


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
        denials = _extract_cdx_permission_denials(item)
        if denials:
            item["permissionDenials"] = denials
            if str(item.get("status") or item.get("state") or "").strip().lower() == "succeeded":
                item["raw_status"] = item.get("status") or item.get("state")
                item["status"] = "blocked"
                item["status_detail"] = "Run reported permission denials; review the report before treating it as successful."
        status = str(item.get("status") or item.get("state") or "").strip().lower()
        if status == "stale" and not item.get("ended_at") and not item.get("endedAt"):
            item["status"] = "running"
            item["status_detail"] = "CDX still marks this run active; no end timestamp has been reported yet."
            item["raw_status"] = "stale"
        usage = _extract_cdx_usage(item)
        if usage.get("available"):
            item["usage"] = usage
        normalized_runs.append(item)
    return {"state": "ok", "message": "", "runs": normalized_runs}


def cdx_history_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"state": "unavailable", "message": "CDX executable is not available on PATH.", "history": []}
    try:
        result = _run_read_only_cdx(repo_root, ["history", "--json"], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX history timed out.", "history": []}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX history: {exc}", "history": []}
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "CDX history failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "history": []}
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "message": "CDX history returned invalid JSON.", "history": []}
    history = parsed.get("history") if isinstance(parsed, dict) else None
    if not isinstance(history, list):
        return {"state": "invalid-json", "message": "CDX history JSON must include a history array.", "history": []}
    normalized_history: list[dict[str, Any]] = []
    for entry in history:
        if not isinstance(entry, dict):
            continue
        item = dict(entry)
        usage = _extract_cdx_usage(item)
        if usage.get("available"):
            item["usage"] = usage
        normalized_history.append(item)
    return {
        "state": "ok",
        "message": str(parsed.get("message") or "") if isinstance(parsed, dict) else "",
        "history": normalized_history,
        "period": parsed.get("period") if isinstance(parsed, dict) and isinstance(parsed.get("period"), dict) else {},
    }


def cdx_disk_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"state": "unavailable", "message": "CDX executable is not available on PATH.", "disk": {}}
    cdx_runner = runner or subprocess.run
    try:
        # Disk scans walk every profile directory; give them more room than the
        # 5s read-only default. JSON output is progress-free by design.
        result = cdx_runner(
            ["cdx", "disk", "profiles", "--json", "--candidates"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            stdin=subprocess.DEVNULL,
            timeout=_viewer._scaled_timeout(repo_root, 60),
        )
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX disk scan timed out.", "disk": {}}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX disk: {exc}", "disk": {}}
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "CDX disk failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "disk": {}}
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "message": "CDX disk returned invalid JSON.", "disk": {}}
    disk = parsed.get("disk") if isinstance(parsed, dict) else None
    if not isinstance(disk, dict):
        return {"state": "invalid-json", "message": "CDX disk JSON must include a disk object.", "disk": {}}
    return {
        "state": "ok",
        "message": str(parsed.get("message") or ""),
        "disk": disk,
        # Scan wall-clock; the route caches this payload for 5 minutes, so the
        # UI can show how stale the numbers are.
        "measured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }


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
    usage = _extract_cdx_usage(report)
    if usage.get("available"):
        report["usage"] = usage
    denials = _extract_cdx_permission_denials(report)
    if denials:
        report["permissionDenials"] = denials
        report["missionBlocked"] = True
        report["status_detail"] = "Run reported permission denials; generated output may be incomplete or unapplied."
        run = report.get("run") if isinstance(report.get("run"), dict) else None
        if run is not None and str(run.get("status") or "").strip().lower() == "succeeded":
            run["raw_status"] = run.get("status")
            run["status"] = "blocked"
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
    contract_block: str = "",
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
    request_only_guidance = (
        "Always capture the outcome as a bounded Logics request. Create it under logics/request/ with `logics-manager flow new request` (use the next available req_ slug), summarizing findings and the recommended follow-up. Leave it as a request draft for later triage; do not promote it to a backlog item or task, and do not directly modify product/source files."
    )
    direct_fix_chain_guidance = (
        "Fix safe, scoped issues directly in repository files when you can validate them; do not make broad refactors, and do not release, tag, push, or publish. Then capture the completed work as a full Logics workflow chain as proof: create a request under logics/request/ with `logics-manager flow new request`, then promote it with `logics-manager flow promote request-to-backlog <req_slug>` and `logics-manager flow promote backlog-to-task <item_slug>` so the request, backlog item, and task all document the applied fixes and their validation evidence."
    )
    if mission_id == "full-audit":
        if direct_fixes:
            action_guidance = direct_fix_chain_guidance
            schema = "Return concise JSON with keys: summary, findings, directFixes, changedFiles, validationEvidence, workflowRefs (the created request, backlog item, and task references)."
        else:
            action_guidance = request_only_guidance
            schema = "Return concise JSON with keys: summary, findings, recommendations, requestFiles, validationEvidence."
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
            action_guidance = "Fix safe, scoped release-readiness issues directly in repository files when you can validate them (stale documentation, missing release notes, narrow test failures). Do not bump versions, tag, push, publish, upload assets, or create GitHub releases. Then capture the completed work as a full Logics workflow chain as proof: create a request under logics/request/ with `logics-manager flow new request`, then promote it with `logics-manager flow promote request-to-backlog <req_slug>` and `logics-manager flow promote backlog-to-task <item_slug>` so the request, backlog item, and task all document the applied fixes and their validation evidence."
            schema = "Return concise JSON with keys: summary, findings, directFixes, changedFiles, validationEvidence, workflowRefs (the created request, backlog item, and task references)."
        else:
            action_guidance = "Always capture the outcome as a bounded Logics request. Create it under logics/request/ with `logics-manager flow new request` (use the next available req_ slug), summarizing release-readiness findings and follow-up. Leave it as a request draft for later triage; do not promote it, do not directly modify product/source files, and do not bump versions, tag, push, publish, upload assets, or create GitHub releases."
            schema = "Return concise JSON with keys: summary, findings, recommendations, requestFiles, validationEvidence."
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
        validation_mode = "Run the release contract validation commands before finalizing the report, and include actionable fixes for any failures." if run_full_validation else "Do not run full validation; identify the release contract validation commands that should be run before release."
        release_prep_guidance = (
            "Prepare release metadata for the requested version by updating the exact version sources and changelog declared by the release contract. Do not create Git tags, push branches, publish packages, upload release assets, or create GitHub releases."
            if allow_file_writes
            else "Do not modify version sources, changelog files, create Git tags, push branches, publish packages, upload release assets, or create GitHub releases."
        )
        return "\n".join([
            line for line in [
                f"Prepare a guarded pre-release for version {release_version}.",
                contract_block,
                validation_mode,
                release_prep_guidance,
                write_guidance,
                commit_guidance,
                "Return JSON only with this schema:",
                '{"summary":"...","version":"vX.X.X","validationMode":"full|plan-only","validationEvidence":["..."],"actionableFixes":[{"title":"...","command":"...","risk":"..."}],"generatedFiles":[{"path":"...","purpose":"..."}],"releasePlan":["..."],"blocked":false}',
            ] if line
        ])
    raise ValueError("Unknown CDX mission.")


def _cdx_mission_timeout(strength: dict[str, Any], *, allow_file_writes: bool = False, commit_at_end: bool = False) -> int:
    timeout = int(strength.get("timeout") or 180)
    if allow_file_writes or commit_at_end:
        return max(timeout, CDX_WRITABLE_MISSION_MIN_TIMEOUT_SECONDS)
    return timeout


def _cdx_mission_permission(*, allow_file_writes: bool = False) -> str:
    return "full" if allow_file_writes else "read-only"


def _cdx_mission_command(
    repo_root: Path,
    mission_id: str,
    *,
    session: str,
    strength: dict[str, Any],
    model: str = "",
    reasoning_effort: str = "",
    power: str = "",
    release_tag: str = "",
    mission_inputs: dict[str, str] | None = None,
    allow_file_writes: bool = False,
    commit_at_end: bool = False,
    prompt_override: str = "",
) -> list[str]:
    mission_inputs = mission_inputs or {}
    override = prompt_override.strip()
    if override:
        prompt = override
    else:
        contract_block = _viewer._release_contract_prompt_block(repo_root) if mission_id == "pre-release" else ""
        prompt = _cdx_mission_prompt(
            mission_id,
            release_tag=release_tag,
            wish_text=mission_inputs.get("wishText", ""),
            release_version=mission_inputs.get("releaseVersion", ""),
            run_full_validation=mission_inputs.get("runFullValidation") == "true",
            allow_file_writes=allow_file_writes,
            direct_fixes=mission_inputs.get("directFixes") == "true",
            commit_at_end=commit_at_end,
            contract_block=contract_block,
        )
    timeout = _cdx_mission_timeout(strength, allow_file_writes=allow_file_writes, commit_at_end=commit_at_end)
    effective_reasoning_effort = reasoning_effort or str(strength.get("reasoningEffort") or "medium")
    effective_power = power or str(strength.get("power") or "medium")
    permission = _cdx_mission_permission(allow_file_writes=allow_file_writes)
    command = [
        "run",
        session,
        "--cwd",
        str(repo_root),
        "--prompt",
        prompt,
        "--kind",
        "assistant",
    ]
    if model:
        command.extend(["--model", model])
    command.extend([
        "--reasoning-effort",
        effective_reasoning_effort,
        "--power",
        effective_power,
        "--permission",
        permission,
        "--timeout-seconds",
        str(timeout),
        "--json",
    ])
    return command


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
    embedded = _viewer._parse_json_from_text(_read_cdx_output_path(parsed))
    if embedded:
        merged["missionOutput"] = embedded
        if isinstance(embedded.get("actions"), list) and "actions" not in merged:
            merged["actions"] = embedded["actions"]
        if "summary" in embedded and "summary" not in merged:
            merged["summary"] = embedded["summary"]
    return merged


def _extract_cdx_permission_denials(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, dict):
        return []
    candidates: list[Any] = [value.get("permission_denials"), value.get("permissionDenials")]
    final_payload = value.get("final_payload") if isinstance(value.get("final_payload"), dict) else None
    if final_payload is not None:
        candidates.extend([final_payload.get("permission_denials"), final_payload.get("permissionDenials")])
    parsed = value.get("parsed") if isinstance(value.get("parsed"), dict) else None
    if parsed is not None:
        candidates.extend([parsed.get("permission_denials"), parsed.get("permissionDenials")])
    report = value.get("report") if isinstance(value.get("report"), dict) else None
    if report is not None:
        candidates.extend([report.get("permission_denials"), report.get("permissionDenials")])
    denials: list[dict[str, Any]] = []
    for candidate in candidates:
        if not isinstance(candidate, list):
            continue
        for item in candidate:
            if isinstance(item, dict):
                denials.append(dict(item))
    return denials


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
    model = _viewer._mission_text_input(body, "model", max_chars=120)
    reasoning_effort = _viewer._mission_text_input(body, "reasoningEffort", max_chars=20)
    power = _viewer._mission_text_input(body, "power", max_chars=20)
    if reasoning_effort and reasoning_effort not in CDX_MISSION_LEVELS:
        return {"state": "error", "message": "Unknown CDX reasoning effort.", "plan": None}
    if power and power not in CDX_MISSION_LEVELS:
        return {"state": "error", "message": "Unknown CDX model power.", "plan": None}
    effective_reasoning_effort = reasoning_effort or str(strength_def.get("reasoningEffort") or "medium")
    effective_power = power or str(strength_def.get("power") or "medium")

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
        wish_text = _viewer._mission_text_input(body, "wishText")
        if not wish_text:
            return {"state": "error", "message": "Enter a wish or intent before previewing this mission.", "plan": None, "catalog": cdx_mission_catalog_payload(), "status": status_payload}
        mission_inputs["wishText"] = wish_text
    if mission_id in {"full-audit", "release-review"}:
        mission_inputs["directFixes"] = "true" if _viewer._mission_bool_input(body, "directFixes") else "false"
    if mission_id == "pre-release":
        release_version = _viewer._mission_text_input(body, "releaseVersion", max_chars=40)
        if not re.fullmatch(r"v\d+\.\d+\.\d+", release_version):
            return {"state": "error", "message": "Enter a semantic version in vX.X.X format before previewing this mission.", "plan": None, "catalog": cdx_mission_catalog_payload(), "status": status_payload}
        mission_inputs["releaseVersion"] = release_version
        mission_inputs["runFullValidation"] = "true" if _viewer._mission_bool_input(body, "runFullValidation") else "false"
    if mission.get("requiresReleaseTag"):
        release_tag = _viewer._latest_release_tag(repo_root, runner=git_runner, which=which)
        if not release_tag:
            return {"state": "error", "message": "No release tag was found for this mission.", "plan": None, "status": status_payload}
    if status_payload.get("state") != "ok":
        warnings.append(str(status_payload.get("message") or "CDX status could not be confirmed."))

    requested_file_writes = _viewer._mission_bool_input(body, "allowFileWrites")
    requested_commit_at_end = _viewer._mission_bool_input(body, "commitAtEnd")
    direct_fixes = mission_inputs.get("directFixes") == "true"
    supports_file_writes = bool(mission.get("supportsFileWrites", True))
    requires_file_writes = bool(mission.get("requiresFileWrites"))
    allow_file_writes = (requested_file_writes or direct_fixes or requires_file_writes) and supports_file_writes
    commit_at_end = requested_commit_at_end and allow_file_writes
    if requested_file_writes and not supports_file_writes:
        warnings.append("This mission is plan-first; direct CDX file writes are disabled. Use Apply allowed actions after CDX returns actions.")
    if requested_commit_at_end and not allow_file_writes:
        warnings.append("Commit-at-end was requested but direct file writes are disabled for this mission.")
    permission = _cdx_mission_permission(allow_file_writes=allow_file_writes)
    prompt_override = _viewer._mission_prompt_override(body)
    command = _cdx_mission_command(
        repo_root,
        mission_id,
        session=session,
        strength=strength_def,
        model=model,
        reasoning_effort=reasoning_effort,
        power=power,
        release_tag=release_tag,
        mission_inputs=mission_inputs,
        allow_file_writes=allow_file_writes,
        commit_at_end=commit_at_end,
        prompt_override=prompt_override,
    )
    prompt_text = ""
    if "--prompt" in command:
        prompt_index = command.index("--prompt")
        if prompt_index + 1 < len(command):
            prompt_text = command[prompt_index + 1]
    if prompt_override:
        warnings.append("Using an operator-edited prompt. Session, permission, and timeout remain enforced by the server.")
    plan = {
        "mission": mission,
        "missionId": mission_id,
        "sessionId": session,
        "strength": strength_def,
        "strengthId": strength,
        "model": model,
        "reasoningEffort": effective_reasoning_effort,
        "power": effective_power,
        "missionInputs": mission_inputs,
        "prompt": prompt_text,
        "promptEdited": bool(prompt_override),
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
        "stdout": _viewer._bounded_process_text(result.stdout or ""),
        "stderr": _viewer._bounded_process_text(result.stderr or ""),
        "parsed": parsed if isinstance(parsed, dict) else None,
        "usage": usage,
    }
    denials = _extract_cdx_permission_denials(parsed)
    if denials:
        run_payload["permissionDenials"] = denials
        return {"state": "blocked", "message": "CDX mission reported permission denials; no applied work should be inferred from this run.", "plan": plan, "run": run_payload}
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
            result = _viewer._run_logics_command(repo_root, args, runner=runner)
        except subprocess.TimeoutExpired:
            return {"state": "timeout", "message": "Logics corpus plan application timed out.", "results": results}
        except (OSError, subprocess.SubprocessError) as exc:
            return {"state": "error", "message": f"Unable to apply corpus plan action: {exc}", "results": results}
        item = {
            "type": action_type,
            "target": target,
            "command": ["logics-manager", *args],
            "returnCode": result.returncode,
            "stdout": _viewer._bounded_process_text(result.stdout or "", 4000),
            "stderr": _viewer._bounded_process_text(result.stderr or "", 4000),
        }
        results.append(item)
        if result.returncode != 0:
            message = (result.stderr or result.stdout or "Corpus plan action failed.").strip().splitlines()[0]
            return {"state": "error", "message": message, "results": results}
    return {"state": "ok", "message": "", "results": results}


def cdx_toggle_payload(
    repo_root: Path,
    session: str,
    enable: bool,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    if not session:
        return {"ok": False, "error": "Session name is required."}
    action = "enable" if enable else "disable"
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(
            ["cdx", action, session, "--json"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_viewer._scaled_timeout(repo_root, 10),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": f"CDX {action} timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or f"CDX {action} failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or f"{action.capitalize()} complete."}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or f"{action.capitalize()} complete."}


def cdx_remove_payload(
    repo_root: Path,
    session: str,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    if not session:
        return {"ok": False, "error": "Session name is required."}
    if not re.match(r"^[A-Za-z0-9_.:-]{1,120}$", session):
        return {"ok": False, "error": "Invalid session name."}
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(
            ["cdx", "rmv", session, "--force", "--json"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_viewer._scaled_timeout(repo_root, 10),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "CDX remove timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or "CDX remove failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or "Remove complete."}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or "Remove complete."}


def cdx_reset_payload(
    repo_root: Path,
    session: str,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    if not session:
        return {"ok": False, "error": "Session name is required."}
    if not re.match(r"^[A-Za-z0-9_.:-]{1,120}$", session):
        return {"ok": False, "error": "Invalid session name."}
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(
            ["cdx", "reset", session, "--yes", "--json"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_viewer._scaled_timeout(repo_root, 30),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "CDX reset timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or "CDX reset failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or "Reset activated."}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or "Reset activated."}


def cdx_permission_payload(
    repo_root: Path,
    session: str,
    permission: str,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    if not session:
        return {"ok": False, "error": "Session name is required."}
    if not re.match(r"^[A-Za-z0-9_.:-]{1,120}$", session):
        return {"ok": False, "error": "Invalid session name."}
    if permission not in {"review", "default", "auto", "full"}:
        return {"ok": False, "error": "Invalid permission value."}
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(
            ["cdx", "set", session, "--permission", permission, "--json"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_viewer._scaled_timeout(repo_root, 10),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "CDX permission update timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or "CDX permission update failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or "Permission update complete.", "permission": permission}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or "Permission update complete.", "permission": permission}


def cdx_config_payload(
    repo_root: Path,
    session: str,
    *,
    power: str | None = None,
    model: str | None = None,
    fast: bool | None = None,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    """Persist launch settings (power/model/fast) for a session via `cdx set`."""
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    if not session:
        return {"ok": False, "error": "Session name is required."}
    if not re.match(r"^[A-Za-z0-9_.:-]{1,120}$", session):
        return {"ok": False, "error": "Invalid session name."}
    command = ["cdx", "set", session]
    applied: dict[str, Any] = {}
    if power is not None:
        if power not in {"minimal", "low", "medium", "high", "xhigh"}:
            return {"ok": False, "error": "Invalid power value."}
        command += ["--power", power]
        applied["power"] = power
    if model is not None:
        model = model.strip()
        if model:
            if len(model) > 200 or not re.match(r"^[A-Za-z0-9_.:\-/]+$", model):
                return {"ok": False, "error": "Invalid model value."}
            command += ["--model", model]
            applied["model"] = model
    if fast is not None:
        command += ["--fast", "on" if fast else "off"]
        applied["fast"] = bool(fast)
    if not applied:
        return {"ok": False, "error": "No settings to update."}
    command.append("--json")
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(
            command,
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_viewer._scaled_timeout(repo_root, 10),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "CDX config update timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or "CDX config update failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or "Config update complete.", **applied}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or "Config update complete.", **applied}


def _cdx_supports_passphrase_stdin(*, runner: Any | None = None) -> bool:
    """True when the installed cdx exposes --passphrase-stdin (cdx >= 0.9.14).

    Preferred over --passphrase-env so the bundle secret never lands in the
    child process environment; falls back to env on older cdx.
    """
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(["cdx", "--help"], text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        return False
    return "--passphrase-stdin" in ((result.stdout or "") + (result.stderr or ""))


def cdx_import_payload(
    repo_root: Path,
    file_bytes: bytes,
    passphrase: str,
    merge: bool = True,
    force: bool = False,
    *,
    runner: Any | None = None,
    which: Any | None = None,
    supports_stdin: bool | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    import tempfile
    with tempfile.TemporaryDirectory() as tmp_dir:
        import_path = Path(tmp_dir) / "cdx-import.cdx"
        import_path.write_bytes(file_bytes)
        args = ["import", str(import_path), "--json"]
        if merge:
            args.append("--merge")
        if force:
            args.append("--force")
        # Prefer handing the secret to cdx on stdin (no env exposure); fall back to
        # --passphrase-env on older cdx that lacks --passphrase-stdin.
        cdx_runner = runner or subprocess.run
        env = {**os.environ}
        stdin_input = None
        if passphrase:
            use_stdin = supports_stdin if supports_stdin is not None else _cdx_supports_passphrase_stdin(runner=runner)
            if use_stdin:
                args += ["--passphrase-stdin"]
                stdin_input = passphrase
            else:
                env["CDX_IMPORT_PASS"] = passphrase
                args += ["--passphrase-env", "CDX_IMPORT_PASS"]
        try:
            result = cdx_runner(
                ["cdx", *args],
                cwd=repo_root,
                text=True,
                capture_output=True,
                timeout=_viewer._scaled_timeout(repo_root, 30),
                env=env,
                input=stdin_input,
            )
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "CDX import timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or "CDX import failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or "Import complete."}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or "Import complete."}


def cdx_export_payload(
    repo_root: Path,
    sessions: list[str],
    passphrase: str,
    include_auth: bool = True,
    *,
    runner: Any | None = None,
    which: Any | None = None,
    supports_stdin: bool | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    import tempfile, base64
    with tempfile.TemporaryDirectory() as tmp_dir:
        export_path = Path(tmp_dir) / "cdx-export.cdx"
        args = ["export", str(export_path), "--json"]
        if include_auth:
            args.append("--include-auth")
        if sessions:
            args += ["--sessions", ",".join(sessions)]
        # Prefer stdin (no env exposure); fall back to --passphrase-env on older cdx.
        cdx_runner = runner or subprocess.run
        env = {**os.environ}
        stdin_input = None
        if passphrase:
            use_stdin = supports_stdin if supports_stdin is not None else _cdx_supports_passphrase_stdin(runner=runner)
            if use_stdin:
                args += ["--passphrase-stdin"]
                stdin_input = passphrase
            else:
                env["CDX_EXPORT_PASS"] = passphrase
                args += ["--passphrase-env", "CDX_EXPORT_PASS"]
        try:
            result = cdx_runner(
                ["cdx", *args],
                cwd=repo_root,
                text=True,
                capture_output=True,
                timeout=_viewer._scaled_timeout(repo_root, 30),
                env=env,
                input=stdin_input,
            )
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "CDX export timed out."}
        if result.returncode != 0:
            msg = (result.stderr or result.stdout or "").strip()
            return {"ok": False, "error": msg or "CDX export failed."}
        if not export_path.exists():
            return {"ok": False, "error": "CDX export produced no file."}
        file_b64 = base64.b64encode(export_path.read_bytes()).decode()
    return {"ok": True, "fileBase64": file_b64, "filename": "cdx-accounts.cdx"}


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
    ref = _viewer._next_viewer_request_ref(repo_root, title)
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
