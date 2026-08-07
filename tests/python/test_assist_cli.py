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


def test_assist_handoff_reports_changed_paths_for_committed_range(tmp_path: Path) -> None:
    from logics_manager.assist import _build_handoff

    repo_root = tmp_path / "git-handoff-repo"
    repo_root.mkdir()
    subprocess.run(["git", "init", "-q"], cwd=repo_root, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_root, check=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_root, check=True)
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    task_path.write_text("## task_001_demo - Demo\n> Status: Ready\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_root, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "initial"], cwd=repo_root, check=True)
    since = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo_root, text=True).strip()

    task_path.write_text("## task_001_demo - Demo\n> Status: Done\n# Validation\n- pytest passed.\n", encoding="utf-8")
    (repo_root / "logics_manager").mkdir()
    (repo_root / "logics_manager" / "assist.py").write_text("# changed\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_root, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "update handoff surfaces"], cwd=repo_root, check=True)

    payload = _build_handoff(repo_root, since)

    assert payload["changed_paths"] == ["logics/tasks/task_001_demo.md", "logics_manager/assist.py"]
    assert payload["surface"]["counts"] == {"python-runtime": 1, "workflow-docs": 1}
    assert payload["logics_docs"][0]["path"] == "logics/tasks/task_001_demo.md"
    assert payload["validations"] == ["pytest passed."]


def test_assist_roi_report_rejects_configured_paths_outside_repo(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics.yaml").write_text(
        "\n".join(
            [
                "version: 1",
                "hybrid_assist:",
                "  audit_log: ../outside.jsonl",
                "  measurement_log: logics/.cache/hybrid_assist_measurements.jsonl",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit, match="Unsupported configured audit_log path"):
        main(["assist", "roi-report"])


def test_assist_roi_report_accepts_absolute_configured_paths_inside_repo(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    cache_dir = repo_root / "logics" / ".cache"
    cache_dir.mkdir(parents=True)
    audit_log = cache_dir / "custom_audit.jsonl"
    measurement_log = cache_dir / "custom_measurements.jsonl"
    audit_log.write_text("", encoding="utf-8")
    measurement_log.write_text("", encoding="utf-8")
    (repo_root / "logics.yaml").write_text(
        "\n".join(
            [
                "version: 1",
                "hybrid_assist:",
                f"  audit_log: {audit_log.as_posix()}",
                f"  measurement_log: {measurement_log.as_posix()}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "roi-report", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert payload["sources"]["audit_log"] == "logics/.cache/custom_audit.jsonl"
    assert payload["sources"]["measurement_log"] == "logics/.cache/custom_measurements.jsonl"


def test_assist_outside_output_is_rejected_even_in_dry_run(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit, match="Unsupported --out path"):
        main(["assist", "runtime-status", "--out", "../runtime.json", "--dry-run"])

    assert not (tmp_path / "runtime.json").exists()


def test_assist_execute_rejects_generated_path_outside_repo(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        "logics_manager.assist._build_request_draft",
        lambda _repo_root, intent: {
            "ref": "req_001_demo",
            "title": "Demo",
            "path": "../outside.md",
            "content": "# outside\n",
            "from_version": "1.0.0",
            "needs": ["Demo"],
            "acceptance": ["AC1: Demo"],
        },
    )

    with pytest.raises(SystemExit, match="Unsupported output path"):
        main(["assist", "request-draft", "--intent", "demo", "--execution-mode", "execute"])

    assert not (tmp_path / "outside.md").exists()
