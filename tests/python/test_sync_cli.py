from __future__ import annotations

import json
from importlib import metadata as importlib_metadata
import os
import re
import subprocess
import sys
import tempfile
import threading
import tomllib
from http.client import HTTPConnection
from pathlib import Path
from types import SimpleNamespace

import pytest

from logics_manager.config import DEFAULT_LOGICS_CONFIG, load_repo_config, render_config_show
from logics_manager.audit import audit_payload, render_audit
from logics_manager.index import index_payload, render_index
from logics_manager.lint import lint_payload, render_lint
from logics_manager.doctor import doctor_payload, render_doctor
from logics_manager.bootstrap import bootstrap_payload
from logics_manager.cli import main
from logics_manager.flow import PlannedDoc, closeout_payload, validate_closeout_payload
from logics_manager.flow_evidence import has_ac_proof, has_validation_evidence
from logics_manager.insights import followups_payload, health_payload, product_consistency_payload, status_payload
from logics_manager.sync import search_logics_docs_payload
from logics_manager import viewer as viewer_module
from logics_manager.viewer import (
    build_viewer_url,
    cdx_artifact_preview_payload,
    cdx_mission_apply_plan_payload,
    cdx_mission_plan_payload,
    cdx_mission_run_payload,
    cdx_remove_payload,
    cdx_history_payload,
    cdx_run_report_payload,
    cdx_runs_payload,
    cdx_status_payload,
    ci_status_payload,
    collect_viewer_items,
    create_request_from_cdx_report,
    create_viewer_server,
    edit_doc_payload,
    file_preview_payload,
    github_repo_url,
    git_diff_payload,
    git_file_preview_payload,
    git_status_payload,
    normalize_viewer_focus_target,
    open_file_payload,
    open_repo_folder_payload,
    read_doc_payload,
    viewer_project_registry,
    viewer_project_capabilities,
    VIEWER_MUTATING_ROUTES,
    WorkshopSessionRegistry,
    WorkshopTerminalRegistry,
    _append_lan_token,
    _render_qr_lines,
    render_start_status,
    workshop_commands_payload,
    workshop_terminals_available,
    workspace_preview_payload,
    workspace_tree_payload,
)
from logics_manager.update_check import get_update_info, is_newer_version
from flow_fixtures import write_ac_traceability_chain

from conftest import (
    _write_minimal_workflow_doc,
)


def test_sync_list_docs_recent_open_changed_filters(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    request_dir = repo_root / "logics" / "request"
    backlog_dir = repo_root / "logics" / "backlog"
    task_dir = repo_root / "logics" / "tasks"
    request_dir.mkdir(parents=True)
    backlog_dir.mkdir(parents=True)
    task_dir.mkdir(parents=True)
    _write_minimal_workflow_doc(request_dir / "req_001_old.md", title="Old", kind="request", status="Done", links=[])
    _write_minimal_workflow_doc(backlog_dir / "item_001_current.md", title="Current", kind="backlog", status="Ready", links=[])
    _write_minimal_workflow_doc(task_dir / "task_001_changed.md", title="Changed", kind="task", status="Ready", links=[])
    old_time = 1_700_000_000
    (request_dir / "req_001_old.md").touch()
    (backlog_dir / "item_001_current.md").touch()
    (task_dir / "task_001_changed.md").touch()
    os.utime(request_dir / "req_001_old.md", (old_time, old_time))
    os.utime(backlog_dir / "item_001_current.md", (old_time + 10, old_time + 10))
    os.utime(task_dir / "task_001_changed.md", (old_time + 20, old_time + 20))
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.sync._git_changed_paths", lambda _repo_root: ["logics/tasks/task_001_changed.md"])

    exit_code = main(["sync", "list-docs", "--open", "--recent", "--format", "json"])
    open_payload = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert open_payload["filters"]["open"] is True
    assert [item["ref"] for item in open_payload["items"]] == ["task_001_changed", "item_001_current"]

    exit_code = main(["sync", "list-docs", "--changed", "--format", "json"])
    changed_payload = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert changed_payload["view"] == "changed"
    assert changed_payload["changed_paths"] == ["logics/tasks/task_001_changed.md"]
    assert [item["ref"] for item in changed_payload["items"]] == ["task_001_changed"]


def test_search_docs_truncated_only_when_extra_match_exists(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_one.md",
        title="One",
        kind="request",
        status="Draft",
        links=[],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_002_two.md",
        title="Two",
        kind="request",
        status="Draft",
        links=[],
    )

    exact = search_logics_docs_payload(repo_root, "Status", kind="request", limit=2)
    truncated = search_logics_docs_payload(repo_root, "Status", kind="request", limit=1)

    assert exact["returned_count"] == 2
    assert exact["truncated"] is False
    assert truncated["returned_count"] == 1
    assert truncated["truncated"] is True


def test_sync_read_doc_text_includes_bounded_content(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True)
    (request_dir / "req_001_demo.md").write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
                "> Schema version: 1.0",
                "# Needs",
                "- Agents need useful body text.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "read-doc", "req_001_demo"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "req_001_demo (request): Demo Request" in captured.out
    assert "# Needs" in captured.out
    assert "Agents need useful body text." in captured.out


def test_sync_update_indicators_canonicalizes_status_alias(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    task_dir = repo_root / "logics" / "tasks"
    task_dir.mkdir(parents=True)
    task_path = task_dir / "task_001_demo.md"
    _write_minimal_workflow_doc(task_path, title="Demo task", kind="task", status="Ready", links=[])
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "update-indicators", "task_001_demo", "--status", "in_progress", "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    assert exit_code == 0
    assert payload["updated_indicators"]["Status"] == "In progress"
    assert "> Status: In progress" in task_path.read_text(encoding="utf-8")


def test_sync_list_and_read_roadmap_docs(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    roadmap_dir = repo_root / "logics" / "roadmap"
    roadmap_dir.mkdir(parents=True)
    (roadmap_dir / "road_001_demo_plan.md").write_text(
        "\n".join(
            [
                "## road_001_demo_plan - Demo Plan",
                "> Date: 2026-07-13",
                "> Status: Proposed",
                "> Related product: (none yet)",
                "> Related request: (none yet)",
                "> Reminder: Update roadmap links.",
                "# Summary",
                "Versioned plan.",
                "# Milestones",
                "## 0.1 - MVP",
                "- Goal: first slice.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "list-docs", "--kind", "roadmap", "--format", "json"])
    listed = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert listed["items"][0]["kind"] == "roadmap"
    assert listed["items"][0]["ref"] == "road_001_demo_plan"

    exit_code = main(["sync", "read-doc", "road_001_demo_plan", "--format", "json"])
    read = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert read["kind"] == "roadmap"
    assert read["sections"]["Milestones"][0] == "## 0.1 - MVP"


def test_sync_context_pack_accepts_multiple_refs(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "## req_001_demo - Demo Request\n> Status: Ready\n> Schema version: 1.0\n# Needs\n- One.\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "tasks" / "task_001_demo.md").write_text(
        "## task_001_demo - Demo Task\n> Status: Ready\n> Schema version: 1.0\n# Validation\n- Two.\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "context-pack", "req_001_demo", "task_001_demo", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert payload["refs"] == ["req_001_demo", "task_001_demo"]
    assert {doc["ref"] for doc in payload["docs"]} == {"req_001_demo", "task_001_demo"}


def test_sync_context_pack_handoff_includes_companions_metadata_and_validation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "product").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
                "> Schema version: 1.0",
                "# Companion docs",
                "- Product brief(s): `prod_001_demo`",
                "# Needs",
                "- One.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "tasks" / "task_001_demo.md").write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Ready",
                "> Schema version: 1.0",
                "# Backlog",
                "- `req_001_demo`",
                "# Validation",
                "- pytest passed.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "product" / "prod_001_demo.md").write_text(
        "## prod_001_demo - Demo Product\n> Status: Proposed\n# Overview\nProduct context.\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "context-pack", "req_001_demo", "task_001_demo", "--handoff", "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    assert exit_code == 0
    assert payload["profile"] == "deep"
    assert payload["handoff"]["enabled"] is True
    assert payload["handoff"]["source_refs"] == ["req_001_demo", "task_001_demo"]
    assert payload["command"] == "logics-manager sync context-pack req_001_demo task_001_demo --mode summary-only --profile deep --handoff"
    assert payload["generated_at"].endswith("Z")
    assert [doc["ref"] for doc in payload["companion_docs"]] == ["prod_001_demo"]
    assert payload["validation_summary"] == [
        {"ref": "task_001_demo", "path": "logics/tasks/task_001_demo.md", "items": ["- pytest passed."]}
    ]


def test_sync_refresh_mermaid_signatures_can_scope_targets(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text("## req_001_demo - Demo Request\n", encoding="utf-8")
    (repo_root / "logics" / "tasks" / "task_001_demo.md").write_text("## task_001_demo - Demo Task\n", encoding="utf-8")
    seen: list[str] = []

    def refresh(path: Path, _kind: str, _dry_run: bool, repo_root: Path | None = None) -> bool:
        assert repo_root is not None
        seen.append(path.relative_to(repo_root).as_posix())
        return True

    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.sync.refresh_workflow_mermaid_signature_file", refresh)

    exit_code = main(["sync", "refresh-mermaid-signatures", "task_001_demo", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert seen == ["logics/tasks/task_001_demo.md"]
    assert payload["scanned_files"] == ["logics/tasks/task_001_demo.md"]


def test_sync_outside_output_is_rejected_even_in_dry_run(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        "logics_manager.sync._build_context_pack",
        lambda _repo_root, ref, mode, profile, config=None, handoff=False: {
            "ref": ref,
            "mode": mode,
            "profile": profile,
            "handoff": {"enabled": handoff},
            "estimates": {"doc_count": 0, "char_count": 0},
            "docs": [],
            "changed_paths": [],
            "budgets": {"max_docs": 0},
        },
    )

    with pytest.raises(SystemExit, match="Unsupported --out path"):
        main(["sync", "context-pack", "req_001_demo", "--out", "../ctx.json", "--dry-run"])

    assert not (tmp_path / "ctx.json").exists()


def test_sync_close_eligible_requests_json_is_clean(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "# Backlog",
                "- `item_001_demo_item`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "backlog" / "item_001_demo_item.md").write_text(
        "\n".join(
            [
                "## item_001_demo_item - Demo Backlog",
                "> Status: Done",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "# Request",
                "- `req_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "close-eligible-requests", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert payload["closed"] == 1
    assert payload["scanned"] == 1
