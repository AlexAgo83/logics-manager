from __future__ import annotations

import hashlib
from http import HTTPStatus
import json
import os
from pathlib import Path
import threading
import time
from typing import Any
from urllib.parse import parse_qs, urlparse, urlunparse


MAX_DIAGNOSTICS = 200
MAX_SESSIONS = 100
SESSION_STALE_SECONDS = 30
_LOCK = threading.RLock()


def diagnostics_path() -> Path:
    override = os.environ.get("LOGICS_MANAGER_VIEWER_DIAGNOSTICS")
    if override:
        return Path(override)
    cache_root = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache")
    return cache_root / "logics-manager" / "viewer-diagnostics.jsonl"


def sessions_path() -> Path:
    return diagnostics_path().with_name("viewer-sessions.json")


def _repo_key(repo_root: Path) -> str:
    resolved = str(repo_root.resolve())
    return hashlib.sha256(resolved.encode("utf-8")).hexdigest()[:16]


def _clean_url(value: Any) -> str:
    raw = str(value or "")[:1000]
    try:
        parsed = urlparse(raw)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))[:500]
    except ValueError:
        return ""


def _bounded(value: Any, limit: int) -> str:
    return str(value or "")[:limit]


def _sanitize_entry(repo_root: Path, entry: dict[str, Any], *, now: float) -> dict[str, Any]:
    cleaned = {
        "at": _bounded(entry.get("at") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)), 64),
        "kind": _bounded(entry.get("kind") or "runtime-error", 80),
        "message": _bounded(entry.get("message") or "Unknown viewer error", 2000),
        "stack": _bounded(entry.get("stack"), 12000),
        "screen": _bounded(entry.get("screen"), 200),
        "url": _clean_url(entry.get("url")),
        "sessionId": _bounded(entry.get("sessionId"), 100),
        "repo": {"key": _repo_key(repo_root), "name": repo_root.name[:200]},
    }
    for key in ("panelHidden", "contentChildren", "contentTextLength", "boardChildren"):
        value = entry.get(key)
        if isinstance(value, (bool, int)) or value is None:
            cleaned[key] = value
    fingerprint_source = f"{cleaned['kind']}\n{cleaned['message']}\n{cleaned['stack'].splitlines()[0] if cleaned['stack'] else ''}"
    cleaned["fingerprint"] = _bounded(entry.get("fingerprint"), 80) or hashlib.sha256(fingerprint_source.encode("utf-8")).hexdigest()[:16]
    cleaned["count"] = max(1, min(int(entry.get("count") or 1), 1_000_000))
    return cleaned


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return []
    entries: list[dict[str, Any]] = []
    for line in lines:
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            entries.append(value)
    return entries


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(path)


def append_diagnostic(repo_root: Path, entry: dict[str, Any], *, now: float | None = None) -> dict[str, Any]:
    timestamp = time.time() if now is None else now
    cleaned = _sanitize_entry(repo_root, entry, now=timestamp)
    with _LOCK:
        entries = _read_jsonl(diagnostics_path())
        entries.append(cleaned)
        entries = entries[-MAX_DIAGNOSTICS:]
        _atomic_write(diagnostics_path(), "".join(json.dumps(item, sort_keys=True) + "\n" for item in entries))
    return cleaned


def diagnostics_payload(repo_root: Path, *, limit: int = 50) -> dict[str, Any]:
    repo_key = _repo_key(repo_root)
    bounded_limit = max(1, min(limit, MAX_DIAGNOSTICS))
    with _LOCK:
        entries = [entry for entry in _read_jsonl(diagnostics_path()) if entry.get("repo", {}).get("key") == repo_key]
    return {"entries": entries[-bounded_limit:], "path": str(diagnostics_path()), "limit": bounded_limit}


def _read_sessions() -> dict[str, dict[str, Any]]:
    try:
        value = json.loads(sessions_path().read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def update_session(repo_root: Path, payload: dict[str, Any], *, now: float | None = None) -> list[dict[str, Any]]:
    timestamp = time.time() if now is None else now
    session_id = _bounded(payload.get("sessionId"), 100)
    event = _bounded(payload.get("event"), 20)
    if not session_id or event not in {"start", "heartbeat", "end"}:
        raise ValueError("Session diagnostics require sessionId and event=start|heartbeat|end.")
    repo_key = _repo_key(repo_root)
    interrupted: list[dict[str, Any]] = []
    with _LOCK:
        sessions = _read_sessions()
        for other_id, session in list(sessions.items()):
            if other_id == session_id or session.get("repoKey") != repo_key or session.get("clean") or session.get("reported"):
                continue
            if timestamp - float(session.get("heartbeatAt") or 0) < SESSION_STALE_SECONDS:
                continue
            entry = append_diagnostic(repo_root, {
                "kind": "unclean-session",
                "message": "A previous viewer session stopped without a clean shutdown.",
                "screen": session.get("screen") or "",
                "url": session.get("url") or "",
                "sessionId": other_id,
            }, now=timestamp)
            interrupted.append(entry)
            session["reported"] = True
        current = sessions.get(session_id, {})
        current.update({
            "repoKey": repo_key,
            "heartbeatAt": timestamp,
            "screen": _bounded(payload.get("screen"), 200),
            "url": _clean_url(payload.get("url")),
            "clean": event == "end",
            "reported": bool(current.get("reported")),
        })
        sessions[session_id] = current
        ordered = sorted(sessions.items(), key=lambda item: float(item[1].get("heartbeatAt") or 0))[-MAX_SESSIONS:]
        _atomic_write(sessions_path(), json.dumps(dict(ordered), sort_keys=True))
    return interrupted


def handle_get(handler: Any, route: str) -> bool:
    if route != "/api/viewer-diagnostics":
        return False
    params = parse_qs(urlparse(handler.path).query)
    try:
        limit = int(params.get("limit", ["50"])[0])
    except ValueError:
        limit = 50
    handler._send_json({"ok": True, "payload": diagnostics_payload(handler.server.repo_root, limit=limit)})
    return True


def handle_post(handler: Any, route: str) -> bool:
    if route not in {"/api/viewer-diagnostics", "/api/viewer-diagnostics/session"}:
        return False
    try:
        body = handler._read_json_body_strict()
        if not isinstance(body, dict):
            raise ValueError("Diagnostic body must be a JSON object.")
        if route.endswith("/session"):
            interrupted = update_session(handler.server.repo_root, body)
            handler._send_json({"ok": True, "payload": {"interrupted": interrupted}})
        else:
            entry = body.get("entry") if isinstance(body.get("entry"), dict) else body
            handler._send_json({"ok": True, "payload": append_diagnostic(handler.server.repo_root, entry)})
    except json.JSONDecodeError:
        handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
    except ValueError as exc:
        handler._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
    except OSError as exc:
        handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, f"Unable to persist viewer diagnostics: {exc}")
    return True
