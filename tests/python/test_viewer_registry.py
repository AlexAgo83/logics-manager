"""req_322/item_666: one live viewer per repo root, claimed atomically.

Two processes (simulating two VS Code windows, or a CLI invocation racing a
window) must not both spawn a server for the same repo root; the second to
acquire the registry lock must find the first's entry and reuse it. A stale
entry (nothing answering its port) must never block a fresh start.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import pytest

from logics_manager import viewer_registry
from logics_manager.viewer_registry import claim_or_reuse

REPO_ROOT = Path(__file__).resolve().parents[2]
_URL_PATTERN = re.compile(r"https?://(?:127\.0\.0\.1|localhost):(\d+)")


@dataclass
class _FakeServer:
    server_address: tuple[str, int]
    url_scheme: str = "http"


class _StatusHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - stdlib method name
        if self.path.startswith("/api/status"):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"{}")
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002 - stdlib signature
        pass


def _start_real_status_server() -> tuple[HTTPServer, threading.Thread]:
    server = HTTPServer(("127.0.0.1", 0), _StatusHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


@pytest.fixture(autouse=True)
def _isolated_registry(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    registry_path = tmp_path / "registry" / "viewers.json"
    monkeypatch.setattr(viewer_registry, "_registry_path", lambda: registry_path)
    return registry_path


def test_first_claim_binds_and_registers(tmp_path: Path) -> None:
    calls = []

    def bind() -> _FakeServer:
        calls.append(1)
        return _FakeServer(server_address=("127.0.0.1", 9999))

    claim = claim_or_reuse(tmp_path, "127.0.0.1", bind=bind)
    assert claim.reused is False
    assert claim.port == 9999
    assert len(calls) == 1


def test_second_claim_reuses_a_live_first_claim(tmp_path: Path) -> None:
    real_server, thread = _start_real_status_server()
    try:
        port = real_server.server_address[1]
        calls = []

        def bind() -> _FakeServer:
            calls.append(1)
            return _FakeServer(server_address=("127.0.0.1", port))

        first = claim_or_reuse(tmp_path, "127.0.0.1", bind=bind)
        assert first.reused is False
        assert len(calls) == 1

        def bind_again() -> _FakeServer:
            calls.append(1)
            raise AssertionError("bind() must not be called when an existing entry is alive")

        second = claim_or_reuse(tmp_path, "127.0.0.1", bind=bind_again)
        assert second.reused is True
        assert second.port == port
        assert len(calls) == 1
    finally:
        real_server.shutdown()
        thread.join(timeout=2)


def test_stale_entry_is_replaced_not_trusted_blindly(tmp_path: Path) -> None:
    # Register an entry for a port nothing is listening on.
    def bind_first() -> _FakeServer:
        return _FakeServer(server_address=("127.0.0.1", 1))  # port 1: nothing answers /api/status here

    claim_or_reuse(tmp_path, "127.0.0.1", bind=bind_first)

    calls = []

    def bind_second() -> _FakeServer:
        calls.append(1)
        return _FakeServer(server_address=("127.0.0.1", 2))

    second = claim_or_reuse(tmp_path, "127.0.0.1", bind=bind_second)
    assert second.reused is False
    assert second.port == 2
    assert len(calls) == 1


def test_different_repo_roots_each_get_their_own_claim(tmp_path: Path) -> None:
    repo_a = tmp_path / "a"
    repo_b = tmp_path / "b"
    repo_a.mkdir()
    repo_b.mkdir()

    claim_a = claim_or_reuse(repo_a, "127.0.0.1", bind=lambda: _FakeServer(server_address=("127.0.0.1", 11)))
    claim_b = claim_or_reuse(repo_b, "127.0.0.1", bind=lambda: _FakeServer(server_address=("127.0.0.1", 22)))
    assert claim_a.reused is False
    assert claim_b.reused is False
    assert claim_a.port != claim_b.port


def test_concurrent_claims_for_the_same_repo_only_one_binds(tmp_path: Path) -> None:
    """Two near-simultaneous starts for the same repo root - the race
    `item_666` closes with an atomic (`fcntl.flock`) claim. Whichever thread
    wins binds a real, live server; the loser's liveness check against it
    must succeed, so it reuses instead of binding its own."""
    real_server, thread = _start_real_status_server()
    try:
        port = real_server.server_address[1]
        bind_count = 0
        lock = threading.Lock()
        results: list[object] = []

        def bind() -> _FakeServer:
            nonlocal bind_count
            with lock:
                bind_count += 1
            return _FakeServer(server_address=("127.0.0.1", port))

        def run() -> None:
            results.append(claim_or_reuse(tmp_path, "127.0.0.1", bind=bind))

        runners = [threading.Thread(target=run) for _ in range(2)]
        for t in runners:
            t.start()
        for t in runners:
            t.join(timeout=5)

        assert bind_count == 1, "bind() must only run once across two concurrent claims for the same repo root"
        assert len(results) == 2
        assert {claim.port for claim in results} == {port}  # type: ignore[union-attr]
    finally:
        real_server.shutdown()
        thread.join(timeout=2)


def _wait_for_port(process: subprocess.Popen[str], *, timeout: float = 30.0) -> int:
    deadline = time.monotonic() + timeout
    buffer = ""
    assert process.stdout is not None
    while time.monotonic() < deadline:
        line = process.stdout.readline()
        if not line:
            if process.poll() is not None:
                break
            continue
        buffer += line
        match = _URL_PATTERN.search(buffer)
        if match:
            return int(match.group(1))
    raise AssertionError(f"no viewer URL printed within {timeout}s; output so far:\n{buffer}")


def test_two_real_cli_processes_for_the_same_repo_share_one_server(tmp_path: Path) -> None:
    """req_322/AC5, exercised through the real CLI entrypoint rather than a
    mock: two independent `logics-manager view` processes for the same repo
    (standing in for two VS Code windows, each spawning its own subprocess)
    must report the same port, not two different ones.

    ponytail: generous timeouts - this spawns two real Python interpreters
    with full module imports and a corpus scan each, which is measurably
    slower (and noisier) under a full parallel test-suite run than in
    isolation."""
    repo = tmp_path / "repo"
    (repo / "logics").mkdir(parents=True)
    env = os.environ.copy()
    env["LOGICS_VIEWER_REGISTRY_PATH"] = str(tmp_path / "viewers.json")
    env["NO_COLOR"] = "1"

    first = subprocess.Popen(
        [sys.executable, "-m", "logics_manager", "--repo-root", str(repo), "view", "--port", "0", "--no-open", "--yes"],
        cwd=REPO_ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env,
    )
    try:
        first_port = _wait_for_port(first)

        second = subprocess.run(
            [sys.executable, "-m", "logics_manager", "--repo-root", str(repo), "view", "--port", "0", "--no-open", "--yes"],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=30, env=env,
        )
        assert "Reusing the viewer already running" in second.stdout, second.stdout + second.stderr
        second_match = _URL_PATTERN.search(second.stdout)
        assert second_match is not None
        assert int(second_match.group(1)) == first_port
    finally:
        first.terminate()
        try:
            first.wait(timeout=5)
        except subprocess.TimeoutExpired:
            first.kill()
