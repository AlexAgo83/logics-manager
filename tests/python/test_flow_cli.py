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
    _write_ac_split_request,
    _write_request_chain_input,
)


def test_flow_creation_json_includes_agent_next_actions(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "new", "request", "--title", "Agent JSON Contract", "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    assert exit_code == 0
    assert payload["created_refs"] == [payload["ref"]]
    assert payload["changed_files"] == [payload["path"]]
    assert payload["validation_suggestions"][0].startswith("logics-manager flow validate ")
    assert payload["next_actions"]
    assert payload["next_action"]


def test_flow_new_request_uses_indicator_args(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(
        [
            "flow",
            "new",
            "request",
            "--title",
            "Indicator Args",
            "--understanding",
            "77%",
            "--confidence",
            "66%",
            "--complexity",
            "Low",
            "--theme",
            "Workflow",
            "--format",
            "json",
        ]
    )
    payload = json.loads(capsys.readouterr().out)
    text = (repo_root / payload["path"]).read_text(encoding="utf-8")

    assert exit_code == 0
    assert "> Understanding: 77%" in text
    assert "> Confidence: 66%" in text
    assert "> Complexity: Low" in text
    assert "> Theme: Workflow" in text


def test_flow_roadmap_propose_show_and_validate(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "roadmap").mkdir(parents=True)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(
        [
            "flow",
            "roadmap",
            "propose",
            "--title",
            "Demo Plan",
            "--milestone",
            "0.1: MVP",
            "--milestone",
            "1.0: Stable",
            "--format",
            "json",
        ]
    )
    created = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert created["ref"] == "road_001_demo_plan"
    assert created["milestones"] == ["0.1", "1.0"]

    exit_code = main(["flow", "roadmap", "show", "road_001_demo_plan", "--format", "json"])
    shown = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert shown["kind"] == "roadmap"
    assert "## 0.1 - MVP" in shown["content"]

    exit_code = main(["flow", "roadmap", "validate", "road_001_demo_plan", "--format", "json"])
    validated = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert validated["ok"] is True
    assert validated["milestone_count"] == 2


def test_flow_withdraw_marks_doc_obsolete_and_records_supersession(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    request_path = repo_root / "logics" / "request" / "req_001_old.md"
    request_path.parent.mkdir(parents=True)
    request_path.write_text("## req_001_old - Old\n> Status: Ready\n# Links\n- none\n", encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "withdraw", "req_001_old", "--superseded-by", "req_002_new", "--format", "json"])
    payload = json.loads(capsys.readouterr().out)
    text = request_path.read_text(encoding="utf-8")

    assert exit_code == 0
    assert payload["kind"] == "request"
    assert "> Status: Obsolete" in text
    assert "Superseded by: `req_002_new`" in text


def test_flow_new_does_not_overwrite_colliding_planned_ref(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    target_path = repo_root / "logics" / "request" / "req_000_demo_request.md"
    target_path.parent.mkdir(parents=True)
    target_path.write_text("existing content\n", encoding="utf-8")
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        "logics_manager.flow._plan_doc",
        lambda *_args, **_kwargs: PlannedDoc(ref="req_000_demo_request", path=target_path),
    )

    with pytest.raises(SystemExit, match="Ref collision while creating Logics doc"):
        main(["flow", "new", "request", "--title", "Demo Request"])

    assert target_path.read_text(encoding="utf-8") == "existing content\n"


def test_flow_split_request_accepts_ac_mappings_and_orchestration_task(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    source_path = repo_root / "logics" / "request" / "req_001_demo.md"
    _write_ac_split_request(source_path)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(
        [
            "flow",
            "split",
            "request",
            "req_001_demo",
            "--slice",
            "Slice A:AC1",
            "--slice",
            "Slice B:AC2",
            "--orchestration-task",
            "Coordinate Demo Split",
            "--orchestration-summary",
            "Coordinate mapped slices.",
            "--format",
            "json",
        ]
    )
    payload = json.loads(capsys.readouterr().out)

    assert exit_code == 0
    assert payload["created_refs"] == ["item_001_slice_a", "item_002_slice_b"]
    assert payload["ac_mappings"] == [
        {"backlog_ref": "item_001_slice_a", "title": "Slice A", "request_acs": ["AC1"]},
        {"backlog_ref": "item_002_slice_b", "title": "Slice B", "request_acs": ["AC2"]},
    ]
    assert payload["omitted_ac_ids"] == ["AC3"]
    assert payload["orchestration_task"]["ref"] == "task_001_coordinate_demo_split"
    first_text = (repo_root / "logics" / "backlog" / "item_001_slice_a.md").read_text(encoding="utf-8")
    task_text = (repo_root / "logics" / "tasks" / "task_001_coordinate_demo_split.md").read_text(encoding="utf-8")
    assert "- AC1: Generate mapped slice A." in first_text
    assert "AC2: Generate mapped slice B." not in first_text
    assert "request-AC1 -> This backlog slice" in first_text
    assert "`task_001_coordinate_demo_split`" in first_text
    assert "Coordinate mapped slices." in task_text


def test_flow_split_request_rejects_unknown_ac_mapping(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    source_path = repo_root / "logics" / "request" / "req_001_demo.md"
    _write_ac_split_request(source_path)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit, match="Unknown request AC"):
        main(["flow", "split", "request", "req_001_demo", "--slice", "Slice A:AC9"])


def test_flow_split_request_rejects_duplicate_ac_mapping(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    source_path = repo_root / "logics" / "request" / "req_001_demo.md"
    _write_ac_split_request(source_path)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit, match="Duplicate request AC"):
        main(["flow", "split", "request", "req_001_demo", "--slice", "Slice A:AC1", "--slice", "Slice B:AC1"])


def test_flow_validate_reports_and_applies_scoped_fixable_diagnostics(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True)
    (request_dir / "req_001_demo.md").write_text("## req_001_demo - Demo\n> Status: Ready\n", encoding="utf-8")
    (request_dir / "req_002_other.md").write_text("## req_002_other - Other\n> Status: Ready\n", encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        "logics_manager.flow.lint_payload",
        lambda _repo_root, require_status=False: {
            "findings": [
                {
                    "path": "logics/request/req_001_demo.md",
                    "message": "Mermaid context signature is stale",
                    "severity": "warning",
                    "repair_command": "logics-manager sync refresh-mermaid-signatures",
                },
                {"path": "logics/request/req_002_other.md", "message": "unrelated", "severity": "blocking"},
            ]
        },
    )
    monkeypatch.setattr("logics_manager.flow.audit_payload", lambda *_args, **_kwargs: {"findings": []})
    calls: list[tuple[list[str], bool]] = []

    def fake_repair(_repo_root: Path, refs: list[str], *, dry_run: bool) -> dict[str, object]:
        calls.append((refs, dry_run))
        return {"kind": "mermaid", "changed_files": ["logics/request/req_001_demo.md"], "dry_run": dry_run}

    monkeypatch.setattr("logics_manager.flow.repair_mermaid_payload", fake_repair)

    exit_code = main(["flow", "validate", "req_001_demo", "--fixable", "--apply-fixes", "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    assert exit_code == 0
    assert payload["finding_count"] == 1
    assert payload["fixable_count"] == 1
    assert payload["next_actions"][0] == "Validation findings are clear for selected refs."
    assert "Run with `--apply-fixes`" in payload["next_actions"][1]
    assert payload["repairs"][0]["changed_files"] == ["logics/request/req_001_demo.md"]
    assert calls == [(["req_001_demo"], False)]


def test_flow_validate_dry_run_does_not_apply_fix(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True)
    (request_dir / "req_001_demo.md").write_text("## req_001_demo - Demo\n> Status: Ready\n", encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        "logics_manager.flow.lint_payload",
        lambda _repo_root, require_status=False: {
            "findings": [
                {
                    "path": "logics/request/req_001_demo.md",
                    "message": "Mermaid context signature is stale",
                    "severity": "warning",
                    "repair_command": "logics-manager sync refresh-mermaid-signatures",
                }
            ]
        },
    )
    monkeypatch.setattr("logics_manager.flow.audit_payload", lambda *_args, **_kwargs: {"findings": []})
    monkeypatch.setattr(
        "logics_manager.flow.repair_mermaid_payload",
        lambda _repo_root, refs, *, dry_run: {"kind": "mermaid", "refs": refs, "changed_files": ["logics/request/req_001_demo.md"], "dry_run": dry_run},
    )

    exit_code = main(["flow", "validate", "req_001_demo", "--apply-fixes", "--dry-run", "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    assert exit_code == 0
    assert payload["repairs"][0]["dry_run"] is True
    assert payload["applied_fixes"] is False


def test_flow_validate_refuses_ambiguous_ac_traceability_fix(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True)
    (request_dir / "req_001_demo.md").write_text("## req_001_demo - Demo\n> Status: Ready\n", encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.flow.lint_payload", lambda _repo_root, require_status=False: {"findings": []})
    monkeypatch.setattr(
        "logics_manager.flow.audit_payload",
        lambda *_args, **_kwargs: {
            "findings": [
                {
                    "path": "logics/request/req_001_demo.md",
                    "code": "ac_missing_item_traceability",
                    "message": "missing AC proof",
                    "severity": "blocking",
                    "repair_command": "python3 -m logics_manager flow repair ac-traceability req_001_demo",
                }
            ]
        },
    )

    exit_code = main(["flow", "validate", "req_001_demo", "--apply-fixes", "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    # req_326: this asserted exit 0 alongside `ok: False`. The dispatcher now derives the
    # status from the payload, so a refused repair on a blocking finding exits non-zero.
    assert exit_code == 1
    assert payload["ok"] is False
    assert payload["refused_repairs"] == [
        {"repair_kind": "ac-traceability", "reason": "explicit --proof is required before applying AC traceability repairs"}
    ]


def test_flow_scaffold_request_chain_creates_docs_context_pack_and_index(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    for rel in ("request", "backlog", "tasks", "product"):
        (repo_root / "logics" / rel).mkdir(parents=True)
    input_path = repo_root / "logics" / "scaffold-input.json"
    _write_request_chain_input(input_path)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "scaffold", "request-chain", "--input", "logics/scaffold-input.json", "--context-pack", "logics/context/scaffold.json", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert payload["request_ref"] == "req_000_scaffold_demo"
    assert payload["product_ref"] == "prod_001_scaffold_demo_product"
    assert payload["backlog_refs"] == ["item_001_first_scaffold_slice", "item_002_context_pack_slice"]
    assert payload["task_ref"] == "task_001_orchestrate_scaffold_demo"
    assert (repo_root / "logics" / "INDEX.md").is_file()
    assert (repo_root / "logics" / "context" / "scaffold.json").is_file()
    context_payload = json.loads((repo_root / "logics" / "context" / "scaffold.json").read_text(encoding="utf-8"))
    request_text = (repo_root / "logics" / "request" / "req_000_scaffold_demo.md").read_text(encoding="utf-8")
    backlog_text = (repo_root / "logics" / "backlog" / "item_001_first_scaffold_slice.md").read_text(encoding="utf-8")
    assert context_payload["handoff"]["enabled"] is True
    assert context_payload["command"].endswith("--handoff")
    assert "This fixture should avoid generic generated text." in request_text
    assert "- `item_001_first_scaffold_slice`" in request_text
    assert "request-AC1 -> This backlog slice" in backlog_text
    assert "- Priority: Medium" in backlog_text
    assert "- Impact:" not in backlog_text
    assert "```mermaid" not in request_text


def test_flow_scaffold_request_chain_dry_run_lists_changes_without_writing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics").mkdir(parents=True)
    input_path = repo_root / "input.json"
    _write_request_chain_input(input_path)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "scaffold", "request-chain", "--input", "input.json", "--context-pack", "logics/context/scaffold.json", "--dry-run", "--format", "json"])

    assert exit_code == 0
    assert not (repo_root / "logics" / "request").exists()


def test_flow_scaffold_request_chain_rejects_invalid_input(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    input_path = repo_root / "input.json"
    input_path.write_text(json.dumps({"title": "Missing Items"}), encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit, match="backlog_items"):
        main(["flow", "scaffold", "request-chain", "--input", "input.json"])


def test_flow_scaffold_request_chain_rejects_existing_ref_collision(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    target = repo_root / "logics" / "request" / "req_000_scaffold_demo.md"
    target.parent.mkdir(parents=True)
    target.write_text("existing\n", encoding="utf-8")
    input_path = repo_root / "input.json"
    _write_request_chain_input(input_path)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        "logics_manager.flow._plan_doc",
        lambda *_args, **_kwargs: PlannedDoc(ref="req_000_scaffold_demo", path=target),
    )

    with pytest.raises(SystemExit, match="Ref collision"):
        main(["flow", "scaffold", "request-chain", "--input", "input.json"])


def test_validate_closeout_rejects_weak_validation_evidence(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_weak_validation.md"
    task_path.write_text(
        "\n".join(
            [
                "## task_001_weak_validation - Weak Validation",
                "> Status: Ready",
                "> Progress: 0%",
                "# Plan",
                "- [x] Do the work.",
                "# Definition of Done (DoD)",
                "- [x] Validation passes.",
                "# Validation",
                "- ok",
                "- not ok yet",
                "- verification pending",
                "- ... passed",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    payload = validate_closeout_payload(repo_root, "task_001_weak_validation")

    assert "validation_evidence_missing" in {issue["code"] for issue in payload["issues"]}


def test_validate_closeout_accepts_structured_validation_evidence(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_structured_validation.md"
    task_path.write_text(
        "\n".join(
            [
                "## task_001_structured_validation - Structured Validation",
                "> Status: Ready",
                "> Progress: 0%",
                "# Plan",
                "- [x] Do the work.",
                "# Definition of Done (DoD)",
                "- [x] Validation passes.",
                "# Validation",
                "- command: `pytest tests/python -q` | result: passed | date: 2026-06-07 | note: 181 tests",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    payload = validate_closeout_payload(repo_root, "task_001_structured_validation")

    assert "validation_evidence_missing" not in {issue["code"] for issue in payload["issues"]}


def test_repair_ac_traceability_records_explicit_proof(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    paths = write_ac_traceability_chain(repo_root)
    backlog_path = paths["backlog"]
    task_path = paths["task"]

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    assert main(
        [
            "flow",
            "repair",
            "ac-traceability",
            "req_001_demo",
            "--proof",
            "AC1 covered by closeout regression.",
            "--proof-source",
            "task_001_demo",
        ]
    ) == 0

    assert "request-AC1 -> This backlog slice. Proof: AC1 covered by closeout regression. Source: `task_001_demo`" in backlog_path.read_text(encoding="utf-8")
    assert "request-AC1 -> This task. Proof: AC1 covered by closeout regression. Source: `task_001_demo`" in task_path.read_text(encoding="utf-8")
    payload = validate_closeout_payload(repo_root, "task_001_demo")
    issue_codes = {issue["code"] for issue in payload["issues"]}
    assert "ac_missing_item_traceability" not in issue_codes
    assert "ac_missing_task_traceability" not in issue_codes


def test_repair_ac_traceability_replaces_only_the_selected_generated_placeholder(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    paths = write_ac_traceability_chain(repo_root)
    task_path = paths["task"]
    sibling_path = repo_root / "logics" / "tasks" / "task_002_sibling.md"
    generated = "- request-AC1 -> `item_001_demo`. Proof deferred to slice closeout."
    paths["request"].write_text(paths["request"].read_text(encoding="utf-8").replace("# Backlog", "- AC2: Leave sibling scope alone.\n# Backlog"), encoding="utf-8")
    task_path.write_text(task_path.read_text(encoding="utf-8").replace("# Links", "# AC Traceability\n" + generated + "\n- request-AC1 -> This task. Proof deferred to slice closeout. (operator note)\n# Links"), encoding="utf-8")
    sibling_path.write_text(task_path.read_text(encoding="utf-8").replace("task_001_demo", "task_002_sibling"), encoding="utf-8")
    paths["backlog"].write_text(paths["backlog"].read_text(encoding="utf-8").replace("# Links", "# AC Traceability\n- request-AC1 -> This backlog slice. Proof: owned.\n# Links").replace("`task_001_demo`", "`task_001_demo`, `task_002_sibling`"), encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    assert main(["flow", "repair", "ac-traceability", "req_001_demo", "--proof", "covered by regression"]) == 0
    assert task_path.read_text(encoding="utf-8").count(generated) == 1
    assert sibling_path.read_text(encoding="utf-8").count(generated) == 1

    assert main(["flow", "repair", "ac-traceability", "req_001_demo", "--proof", "covered by regression", "--task", "task_001_demo"]) == 0

    repaired = task_path.read_text(encoding="utf-8")
    assert "request-AC1 -> This task. Proof: covered by regression" in repaired
    assert "This task. Proof deferred to slice closeout. (operator note)" in repaired
    assert "request-AC2" not in repaired
    assert sibling_path.read_text(encoding="utf-8").count(generated) == 1


def test_closeout_allows_a_completed_task_to_leave_a_sibling_open(
    tmp_path: Path,
) -> None:
    repo_root = tmp_path / "logics-repo"
    paths = write_ac_traceability_chain(repo_root)
    task_path = paths["task"]
    sibling_path = repo_root / "logics" / "tasks" / "task_002_sibling.md"
    paths["backlog"].write_text(paths["backlog"].read_text(encoding="utf-8").replace("# Links", "# AC Traceability\n- request-AC1 -> This backlog slice. Proof: covered.\n# Links").replace("`task_001_demo`", "`task_001_demo`, `task_002_sibling`"), encoding="utf-8")
    task_path.write_text(task_path.read_text(encoding="utf-8").replace("# Links", "# AC Traceability\n- request-AC1 -> This task. Proof: covered.\n# Links"), encoding="utf-8")
    sibling_path.write_text(task_path.read_text(encoding="utf-8").replace("task_001_demo", "task_002_sibling"), encoding="utf-8")

    payload = closeout_payload(repo_root, "task_001_demo", validations=["pytest passed"], run_index=False, run_lint=False, run_audit=False, dry_run=False)

    assert payload["closed"] is True
    assert "> Status: In progress" in paths["backlog"].read_text(encoding="utf-8")


def test_closeout_checks_only_the_acs_declared_by_its_backlog_slice(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    paths = write_ac_traceability_chain(repo_root)
    paths["request"].write_text(paths["request"].read_text(encoding="utf-8").replace("# Backlog", "- AC2: Deliver the other slice.\n# Backlog\n- `item_002_other`"), encoding="utf-8")
    paths["backlog"].write_text(paths["backlog"].read_text(encoding="utf-8").replace("# Links", "# AC Traceability\n- request-AC1 -> This backlog slice. Proof: covered.\n# Links"), encoding="utf-8")
    paths["task"].write_text(paths["task"].read_text(encoding="utf-8").replace("# Links", "# AC Traceability\n- request-AC1 -> This task. Proof: covered.\n# Links"), encoding="utf-8")
    other_item = repo_root / "logics" / "backlog" / "item_002_other.md"
    other_task = repo_root / "logics" / "tasks" / "task_002_other.md"
    other_item.write_text("## item_002_other - Other\n> Status: Ready\n# AC Traceability\n- request-AC2 -> This backlog slice. Proof: deferred.\n# Links\n- Request: `req_001_demo`\n- Primary task(s): `task_002_other`\n", encoding="utf-8")
    other_task.write_text("## task_002_other - Other\n> Status: Ready\n# Backlog\n- `item_002_other`\n# AC Traceability\n- request-AC2 -> This task. Proof deferred to slice closeout.\n", encoding="utf-8")

    payload = validate_closeout_payload(repo_root, "task_001_demo")

    assert payload["ok"] is True


def test_repair_ac_traceability_verify_rolls_back_without_proof(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    paths = write_ac_traceability_chain(repo_root)
    backlog_path = paths["backlog"]
    task_path = paths["task"]
    original_backlog_text = backlog_path.read_text(encoding="utf-8")
    original_task_text = task_path.read_text(encoding="utf-8")

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    assert main(
        [
            "flow",
            "repair",
            "ac-traceability",
            "req_001_demo",
            "--verify-closeout",
            "task_001_demo",
            "--format",
            "json",
        ]
    ) == 0
    payload = json.loads(capsys.readouterr().out)

    assert payload["rolled_back"] is True
    assert payload["changed_files"] == []
    assert "logics/backlog/item_001_demo.md" in payload["attempted_changed_files"]
    assert backlog_path.read_text(encoding="utf-8") == original_backlog_text
    assert task_path.read_text(encoding="utf-8") == original_task_text


def test_closeout_rolls_back_failed_repairs(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    request_path = repo_root / "logics" / "request" / "req_001_demo.md"
    backlog_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"

    request_path.write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
                "# Needs",
                "- Deliver demo.",
                "# Acceptance criteria",
                "- AC1: Deliver demo.",
                "# Definition of Ready (DoR)",
                "- [ ] Ready.",
                "# Backlog",
                "- `item_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    backlog_path.write_text(
        "\n".join(
            [
                "## item_001_demo - Demo Backlog",
                "> Status: Ready",
                "# Problem",
                "- Deliver demo.",
                "# Links",
                "- Request: `req_001_demo`",
                "- Primary task(s): `task_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    task_path.write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Ready",
                "# Plan",
                "- [ ] Do the work.",
                "# Backlog",
                "- `item_001_demo`",
                "# Definition of Done (DoD)",
                "- [ ] Validation passes.",
                "# Validation",
                "- validation pending",
                "# Links",
                "- Request: `req_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    original_request_text = request_path.read_text(encoding="utf-8")
    original_backlog_text = backlog_path.read_text(encoding="utf-8")
    original_task_text = task_path.read_text(encoding="utf-8")

    payload = closeout_payload(
        repo_root,
        "task_001_demo",
        validations=["pytest passed"],
        run_index=False,
        run_lint=False,
        run_audit=False,
        dry_run=False,
    )

    assert payload["ok"] is False
    assert payload["rolled_back"] is True
    assert payload["changed_files"] == []
    assert "logics/tasks/task_001_demo.md" in payload["attempted_changed_files"]
    assert "ac_missing_item_traceability" in {issue["code"] for issue in payload["preflight"]["issues"]}
    assert "ac_missing_task_traceability" in {issue["code"] for issue in payload["preflight"]["issues"]}
    assert request_path.read_text(encoding="utf-8") == original_request_text
    assert backlog_path.read_text(encoding="utf-8") == original_backlog_text
    assert task_path.read_text(encoding="utf-8") == original_task_text


def test_closeout_settles_linked_product_brief(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    paths = write_ac_traceability_chain(repo_root)
    product_path = repo_root / "logics" / "product" / "prod_001_demo.md"
    product_path.parent.mkdir(parents=True)
    product_path.write_text(
        "\n".join(
            [
                "## prod_001_demo - Demo Product",
                "> Date: 2026-07-13",
                "> Status: Proposed",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "> Related architecture: (none yet)",
                "> Reminder: Update this doc.",
                "# Overview",
                "Demo product.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    task_path = paths["task"]
    paths["backlog"].write_text(
        paths["backlog"].read_text(encoding="utf-8")
        + "\n# AC Traceability\n- request-AC1 -> This backlog slice. Proof: closeout regression covers it.\n",
        encoding="utf-8",
    )
    task_path.write_text(
        task_path.read_text(encoding="utf-8")
        + "\n# Product\n- `prod_001_demo`\n# AC Traceability\n- request-AC1 -> This task. Proof: closeout regression covers it.\n",
        encoding="utf-8",
    )

    payload = closeout_payload(
        repo_root,
        "task_001_demo",
        validations=["pytest passed"],
        run_index=False,
        run_lint=False,
        run_audit=False,
        dry_run=False,
    )

    assert payload["ok"] is True
    assert "> Status: Settled" in product_path.read_text(encoding="utf-8")
    assert "> Related task: `task_001_demo`" in product_path.read_text(encoding="utf-8")


def test_flow_show_reads_workflow_doc_content(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    task_dir = repo_root / "logics" / "tasks"
    task_dir.mkdir(parents=True)
    (task_dir / "task_001_demo.md").write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Ready",
                "> Schema version: 1.0",
                "# Validation",
                "- pytest will run.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "show", "task_001_demo", "--section", "Validation"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "task_001_demo (task): Demo Task" in captured.out
    assert "# Validation" in captured.out
    assert "pytest will run." in captured.out
    # item_832 AC3: no viewer running in this test, so the output is exactly what it
    # was before this slice -- no "- link:" line at all.
    assert "- link:" not in captured.out


def test_flow_show_prints_a_link_when_a_viewer_is_running(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    """item_832 AC1: `flow show <ref>` prints a link that opens that document."""
    from logics_manager import viewer_docs

    repo_root = tmp_path / "logics-repo"
    task_dir = repo_root / "logics" / "tasks"
    task_dir.mkdir(parents=True)
    (task_dir / "task_001_demo.md").write_text(
        "## task_001_demo - Demo Task\n> Status: Ready\n> Schema version: 1.0\n# Validation\n- pytest will run.\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        viewer_docs,
        "running_viewer",
        lambda root, **kwargs: SimpleNamespace(scheme="http", host="127.0.0.1", port=4321),
    )

    exit_code = main(["flow", "show", "task_001_demo"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "- link: http://127.0.0.1:4321?focus=task_001_demo&read=1" in captured.out


def test_flow_unknown_subcommand_suggests_show(capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit, match=r"Unsupported flow subcommand: read\. Use `logics-manager flow show <ref>`"):
        main(["flow", "read", "task_001_demo"])


def test_flow_promote_accepts_request_ref_and_emits_clean_json(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    request_path = repo_root / "logics" / "request" / "req_001_demo.md"
    request_path.write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Draft",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "# Needs",
                "- Clarify scope",
                "# Context",
                "- Context note",
                "# Acceptance criteria",
                "- AC1: Validate scope",
                "# Backlog",
                "- none",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "promote", "request-to-backlog", "req_001_demo", "--dry-run", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert captured.err == ""
    assert payload["source"] == "logics/request/req_001_demo.md"
    assert payload["created_path"] == "logics/backlog/item_001_demo_request.md"
    assert not (repo_root / payload["created_path"]).exists()


def test_flow_close_rejects_external_task_before_mutation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    external_task = tmp_path / "task_999_external.md"
    original = "\n".join(
        [
            "## task_999_external - External",
            "> Status: Ready",
            "> From version: 1.0.0",
            "> Schema version: 1.0",
            "> Progress: 0%",
            "# Backlog",
            "- none",
        ]
    ) + "\n"
    external_task.write_text(original, encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit, match="Unsupported source"):
        main(["flow", "close", "task", external_task.as_posix()])

    assert external_task.read_text(encoding="utf-8") == original


def test_flow_close_accepts_task_ref_and_emits_clean_json(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    task_path.write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Ready",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "> Progress: 0%",
                "# Backlog",
                "- none",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "close", "task", "task_001_demo", "--dry-run", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert payload == {
        "command": "close",
        "dry_run": True,
        "kind": "task",
        "source": "logics/tasks/task_001_demo.md",
    }
    assert "> Status: Ready" in task_path.read_text(encoding="utf-8")


def test_close_doc_inserts_progress_after_metadata(tmp_path: Path) -> None:
    from logics_manager.flow import _close_doc, DOC_KINDS

    doc = tmp_path / "task_x.md"
    doc.write_text(
        "## task_x - Title\n"
        "> From version: 1.0\n"
        "> Schema version: 1.0\n"
        "> Status: Ready\n"
        "> Understanding: 90%\n"
        "\n# Context\n- x\n",
        encoding="utf-8",
    )
    _close_doc(doc, DOC_KINDS["task"], dry_run=False)
    lines = doc.read_text(encoding="utf-8").splitlines()
    progress_idx = next(i for i, l in enumerate(lines) if l.startswith("> Progress:"))
    schema_idx = next(i for i, l in enumerate(lines) if l.startswith("> Schema version:"))
    # Progress must land after the other metadata, not be jammed in before it.
    assert progress_idx > schema_idx
    assert lines[progress_idx] == "> Progress: 100%"


def test_related_ref_strips_captured_ref() -> None:
    from logics_manager.insights import _related_ref

    assert _related_ref("> Related request: `req_1 `\n", "request") == "req_1"
    assert _related_ref("> Related task:  task_9  \n", "task") == "task_9"
