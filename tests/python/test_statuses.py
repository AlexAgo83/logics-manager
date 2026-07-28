from __future__ import annotations

from logics_manager.statuses import (
    canonical_status,
    closed_statuses,
    open_statuses,
    stage_statuses,
    transition_error,
    workflow_statuses,
)


def test_obsolete_is_a_valid_workflow_status() -> None:
    for stage in ("request", "backlog", "task"):
        assert "Obsolete" in stage_statuses(stage)
    assert "Obsolete" in workflow_statuses()


def test_open_and_closed_sets_are_disjoint_and_cover_obsolete() -> None:
    assert open_statuses().isdisjoint(closed_statuses())
    assert "Obsolete" in closed_statuses()


def test_transition_rejects_unknown_status_for_stage() -> None:
    assert transition_error("task", "Ready", "Bogus") is not None
    assert transition_error("task", "Ready", "In progress") is None


def test_canonical_status_accepts_common_aliases() -> None:
    assert canonical_status("task", "In Progress") == "In progress"
    assert canonical_status("task", "in_progress") == "In progress"
    assert canonical_status("task", "in progress") == "In progress"
    assert transition_error("task", "Ready", "In Progress") is None


def test_transition_rejects_leaving_a_terminal_status() -> None:
    assert transition_error("task", "Archived", "Ready") is not None
    # staying put is always fine
    assert transition_error("task", "Archived", "Archived") is None
    # reaching a terminal status is allowed
    assert transition_error("task", "Done", "Archived") is None
