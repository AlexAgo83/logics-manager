"""The viewer must be able to read the workflow health report.

Its health screen was built from lint and audit alone, so blocked documents,
backlog items with no task, and stale documents were reported by the CLI and
invisible in the viewer.
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from types import SimpleNamespace

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]

DOC = """## {ref} - {ref}
> Schema version: 1.0
> Status: {status}
> Understanding: 50%
> Confidence: 50%
> Progress: 0%

# Needs
- Something.
"""


@pytest.fixture
def corpus(tmp_path: Path) -> Path:
    root = tmp_path / "corpus"
    root.mkdir()
    subprocess.run(
        [sys.executable, "-m", "logics_manager", "bootstrap", "--repo-root", str(root)],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=60, check=True,
    )
    (root / "logics" / "request" / "req_001_blocked.md").write_text(
        DOC.format(ref="req_001_blocked", status="Blocked"), encoding="utf-8"
    )
    return root


@pytest.fixture
def viewer(corpus: Path):
    process = subprocess.Popen(
        [sys.executable, "-m", "logics_manager", "view", "--repo-root", str(corpus),
         "--port", "0", "--no-open"],
        cwd=REPO_ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    base = None
    deadline = time.time() + 30
    while time.time() < deadline:
        line = process.stdout.readline()
        if not line:
            break
        if "http://127.0.0.1" in line:
            base = line.split()[-1].strip()
            break
    if base is None:
        process.terminate()
        pytest.skip("viewer did not report a listening address")
    try:
        yield base
    finally:
        process.terminate()
        process.wait(timeout=15)


def _get(base: str, route: str) -> dict:
    with urllib.request.urlopen(base + route, timeout=30) as response:
        return json.load(response)


def test_health_route_serves_the_workflow_report(viewer: str) -> None:
    payload = _get(viewer, "/api/health")
    assert payload["ok"] is True
    report = payload["payload"]
    for key in ("issue_count", "issues", "stale_docs", "stale_doc_count", "stale_after_days"):
        assert key in report, f"missing {key}"


def test_health_route_reports_blocked_documents(viewer: str) -> None:
    report = _get(viewer, "/api/health")["payload"]
    blocked = {entry["ref"] for entry in report["issues"]["blocked_docs"]}
    assert "req_001_blocked" in blocked


def test_health_route_carries_the_configured_threshold(viewer: str) -> None:
    report = _get(viewer, "/api/health")["payload"]
    assert report["stale_after_days"] == 14


def test_lint_and_audit_routes_are_unchanged(viewer: str) -> None:
    """The existing validation findings must keep working alongside the new route."""
    assert _get(viewer, "/api/lint")["ok"] is True
    assert _get(viewer, "/api/audit")["ok"] is True


def test_health_route_is_read_only(viewer: str) -> None:
    request = urllib.request.Request(viewer + "/api/health", method="POST", data=b"{}")
    with pytest.raises(urllib.error.HTTPError) as caught:
        urllib.request.urlopen(request, timeout=30)
    assert caught.value.code in (404, 405)


# ---- per-project state (item_601) ----


def test_projects_state_reports_each_listed_project(viewer: str) -> None:
    listed = {entry["id"] for entry in _get(viewer, "/api/projects")["payload"]["projects"]}
    state = _get(viewer, "/api/projects-state")["payload"]["projects"]
    assert set(state) == listed, "the switcher would show a project with no state"


def test_projects_state_carries_open_and_issue_counts(viewer: str) -> None:
    state = _get(viewer, "/api/projects-state")["payload"]["projects"]
    corpora = [entry for entry in state.values() if entry.get("hasLogics")]
    assert corpora, "no project with a corpus was reported"
    for entry in corpora:
        for key in ("openCount", "issueCount", "staleCount"):
            assert key in entry, f"missing {key}"


def test_projects_without_a_corpus_are_marked_not_scanned(viewer: str) -> None:
    state = _get(viewer, "/api/projects-state")["payload"]["projects"]
    for entry in state.values():
        if entry.get("hasLogics") is False:
            assert entry["ok"] is True
            assert "openCount" not in entry


def test_a_failing_project_does_not_hide_the_others(corpus: Path, monkeypatch) -> None:
    """One unreadable project must not take the whole switcher down.

    Driven through the payload rather than HTTP: the failure has to be injected,
    and a live server gives no seam to inject it.
    """
    from logics_manager import viewer as viewer_module

    server = SimpleNamespace(
        project_registry_payload=lambda: [
            {"id": "a", "root": str(corpus), "hasLogics": True},
            {"id": "b", "root": str(corpus), "hasLogics": True},
        ]
    )

    def exploding(root, **kwargs):
        if not getattr(exploding, "failed", False):
            exploding.failed = True
            raise ValueError("boom")
        return {"open_count": 3, "next_actions": []}

    monkeypatch.setattr(viewer_module, "status_payload", exploding)
    monkeypatch.setattr(viewer_module, "health_payload", lambda root, **kw: {"issue_count": 0, "stale_doc_count": 0})

    # the isolation logic lives in the builder; the caching wrapper is tested separately
    payload = viewer_module.LogicsViewerServer._build_project_state(server)["projects"]
    assert payload["a"] == {"ok": False, "error": "boom"}
    assert payload["b"]["ok"] is True
    assert payload["b"]["openCount"] == 3


# ---- the scan is cached (item_603) ----


def _fake_server(builder):
    from threading import Lock

    return SimpleNamespace(
        repo_root="/tmp/logics-cache-probe",
        status_components={},
        status_cache={},
        status_cache_lock=Lock(),
        _build_project_state=builder,
    )


def _call(server, **kwargs):
    from logics_manager.viewer import LogicsViewerServer

    server.status_component = lambda name, producer, *, force=False: (
        LogicsViewerServer.status_component(server, name, producer, force=force)
    )
    return LogicsViewerServer.project_state_payload(server, **kwargs)


def test_repeated_requests_do_not_rescan() -> None:
    """The scan measured ~6s across 33 corpora and used to run on every open."""
    calls = {"n": 0}

    def builder():
        calls["n"] += 1
        return {"projects": {}}

    server = _fake_server(builder)
    for _ in range(5):
        _call(server)
    assert calls["n"] == 1, f"rescanned {calls['n']} times for five requests"


def test_a_forced_request_rescans() -> None:
    calls = {"n": 0}

    def builder():
        calls["n"] += 1
        return {"projects": {}}

    server = _fake_server(builder)
    _call(server)
    _call(server, force=True)
    assert calls["n"] == 2


def test_the_scan_is_still_on_demand(viewer: str) -> None:
    """Caching must not turn into scanning while the viewer starts."""
    payload = _get(viewer, "/api/projects-state")["payload"]
    assert "projects" in payload


# ---- the extracted route modules (item_607) ----


@pytest.mark.parametrize(
    "route",
    [
        "/api/cdx-status",
        "/api/cdx-runs",
        "/api/cdx-memory?scope=current",
        "/api/workshop-commands",
        "/api/workshop-sessions",
        "/api/workshop-terminals",
    ],
)
def test_moved_routes_keep_their_contract(route: str, viewer: str) -> None:
    """Paths, status codes, and payload envelope are unchanged by the move."""
    with urllib.request.urlopen(viewer + route, timeout=60) as response:
        assert response.status == 200, route
        assert json.load(response)["ok"] is True


def test_the_moved_routes_keep_their_mutating_classification() -> None:
    """A route that lost its mutating status would become writable over the network."""
    from logics_manager.viewer import VIEWER_MUTATING_ROUTES

    for route in (
        "/api/cdx-mission-run",
        "/api/cdx-import",
        "/api/cdx-reset",
        "/api/workshop-terminal-start",
        "/api/workshop-terminal-input",
        "/api/workshop-command-start",
    ):
        assert route in VIEWER_MUTATING_ROUTES, f"{route} is no longer gated"


def test_the_route_modules_expose_the_shared_contract() -> None:
    from logics_manager import viewer_cdx_routes, viewer_workshop_routes

    for module in (viewer_cdx_routes, viewer_workshop_routes):
        assert callable(module.handle_get)
        assert callable(module.handle_post)


def test_an_unknown_route_is_declined_by_both_modules() -> None:
    """Returning True for a route it did not handle would swallow the response."""
    from types import SimpleNamespace

    from logics_manager import viewer_cdx_routes, viewer_workshop_routes

    parsed = SimpleNamespace(path="/api/definitely-not-a-route", query="")
    for module in (viewer_cdx_routes, viewer_workshop_routes):
        assert module.handle_get(None, "/api/definitely-not-a-route", parsed) is False
        assert module.handle_post(None, parsed) is False
