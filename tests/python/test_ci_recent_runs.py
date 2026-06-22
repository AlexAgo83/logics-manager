from __future__ import annotations

from logics_manager.viewer import CI_RECENT_RUNS_LIMIT, _recent_ci_runs


def _run(idx: int, *, status: str = "completed", conclusion: str = "success") -> dict:
    return {
        "id": idx,
        "name": "CI",
        "status": status,
        "conclusion": conclusion,
        "head_sha": f"sha{idx}",
        "html_url": f"https://example/run/{idx}",
        "updated_at": f"2026-06-22T00:0{idx}:00Z",
        "display_title": f"commit {idx}",
    }


def test_recent_ci_runs_maps_compact_fields() -> None:
    [entry] = _recent_ci_runs([_run(1)])
    assert entry["id"] == 1
    assert entry["badgeState"] == "passing"
    assert entry["url"] == "https://example/run/1"
    assert entry["headSha"] == "sha1"
    assert entry["updatedAt"] == "2026-06-22T00:01:00Z"


def test_recent_ci_runs_is_capped() -> None:
    runs = [_run(i) for i in range(CI_RECENT_RUNS_LIMIT + 5)]
    assert len(_recent_ci_runs(runs)) == CI_RECENT_RUNS_LIMIT


def test_recent_ci_runs_handles_empty() -> None:
    assert _recent_ci_runs([]) == []


def test_recent_ci_runs_carries_failure_state() -> None:
    [entry] = _recent_ci_runs([_run(2, conclusion="failure")])
    assert entry["badgeState"] == "failing"
