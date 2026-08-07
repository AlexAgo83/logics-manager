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
from logics_manager.obsidian import obsidian_payload
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
    render_start_status,
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
    _run_logics_manager_subprocess,
    _write_minimal_architecture_doc,
    _write_minimal_lint_doc,
    _write_minimal_product_doc,
    _write_minimal_spec_doc,
    _write_minimal_workflow_doc,
    _write_subprocess_json_repo,
)


def test_main_prints_help_and_fails_without_command(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main([])

    captured = capsys.readouterr()
    assert exit_code == 1
    assert "Logics Manager CLI" in captured.out
    assert "Common workflows:" in captured.out


def test_cli_rejects_invalid_subcommand_via_argparse() -> None:
    # The hardcoded slice validators are gone; argparse rejects unknown subcommands.
    with pytest.raises(SystemExit) as excinfo:
        main(["sync", "definitely-not-a-subcommand"])
    assert excinfo.value.code == 2
    with pytest.raises(SystemExit) as excinfo:
        main(["assist", "definitely-not-a-subcommand"])
    assert excinfo.value.code == 2


def test_main_prints_version_and_exits(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["--version"])

    captured = capsys.readouterr()
    assert exit_code == 0
    version = (Path(__file__).resolve().parents[2] / "VERSION").read_text(encoding="utf-8").strip()
    assert f"logics-manager {version}" in captured.out


def test_main_prints_version_with_short_alias(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["-v"])

    captured = capsys.readouterr()
    assert exit_code == 0
    version = (Path(__file__).resolve().parents[2] / "VERSION").read_text(encoding="utf-8").strip()
    assert f"logics-manager {version}" in captured.out


def test_python_viewer_assets_include_workshop_terminal_vendor_files() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    package_asset_root = repo_root / "logics_manager" / "viewer_assets" / "media" / "vendor" / "xterm"
    package_viewer_root = repo_root / "logics_manager" / "viewer_assets" / "viewer"
    expected_files = {
        "xterm.css",
        "xterm.js",
        "xterm-addon-fit.js",
        "xterm-addon-web-links.js",
    }

    assert expected_files <= {path.name for path in package_asset_root.iterdir()}

    pyproject = tomllib.loads((repo_root / "pyproject.toml").read_text(encoding="utf-8"))
    package_data = pyproject["tool"]["setuptools"]["package-data"]["logics_manager"]
    assert "viewer_assets/media/vendor/xterm/*" in package_data

    package_index = (package_viewer_root / "index.html").read_text(encoding="utf-8")
    assert 'id="viewer-workshop"' in package_index
    assert 'id="viewer-lan-banner"' in package_index
    assert "/media/vendor/xterm/xterm.css" in package_index
    assert "/media/vendor/xterm/xterm.js" in package_index
    assert "/media/vendor/xterm/xterm-addon-fit.js" in package_index
    assert "/media/vendor/xterm/xterm-addon-web-links.js" in package_index
    provenance = (package_asset_root / "PROVENANCE.md").read_text(encoding="utf-8")
    assert "@xterm/xterm@5.5.0" in provenance
    assert "@xterm/addon-fit@0.10.0" in provenance
    assert "@xterm/addon-web-links@0.11.0" in provenance
    package_host = (package_viewer_root / "browser-host.js").read_text(encoding="utf-8")
    assert "convertEol: false" in package_host


def test_main_renders_the_canonical_claude_bridge_manifest(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["assist", "claude-bridges", "--format", "json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["kind"] == "claude-bridge-manifest"
    assert payload["bridge_count"] == 4
    assert [bridge["id"] for bridge in payload["bridges"]] == [
        "hybrid-assist",
        "request-draft",
        "spec-first-pass",
        "backlog-groom",
    ]
    assert "Reviewer nudge:" in payload["bridges"][2]["command_content"]


def test_main_renders_the_canonical_claude_instructions_manifest(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["assist", "claude-instructions", "--format", "json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["kind"] == "claude-instructions"
    assert payload["path"] == "logics/instructions.md"
    assert payload["line_count"] > 0
    assert "python3 -m logics_manager flow finish task" in payload["content"]
    assert "rtk npm exec -- vitest" in payload["content"]


def test_main_assist_cdx_memory_show_uses_shared_payload(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: tmp_path)
    monkeypatch.setattr(
        "logics_manager.assist.cdx_memory_payload",
        lambda *_args, **_kwargs: {
            "ok": True,
            "state": "ready",
            "scope": "current",
            "warnings": [],
            "cleaned_excerpt": "Clean handoff",
            "raw_excerpt": "Raw handoff",
        },
    )

    exit_code = main(["assist", "cdx-memory", "show", "--clean"])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "CDX memory current: ready" in captured.out
    assert "Clean handoff" in captured.out


def test_main_roadmap_status_reports_unplaced_refs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    _write_subprocess_json_repo(tmp_path)
    (tmp_path / "logics" / "roadmap").mkdir(parents=True)
    (tmp_path / "logics" / "roadmap" / "road_001_plan.md").write_text("## road_001_plan - Plan\n\n## Now\n\n- `req_001_demo`\n", encoding="utf-8")
    monkeypatch.setattr("logics_manager.roadmap.find_repo_root", lambda _cwd: tmp_path)

    exit_code = main(["roadmap", "status", "--format", "json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["ok"] is True
    assert {row["ref"] for row in payload["unplaced"]} == {"item_001_demo", "task_001_demo"}


def test_main_roadmap_place_adds_ref_to_milestone(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    _write_subprocess_json_repo(tmp_path)
    (tmp_path / "logics" / "roadmap").mkdir(parents=True)
    roadmap = tmp_path / "logics" / "roadmap" / "road_001_plan.md"
    roadmap.write_text("## road_001_plan - Plan\n\n## Now\n", encoding="utf-8")
    monkeypatch.setattr("logics_manager.roadmap.find_repo_root", lambda _cwd: tmp_path)

    exit_code = main(["roadmap", "place", "task_001_demo", "--milestone", "Now", "--format", "json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["state"] == "updated"
    assert "`task_001_demo`: Demo task" in roadmap.read_text(encoding="utf-8")


def test_main_design_prompt_generates_prompt_pack(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    _write_subprocess_json_repo(tmp_path)
    monkeypatch.setattr("logics_manager.design.find_repo_root", lambda _cwd: tmp_path)

    exit_code = main([
        "design",
        "prompt",
        "--text",
        "garage upgrade icons",
        "--kind",
        "icon-sheet",
        "--count",
        "16",
        "--ref",
        "task_001_demo",
        "--out",
        "logics/design/garage-icons",
        "--format",
        "json",
    ])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["layout"] == "4x4 grid"
    assert payload["transparent"] is True
    assert "task_001_demo - Demo task" in payload["prompt"]
    assert (tmp_path / "logics" / "design" / "garage-icons" / "prompt.md").is_file()


def test_main_accepts_json_alias_for_native_root_command(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = Path(tempfile.mkdtemp(prefix="logics-json-alias-"))
    (repo_root / "logics").mkdir()
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["index", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["ok"] is True
    assert payload["output_path"] == "logics/INDEX.md"


def test_main_accepts_json_alias_for_native_subcommand(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = Path(tempfile.mkdtemp(prefix="logics-json-alias-sync-"))
    (repo_root / "logics" / "request").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        kind="request",
        status="Draft",
        links=[],
    )
    monkeypatch.setattr("logics_manager.config.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.sync.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "list-docs", "--kind", "request", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["returned_count"] == 1
    assert payload["items"][0]["ref"] == "req_001_demo"


def test_obsidian_sync_is_disabled_by_default(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    doc = repo_root / "logics" / "request" / "req_001_demo.md"
    _write_minimal_lint_doc(doc, title="Demo request", status="Ready", include_progress=False)

    payload = obsidian_payload(repo_root, action="sync")

    assert payload["ok"] is True
    assert payload["changed_count"] == 0
    assert "obsidian.enabled is false" in payload["skipped_reason"]
    assert not doc.read_text(encoding="utf-8").startswith("---")


def test_obsidian_sync_check_and_clean_round_trip(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics.yaml").write_text("version: 1\nobsidian:\n  enabled: true\n", encoding="utf-8")
    doc = repo_root / "logics" / "request" / "req_001_demo.md"
    _write_minimal_lint_doc(doc, title="Demo request", status="Ready", include_progress=False)
    original = doc.read_text(encoding="utf-8")

    sync_payload = obsidian_payload(repo_root, action="sync")
    projected = doc.read_text(encoding="utf-8")
    check_payload = obsidian_payload(repo_root, action="sync", check=True)
    clean_payload = obsidian_payload(repo_root, action="clean")

    assert sync_payload["changed"] == ["logics/request/req_001_demo.md"]
    assert projected.startswith("---\n")
    assert 'logics_projection: "obsidian"' in projected
    assert 'type: "request"' in projected
    assert 'ref: "req_001_demo"' in projected
    assert 'status: "Ready"' in projected
    assert '  - "Demo request"' in projected
    assert check_payload["ok"] is True
    assert clean_payload["changed_count"] == 1
    assert doc.read_text(encoding="utf-8") == original


def test_obsidian_check_and_lint_detect_frontmatter_drift(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics.yaml").write_text("version: 1\nobsidian:\n  enabled: true\n", encoding="utf-8")
    doc = repo_root / "logics" / "request" / "req_001_demo.md"
    _write_minimal_lint_doc(doc, title="Demo request", status="Ready", include_progress=False)
    obsidian_payload(repo_root, action="sync")
    doc.write_text(doc.read_text(encoding="utf-8").replace('status: "Ready"', 'status: "Draft"', 1), encoding="utf-8")

    check_payload = obsidian_payload(repo_root, action="sync", check=True)
    lint = lint_payload(repo_root, require_status=True)

    assert check_payload["ok"] is False
    assert check_payload["drift_count"] == 1
    assert lint["ok"] is False
    assert any("Obsidian frontmatter drift" in issue["message"] for issue in lint["issues"])


def test_update_check_compares_versions_and_uses_cache(tmp_path: Path) -> None:
    cache_path = tmp_path / "update-check.json"
    calls = 0

    def fetch_latest() -> str:
        nonlocal calls
        calls += 1
        return "2.3.0"

    assert is_newer_version("2.3.0", "2.2.0") is True
    assert is_newer_version("2.2.0", "2.2.0") is False
    assert is_newer_version("2.2.0", "2.2.0-beta.1") is True
    assert is_newer_version("2.2.0-beta.2", "2.2.0-beta.10") is False
    assert is_newer_version("2.2.0.1", "2.2.0") is True
    first = get_update_info("2.2.0", cache_path=cache_path, now=100, fetch_latest=fetch_latest)
    second = get_update_info("2.2.0", cache_path=cache_path, now=200, fetch_latest=lambda: "9.9.9")

    assert first.update_available is True
    assert first.latest_version == "2.3.0"
    assert second.latest_version == "2.3.0"
    assert calls == 1


def test_update_check_does_not_cache_failed_fetch(tmp_path: Path) -> None:
    cache_path = tmp_path / "update-check.json"
    calls = 0

    def fetch_latest() -> str | None:
        nonlocal calls
        calls += 1
        return None

    first = get_update_info("2.2.0", cache_path=cache_path, now=100, fetch_latest=fetch_latest)
    second = get_update_info("2.2.0", cache_path=cache_path, now=200, fetch_latest=fetch_latest)

    assert first.latest_version is None
    assert second.latest_version is None
    assert calls == 2
    assert not cache_path.exists()


def test_cli_update_notice_is_human_only(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
) -> None:
    repo_root = tmp_path
    (repo_root / "logics").mkdir()
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.cli.get_update_notice", lambda _version: "update available")
    monkeypatch.setattr(sys.stdout, "isatty", lambda: True)

    exit_code = main(["status"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "update available" in captured.err


def test_cli_update_notice_skips_json(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
) -> None:
    repo_root = tmp_path
    (repo_root / "logics").mkdir()
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.cli.get_update_notice", lambda _version: "update available")
    monkeypatch.setattr(sys.stdout, "isatty", lambda: True)

    exit_code = main(["status", "--json"])
    captured = capsys.readouterr()

    assert exit_code == 0
    json.loads(captured.out)
    assert "update available" not in captured.err


def test_root_help_lists_local_viewer_command(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["--help"])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "view       Start a local read-only browser viewer" in captured.out


def test_create_request_from_cdx_report_writes_traceable_request(tmp_path: Path) -> None:
    report = {
        "report": {
            "run": {"run_id": "run-1", "status": "succeeded"},
            "artifacts": {"transcript_path": "/tmp/run.log", "stdout_path": "/tmp/run.out"},
            "task_report": {
                "kind": "code-review",
                "run_id": "run-1",
                "summary": "One issue.",
                "findings": [{"severity": "high", "path": "src/app.py", "line": 12, "message": "Missing validation."}],
            },
        }
    }

    created = create_request_from_cdx_report(tmp_path, report)

    assert created["id"].startswith("req_000_address_cdx_code_review_findings")
    text = (tmp_path / created["path"]).read_text(encoding="utf-8")
    assert "CDX run id: `run-1`" in text
    assert "`src/app.py:12`: Missing validation." in text


def test_create_request_from_cdx_report_handles_mission_output(tmp_path: Path) -> None:
    report = {
        "report": {
            "run": {"run_id": "run-2", "status": "succeeded", "kind": "assistant"},
            "artifacts": {"transcript_path": "/tmp/run.log", "stdout_path": "/tmp/run.out"},
            "task_report": {"kind": "assistant", "run_id": "run-2", "summary": "Release review completed."},
            "missionOutput": {
                "summary": "Release is not ready.",
                "findings": ["Missing v2.8.0 changelog."],
                "recommendations": [{"title": "Create release metadata", "command": "npm run release:changelog:validate"}],
            },
        }
    }

    created = create_request_from_cdx_report(tmp_path, report)

    assert created["id"].startswith("req_000_address_cdx_assistant_follow_up")
    text = (tmp_path / created["path"]).read_text(encoding="utf-8")
    assert "Follow up on CDX `assistant` run `run-2`." in text
    assert "Missing v2.8.0 changelog." in text
    assert "Create release metadata" in text
    assert "npm run release:changelog:validate" in text


def test_create_request_from_cdx_report_handles_full_audit_request_files(tmp_path: Path) -> None:
    report = {
        "report": {
            "run": {"run_id": "run-audit", "status": "succeeded", "kind": "full-audit"},
            "artifacts": {"transcript_path": "/tmp/run.log", "stdout_path": "/tmp/run.out"},
            "task_report": {"kind": "full-audit", "run_id": "run-audit", "summary": "Audit completed."},
            "missionOutput": {
                "summary": "Audit follow-up request created.",
                "findings": [{"severity": "medium", "path": "logics/request/req_240.md", "message": "Missing validation trace."}],
                "requestFiles": [{"path": "logics/request/req_999_audit_follow_up.md", "purpose": "Audit follow-up"}],
            },
        }
    }

    created = create_request_from_cdx_report(tmp_path, report)

    assert created["id"].startswith("req_000_address_cdx_audit_findings")
    text = (tmp_path / created["path"]).read_text(encoding="utf-8")
    assert "Follow up on CDX full-audit run `run-audit`." in text
    assert "Audit follow-up" in text
    assert "logics/request/req_999_audit_follow_up.md" in text


def test_status_payload_reports_remaining_work(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "product").mkdir(parents=True)
    (repo_root / "logics" / "architecture").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        kind="request",
        status="Draft",
        links=[],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_001_demo.md",
        title="Demo backlog",
        kind="backlog",
        status="Ready",
        links=[],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "tasks" / "task_001_demo.md",
        title="Demo task",
        kind="task",
        status="In progress",
        links=["item_001_demo"],
    )

    payload = status_payload(repo_root)

    assert payload["open_count"] == 3
    assert payload["active_tasks"][0]["ref"] == "task_001_demo"
    assert payload["backlog_without_task"] == []
    assert "Continue or finish 1 active task(s)." in payload["next_actions"]
    assert "Groom 1 draft request(s)." in payload["next_actions"]


def test_status_payload_sorts_tasks_by_linked_item_priority(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    for suffix, priority in (("low", "Low"), ("high", "High")):
        item_path = repo_root / "logics" / "backlog" / f"item_00{1 if suffix == 'low' else 2}_{suffix}.md"
        task_path = repo_root / "logics" / "tasks" / f"task_00{1 if suffix == 'low' else 2}_{suffix}.md"
        _write_minimal_workflow_doc(item_path, title=suffix, kind="backlog", status="Ready", links=[])
        item_path.write_text(item_path.read_text(encoding="utf-8") + f"\n# Priority\n- Priority: {priority}\n", encoding="utf-8")
        _write_minimal_workflow_doc(task_path, title=suffix, kind="task", status="Ready", links=[item_path.stem])

    payload = status_payload(repo_root)

    assert [item["ref"] for item in payload["active_tasks"]] == ["task_002_high", "task_001_low"]
    assert payload["active_tasks"][0]["priority"] == "High"


def test_flow_start_marks_doc_in_progress_with_env_owner(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    _write_minimal_workflow_doc(task_path, title="Demo task", kind="task", status="Ready", links=[])
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setenv("LOGICS_AGENT", "codex")

    exit_code = main(["flow", "start", "task_001_demo", "--format", "json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    text = task_path.read_text(encoding="utf-8")
    assert exit_code == 0
    assert payload["previous_status"] == "Ready"
    assert payload["status"] == "In progress"
    assert payload["owner"] == "codex"
    assert payload["warnings"] == []
    assert "> Status: In progress" in text
    assert "> Owner: codex" in text


def test_flow_start_task_updates_linked_backlog_progress(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    item_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    _write_minimal_workflow_doc(item_path, title="Demo backlog", kind="backlog", status="Ready", links=["task_001_demo"])
    _write_minimal_workflow_doc(task_path, title="Demo task", kind="task", status="Ready", links=["item_001_demo"])
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "start", "task_001_demo", "--format", "json"])

    payload = json.loads(capsys.readouterr().out)
    item_text = item_path.read_text(encoding="utf-8")
    assert exit_code == 0
    assert "logics/backlog/item_001_demo.md" in payload["changed_files"]
    assert "> Status: In progress" in item_text
    assert "> Progress: 10%" in item_text


def test_flow_progress_task_updates_linked_backlog_average(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    item_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    task_one = repo_root / "logics" / "tasks" / "task_001_demo.md"
    task_two = repo_root / "logics" / "tasks" / "task_002_demo.md"
    _write_minimal_workflow_doc(item_path, title="Demo backlog", kind="backlog", status="In progress", links=["task_001_demo", "task_002_demo"])
    _write_minimal_workflow_doc(task_one, title="Demo task", kind="task", status="In progress", links=["item_001_demo"])
    _write_minimal_workflow_doc(task_two, title="Other task", kind="task", status="Ready", links=["item_001_demo"])
    task_two.write_text(task_two.read_text(encoding="utf-8").replace("> Schema version: 1.0", "> Schema version: 1.0\n> Progress: 100%"), encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "progress", "task", "task_001_demo", "--progress", "40%", "--format", "json"])

    payload = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert payload["progress"] == "40%"
    assert "> Progress: 40%" in task_one.read_text(encoding="utf-8")
    assert "> Progress: 70%" in item_path.read_text(encoding="utf-8")


def test_flow_progress_task_rejects_invalid_progress_without_writes(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    _write_minimal_workflow_doc(task_path, title="Demo task", kind="task", status="Ready", links=[])
    before = task_path.read_text(encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit):
        main(["flow", "progress", "task", "task_001_demo", "--progress", "soon"])

    assert task_path.read_text(encoding="utf-8") == before


def test_flow_start_warns_without_owner_and_overrides_existing_owner(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    _write_minimal_workflow_doc(task_path, title="Demo task", kind="task", status="Ready", links=[])
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.delenv("LOGICS_AGENT", raising=False)

    exit_code = main(["flow", "start", "task_001_demo"])
    first_output = capsys.readouterr().out

    assert exit_code == 0
    assert "Warning: No owner provided" in first_output
    assert "> Status: In progress" in task_path.read_text(encoding="utf-8")
    assert "> Owner:" not in task_path.read_text(encoding="utf-8")

    main(["flow", "start", "task_001_demo", "--owner", "codex"])
    capsys.readouterr()
    exit_code = main(["flow", "start", "task_001_demo", "--owner", "reviewer", "--format", "json"])

    payload = json.loads(capsys.readouterr().out)
    text = task_path.read_text(encoding="utf-8")
    assert exit_code == 0
    assert "already owner=codex" in payload["warnings"][0]
    assert payload["previous_owner"] == "codex"
    assert payload["owner"] == "reviewer"
    assert "> Owner: reviewer" in text


def test_owner_surfaces_in_status_flow_list_index_and_obsidian(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics.yaml").write_text("version: 1\nobsidian:\n  enabled: true\n", encoding="utf-8")
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    _write_minimal_workflow_doc(task_path, title="Demo task", kind="task", status="In progress", links=[])
    task_path.write_text(
        task_path.read_text(encoding="utf-8").replace(
            "> Status: In progress\n",
            "> Status: In progress\n> Owner: codex\n",
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    status = status_payload(repo_root)
    assert status["active_tasks"][0]["owner"] == "codex"

    exit_code = main(["flow", "list", "--format", "json"])
    flow_list = json.loads(capsys.readouterr().out)
    assert exit_code == 0
    assert flow_list["entries"][0]["owner"] == "codex"

    index_payload(repo_root, out="logics/INDEX.md")
    index_text = (repo_root / "logics" / "INDEX.md").read_text(encoding="utf-8")
    assert "| Doc | Title | Status | Owner | Progress | Path |" in index_text
    assert "| [task_001_demo]" in index_text
    assert " | In progress | codex | " in index_text

    sync_payload = obsidian_payload(repo_root, action="sync")
    projected = task_path.read_text(encoding="utf-8")
    assert sync_payload["ok"] is True
    assert 'owner: "codex"' in projected


def test_lint_accepts_owner_indicator(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    _write_minimal_lint_doc(task_path, title="Demo task", status="In progress", include_progress=True)
    task_path.write_text(task_path.read_text(encoding="utf-8") + "> Owner: codex\n", encoding="utf-8")

    payload = lint_payload(repo_root, require_status=True)

    assert payload["ok"] is True


def test_main_runs_status_json(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "tasks" / "task_001_demo.md",
        title="Demo task",
        kind="task",
        status="Ready",
        links=[],
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["status", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["active_tasks"][0]["ref"] == "task_001_demo"


def test_health_payload_reports_workflow_signals(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_001_demo.md",
        title="Demo backlog",
        kind="backlog",
        status="Done",
        links=[],
    )
    (repo_root / "logics" / "backlog" / "item_001_demo.md").write_text(
        (repo_root / "logics" / "backlog" / "item_001_demo.md").read_text(encoding="utf-8").replace("> Progress: 0%", "> Progress: 90%"),
        encoding="utf-8",
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "tasks" / "task_001_demo.md",
        title="Demo task",
        kind="task",
        status="Blocked",
        links=[],
    )

    payload = health_payload(repo_root)

    assert payload["ok"] is False
    assert payload["issue_count"] == 2
    assert payload["issues"]["done_without_full_progress"][0]["ref"] == "item_001_demo"
    assert payload["issues"]["blocked_docs"][0]["ref"] == "task_001_demo"


def test_main_runs_health_json(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        kind="request",
        status="Draft",
        links=[],
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["health", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["doc_count"] == 1
    assert payload["open_workflow_count"] == 1


def test_followups_payload_suggests_request_commands(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Validated",
        body="# References\n- Follow-up area: improve workflow search\n",
    )

    payload = followups_payload(repo_root)

    assert payload["count"] == 1
    item = payload["followups"][0]
    assert item["source_ref"] == "prod_001_demo"
    assert item["text"] == "improve workflow search"
    assert "--title 'Improve workflow search'" in item["suggested_command"]


def test_followups_payload_cleans_suggested_titles(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "product").mkdir(parents=True)
    long_tail = " while keeping the generated shell command readable and bounded for operators"
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Proposed",
        body=f"- Follow-up area: review `product-consistency --strict` behavior{long_tail * 2}\n",
    )

    payload = followups_payload(repo_root)
    item = payload["followups"][0]

    assert "`" not in item["suggested_title"]
    assert item["suggested_title"].startswith("Review product-consistency --strict behavior")
    assert len(item["suggested_title"]) <= 96
    assert item["suggested_command"].startswith("python3 -m logics_manager flow new request --title ")


def test_followups_payload_skips_non_actionable_markers(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_001_demo.md",
        title="Demo backlog",
        kind="backlog",
        status="Done",
        links=[],
    )
    path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    path.write_text(
        path.read_text(encoding="utf-8")
        + "\n# Decision framing\n"
        + "- Product follow-up: none\n"
        + "- Architecture follow-up: No architecture decision follow-up is expected based on current signals.\n"
        + "- Architecture follow-up: Covered by `adr_001_demo`; no new ADR is required unless scope changes.\n"
        + "- Product follow-up: define release workflow\n",
        encoding="utf-8",
    )

    payload = followups_payload(repo_root, include_closed=True)

    assert payload["count"] == 1
    assert payload["followups"][0]["text"] == "define release workflow"


def test_followups_payload_defaults_to_open_sources(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_001_done.md",
        title="Done backlog",
        kind="backlog",
        status="Done",
        links=[],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_002_ready.md",
        title="Ready backlog",
        kind="backlog",
        status="Ready",
        links=[],
    )
    (repo_root / "logics" / "backlog" / "item_001_done.md").write_text(
        (repo_root / "logics" / "backlog" / "item_001_done.md").read_text(encoding="utf-8")
        + "\n- Product follow-up: closed followup\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "backlog" / "item_002_ready.md").write_text(
        (repo_root / "logics" / "backlog" / "item_002_ready.md").read_text(encoding="utf-8")
        + "\n- Product follow-up: open followup\n",
        encoding="utf-8",
    )

    payload = followups_payload(repo_root)
    closed_payload = followups_payload(repo_root, closed_only=True)

    assert [item["text"] for item in payload["followups"]] == ["open followup"]
    assert [item["text"] for item in closed_payload["followups"]] == ["closed followup"]


def test_followups_payload_treats_settled_companion_docs_as_closed(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Settled",
        body="- Product follow-up: settled followup\n",
    )

    payload = followups_payload(repo_root)
    closed_payload = followups_payload(repo_root, closed_only=True)

    assert payload["followups"] == []
    assert [item["text"] for item in closed_payload["followups"]] == ["settled followup"]


def test_followups_payload_filters_source_kind(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "product").mkdir(parents=True)
    (repo_root / "logics" / "architecture").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Proposed",
        body="- Follow-up area: product followup\n",
    )
    (repo_root / "logics" / "architecture" / "adr_001_demo.md").write_text(
        "\n".join(
            [
                "## adr_001_demo - Demo ADR",
                "> Status: Proposed",
                "",
                "- Architecture follow-up: architecture followup",
            ]
        ),
        encoding="utf-8",
    )

    payload = followups_payload(repo_root, source_kind="product")

    assert payload["count"] == 1
    assert payload["followups"][0]["source_kind"] == "product"
    assert payload["followups"][0]["text"] == "product followup"


def test_main_runs_followups_json(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "architecture").mkdir(parents=True)
    (repo_root / "logics" / "architecture" / "adr_001_demo.md").write_text(
        "\n".join(
            [
                "## adr_001_demo - Demo ADR",
                "> Status: Proposed",
                "",
                "# Notes",
                "- Architecture follow-up: document module boundaries",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["followups", "--source-kind", "architecture", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["filters"]["source_kind"] == "architecture"
    assert payload["followups"][0]["text"] == "document module boundaries"


def test_main_runs_search_shortcut_json(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        kind="request",
        status="Draft",
        links=[],
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["search", "Demo", "--kind", "request", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["returned_count"] == 1
    assert payload["matches"][0]["ref"] == "req_001_demo"


def test_product_consistency_payload_reports_broken_related_refs(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Active",
    )
    product_path = repo_root / "logics" / "product" / "prod_001_demo.md"
    product_path.write_text(
        product_path.read_text(encoding="utf-8")
        .replace("> Related request: (none yet)", "> Related request: `req_001_missing`")
        .replace("> Related task: (none yet)", "> Related task: `task_001_missing`"),
        encoding="utf-8",
    )

    payload = product_consistency_payload(repo_root)

    assert payload["ok"] is False
    assert payload["issue_count"] == 1
    issue = payload["issues"][0]
    assert issue["missing_related"] == ["backlog"]
    assert [item["ref"] for item in issue["broken_related"]] == ["req_001_missing", "task_001_missing"]


def test_product_consistency_treats_backticked_none_as_missing(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Active",
    )
    product_path = repo_root / "logics" / "product" / "prod_001_demo.md"
    product_path.write_text(
        product_path.read_text(encoding="utf-8").replace("> Related task: (none yet)", "> Related task: `(none yet)`"),
        encoding="utf-8",
    )

    payload = product_consistency_payload(repo_root)

    assert payload["issues"][0]["missing_related"] == ["request", "backlog", "task"]
    assert payload["issues"][0]["broken_related"] == []


def test_main_runs_product_consistency_json(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "product").mkdir(parents=True)
    (repo_root / "logics" / "request").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Active",
    )
    product_path = repo_root / "logics" / "product" / "prod_001_demo.md"
    product_path.write_text(
        product_path.read_text(encoding="utf-8").replace("> Related request: (none yet)", "> Related request: `req_001_demo`"),
        encoding="utf-8",
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        kind="request",
        status="Done",
        links=[],
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["product-consistency", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["issue_count"] == 1
    assert payload["issues"][0]["missing_related"] == ["backlog", "task"]


def test_product_consistency_skips_proposed_unlinked_briefs(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Proposed",
    )

    payload = product_consistency_payload(repo_root)

    assert payload["ok"] is True
    assert payload["checked_product_count"] == 0
    assert payload["skipped_product_count"] == 1


def test_main_product_consistency_strict_fails_on_issues(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Active",
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["product-consistency", "--strict", "--json"])

    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 1
    assert payload["issue_count"] == 1


@pytest.mark.parametrize(
    ("argv", "expected_script_suffix", "expected_args"),
    [
        (["flow", "new", "request", "--title", "Demo"], None, None),
        (["flow", "close", "task", "logics/tasks/task_148_integrate_the_runtime_into_cdx_logics_vscode_and_remove_the_skills_checkout.md"], None, None),
        (["flow", "finish", "task", "logics/tasks/task_148_integrate_the_runtime_into_cdx_logics_vscode_and_remove_the_skills_checkout.md"], None, None),
        (["bootstrap", "--check"], None, None),
        (["sync", "close-eligible-requests"], None, None),
        (["sync", "refresh-mermaid-signatures"], None, None),
        (["sync", "schema-status"], None, None),
        (["sync", "context-pack", "req_001_demo"], None, None),
        (["sync", "export-graph"], None, None),
        (["assist", "runtime-status"], None, None),
        (["assist", "diff-risk"], None, None),
        (["assist", "commit-plan"], None, None),
        (["assist", "changed-surface-summary"], None, None),
        (["assist", "doc-consistency"], None, None),
        (["assist", "review-checklist"], None, None),
        (["assist", "validation-checklist"], None, None),
        (["assist", "validation-summary"], None, None),
        (["assist", "test-impact-summary"], None, None),
        (["assist", "roi-report"], None, None),
        (["assist", "next-step"], None, None),
        (["assist", "claude-bridges"], None, None),
        (["assist", "claude-instructions"], None, None),
        (["assist", "request-draft", "--intent", "Draft a request for runtime bundling"], None, None),
        (["assist", "spec-first-pass", "item_001_demo"], None, None),
        (["assist", "backlog-groom", "req_001_demo"], None, None),
        (["assist", "closure-summary"], None, None),
        (["assist", "context", "request-draft"], None, None),
        (["self-update", "--dry-run"], None, None),
        (["update", "--dry-run"], None, None),
        (["doctor", "--format", "json"], None, None),
        (["audit", "--format", "json"], None, None),
        (["index", "--format", "json"], None, None),
        (["health", "--format", "json"], None, None),
        (["followups", "--format", "json"], None, None),
        (["status", "--format", "json"], None, None),
        (["search", "runtime", "--format", "json"], None, None),
        (["product-consistency", "--format", "json"], None, None),
        (["config", "show", "--format", "json"], None, None),
    ],
)
def test_main_dispatches_to_expected_underlying_script(
    monkeypatch: pytest.MonkeyPatch,
    argv: list[str],
    expected_script_suffix: str | None,
    expected_args: list[str] | None,
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool = False, **kwargs: object) -> subprocess.CompletedProcess[object]:
        # accepts kwargs, and ignores git: this patches subprocess.run globally,
        # so incidental queries (the batched git-log walk behind doc ages) land
        # here too. Only a dispatch to an underlying script is being recorded.
        if not (isinstance(command, list) and command[:1] == ["git"]):
            recorded["command"] = command
            recorded["check"] = check
        return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    if argv[:2] in (
        ["flow", "new"],
        ["flow", "companion"],
        ["flow", "close"],
        ["flow", "finish"],
        ["sync", "close-eligible-requests"],
        ["sync", "refresh-mermaid-signatures"],
        ["sync", "schema-status"],
        ["sync", "context-pack"],
        ["sync", "export-graph"],
        ["assist", "runtime-status"],
        ["assist", "diff-risk"],
        ["assist", "commit-plan"],
        ["assist", "changed-surface-summary"],
        ["assist", "doc-consistency"],
        ["assist", "review-checklist"],
        ["assist", "validation-checklist"],
        ["assist", "validation-summary"],
        ["assist", "test-impact-summary"],
        ["assist", "roi-report"],
        ["assist", "next-step"],
        ["assist", "claude-bridges"],
        ["assist", "claude-instructions"],
        ["assist", "request-draft"],
        ["assist", "spec-first-pass"],
        ["assist", "backlog-groom"],
        ["assist", "closure-summary"],
        ["assist", "context"],
    ):
        monkeypatch.setattr("logics_manager.flow.main", lambda _argv: 0)
        monkeypatch.setattr("logics_manager.sync.main", lambda _argv: 0)
        monkeypatch.setattr("logics_manager.assist.main", lambda _argv: 0)
    if argv[:2] == ["bootstrap", "--check"]:
        repo_root = Path(tempfile.mkdtemp(prefix="logics-bootstrap-dispatch-"))
        (repo_root / "logics").mkdir()
        for directory in ("request", "backlog", "tasks", "specs", "product", "architecture", "external", ".cache"):
            (repo_root / "logics" / directory).mkdir(parents=True, exist_ok=True)
            (repo_root / "logics" / directory / ".gitkeep").write_text("", encoding="utf-8")
        bootstrap_payload(repo_root, check=False)
        monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)
    if argv[:2] == ["assist", "diff-risk"]:
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: [])
    if argv[:2] == ["assist", "commit-plan"]:
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: [])
    if argv[:2] == ["assist", "changed-surface-summary"]:
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: [])
    if argv[:2] == ["assist", "doc-consistency"]:
        monkeypatch.setattr("logics_manager.assist.doctor_payload", lambda _repo_root: {"ok": True, "issue_count": 0, "issues": [], "workflow_doc_count": 1, "missing_schema_version_count": 0})
        monkeypatch.setattr("logics_manager.assist.lint_payload", lambda _repo_root, require_status=False: {"ok": True, "issue_count": 0, "warning_count": 0, "issues": [], "warnings": []})
    if argv[:2] == ["assist", "review-checklist"]:
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["clients/vscode/src/app.ts"])
        monkeypatch.setattr("logics_manager.assist.doctor_payload", lambda _repo_root: {"ok": True, "issue_count": 0, "issues": [], "workflow_doc_count": 1, "missing_schema_version_count": 0})
        monkeypatch.setattr("logics_manager.assist.lint_payload", lambda _repo_root, require_status=False: {"ok": True, "issue_count": 0, "warning_count": 0, "issues": [], "warnings": []})
    if argv[:2] == ["assist", "validation-checklist"]:
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["clients/vscode/src/app.ts"])
    if argv[:2] == ["assist", "validation-summary"]:
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["clients/vscode/src/app.ts"])
        monkeypatch.setattr("logics_manager.assist.doctor_payload", lambda _repo_root: {"ok": True, "issue_count": 0, "issues": [], "workflow_doc_count": 1, "missing_schema_version_count": 0})
        monkeypatch.setattr("logics_manager.assist.lint_payload", lambda _repo_root, require_status=False: {"ok": True, "issue_count": 0, "warning_count": 0, "issues": [], "warnings": []})
    if argv[:2] == ["assist", "test-impact-summary"]:
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["logics_manager/assist.py"])
    if argv[:2] == ["assist", "next-step"]:
        monkeypatch.setattr("logics_manager.assist._resolve_workflow_doc", lambda _repo_root, ref: None)
    if argv[:2] == ["assist", "closure-summary"]:
        monkeypatch.setattr("logics_manager.assist._resolve_workflow_doc", lambda _repo_root, ref: None)
    if argv[:2] == ["assist", "spec-first-pass"]:
        monkeypatch.setattr(
            "logics_manager.assist._build_spec_first_pass",
            lambda _repo_root, _ref: {
                "ref": "spec_001_demo",
                "title": "Demo first-pass spec",
                "path": "logics/specs/spec_001_demo.md",
                "backlog_ref": "item_001_demo",
                "backlog_path": "logics/backlog/item_001_demo.md",
                "content": "# demo\n",
                "overview": "Demo overview",
                "goals": ["Demo goal"],
                "acceptance": ["Demo AC"],
                "validation": ["Demo validation"],
            },
        )
    if argv[:2] == ["assist", "backlog-groom"]:
        monkeypatch.setattr(
            "logics_manager.assist._build_backlog_groom",
            lambda _repo_root, _ref: {
                "ref": "item_001_demo",
                "title": "Demo backlog",
                "path": "logics/backlog/item_001_demo.md",
                "request_ref": "req_001_demo",
                "request_path": "logics/request/req_001_demo.md",
                "content": "# demo\n",
                "problem": ["Demo problem"],
                "acceptance": ["Demo AC"],
                "complexity": "Medium",
            },
        )
    if argv[:1] in (["self-update"], ["update"]):
        monkeypatch.setattr("logics_manager.cli.which", lambda _command: "/usr/bin/npm")
        monkeypatch.setattr(
            "logics_manager.cli.metadata.version",
            lambda _name: (_ for _ in ()).throw(importlib_metadata.PackageNotFoundError()),
        )
    if argv[:1] == ["audit"]:
        monkeypatch.setattr("logics_manager.cli.audit_payload", lambda *args, **kwargs: {"ok": True})
        monkeypatch.setattr("logics_manager.cli.render_audit", lambda *args, **kwargs: "{}")

    exit_code = main(argv)

    assert exit_code == 0
    if expected_script_suffix is None:
        assert "command" not in recorded
        return
    command = recorded["command"]
    assert isinstance(command, list)
    assert command[0] == sys.executable
    assert str(command[1]).endswith(expected_script_suffix)
    assert command[2:] == expected_args
    assert recorded["check"] is False


def test_main_runs_self_update_with_npm(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr("logics_manager.cli.which", lambda _command: "/usr/bin/npm")
    monkeypatch.setattr(
        "logics_manager.cli.metadata.version",
        lambda _name: (_ for _ in ()).throw(importlib_metadata.PackageNotFoundError()),
    )
    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(["self-update"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Updated @grifhinz/logics-manager via npm." in captured.out
    assert recorded["command"] == ["/usr/bin/npm", "install", "-g", "@grifhinz/logics-manager@latest"]
    assert recorded["check"] is False


def test_main_runs_update_alias_with_npm(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr("logics_manager.cli.which", lambda _command: "/usr/bin/npm")
    monkeypatch.setattr(
        "logics_manager.cli.metadata.version",
        lambda _name: (_ for _ in ()).throw(importlib_metadata.PackageNotFoundError()),
    )
    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(["update"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Updated @grifhinz/logics-manager via npm." in captured.out
    assert recorded["command"] == ["/usr/bin/npm", "install", "-g", "@grifhinz/logics-manager@latest"]
    assert recorded["check"] is False


def test_main_prefers_npm_self_update_when_running_from_npm_package(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr("logics_manager.cli.which", lambda _command: "/usr/bin/npm")
    monkeypatch.setattr("logics_manager.cli._is_running_from_npm_package", lambda: True)
    monkeypatch.setattr(
        "logics_manager.cli.metadata.version",
        lambda _name: "2.1.1",
    )
    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(["self-update"])

    assert exit_code == 0
    assert recorded["command"] == ["/usr/bin/npm", "install", "-g", "@grifhinz/logics-manager@latest"]
    assert recorded["check"] is False


def test_main_prefers_pipx_self_update_when_running_from_pipx(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr("logics_manager.cli.which", lambda command: "/usr/bin/pipx" if command == "pipx" else "/usr/bin/npm")
    monkeypatch.setattr("logics_manager.cli._is_running_from_npm_package", lambda: False)
    monkeypatch.setattr("logics_manager.cli._is_running_from_pipx", lambda _package_name: True)
    # the running executable is now the primary evidence, ahead of the heuristics above
    monkeypatch.setattr(
        "logics_manager.cli.detect_running_manager",
        lambda _package_name=None: ("pipx", Path("/opt/pipx/venvs/logics-manager/bin/logics-manager")),
    )
    monkeypatch.setattr("logics_manager.cli.shadowing_executables", lambda _executable, _command="logics-manager": [])
    monkeypatch.setattr(
        "logics_manager.cli.metadata.version",
        lambda _name: "2.1.1",
    )
    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(["self-update"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Updated logics-manager via pipx." in captured.out
    assert recorded["command"] == ["/usr/bin/pipx", "upgrade", "logics-manager"]
    assert recorded["check"] is False


def test_main_runs_explicit_pipx_self_update(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr("logics_manager.cli.which", lambda command: "/usr/bin/pipx" if command == "pipx" else None)
    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(["self-update", "--manager", "pipx"])

    assert exit_code == 0
    assert recorded["command"] == ["/usr/bin/pipx", "upgrade", "logics-manager"]
    assert recorded["check"] is False


def test_main_reports_missing_pipx_for_explicit_pipx_self_update(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr("logics_manager.cli.which", lambda _command: None)

    exit_code = main(["self-update", "--manager", "pipx"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "pipx was not found on PATH" in captured.out


def test_main_runs_self_update_with_pip(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(
        "logics_manager.cli.metadata.version",
        lambda _name: "2.0.3",
    )
    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(["self-update", "--manager", "pip"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Updated logics-manager via pip." in captured.out
    assert recorded["command"] == [sys.executable, "-m", "pip", "install", "--upgrade", "logics-manager"]
    assert recorded["check"] is False


def test_main_blocks_pip_self_update_in_externally_managed_python(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(
        "logics_manager.cli.metadata.version",
        lambda _name: "2.0.3",
    )
    monkeypatch.setattr("logics_manager.cli._is_externally_managed_python", lambda: True)
    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(["self-update", "--manager", "pip"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "externally managed" in captured.out
    assert "pipx upgrade logics-manager" in captured.out
    assert "pipx install --force logics-manager" in captured.out
    assert "command" not in recorded


def test_main_warns_about_path_conflict_after_npm_self_update(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr("logics_manager.cli.which", lambda _command: "/usr/bin/npm")
    monkeypatch.setattr("logics_manager.cli._find_executable_paths", lambda _command: ["/home/user/.local/bin/logics-manager", "/usr/bin/logics-manager"])
    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(["self-update", "--manager", "npm"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert recorded["command"] == ["/usr/bin/npm", "install", "-g", "@grifhinz/logics-manager@latest"]
    assert "Multiple logics-manager executables are on PATH" in captured.out
    assert "/home/user/.local/bin/logics-manager" in captured.out
    assert "type -a logics-manager" in captured.out
    assert "whence -a logics-manager" in captured.out
    assert "command -v -a" not in captured.out
    assert "pipx list" in captured.out
    assert "rehash" in captured.out


def test_main_allows_explicit_break_system_packages_for_pip_self_update(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(
        "logics_manager.cli.metadata.version",
        lambda _name: "2.0.3",
    )
    monkeypatch.setattr("logics_manager.cli._is_externally_managed_python", lambda: True)
    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(["self-update", "--manager", "pip", "--break-system-packages"])

    assert exit_code == 0
    assert recorded["command"] == [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--upgrade",
        "logics-manager",
        "--break-system-packages",
    ]
    assert recorded["check"] is False


def test_main_rejects_invalid_config_subcommand() -> None:
    with pytest.raises(SystemExit, match="Usage: logics-manager config show"):
        main(["config", "list"])


def test_render_config_show_merges_overrides(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics.yaml").write_text(
        "version: 2\nworkflow:\n  split:\n    max_children_without_override: 6\n",
        encoding="utf-8",
    )

    payload = render_config_show(repo_root, output_format="json")

    assert '"version": 2' in payload
    assert '"max_children_without_override": 6' in payload


def test_load_repo_config_coerces_yaml_boolean_spellings(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics.yaml").write_text(
        "version: 2\nfeatures:\n  enabled: TRUE\n  disabled: off\n  consent: yes\n",
        encoding="utf-8",
    )

    config, _config_path = load_repo_config(repo_root)

    assert config["features"]["enabled"] is True
    assert config["features"]["disabled"] is False
    assert config["features"]["consent"] is True


def test_load_repo_config_uses_defaults_when_missing(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()

    config, config_path = load_repo_config(repo_root)

    assert config_path is None
    assert config["version"] == DEFAULT_LOGICS_CONFIG["version"]


def test_render_doctor_reports_missing_workflow_dirs(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "request").mkdir()
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "## req_001_demo - Demo\n> Schema version: 1.0\n",
        encoding="utf-8",
    )

    payload = doctor_payload(repo_root)

    assert payload["ok"] is False
    assert payload["issue_count"] == 2
    assert payload["missing_schema_version_count"] == 0
    output = render_doctor(repo_root, output_format="text")
    assert "Logics doctor: FAILED" in output
    assert "missing_directory" in output


def test_doctor_packaging_metadata_check_reports_missing_package(tmp_path: Path) -> None:
    from logics_manager.doctor import doctor_packaging_payload

    repo_root = tmp_path / "repo"
    package_dir = repo_root / "logics_manager" / "extra"
    package_dir.mkdir(parents=True)
    (repo_root / "logics_manager" / "__init__.py").write_text("", encoding="utf-8")
    (package_dir / "__init__.py").write_text("", encoding="utf-8")
    (repo_root / "pyproject.toml").write_text(
        "\n".join(
            [
                "[tool.setuptools]",
                "packages = [",
                '  "logics_manager",',
                "]",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    payload = doctor_packaging_payload(repo_root, clean_install=False)

    assert payload["ok"] is False
    assert payload["missing_packages"] == ["logics_manager.extra"]


def test_main_doctor_packaging_metadata_only(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = Path(tempfile.mkdtemp(prefix="logics-packaging-"))
    (repo_root / "logics_manager").mkdir()
    (repo_root / "logics_manager" / "__init__.py").write_text("", encoding="utf-8")
    (repo_root / "pyproject.toml").write_text('[tool.setuptools]\npackages = [\n  "logics_manager",\n]\n', encoding="utf-8")
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["doctor", "packaging", "--metadata-only", "--format", "json"])
    payload = json.loads(capsys.readouterr().out)

    assert exit_code == 0
    assert payload["checks"][0]["id"] == "metadata_subpackages"


@pytest.mark.parametrize(
    "argv",
    [
        ["config", "show", "--format", "json"],
        ["doctor", "--format", "json"],
        ["index", "--format", "json"],
        ["lint", "--format", "json"],
        ["audit", "--skip-ac-traceability", "--skip-gates", "--format", "json"],
        ["flow", "new", "request", "--title", "Subprocess Contract", "--format", "json"],
        ["flow", "list", "--kind", "request", "--format", "json"],
        ["sync", "schema-status", "--format", "json"],
        ["sync", "list-docs", "--format", "json"],
        ["assist", "runtime-status", "--format", "json"],
        ["assist", "claude-bridges", "--format", "json"],
        ["assist", "claude-instructions", "--format", "json"],
        ["status", "--json"],
        ["health", "--json"],
        ["followups", "--json"],
        ["search", "Demo", "--json"],
        ["product-consistency", "--json"],
    ],
)
def test_documented_json_commands_emit_parseable_stdout_in_subprocess(tmp_path: Path, argv: list[str]) -> None:
    repo_root = tmp_path / "logics-repo"
    _write_subprocess_json_repo(repo_root)

    result = _run_logics_manager_subprocess(repo_root, argv)

    assert result.returncode in (0, 1), result.stderr
    assert result.stderr == ""
    payload = json.loads(result.stdout)
    assert isinstance(payload, dict)


@pytest.mark.parametrize("output_args", [[], ["--format", "json"]])
def test_main_audit_returns_nonzero_for_failed_payload(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    output_args: list[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product brief",
        status="Proposed",
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["audit", "--governance-profile", "strict", *output_args])

    captured = capsys.readouterr()
    assert exit_code == 1
    if output_args:
        payload = json.loads(captured.out)
        assert payload["ok"] is False
        assert payload["issue_count"] == 2
    else:
        assert "Workflow audit: FAILED" in captured.out


def test_render_index_builds_markdown_and_json(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        kind="request",
        status="Draft",
        links=[],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_001_demo_item.md",
        title="Demo backlog",
        kind="backlog",
        status="Ready",
        links=[],
    )

    payload = index_payload(repo_root, out="logics/INDEX.md")

    assert payload["ok"] is True
    assert payload["counts"]["request"] == 1
    assert payload["counts"]["backlog"] == 1
    # The first call above wrote the index, so a second run is a no-op and says so.
    assert "Unchanged logics/INDEX.md" == render_index(repo_root, output_format="text")
    json_output = render_index(repo_root, output_format="json")
    assert '"ok": true' in json_output


def test_render_lint_reports_ok_for_minimal_consistent_repo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    _write_minimal_lint_doc(repo_root / "logics" / "request" / "req_001_demo.md", title="Demo request", status="Draft", include_progress=False)
    _write_minimal_lint_doc(repo_root / "logics" / "backlog" / "item_001_demo.md", title="Demo backlog", status="Ready", include_progress=True)
    _write_minimal_lint_doc(repo_root / "logics" / "tasks" / "task_001_demo.md", title="Demo task", status="Ready", include_progress=True)

    monkeypatch.setattr("logics_manager.lint._git_modified_paths", lambda _repo_root: set())
    monkeypatch.setattr("logics_manager.lint._git_untracked_paths", lambda _repo_root: set())

    payload = lint_payload(repo_root)

    assert payload["ok"] is True
    assert payload["issue_count"] == 0
    assert "Logics lint: OK" in render_lint(repo_root, output_format="text")


def test_lint_accepts_changed_workflow_docs_without_mermaid(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    request_path = repo_root / "logics" / "request" / "req_001_demo.md"
    backlog_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    request_path.parent.mkdir(parents=True)
    backlog_path.parent.mkdir(parents=True)
    task_path.parent.mkdir(parents=True)

    _write_minimal_lint_doc(request_path, title="Demo request", status="Ready", include_progress=False)
    _write_minimal_lint_doc(backlog_path, title="Demo backlog", status="Ready", include_progress=True)
    _write_minimal_lint_doc(task_path, title="Demo task", status="Ready", include_progress=True)
    backlog_path.write_text(backlog_path.read_text(encoding="utf-8").replace("> Progress: 0%", "> Progress: 50%"), encoding="utf-8")
    task_path.write_text(task_path.read_text(encoding="utf-8").replace("> Progress: 0%", "> Progress: 50%"), encoding="utf-8")
    changed = {
        Path("logics/request/req_001_demo.md"),
        Path("logics/backlog/item_001_demo.md"),
        Path("logics/tasks/task_001_demo.md"),
    }
    monkeypatch.setattr("logics_manager.lint._git_modified_paths", lambda _repo_root: set())
    monkeypatch.setattr("logics_manager.lint._git_untracked_paths", lambda _repo_root: changed)

    payload = lint_payload(repo_root, require_status=True)

    assert payload["ok"] is True
    assert payload["issue_count"] == 0
    assert payload["warning_count"] == 0


def test_lint_changed_doc_hint_is_runnable_and_mentions_non_semantic_marker(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    request_path = repo_root / "logics" / "request" / "req_001_demo.md"
    request_path.parent.mkdir(parents=True)
    _write_minimal_lint_doc(request_path, title="Demo request", status="Ready", include_progress=False)

    monkeypatch.setattr("logics_manager.lint._git_modified_paths", lambda _repo_root: {Path("logics/request/req_001_demo.md")})
    monkeypatch.setattr("logics_manager.lint._git_untracked_paths", lambda _repo_root: set())
    monkeypatch.setattr("logics_manager.lint._diff_has_indicator_changes", lambda *_args: False)
    monkeypatch.setattr("logics_manager.lint._diff_is_status_only_normalization", lambda *_args: False)

    payload = lint_payload(repo_root, require_status=True)
    message = payload["issues"][0]["message"]

    assert "logics-manager sync update-indicators req_001_demo --understanding <n> --confidence <n>" in message
    assert "`> Non-semantic edit:`" in message


def test_lint_accepts_validated_and_settled_companion_statuses(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "product").mkdir(parents=True)
    (repo_root / "logics" / "architecture").mkdir(parents=True)
    (repo_root / "logics" / "specs").mkdir(parents=True)

    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product",
        status="Settled",
    )
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_002_accepted.md",
        title="Accepted product",
        status="Accepted",
    )
    _write_minimal_architecture_doc(
        repo_root / "logics" / "architecture" / "adr_001_demo.md",
        title="Demo ADR",
        status="Validated",
    )
    _write_minimal_architecture_doc(
        repo_root / "logics" / "architecture" / "adr_002_closed.md",
        title="Closed ADR",
        status="Settled",
    )
    _write_minimal_spec_doc(
        repo_root / "logics" / "specs" / "spec_001_demo.md",
        title="Demo spec",
        status="Settled",
    )
    _write_minimal_spec_doc(
        repo_root / "logics" / "specs" / "req_002_legacy_spec.md",
        title="Legacy prefixed spec",
        status="Validated",
    )

    monkeypatch.setattr("logics_manager.lint._git_modified_paths", lambda _repo_root: set())
    monkeypatch.setattr("logics_manager.lint._git_untracked_paths", lambda _repo_root: set())

    payload = lint_payload(repo_root, require_status=True)

    assert payload["ok"] is True
    assert payload["issue_count"] == 0


def test_main_runs_native_lint(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    _write_minimal_lint_doc(repo_root / "logics" / "request" / "req_001_demo.md", title="Demo request", status="Draft", include_progress=False)
    _write_minimal_lint_doc(repo_root / "logics" / "backlog" / "item_001_demo.md", title="Demo backlog", status="Ready", include_progress=True)
    _write_minimal_lint_doc(repo_root / "logics" / "tasks" / "task_001_demo.md", title="Demo task", status="Ready", include_progress=True)

    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.lint._git_modified_paths", lambda _repo_root: set())
    monkeypatch.setattr("logics_manager.lint._git_untracked_paths", lambda _repo_root: set())

    exit_code = main(["lint", "--format", "json"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert '"ok": true' in captured.out


def test_main_runs_native_flow_new_request(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "new", "request", "--title", "Demo Request"])
    captured = capsys.readouterr()

    assert exit_code == 0
    created = repo_root / "logics" / "request" / "req_000_demo_request.md"
    assert created.is_file()
    assert "```mermaid" not in created.read_text(encoding="utf-8")
    assert "Created request:" in captured.out


def test_main_runs_native_flow_new_backlog_with_companions(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "product").mkdir(parents=True)
    (repo_root / "logics" / "architecture").mkdir(parents=True)

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(
        [
            "flow",
            "new",
            "backlog",
            "--title",
            "Demo Backlog",
            "--auto-create-product-brief",
            "--auto-create-adr",
        ]
    )
    captured = capsys.readouterr()

    assert exit_code == 0
    backlog_docs = list((repo_root / "logics" / "backlog").glob("item_*.md"))
    assert len(backlog_docs) == 1
    assert "```mermaid" not in backlog_docs[0].read_text(encoding="utf-8")
    assert len(list((repo_root / "logics" / "product").glob("prod_*.md"))) == 1
    assert len(list((repo_root / "logics" / "architecture").glob("adr_*.md"))) == 1
    assert "Created backlog:" in captured.out


def test_main_runs_native_flow_companion_product(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "product").mkdir(parents=True)

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(
        [
            "flow",
            "companion",
            "product",
            "--title",
            "Demo Product",
            "--source-ref",
            "req_001_demo",
        ]
    )
    captured = capsys.readouterr()

    assert exit_code == 0
    created = repo_root / "logics" / "product" / "prod_001_demo_product.md"
    assert created.is_file()
    content = created.read_text(encoding="utf-8")
    assert "> Related request: `req_001_demo`" in content
    assert "%% logics-kind: product" in content
    assert "%% logics-signature: product|demo_product|generated" in content
    payload = audit_payload(repo_root, group_by_doc=True, legacy_cutoff_version="1.1.0")
    assert "companion_doc_missing_mermaid" not in {warning["code"] for warning in payload["warnings"]}
    assert "Created companion doc:" in captured.out


def test_main_runs_native_flow_deliver_from_product(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "product").mkdir(parents=True)
    product_path = repo_root / "logics" / "product" / "prod_001_demo_product.md"
    product_path.write_text(
        "\n".join(
            [
                "## prod_001_demo_product - Demo Product",
                "> Date: 2026-06-07",
                "> Status: Proposed",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "# Overview Diagram",
                "```mermaid",
                "flowchart TD",
                "  Request[Demo need] --> Product[Demo Product]",
                "```",
                "# Overview",
                "- Demo product brief.",
                "# References",
                "- Product back-reference: (none yet)",
                "- Task back-reference: (none yet)",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "deliver", "--from-product", "prod_001_demo_product"])
    captured = capsys.readouterr()

    assert exit_code == 0
    request_path = repo_root / "logics" / "request" / "req_000_demo_product.md"
    backlog_path = repo_root / "logics" / "backlog" / "item_001_demo_product.md"
    task_path = repo_root / "logics" / "tasks" / "task_001_demo_product.md"
    assert request_path.is_file()
    assert backlog_path.is_file()
    assert task_path.is_file()
    assert "Created delivery chain from product" in captured.out

    product_text = product_path.read_text(encoding="utf-8")
    assert "> Related request: `req_000_demo_product`" in product_text
    assert "> Related backlog: `item_001_demo_product`" in product_text
    assert "> Related task: `task_001_demo_product`" in product_text
    assert "- Product back-reference: `item_001_demo_product`" in product_text
    assert "- Task back-reference: `task_001_demo_product`" in product_text
    request_text = request_path.read_text(encoding="utf-8")
    backlog_text = backlog_path.read_text(encoding="utf-8")
    task_text = task_path.read_text(encoding="utf-8")
    assert "```mermaid" not in request_text
    assert "```mermaid" not in backlog_text
    assert "```mermaid" not in task_text
    assert "- Product brief(s): `prod_001_demo_product`" in request_text
    assert "`item_001_demo_product`" in request_text
    assert "- none" not in request_text
    assert "- [x] Problem statement is explicit and user impact is clear." in request_text
    assert "`task_001_demo_product`" in backlog_text
    assert "- Primary task(s): `task_001_demo_product`" in backlog_text
    assert "- Product brief(s): `prod_001_demo_product`" in backlog_text
    assert "- Request: `req_000_demo_product`" in backlog_text
    assert "logics/request/req_000_demo_product.md" not in backlog_text
    assert "request-AC3 -> This backlog slice. Proof:" in backlog_text
    assert "- Product brief(s): `prod_001_demo_product`" in task_text
    assert "request-AC3 -> This task. Proof:" in task_text
    assert "Meaningful waves followed ADR 009" in task_text


def test_main_runs_native_flow_promote_request_to_backlog(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    source_path = repo_root / "logics" / "request" / "req_001_demo.md"
    source_path.write_text(
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

    exit_code = main(["flow", "promote", "request-to-backlog", str(source_path)])
    captured = capsys.readouterr()

    assert exit_code == 0
    created = repo_root / "logics" / "backlog" / "item_001_demo_request.md"
    assert created.is_file()
    assert "```mermaid" not in created.read_text(encoding="utf-8")
    assert "Created backlog slice from request" in captured.out
    assert created.stem in source_path.read_text(encoding="utf-8")


def test_main_runs_native_flow_split_request(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    source_path = repo_root / "logics" / "request" / "req_001_demo.md"
    source_path.write_text(
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

    exit_code = main(["flow", "split", "request", str(source_path), "--title", "Child A"])
    captured = capsys.readouterr()

    assert exit_code == 0
    created = repo_root / "logics" / "backlog" / "item_001_child_a.md"
    assert created.is_file()
    assert "```mermaid" not in created.read_text(encoding="utf-8")
    assert "Split request into 1 backlog item(s)" in captured.out
    assert "item_001_child_a" in source_path.read_text(encoding="utf-8")


def test_main_runs_native_flow_promote_backlog_to_task(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    source_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    source_path.write_text(
        "\n".join(
            [
                "## item_001_demo - Demo Backlog",
                "> Status: Ready",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "# Problem",
                "- Clarify scope",
                "# Acceptance criteria",
                "- AC1: Validate scope",
                "- AC2: Keep it executable",
                "# Tasks",
                "- none",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "promote", "backlog-to-task", str(source_path)])
    captured = capsys.readouterr()

    assert exit_code == 0
    created = repo_root / "logics" / "tasks" / "task_001_demo_backlog.md"
    assert created.is_file()
    created_text = created.read_text(encoding="utf-8")
    assert "```mermaid" not in created_text
    assert "Meaningful waves followed ADR 009" in created_text
    assert "flow progress task" in created_text
    assert "Created task from backlog" in captured.out
    assert created.stem in source_path.read_text(encoding="utf-8")


def test_main_runs_native_flow_split_backlog(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    source_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    source_path.write_text(
        "\n".join(
            [
                "## item_001_demo - Demo Backlog",
                "> Status: Ready",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "# Problem",
                "- Clarify scope",
                "# Acceptance criteria",
                "- AC1: Validate scope",
                "# Tasks",
                "- none",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "split", "backlog", str(source_path), "--title", "Child A"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert (repo_root / "logics" / "tasks" / "task_001_child_a.md").is_file()
    assert "Split backlog item into 1 task(s)" in captured.out
    assert "task_001_child_a" in source_path.read_text(encoding="utf-8")


def test_main_runs_native_flow_validate_closeout_reports_blockers(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo_task.md"
    task_path.write_text(
        "\n".join(
            [
                "## task_001_demo_task - Demo Task",
                "> Status: Ready",
                "> From version: 2.1.2",
                "> Schema version: 1.0",
                "# Plan",
                "- [ ] Do the work.",
                "# Backlog",
                "- `item_001_missing`",
                "# Definition of Done (DoD)",
                "- [ ] Validation passes.",
                "# Validation",
                "- Run `python3 -m logics_manager lint --require-status`.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "validate-closeout", "task_001_demo_task"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "Closeout preflight: FAILED" in captured.out
    assert "task_gate_unchecked" in captured.out
    assert "validation_evidence_missing" in captured.out
    assert "flow repair gates task_001_demo_task" in captured.out


def test_main_runs_native_flow_validate_closeout_passes_complete_chain(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "product").mkdir(parents=True)

    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
                "> From version: 2.1.2",
                "> Schema version: 1.0",
                "# Needs",
                "- Deliver demo.",
                "```mermaid",
                "%% logics-kind: request",
                "%% logics-signature: request|demo-request|deliver-demo|ac1-deliver-demo",
                "flowchart TD",
                "    Trigger[Demo Request] --> Need[Deliver demo]",
                "    Need --> Outcome[AC1 Deliver demo]",
                "    Outcome --> Backlog[Backlog]",
                "```",
                "# Acceptance criteria",
                "- AC1: Deliver demo.",
                "# Definition of Ready (DoR)",
                "- [x] Ready.",
                "# Backlog",
                "- `item_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "backlog" / "item_001_demo.md").write_text(
        "\n".join(
            [
                "## item_001_demo - Demo Backlog",
                "> Status: Ready",
                "> From version: 2.1.2",
                "> Schema version: 1.0",
                "> Progress: 0%",
                "# Problem",
                "- Deliver demo.",
                "# Scope",
                "- In:",
                "  - demo",
                "```mermaid",
                "%% logics-kind: backlog",
                "%% logics-signature: backlog|demo-backlog|req-001-demo|deliver-demo|ac1-deliver-demo",
                "flowchart TD",
                "    Request[req 001 demo] --> Problem[Deliver demo]",
                "    Problem --> Scope[Demo Backlog]",
                "    Scope --> Acceptance[AC1 Deliver demo]",
                "    Acceptance --> Tasks[task 001 demo]",
                "```",
                "# Acceptance criteria",
                "- AC1: Deliver demo.",
                "# AC Traceability",
                "- request-AC1 -> This backlog slice. Proof: Deliver demo.",
                "# Links",
                "- Request: `req_001_demo`",
                "- Primary task(s): `task_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "product" / "prod_001_demo.md").write_text(
        "## prod_001_demo - Demo Product\n> Related task: `task_001_demo`\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "tasks" / "task_001_demo.md").write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Ready",
                "> From version: 2.1.2",
                "> Schema version: 1.0",
                "> Progress: 0%",
                "# Plan",
                "- [x] Do the work.",
                "# Backlog",
                "- `item_001_demo`",
                "```mermaid",
                "%% logics-kind: task",
                "%% logics-signature: task|demo-task|item-001-demo|do-the-work|pytest-passed",
                "flowchart TD",
                "    Backlog[Backlog item] --> Build[Implementation]",
                "    Build --> Validate[Validation]",
                "    Validate --> Close[Finish workflow]",
                "```",
                "# Definition of Done (DoD)",
                "- [x] Validation passes.",
                "# AC Traceability",
                "- request-AC1 -> This task. Proof: Deliver demo.",
                "# Validation",
                "- pytest passed.",
                "# Links",
                "- Request: `req_001_demo`",
                "- Product brief(s): `prod_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.flow._mermaid_closeout_issue", lambda _path, _kind: None)

    assert main(["flow", "validate-closeout", "task_001_demo", "--format", "json"]) == 0


def test_main_runs_native_flow_repair_closeout_helpers(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "product").mkdir(parents=True)
    request_path = repo_root / "logics" / "request" / "req_001_demo.md"
    backlog_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    product_path = repo_root / "logics" / "product" / "prod_001_demo.md"

    request_path.write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
                "> From version: 2.1.2",
                "> Schema version: 1.0",
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
                "> From version: 2.1.2",
                "> Schema version: 1.0",
                "> Progress: 0%",
                "# Problem",
                "- Deliver demo.",
                "# Links",
                "- Request: `req_001_demo`",
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
                "> From version: 2.1.2",
                "> Schema version: 1.0",
                "> Progress: 0%",
                "# Plan",
                "- [ ] Do the work.",
                "# Backlog",
                "- `item_001_demo`",
                "# Definition of Done (DoD)",
                "- [ ] Validation passes.",
                "# Validation",
                "- pytest passed.",
                "# Links",
                "- Request: `req_001_demo`",
                "- Product brief(s): `prod_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    product_path.write_text(
        "\n".join(
            [
                "## prod_001_demo - Demo Product",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "# References",
                "- Product back-reference: (none yet)",
                "- Task back-reference: (none yet)",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    assert main(["flow", "repair", "gates", "task_001_demo"]) == 0
    assert main(["flow", "repair", "ac-traceability", "req_001_demo"]) == 0
    assert main(["flow", "repair", "links", "task_001_demo"]) == 0
    assert main(["flow", "repair", "mermaid", "--refs", "req_001_demo", "item_001_demo", "task_001_demo"]) == 0

    request_text = request_path.read_text(encoding="utf-8")
    backlog_text = backlog_path.read_text(encoding="utf-8")
    task_text = task_path.read_text(encoding="utf-8")
    product_text = product_path.read_text(encoding="utf-8")
    assert "- [x] Ready." in request_text
    assert "request-AC1 -> This backlog slice. Evidence needed: Deliver demo." in backlog_text
    assert "request-AC1 -> This task. Evidence needed: Deliver demo." in task_text
    preflight = validate_closeout_payload(repo_root, "task_001_demo")
    assert "ac_missing_item_traceability" in {issue["code"] for issue in preflight["issues"]}
    assert "ac_missing_task_traceability" in {issue["code"] for issue in preflight["issues"]}
    assert "`task_001_demo`" in backlog_text
    assert "> Related task: `task_001_demo`" in product_text
    assert "```mermaid" not in request_text
    assert "```mermaid" not in backlog_text
    assert "```mermaid" not in task_text


def test_main_runs_native_flow_closeout_finishes_delivery_chain(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "product").mkdir(parents=True)
    product_path = repo_root / "logics" / "product" / "prod_001_demo_product.md"
    product_path.write_text(
        "\n".join(
            [
                "## prod_001_demo_product - Demo Product",
                "> Date: 2026-06-07",
                "> Status: Proposed",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "> Related architecture: (none yet)",
                "> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.",
                "# Overview Diagram",
                "```mermaid",
                "flowchart TD",
                "  Request[Demo need] --> Product[Demo Product]",
                "```",
                "# Overview",
                "- Demo product brief.",
                "# References",
                "- Product back-reference: (none yet)",
                "- Task back-reference: (none yet)",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    assert main(["flow", "deliver", "--from-product", "prod_001_demo_product"]) == 0
    exit_code = main(
        [
            "flow",
            "closeout",
            "task_001_demo_product",
            "--validation-command",
            "PYTHONPATH=$PWD pytest tests/python -q",
            "--validation-result",
            "passed",
            "--validation-note",
            "closeout regression passed",
            "--index",
            "--lint",
            "--audit",
        ]
    )
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Closeout: OK" in captured.out
    assert (repo_root / "logics" / "INDEX.md").is_file()
    assert "> Status: Done" in (repo_root / "logics" / "tasks" / "task_001_demo_product.md").read_text(encoding="utf-8")
    assert "> Status: Done" in (repo_root / "logics" / "backlog" / "item_001_demo_product.md").read_text(encoding="utf-8")
    assert "> Status: Done" in (repo_root / "logics" / "request" / "req_000_demo_product.md").read_text(encoding="utf-8")
    task_text = (repo_root / "logics" / "tasks" / "task_001_demo_product.md").read_text(encoding="utf-8")
    assert "command: `PYTHONPATH=$PWD pytest tests/python -q`" in task_text
    assert "result: passed" in task_text
    assert "note: closeout regression passed" in task_text


def test_main_runs_native_flow_finish_task(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

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
                "> Status: Ready",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "# Links",
                "- Primary task(s): `task_001_demo_task`",
                "# Request",
                "- `req_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    task_path = repo_root / "logics" / "tasks" / "task_001_demo_task.md"
    task_path.write_text(
        "\n".join(
            [
                "## task_001_demo_task - Demo Task",
                "> Status: Ready",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "# Backlog",
                "- `item_001_demo_item`",
                "# Definition of Done (DoD)",
                "- [ ] Scope implemented and acceptance criteria covered.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "finish", "task", str(task_path)])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Finish verification: OK" in captured.out
    assert "> Status: Done" in task_path.read_text(encoding="utf-8")
    assert "> Status: Done" in (repo_root / "logics" / "backlog" / "item_001_demo_item.md").read_text(encoding="utf-8")
    assert "> Status: Done" in (repo_root / "logics" / "request" / "req_001_demo.md").read_text(encoding="utf-8")


def test_main_runs_native_sync_close_eligible_requests(
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

    exit_code = main(["sync", "close-eligible-requests"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Scanned 1 request(s); closed 1." in captured.out
    assert "> Status: Done" in (repo_root / "logics" / "request" / "req_001_demo.md").read_text(encoding="utf-8")


def test_main_runs_native_sync_refresh_mermaid_signatures(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text("## req_001_demo - Demo Request\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.sync.refresh_workflow_mermaid_signature_file", lambda path, kind, dry_run, repo_root=None: path.name == "req_001_demo.md")

    exit_code = main(["sync", "refresh-mermaid-signatures"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Refreshed Mermaid signatures in 1 workflow doc(s)." in captured.out
    assert "- logics/request/req_001_demo.md" in captured.out


def test_main_runs_native_sync_append_note_reports_mermaid_refresh(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    task_path.write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Ready",
                "> From version: 2.1.2",
                "> Schema version: 1.0",
                "# Validation",
                "- Run tests.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.sync.refresh_workflow_mermaid_signature_file", lambda path, kind, dry_run, repo_root=None: True)

    exit_code = main(["sync", "append-note", "task_001_demo", "--section", "validation", "--text", "pytest passed"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Appended validation note" in captured.out
    assert "Mermaid signature refreshed." in captured.out


def test_main_runs_native_sync_schema_status(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Schema version: 1.0",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "schema-status"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Schema status: 1 workflow doc(s) scanned." in captured.out
    assert "- 1.0: 1" in captured.out


def test_main_runs_native_sync_context_pack(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
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
            "estimates": {"doc_count": 1, "char_count": 10},
            "docs": [{"ref": ref}],
            "changed_paths": [],
            "budgets": {"max_docs": 1},
        },
    )

    exit_code = main(["sync", "context-pack", "req_001_demo"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Context pack: req_001_demo (summary-only, normal)" in captured.out
    assert "- docs: 1" in captured.out


def test_main_runs_native_sync_export_graph(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()

    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        "logics_manager.sync._graph_payload",
        lambda _repo_root, config=None: {"nodes": [{"ref": "req_001_demo"}], "edges": [{"from": "req_001_demo", "to": "item_001_demo"}]},
    )

    exit_code = main(["sync", "export-graph"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Graph: 1 node(s), 1 edge(s)." in captured.out


def test_main_runs_native_assist_runtime_status(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    claude_home = tmp_path / "claude-home"
    claude_home.mkdir()
    (claude_home / "commands").mkdir(parents=True)
    (claude_home / "agents").mkdir(parents=True)
    (claude_home / "commands" / "logics-assist.md").write_text("", encoding="utf-8")
    (claude_home / "agents" / "logics-hybrid-delivery-assistant.md").write_text("", encoding="utf-8")
    (repo_root / "logics").mkdir()
    (repo_root / "logics.yaml").write_text(
        "\n".join(
            [
                "version: 1",
                "hybrid_assist:",
                "  default_backend: auto",
                "  default_model_profile: deepseek-coder",
                "  default_model: deepseek-coder-v2:16b",
                "  ollama_host: http://127.0.0.1:11434",
                "  timeout_seconds: 20.0",
                "  model_profiles:",
                "    deepseek-coder:",
                "      model: deepseek-coder-v2:16b",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("LOGICS_CLAUDE_GLOBAL_HOME", claude_home.as_posix())

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "runtime-status"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Assist runtime status:" in captured.out
    assert "- selected backend:" in captured.out


def test_main_runs_native_assist_diff_risk(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    (repo_root / "src").mkdir()
    (repo_root / "src" / "app.ts").write_text("console.log('demo')\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["clients/vscode/src/app.ts"])

    exit_code = main(["assist", "diff-risk"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Diff risk: medium" in captured.out
    assert "- changed paths: 1" in captured.out


def test_main_runs_native_assist_commit_plan(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["logics_manager/assist.py"])

    exit_code = main(["assist", "commit-plan"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Commit plan: feat: extend native logics-manager runtime" in captured.out
    assert "- scope: python-runtime" in captured.out


def test_main_runs_native_assist_changed_surface_summary(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    (repo_root / "src").mkdir()
    (repo_root / "src" / "app.ts").write_text("console.log('demo')\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["clients/vscode/src/app.ts", "logics_manager/assist.py"])

    exit_code = main(["assist", "changed-surface-summary"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Changed surface:" in captured.out
    assert "- changed paths: 2" in captured.out


def test_main_runs_native_assist_doc_consistency(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist.doctor_payload", lambda _repo_root: {"ok": False, "issue_count": 1, "issues": [{"code": "missing_directory", "path": "logics/request", "message": "Missing required directory `logics/request`.", "remediation": "Create `logics/request`."}], "workflow_doc_count": 0, "missing_schema_version_count": 0})
    monkeypatch.setattr("logics_manager.assist.lint_payload", lambda _repo_root, require_status=False: {"ok": False, "issue_count": 1, "warning_count": 0, "issues": [{"path": "logics/request/req_001.md", "message": "missing status"}], "warnings": []})

    exit_code = main(["assist", "doc-consistency"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Doc consistency: ISSUES-FOUND" in captured.out
    assert "- doctor issues: 1" in captured.out
    assert "- lint issues: 1" in captured.out


def test_main_runs_native_assist_review_checklist(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["clients/vscode/src/app.ts"])
    monkeypatch.setattr("logics_manager.assist.doctor_payload", lambda _repo_root: {"ok": True, "issue_count": 0, "issues": [], "workflow_doc_count": 1, "missing_schema_version_count": 0})
    monkeypatch.setattr("logics_manager.assist.lint_payload", lambda _repo_root, require_status=False: {"ok": True, "issue_count": 0, "warning_count": 0, "issues": [], "warnings": []})

    exit_code = main(["assist", "review-checklist"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Review checklist:" in captured.out
    assert "- doc consistency: clean" in captured.out


def test_main_runs_native_assist_validation_checklist(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    (repo_root / "src").mkdir()
    (repo_root / "src" / "app.ts").write_text("console.log('demo')\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["clients/vscode/src/app.ts"])

    exit_code = main(["assist", "validation-checklist"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Validation checklist:" in captured.out
    assert "- profile: deterministic" in captured.out


def test_main_runs_native_assist_validation_summary(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["clients/vscode/src/app.ts"])
    monkeypatch.setattr("logics_manager.assist.doctor_payload", lambda _repo_root: {"ok": True, "issue_count": 0, "issues": [], "workflow_doc_count": 1, "missing_schema_version_count": 0})
    monkeypatch.setattr("logics_manager.assist.lint_payload", lambda _repo_root, require_status=False: {"ok": True, "issue_count": 0, "warning_count": 0, "issues": [], "warnings": []})

    exit_code = main(["assist", "validation-summary"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Validation summary:" in captured.out
    assert "- overall: ok" in captured.out
    assert "- test commands: 1" in captured.out


def test_main_runs_native_assist_handoff(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    task_path.parent.mkdir(parents=True)
    task_path.write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Done",
                "# Validation",
                "- pytest passed.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist_handoff._git_range_changed_paths", lambda _repo_root, _since: ["logics/tasks/task_001_demo.md", "logics_manager/assist.py"])
    monkeypatch.setattr("logics_manager.assist_handoff._git_range_commits", lambda _repo_root, _since: [{"commit": "abc1234", "subject": "feat: demo"}])

    exit_code = main(["assist", "handoff", "--since", "HEAD~1"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Handoff since HEAD~1" in captured.out
    assert "- commit: abc1234 feat: demo" in captured.out
    assert "- logics: task_001_demo [Done] logics/tasks/task_001_demo.md" in captured.out
    assert "- validation: pytest passed." in captured.out


def test_main_runs_native_assist_test_impact_summary(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    (repo_root / "logics_manager").mkdir()
    (repo_root / "logics_manager" / "assist.py").write_text("# demo\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["logics_manager/assist.py"])

    exit_code = main(["assist", "test-impact-summary"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Test impact summary:" in captured.out
    assert "- python3 -m pytest tests/python/test_logics_manager_cli.py -q" in captured.out


def test_main_runs_native_assist_next_step(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist._resolve_workflow_doc", lambda _repo_root, ref: repo_root / "logics" / "request" / "req_001_demo.md")
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "\n".join([
            "## req_001_demo - Demo Request",
            "> Status: Ready",
            "> Schema version: 1.0",
        ]) + "\n",
        encoding="utf-8",
    )

    exit_code = main(["assist", "next-step", "req_001_demo"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Next step: promote request to backlog" in captured.out
    assert "- ref: req_001_demo" in captured.out


def test_main_runs_native_assist_request_draft(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "package.json").write_text('{"version":"1.2.3"}\n', encoding="utf-8")
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "request").mkdir(parents=True)

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "request-draft", "--intent", "Draft a request for runtime bundling"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Request draft:" in captured.out
    assert "- suggestion only: no file written" in captured.out
    assert "runtime bundling" in captured.out.lower()


def test_main_runs_native_assist_request_draft_execute(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "package.json").write_text('{"version":"1.2.3"}\n', encoding="utf-8")
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "request").mkdir(parents=True)

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "request-draft", "--intent", "Draft a request for runtime bundling", "--execution-mode", "execute"])

    assert exit_code == 0
    created = next((repo_root / "logics" / "request").glob("req_*.md"))
    assert created.is_file()
    text = created.read_text(encoding="utf-8")
    assert "> Status: Draft" in text
    assert "runtime bundling" in text.lower()


def test_main_runs_native_assist_spec_first_pass(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "package.json").write_text('{"version":"1.2.3"}\n', encoding="utf-8")
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "backlog" / "item_001_demo.md").write_text(
        "\n".join(
            [
                "## item_001_demo - Demo backlog",
                "> Status: Ready",
                "> Schema version: 1.0",
                "",
                "# Problem",
                "- Deliver a bounded spec generation slice.",
                "",
                "# Acceptance criteria",
                "- AC1: Stay bounded.",
                "- AC2: Remain proposal-only.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "spec-first-pass", "item_001_demo"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Spec first pass:" in captured.out
    assert "- source ref: item_001_demo" in captured.out
    assert "- suggestion only: no file written" in captured.out


def test_main_runs_native_assist_spec_first_pass_execute(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "package.json").write_text('{"version":"1.2.3"}\n', encoding="utf-8")
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "backlog" / "item_001_demo.md").write_text(
        "\n".join(
            [
                "## item_001_demo - Demo backlog",
                "> Status: Ready",
                "> Schema version: 1.0",
                "",
                "# Problem",
                "- Deliver a bounded spec generation slice.",
                "",
                "# Acceptance criteria",
                "- AC1: Stay bounded.",
                "- AC2: Remain proposal-only.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "spec-first-pass", "item_001_demo", "--execution-mode", "execute"])

    assert exit_code == 0
    created = next((repo_root / "logics" / "specs").glob("spec_*.md"))
    assert created.is_file()
    text = created.read_text(encoding="utf-8")
    assert "> Status: Draft" in text
    assert "# Overview" in text
    assert "Deliver a bounded spec generation slice." in text


def test_main_runs_native_assist_backlog_groom(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "package.json").write_text('{"version":"1.2.3"}\n', encoding="utf-8")
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "\n".join(
            [
                "## req_001_demo - Demo request",
                "> Status: Ready",
                "> Schema version: 1.0",
                "",
                "# Needs",
                "- Deliver a bounded backlog slice.",
                "",
                "# Acceptance criteria",
                "- AC1: Stay bounded.",
                "- AC2: Keep the proposal reviewable.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "backlog-groom", "req_001_demo"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Backlog groom:" in captured.out
    assert "- source ref: req_001_demo" in captured.out
    assert "- suggestion only: no file written" in captured.out


def test_main_runs_native_assist_backlog_groom_execute(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "package.json").write_text('{"version":"1.2.3"}\n', encoding="utf-8")
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "request").mkdir(parents=True)
    request = repo_root / "logics" / "request" / "req_001_demo.md"
    request.write_text(
        "\n".join(
            [
                "## req_001_demo - Demo request",
                "> Status: Ready",
                "> Schema version: 1.0",
                "",
                "# Needs",
                "- Deliver a bounded backlog slice.",
                "",
                "# Acceptance criteria",
                "- AC1: Stay bounded.",
                "- AC2: Keep the proposal reviewable.",
                "",
                "# Backlog",
                "- none",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "backlog-groom", "req_001_demo", "--execution-mode", "execute"])

    assert exit_code == 0
    created = next((repo_root / "logics" / "backlog").glob("item_*.md"))
    assert created.is_file()
    text = created.read_text(encoding="utf-8")
    assert "# Acceptance criteria" in text
    assert "Hybrid rationale:" in text
    assert "- Priority: Medium" in text
    assert "- Impact:" not in text
    request_text = request.read_text(encoding="utf-8")
    assert created.stem in request_text


def test_main_runs_native_bootstrap_check_reports_missing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    monkeypatch.chdir(repo_root)

    exit_code = main(["bootstrap", "--check"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "Bootstrap check: actions required" in captured.out
    assert "missing: logics/" in captured.out
    assert not (repo_root / "logics").exists()


def test_main_runs_native_bootstrap_creates_scaffold(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    monkeypatch.chdir(repo_root)

    exit_code = main(["bootstrap"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Bootstrap: OK" in captured.out
    assert (repo_root / "logics").is_dir()
    assert (repo_root / "logics" / "instructions.md").is_file()
    assert not (repo_root / ".claude").exists()
    assert not (repo_root / "logics" / "skills").exists()
    for directory in ("request", "backlog", "tasks", "specs", "product", "architecture", "external", ".cache"):
        assert (repo_root / "logics" / directory).is_dir()
        assert (repo_root / "logics" / directory / ".gitkeep").is_file()


def test_main_runs_native_bootstrap_cleans_legacy_runtime_artifacts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / ".claude" / "commands").mkdir(parents=True)
    (repo_root / ".claude" / "agents").mkdir(parents=True)
    (repo_root / "logics" / "skills" / "legacy-skill").mkdir(parents=True)
    (repo_root / "logics" / "skills" / "legacy-skill" / "SKILL.md").write_text("# legacy\n", encoding="utf-8")
    monkeypatch.chdir(repo_root)

    exit_code = main(["bootstrap"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Bootstrap: OK" in captured.out
    assert not (repo_root / ".claude").exists()
    assert not (repo_root / "logics" / "skills").exists()


def test_main_runs_native_bootstrap_repairs_stale_instructions(
    tmp_path: Path,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "instructions.md").write_text("stale instructions\n", encoding="utf-8")

    payload = bootstrap_payload(repo_root, check=False)

    assert payload["ok"] is True
    assert payload["claude_instruction_line_count"] > 0
    instructions_text = (repo_root / "logics" / "instructions.md").read_text(encoding="utf-8")
    assert "# Codex Context" in instructions_text
    assert "python3 -m logics_manager flow start" in instructions_text
    assert "python3 -m logics_manager flow progress task" in instructions_text
    assert "python3 -m logics_manager flow finish task" in instructions_text
    assert "ADR 009 checkpoints" in instructions_text
    assert "set a deliberate `# Priority` tier" in instructions_text
    assert "Sequence delivery plans and roadmaps by status priority order" in instructions_text


def test_main_runs_native_bootstrap_creates_local_assistant_bridge(
    tmp_path: Path,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()

    payload = bootstrap_payload(repo_root, check=False)

    assert payload["ok"] is True
    logics_text = (repo_root / "LOGICS.md").read_text(encoding="utf-8")
    agents_text = (repo_root / "AGENTS.md").read_text(encoding="utf-8")
    gitignore_text = (repo_root / ".gitignore").read_text(encoding="utf-8")
    assert "logics-manager:managed:start" in logics_text
    assert "Canonical generated instructions live in `logics/instructions.md`." in logics_text
    assert "If unmanaged notes in this file conflict with this section" in logics_text
    assert "logics-manager release status" in logics_text
    assert "logics-manager release plan <version>" in logics_text
    assert "logics-manager release evidence add" in logics_text
    assert "logics-manager i18n status" in logics_text
    assert "logics-manager i18n init --source-locale <locale>" in logics_text
    assert "logics-manager i18n validate" in logics_text
    assert "logics-manager flow start <ref>" in logics_text
    assert "logics-manager flow progress task <ref> --progress <n>%" in logics_text
    assert "logics-manager flow finish task <path>" in logics_text
    assert "logics-manager sync refresh-mermaid-signatures" in logics_text
    assert "logics-manager view" in logics_text
    assert "repo-relative, never absolute filesystem paths" in logics_text
    assert "@LOGICS.md" in agents_text
    assert "LOGICS.md" in gitignore_text
    assert "AGENTS.md" in gitignore_text


def test_main_runs_native_bootstrap_refreshes_managed_bridge_without_overwriting_local_notes(
    tmp_path: Path,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "LOGICS.md").write_text(
        "\n".join(
            [
                "# Local Notes",
                "",
                "Keep this repo-specific instruction.",
                "",
                "<!-- logics-manager:managed:start -->",
                "old generated content",
                "<!-- logics-manager:managed:end -->",
                "",
                "Local footer.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    payload = bootstrap_payload(repo_root, check=False)

    assert "LOGICS.md" in payload["updated_paths"]
    logics_text = (repo_root / "LOGICS.md").read_text(encoding="utf-8")
    assert "Keep this repo-specific instruction." in logics_text
    assert "Local footer." in logics_text
    assert "old generated content" not in logics_text
    assert "logics-manager release evidence add" in logics_text


def test_main_runs_native_bootstrap_replaces_unmanaged_obsolete_logics_bridge(
    tmp_path: Path,
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "LOGICS.md").write_text("# Old Instructions\n\nUse a stale command.\n", encoding="utf-8")

    payload = bootstrap_payload(repo_root, check=False)

    assert "LOGICS.md" in payload["updated_paths"]
    logics_text = (repo_root / "LOGICS.md").read_text(encoding="utf-8")
    assert "logics-manager:managed:start" in logics_text
    assert "Use a stale command." not in logics_text
    assert "Unmanaged Local Notes" not in logics_text


def test_main_runs_native_bootstrap_check_reports_stale_instructions(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "instructions.md").write_text("stale instructions\n", encoding="utf-8")
    monkeypatch.chdir(repo_root)

    exit_code = main(["bootstrap", "--check"])
    captured = capsys.readouterr()

    assert exit_code == 1
    assert "Bootstrap check: actions required" in captured.out
    assert "missing: logics/instructions.md" in captured.out


def test_main_runs_native_assist_closure_summary(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "\n".join([
            "## req_001_demo - Demo Request",
            "> Status: Done",
            "> Schema version: 1.0",
            "# Links",
            "- item_001_demo_item",
        ]) + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "closure-summary", "req_001_demo"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Closure summary:" in captured.out
    assert "- status: Done" in captured.out


def test_main_runs_native_assist_roi_report(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / ".cache").mkdir(parents=True)
    (repo_root / "logics" / ".cache" / "hybrid_assist_measurements.jsonl").write_text(
        "\n".join(
            [
                '{"recorded_at":"2026-04-22T10:00:00+00:00","flow":"request-draft","backend_requested":"auto","backend_used":"ollama","execution_path":"local","result_status":"ok","confidence":0.92,"degraded_reasons":[],"review_recommended":false}',
                '{"recorded_at":"2026-04-22T11:00:00+00:00","flow":"request-draft","backend_requested":"auto","backend_used":"codex","execution_path":"fallback","result_status":"degraded","confidence":0.61,"degraded_reasons":["backend fallback"],"review_recommended":true}',
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / ".cache" / "hybrid_assist_audit.jsonl").write_text(
        "\n".join(
            [
                '{"recorded_at":"2026-04-22T10:00:00+00:00","flow":"request-draft","result_status":"ok","backend":{"requested_backend":"auto","selected_backend":"ollama","reasons":[]},"safety_class":"proposal-only","context_summary":{"seed_ref":"req_001_demo"},"transport":{"reason":"local"}}',
                '{"recorded_at":"2026-04-22T11:00:00+00:00","flow":"request-draft","result_status":"degraded","backend":{"requested_backend":"auto","selected_backend":"codex","reasons":["bridge missing"]},"safety_class":"proposal-only","context_summary":{"seed_ref":"req_001_demo"},"transport":{"reason":"fallback"}}',
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "roi-report"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Assist ROI report: OK" in captured.out
    assert "- runs: 2" in captured.out
    assert "- local offload rate: 0.5" in captured.out


def test_main_runs_native_assist_context(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.assist._build_context_pack", lambda *args, **kwargs: {"ref": "req_001_demo", "mode": "summary-only", "profile": "normal", "budgets": {"max_docs": 1}, "changed_paths": [], "docs": [], "estimates": {"doc_count": 1, "char_count": 10}})

    exit_code = main(["assist", "context", "request-draft", "req_001_demo"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Assist context: request-draft" in captured.out
    assert "- ref: req_001_demo" in captured.out


def test_root_commands_reject_unknown_flags(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics").mkdir(parents=True)
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit) as exc_info:
        main(["lint", "--bogus"])

    assert exc_info.value.code == 2


@pytest.mark.parametrize(
    "argv",
    [
        ["config", "show", "--bogus"],
        ["doctor", "--bogus"],
        ["index", "--bogus"],
        ["lint", "--bogus"],
        ["flow", "new", "request", "--title", "Unknown Flag", "--bogus"],
        ["flow", "list", "--bogus"],
        ["sync", "list-docs", "--bogus"],
        ["assist", "runtime-status", "--bogus"],
    ],
)
def test_unknown_flags_fail_consistently_in_subprocess(tmp_path: Path, argv: list[str]) -> None:
    repo_root = tmp_path / "logics-repo"
    _write_subprocess_json_repo(repo_root)

    result = _run_logics_manager_subprocess(repo_root, argv)

    assert result.returncode == 2
    assert result.stdout == ""
    assert "unrecognized arguments: --bogus" in result.stderr


def test_index_rejects_outside_output_before_writing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)
    outside = tmp_path / "outside.md"

    with pytest.raises(SystemExit, match="Unsupported --out path"):
        main(["index", "--out", "../outside.md"])

    assert not outside.exists()
