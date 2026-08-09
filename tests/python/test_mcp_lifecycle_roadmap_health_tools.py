"""req_318/item_655: nine CLI commands had no MCP tool at all - withdraw,
progress, roadmap show/validate, deliver, validate-closeout, gates repair,
links repair, doctor. An MCP-only agent was capped below what the CLI could
do for all of them, regardless of any skill written to explain them.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from logics_manager.bootstrap import bootstrap_payload
from logics_manager.mcp import call_tool


def _repo(tmp_path: Path) -> Path:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    bootstrap_payload(repo_root, check=False)
    subprocess.run(["git", "init"], cwd=repo_root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return repo_root


def _deliver(repo_root: Path) -> dict[str, str]:
    product = call_tool("create_product_brief", {"title": "Smoke Product"}, repo_root=repo_root)
    delivered = call_tool("deliver_from_product", {"product_path": product["path"]}, repo_root=repo_root)
    return delivered


def test_deliver_from_product_creates_a_linked_chain(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    delivered = _deliver(repo_root)
    assert (repo_root / delivered["created_request_path"]).is_file()
    assert (repo_root / delivered["created_backlog_path"]).is_file()
    assert (repo_root / delivered["created_task_path"]).is_file()


def test_progress_task_updates_progress_indicator(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    delivered = _deliver(repo_root)
    task_path = delivered["created_task_path"]

    result = call_tool("progress_task", {"task_path": task_path, "progress": 40}, repo_root=repo_root)
    assert result["progress"] == "40%"
    text = (repo_root / task_path).read_text(encoding="utf-8")
    assert "> Progress: 40%" in text


def test_progress_task_rejects_out_of_range_progress(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    delivered = _deliver(repo_root)
    with pytest.raises(Exception, match="progress"):
        call_tool("progress_task", {"task_path": delivered["created_task_path"], "progress": 140}, repo_root=repo_root)


def test_withdraw_workflow_doc_marks_obsolete_with_replacement(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    delivered = _deliver(repo_root)
    request_path = delivered["created_request_path"]

    call_tool("withdraw_workflow_doc", {"source_path": request_path, "superseded_by": "req_999_other"}, repo_root=repo_root)
    text = (repo_root / request_path).read_text(encoding="utf-8")
    assert "> Status: Obsolete" in text
    assert "Superseded by: `req_999_other`" in text


def test_roadmap_show_and_validate(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    proposed = call_tool("create_roadmap", {"title": "Smoke Roadmap", "milestones": ["0.1: MVP"]}, repo_root=repo_root)

    shown = call_tool("roadmap_show", {"source": proposed["ref"]}, repo_root=repo_root)
    assert shown["ref"] == proposed["ref"]
    assert "# Milestones" in shown["content"]

    validated = call_tool("roadmap_validate", {"source": proposed["ref"]}, repo_root=repo_root)
    assert validated["ok"] is True
    assert validated["milestone_count"] == 1


def test_roadmap_validate_reports_a_missing_milestone(tmp_path: Path) -> None:
    """`create_roadmap` always seeds default milestones when none are passed
    (flow/__init__.py's `_split_milestones`), so this writes a malformed
    roadmap doc directly to exercise the actual failure path."""
    repo_root = _repo(tmp_path)
    (repo_root / "logics" / "roadmap").mkdir(parents=True, exist_ok=True)
    (repo_root / "logics" / "roadmap" / "road_001_empty.md").write_text(
        "\n".join(
            [
                "## road_001_empty - Empty Roadmap",
                "> Date: 2026-08-09",
                "> Status: Proposed",
                "> Related product: (none yet)",
                "> Related request: (none yet)",
                "> Reminder: Update status, milestone scope, linked refs, risks, and success signals when you edit this doc.",
                "",
                "# Summary",
                "No milestones declared.",
                "",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    validated = call_tool("roadmap_validate", {"source": "road_001_empty"}, repo_root=repo_root)
    assert validated["ok"] is False
    assert "missing versioned milestones" in validated["issues"]


def test_validate_closeout_reports_findings_and_repair_commands(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    delivered = _deliver(repo_root)
    task_ref = Path(delivered["created_task_path"]).stem

    result = call_tool("validate_closeout", {"source": task_ref}, repo_root=repo_root)
    assert result["ok"] is False
    codes = {issue["code"] for issue in result["issues"]}
    assert "task_gate_unchecked" in codes


def test_repair_gates_checks_off_deterministic_boxes(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    delivered = _deliver(repo_root)
    task_path = delivered["created_task_path"]

    call_tool("repair_gates", {"task_path": task_path}, repo_root=repo_root)
    result = call_tool("validate_closeout", {"source": Path(task_path).stem}, repo_root=repo_root)
    codes = {issue["code"] for issue in result["issues"]}
    assert "task_gate_unchecked" not in codes


def test_repair_links_fixes_a_missing_backlog_back_reference(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    delivered = _deliver(repo_root)
    task_path = delivered["created_task_path"]
    backlog_path = delivered["created_backlog_path"]

    # Break the back-reference the same way validate-closeout would find it broken.
    (repo_root / backlog_path).write_text(
        (repo_root / backlog_path).read_text(encoding="utf-8").replace(Path(task_path).stem, "task_999_unrelated"),
        encoding="utf-8",
    )
    before = call_tool("validate_closeout", {"source": Path(task_path).stem}, repo_root=repo_root)
    assert "backlog_missing_task_link" in {issue["code"] for issue in before["issues"]}

    call_tool("repair_links", {"task_path": task_path}, repo_root=repo_root)
    after = call_tool("validate_closeout", {"source": Path(task_path).stem}, repo_root=repo_root)
    assert "backlog_missing_task_link" not in {issue["code"] for issue in after["issues"]}


def test_get_logics_doctor(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    result = call_tool("get_logics_doctor", {}, repo_root=repo_root)
    assert result["ok"] is True
    assert "issues" in result
