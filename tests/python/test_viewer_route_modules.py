"""Write and error branches of the routes lifted out of `viewer.py`.

These two modules reported the lowest coverage in the repository — 17% and 14%
— with roughly twenty write branches exercised by nothing. They were equally
untested before the extraction moved them; the move only made it visible in the
report. A refactor that broke one would not have been caught.

Driven through the module hooks rather than a live server: a malformed body or
a missing argument is what these branches are for, and a real request is a poor
way to produce one on demand.
"""

from __future__ import annotations

import json
from http import HTTPStatus
from types import SimpleNamespace
from typing import Any

import pytest

from logics_manager import viewer_cdx_routes, viewer_workshop_routes


class RecordingHandler:
    """Stands in for the request handler, recording what a route sent back."""

    def __init__(self, body: Any = None, body_error: Exception | None = None, repo_root: str = "/tmp/probe"):
        self._body = body if body is not None else {}
        self._body_error = body_error
        self.sent: list[tuple[str, Any]] = []
        self.server = SimpleNamespace(
            repo_root=repo_root,
            workshop_terminals=SimpleNamespace(),
            workshop_commands=SimpleNamespace(),
            viewer_payload=lambda **kwargs: {"ok": True},
            invalidate_status_components=lambda *args, **kwargs: None,
        )

    def _read_json_body_strict(self) -> Any:
        if self._body_error is not None:
            raise self._body_error
        return self._body

    def _send_json(self, payload: Any) -> None:
        self.sent.append(("json", payload))

    def _send_error_json(self, status: Any, message: str) -> None:
        self.sent.append(("error", (status, message)))

    def _send_status_json(self, label: str, producer: Any) -> None:
        self.sent.append(("status", label))


def _parsed(path: str, query: str = "") -> SimpleNamespace:
    return SimpleNamespace(path=path, query=query)


# ---- declining routes they do not own ----


@pytest.mark.parametrize("module", [viewer_cdx_routes, viewer_workshop_routes])
def test_declines_an_unowned_route(module) -> None:
    """Claiming a route it did not handle would swallow the response."""
    parsed = _parsed("/api/not-mine")
    assert module.handle_get(None, "/api/not-mine", parsed) is False
    assert module.handle_post(None, parsed) is False


@pytest.mark.parametrize("module", [viewer_cdx_routes, viewer_workshop_routes])
def test_declines_a_route_owned_by_the_other_module(module) -> None:
    other = "/api/workshop-terminals" if module is viewer_cdx_routes else "/api/cdx-runs"
    assert module.handle_get(None, other, _parsed(other)) is False


# ---- malformed bodies ----


# `/api/cdx-mission-plan` is deliberately absent: it is a POST, but it only
# builds a preview -- verified to contain no write or process primitive -- so it
# is correctly outside VIEWER_MUTATING_ROUTES while `-run` and `-apply-plan` are
# inside it.
CDX_WRITE_ROUTES = [
    "/api/cdx-report-request",
    "/api/cdx-mission-run",
    "/api/cdx-mission-apply-plan",
    "/api/cdx-import",
    "/api/cdx-export",
    "/api/cdx-toggle",
    "/api/cdx-permission",
    "/api/cdx-config",
    "/api/cdx-remove",
    "/api/cdx-reset",
]

WORKSHOP_WRITE_ROUTES = [
    "/api/workshop-command-start",
    "/api/workshop-terminal-start",
    "/api/workshop-terminal-input",
    "/api/workshop-terminal-resize",
    "/api/workshop-terminal-rename",
    "/api/workshop-terminal-stop",
    "/api/workshop-command-stop",
]


@pytest.mark.parametrize("route", CDX_WRITE_ROUTES)
def test_cdx_write_route_handles_an_invalid_body(route: str) -> None:
    handler = RecordingHandler(body_error=json.JSONDecodeError("bad", "", 0))
    assert viewer_cdx_routes.handle_post(handler, _parsed(route)) is True
    assert handler.sent, f"{route} answered nothing"
    kind, payload = handler.sent[-1]
    assert kind == "error", f"{route} accepted an invalid body: {payload}"


@pytest.mark.parametrize("route", WORKSHOP_WRITE_ROUTES)
def test_workshop_write_route_handles_an_invalid_body(route: str) -> None:
    handler = RecordingHandler(body_error=json.JSONDecodeError("bad", "", 0))
    assert viewer_workshop_routes.handle_post(handler, _parsed(route)) is True
    assert handler.sent, f"{route} answered nothing"
    kind, payload = handler.sent[-1]
    assert kind == "error", f"{route} accepted an invalid body: {payload}"


def test_a_missing_command_falls_back_to_the_default() -> None:
    """An empty body must not mean "run nothing" or crash: it means the default."""
    started: list[Any] = []
    handler = RecordingHandler(body={})
    handler.server.workshop_terminals = SimpleNamespace(
        create=lambda command, root, **kwargs: started.append(command)
        or SimpleNamespace(status_payload=lambda: {"id": "t1"})
    )
    assert viewer_workshop_routes.handle_post(handler, _parsed("/api/workshop-terminal-start")) is True
    assert started and isinstance(started[0], list) and started[0], "no default command was chosen"


def test_a_supplied_command_is_used_verbatim() -> None:
    """This is the capability SECURITY.md now spells out; pin it so it stays visible."""
    started: list[Any] = []
    handler = RecordingHandler(body={"command": ["/bin/echo", "hello"]})
    handler.server.workshop_terminals = SimpleNamespace(
        create=lambda command, root, **kwargs: started.append(command)
        or SimpleNamespace(status_payload=lambda: {"id": "t1"})
    )
    assert viewer_workshop_routes.handle_post(handler, _parsed("/api/workshop-terminal-start")) is True
    assert started == [["/bin/echo", "hello"]]


def test_a_non_string_command_is_rejected_for_the_default() -> None:
    started: list[Any] = []
    handler = RecordingHandler(body={"command": ["ok", 42]})
    handler.server.workshop_terminals = SimpleNamespace(
        create=lambda command, root, **kwargs: started.append(command)
        or SimpleNamespace(status_payload=lambda: {"id": "t1"})
    )
    assert viewer_workshop_routes.handle_post(handler, _parsed("/api/workshop-terminal-start")) is True
    assert started and started[0] != ["ok", 42], "a malformed command was passed through"


# ---- read routes ----


def test_cdx_memory_defaults_an_unknown_scope() -> None:
    handler = RecordingHandler()
    assert viewer_cdx_routes.handle_get(handler, "/api/cdx-memory", _parsed("", "scope=nonsense")) is True
    assert handler.sent[-1] == ("status", "cdx-memory:current")


def test_cdx_memory_accepts_a_known_scope() -> None:
    handler = RecordingHandler()
    assert viewer_cdx_routes.handle_get(handler, "/api/cdx-memory", _parsed("", "scope=global")) is True
    assert handler.sent[-1] == ("status", "cdx-memory:global")


def test_a_terminal_route_with_an_unknown_id_is_answered() -> None:
    handler = RecordingHandler()
    handler.server.workshop_terminals = SimpleNamespace(get=lambda session_id: None)
    handled = viewer_workshop_routes.handle_get(
        handler, "/api/workshop-terminal/does-not-exist", _parsed("/api/workshop-terminal/does-not-exist")
    )
    assert handled is True
    assert handler.sent, "an unknown terminal id answered nothing"
    kind, _ = handler.sent[-1]
    assert kind == "error", "an unknown terminal id was not reported as an error"


# ---- the guarding classification survived the move ----


@pytest.mark.parametrize("route", CDX_WRITE_ROUTES + WORKSHOP_WRITE_ROUTES)
def test_every_write_route_is_still_gated(route: str) -> None:
    from logics_manager.viewer import VIEWER_MUTATING_ROUTES

    assert route in VIEWER_MUTATING_ROUTES, f"{route} lost its mutating classification"


def test_read_routes_are_not_gated() -> None:
    from logics_manager.viewer import VIEWER_MUTATING_ROUTES

    for route in ("/api/cdx-runs", "/api/cdx-status", "/api/workshop-terminals", "/api/workshop-sessions"):
        assert route not in VIEWER_MUTATING_ROUTES, f"{route} became write-gated"
