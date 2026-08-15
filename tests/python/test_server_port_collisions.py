"""req_322/item_665: a bind collision must read as a clear, actionable error,

not a raw traceback - and the viewer and MCP's HTTP server must not share a
default port by accident.
"""

from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from logics_manager.mcp import serve_http
from logics_manager.viewer import create_viewer_server


def _bind_a_blocking_listener() -> tuple[ThreadingHTTPServer, int]:
    server = ThreadingHTTPServer(("127.0.0.1", 0), BaseHTTPRequestHandler)
    return server, server.server_port


def test_viewer_bind_collision_raises_a_clear_actionable_error(tmp_path: Path) -> None:
    blocker, port = _bind_a_blocking_listener()
    try:
        with pytest.raises(SystemExit, match="already in use"):
            create_viewer_server(tmp_path, host="127.0.0.1", port=port)
    finally:
        blocker.server_close()


def test_a_viewer_can_rebind_the_port_its_own_restart_released(tmp_path: Path) -> None:
    """item_828: `allow_reuse_address = False` on every platform also refused the one case
    SO_REUSEADDR exists for.

    Settings' Restart re-execs while the connection that carried the restart request is
    still in TIME_WAIT on that port, so the bind failed and the viewer died instead of
    coming back -- reproduced over HTTP on ports 8793 and 8794. On POSIX, SO_REUSEADDR does
    not let a second process bind a port with a live listener, so the collision guarantee
    above does not depend on refusing this.
    """
    first = create_viewer_server(tmp_path, host="127.0.0.1", port=0)
    port = first.server_port
    first.server_close()

    # The same process the re-exec becomes, taking the port it just released.
    second = create_viewer_server(tmp_path, host="127.0.0.1", port=port)
    try:
        assert second.server_port == port
    finally:
        second.server_close()


def test_mcp_serve_http_bind_collision_raises_a_clear_actionable_error(tmp_path: Path) -> None:
    (tmp_path / "logics").mkdir()
    blocker, port = _bind_a_blocking_listener()
    try:
        with pytest.raises(SystemExit, match="already in use"):
            serve_http(repo_root=tmp_path, host="127.0.0.1", port=port)
    finally:
        blocker.server_close()


def test_viewer_and_mcp_http_no_longer_share_a_default_port() -> None:
    import inspect

    viewer_default = inspect.signature(create_viewer_server).parameters["port"].default
    mcp_default = inspect.signature(serve_http).parameters["port"].default
    assert viewer_default != mcp_default
