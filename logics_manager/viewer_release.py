from __future__ import annotations

from http import HTTPStatus
from typing import Any
from urllib.parse import parse_qs

from .config import ConfigError
from .release import release_reset_payload, release_reset_target_payload, release_status_payload


def handle_get(handler: Any, route: str, parsed: Any) -> bool:
    if route != "/api/release-status":
        return False
    target = parse_qs(parsed.query).get("target", [""])[0].strip() or None
    if target:
        handler._send_status_json(f"release-status:{target}", lambda *, force=False: release_status_payload(handler.server.repo_root, target=target))
    else:
        handler._send_status_json("release-status", lambda *, force=False: handler._status_component("release", force=force))
    return True


def handle_post(handler: Any, parsed: Any) -> bool:
    if parsed.path != "/api/release-reset":
        return False
    try:
        target = parse_qs(parsed.query).get("target", [""])[0].strip() or None
        payload = release_reset_target_payload(handler.server.repo_root, target=target) if target else release_reset_payload(handler.server.repo_root)
        handler._send_json({"ok": True, "payload": payload})
    except ConfigError as exc:
        handler._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
    except (OSError, ValueError) as exc:
        handler._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, f"Unable to reset release evidence: {exc}")
    return True
