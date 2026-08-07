"""HTTP routes for the session cockpit, lifted out of `viewer.py`.

The viewer module had grown past six thousand lines, and the majority of its
routes belonged to two subsystems that are not the viewer. Its POST handler
alone ran to 493 lines, more than a reviewer can hold while checking an
authorization or read-only rule.

Same contract as `viewer_project_tools`: each hook returns True when it handled
the route, False to let the caller keep dispatching. Route paths, payload
shapes, and status codes are unchanged -- this is a move, not a redesign.
"""

from __future__ import annotations

import json
from http import HTTPStatus
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs

from . import viewer as _viewer


def handle_get(handler: Any, route: str, parsed: Any) -> bool:
    if route == "/api/cdx-memory":
        scope = parse_qs(parsed.query).get("scope", ["current"])[0]
        if scope not in {"current", "global", "project"}:
            scope = "current"
        handler._send_status_json(f"cdx-memory:{scope}", lambda *, force=False: _viewer.cdx_memory_payload(handler.server.repo_root, scope=scope))
        return True
    if route == "/api/cdx-run-report":
        run_id = parse_qs(parsed.query).get("runId", [""])[0]
        handler._send_json({"ok": True, "payload": _viewer.cdx_run_report_payload(handler.server.repo_root, run_id)})
        return True
    return False


def handle_post(handler: Any, parsed: Any) -> bool:
    if parsed.path == "/api/cdx-report-request":
        try:
            body = handler._read_json_body_strict()
            report_payload = _viewer.cdx_run_report_payload(handler.server.repo_root, str(body.get("runId") or ""))
            if report_payload.get("state") != "ok":
                handler._send_error_json(HTTPStatus.BAD_GATEWAY, str(report_payload.get("message") or "Unable to load CDX report."))
                return True
            created = _viewer.create_request_from_cdx_report(handler.server.repo_root, report_payload)
            handler._send_json({"ok": True, "created": created, "payload": handler.server.viewer_payload(selected_id=created["id"])})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        except OSError as exc:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
        return True
    if parsed.path == "/api/cdx-mission-plan":
        try:
            body = handler._read_json_body_strict()
            handler._send_json({"ok": True, "payload": _viewer.cdx_mission_plan_payload(handler.server.repo_root, body)})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        return True
    if parsed.path == "/api/cdx-mission-run":
        try:
            body = handler._read_json_body_strict()
            handler._send_json({"ok": True, "payload": _viewer.cdx_mission_run_payload(handler.server.repo_root, body)})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        return True
    if parsed.path == "/api/cdx-mission-apply-plan":
        try:
            body = handler._read_json_body_strict()
            handler._send_json({"ok": True, "payload": _viewer.cdx_mission_apply_plan_payload(handler.server.repo_root, body)})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        return True
    if parsed.path == "/api/cdx-import":
        try:
            body = handler._read_json_body_strict()
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return True
        file_b64 = str(body.get("fileBase64") or "")
        passphrase = str(body.get("passphrase") or "")
        merge = bool(body.get("merge", True))
        force = bool(body.get("force", False))
        if not file_b64:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "fileBase64 is required.")
            return True
        import base64
        try:
            file_bytes = base64.b64decode(file_b64)
        except Exception:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid base64 in fileBase64.")
            return True
        result = _viewer.cdx_import_payload(handler.server.repo_root, file_bytes, passphrase, merge, force)
        if result.get("ok"):
            handler._send_json({"ok": True, "payload": result})
        else:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Import failed."))
        return True
    if parsed.path == "/api/cdx-export":
        try:
            body = handler._read_json_body_strict()
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return True
        sessions = [str(s) for s in (body.get("sessions") or []) if s]
        passphrase = str(body.get("passphrase") or "")
        include_auth = bool(body.get("includeAuth", True))
        result = _viewer.cdx_export_payload(handler.server.repo_root, sessions, passphrase, include_auth)
        if result.get("ok"):
            handler._send_json({"ok": True, "payload": result})
        else:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Export failed."))
        return True
    if parsed.path == "/api/cdx-toggle":
        try:
            body = handler._read_json_body_strict()
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return True
        session = str(body.get("session") or "")
        enable = bool(body.get("enable", True))
        result = _viewer.cdx_toggle_payload(handler.server.repo_root, session, enable)
        if result.get("ok"):
            handler._send_json({"ok": True, "payload": result})
        else:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Toggle failed."))
        return True
    if parsed.path == "/api/cdx-permission":
        try:
            body = handler._read_json_body_strict()
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return True
        session = str(body.get("session") or "")
        permission = str(body.get("permission") or "")
        result = _viewer.cdx_permission_payload(handler.server.repo_root, session, permission)
        if result.get("ok"):
            handler._send_json({"ok": True, "payload": result})
        else:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Permission update failed."))
        return True
    if parsed.path == "/api/cdx-config":
        try:
            body = handler._read_json_body_strict()
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return True
        session = str(body.get("session") or "")
        power = str(body.get("power")) if body.get("power") is not None else None
        model = str(body.get("model")) if body.get("model") is not None else None
        fast = bool(body.get("fast")) if body.get("fast") is not None else None
        result = _viewer.cdx_config_payload(handler.server.repo_root, session, power=power, model=model, fast=fast)
        if result.get("ok"):
            handler._send_json({"ok": True, "payload": result})
        else:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Config update failed."))
        return True
    if parsed.path == "/api/cdx-remove":
        try:
            body = handler._read_json_body_strict()
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return True
        session = str(body.get("session") or "")
        result = _viewer.cdx_remove_payload(handler.server.repo_root, session)
        if result.get("ok"):
            handler._send_json({"ok": True, "payload": result})
        else:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Remove failed."))
        return True
    if parsed.path == "/api/cdx-reset":
        try:
            body = handler._read_json_body_strict()
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
            return True
        session = str(body.get("session") or "")
        result = _viewer.cdx_reset_payload(handler.server.repo_root, session)
        if result.get("ok"):
            handler._send_json({"ok": True, "payload": result})
        else:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, result.get("error", "Reset failed."))
        return True
    if parsed.path == "/api/cdx-artifact-preview":
        try:
            body = handler._read_json_body_strict()
            handler._send_json({"ok": True, "payload": _viewer.cdx_artifact_preview_payload(handler.server.repo_root, str(body.get("path", "")))})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        except (FileNotFoundError, ValueError) as exc:
            handler._send_error_json(HTTPStatus.NOT_FOUND, str(exc))
        except OSError as exc:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))
        return True
    return False
