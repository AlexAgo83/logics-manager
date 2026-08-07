"""HTTP routes for the workshop terminal, lifted out of `viewer.py`.

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
    if route == "/api/workshop-commands":
        try:
            handler._send_json({"ok": True, "payload": _viewer.workshop_commands_payload(handler.server.repo_root)})
        except ValueError as exc:
            handler._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
        return True
    if route == "/api/workshop-sessions":
        handler._send_json({"ok": True, "payload": {"sessions": handler.server.workshop_sessions.list()}})
        return True
    if route == "/api/workshop-terminals":
        handler._send_json({"ok": True, "payload": {"sessions": handler.server.workshop_terminals.list(), "available": _viewer.workshop_terminals_available()}})
        return True
    if route.startswith("/api/workshop-terminal/"):
        tail = route[len("/api/workshop-terminal/"):]
        parts = tail.split("/", 1)
        session_id = parts[0]
        kind = parts[1] if len(parts) > 1 else "status"
        session = handler.server.workshop_terminals.get(session_id)
        if session is None:
            handler._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
            return True
        if kind == "status":
            handler._send_json({"ok": True, "payload": session.status_payload()})
            return True
        if kind == "stream":
            handler._stream_workshop_terminal(session, parsed)
            return True
        handler._send_error_json(HTTPStatus.NOT_FOUND, "Unknown terminal sub-resource.")
        return True
    if route.startswith("/api/workshop-session/"):
        tail = route[len("/api/workshop-session/"):]
        parts = tail.split("/", 1)
        session_id = parts[0]
        kind = parts[1] if len(parts) > 1 else "status"
        session = handler.server.workshop_sessions.get(session_id)
        if session is None:
            handler._send_error_json(HTTPStatus.NOT_FOUND, "Workshop session not found.")
            return True
        if kind == "status":
            handler._send_json({"ok": True, "payload": session.status_payload()})
            return True
        if kind == "stream":
            handler._stream_workshop_session(session, parsed)
            return True
        handler._send_error_json(HTTPStatus.NOT_FOUND, "Unknown session sub-resource.")
        return True
    return False


def handle_post(handler: Any, parsed: Any) -> bool:
    if parsed.path == "/api/workshop-command-start":
        try:
            body = handler._read_json_body_strict()
            command_id = str(body.get("commandId") or "")
            if not command_id:
                handler._send_error_json(HTTPStatus.BAD_REQUEST, "Missing commandId.")
                return True
            catalog = _viewer.workshop_commands_payload(handler.server.repo_root)
            entry = next((c for c in catalog.get("commands", []) if c.get("id") == command_id), None)
            if entry is None:
                handler._send_error_json(HTTPStatus.NOT_FOUND, "Unknown command id.")
                return True
            session = handler.server.workshop_sessions.create(entry, handler.server.repo_root)
            handler._send_json({"ok": True, "payload": session.status_payload()})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        except ValueError as exc:
            handler._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
        return True
    if parsed.path == "/api/workshop-terminal-start":
        try:
            body = handler._read_json_body_strict()
            command_override = body.get("command")
            label = str(body.get("label") or "")
            command = command_override if isinstance(command_override, list) and all(isinstance(p, str) for p in command_override) and command_override else _viewer.workshop_terminal_default_command()
            try:
                initial_cols = int(body.get("cols") or 0)
                initial_rows = int(body.get("rows") or 0)
            except (TypeError, ValueError):
                initial_cols = initial_rows = 0
            session = handler.server.workshop_terminals.create(
                command,
                handler.server.repo_root,
                label=label,
                initial_cols=initial_cols or 80,
                initial_rows=initial_rows or 24,
            )
            handler._send_json({"ok": True, "payload": session.status_payload()})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        except ValueError as exc:
            handler._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
        return True
    if parsed.path == "/api/workshop-terminal-external-start":
        try:
            body = handler._read_json_body_strict()
            payload = _viewer.open_system_terminal_payload(handler.server.repo_root, body)
            handler._send_json({"ok": True, "payload": payload})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        except ValueError as exc:
            handler._send_error_json(HTTPStatus.FORBIDDEN, str(exc))
        except (OSError, _viewer.subprocess.SubprocessError) as exc:
            handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, f"System terminal launch failed: {exc}")
        return True
    if parsed.path == "/api/workshop-terminal-input":
        try:
            body = handler._read_json_body_strict()
            session_id = str(body.get("sessionId") or "")
            data = str(body.get("data") or "")
            session = handler.server.workshop_terminals.get(session_id)
            if session is None:
                handler._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                return True
            session.write(data)
            handler._send_json({"ok": True})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        return True
    if parsed.path == "/api/workshop-terminal-resize":
        try:
            body = handler._read_json_body_strict()
            session_id = str(body.get("sessionId") or "")
            rows = int(body.get("rows") or 0)
            cols = int(body.get("cols") or 0)
            session = handler.server.workshop_terminals.get(session_id)
            if session is None:
                handler._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                return True
            session.resize(rows, cols)
            handler._send_json({"ok": True})
        except (json.JSONDecodeError, ValueError):
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid resize body.")
        return True
    if parsed.path == "/api/workshop-terminal-rename":
        try:
            body = handler._read_json_body_strict()
            session_id = str(body.get("sessionId") or "")
            label = str(body.get("label") or "")
            session = handler.server.workshop_terminals.get(session_id)
            if session is None:
                handler._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                return True
            session.rename(label)
            handler._send_json({"ok": True, "payload": session.status_payload()})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        except ValueError as exc:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
        return True
    if parsed.path == "/api/workshop-terminal-stop":
        try:
            body = handler._read_json_body_strict()
            session_id = str(body.get("sessionId") or "")
            session = handler.server.workshop_terminals.get(session_id)
            if session is None:
                handler._send_error_json(HTTPStatus.NOT_FOUND, "Workshop terminal not found.")
                return True
            session.stop()
            handler._send_json({"ok": True, "payload": session.status_payload()})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        return True
    if parsed.path == "/api/workshop-command-stop":
        try:
            body = handler._read_json_body_strict()
            session_id = str(body.get("sessionId") or "")
            session = handler.server.workshop_sessions.get(session_id)
            if session is None:
                handler._send_error_json(HTTPStatus.NOT_FOUND, "Workshop session not found.")
                return True
            session.stop()
            handler._send_json({"ok": True, "payload": session.status_payload()})
        except json.JSONDecodeError:
            handler._send_error_json(HTTPStatus.BAD_REQUEST, "Invalid JSON body.")
        return True
    return False
