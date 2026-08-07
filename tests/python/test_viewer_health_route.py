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
