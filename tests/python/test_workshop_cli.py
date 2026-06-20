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


def test_workshop_commands_discovers_npm_project_and_poetry_scripts(tmp_path: Path) -> None:
    (tmp_path / "package.json").write_text(
        json.dumps({"scripts": {"test": "vitest run", "build": "tsc"}}),
        encoding="utf-8",
    )
    (tmp_path / "pyproject.toml").write_text(
        "[project]\nname = \"demo\"\n[project.scripts]\nfoo = \"demo:main\"\n"
        "[tool.poetry.scripts]\nbar = \"demo:bar\"\n",
        encoding="utf-8",
    )

    payload = workshop_commands_payload(tmp_path)
    by_id = {entry["id"]: entry for entry in payload["commands"]}

    assert payload["state"] == "ok"
    assert by_id["npm-test"]["runner"] == ["npm", "run", "test"]
    assert by_id["npm-build"]["group"] == "npm scripts"
    assert by_id["pyproject-foo"]["runner"] == ["foo"]
    assert by_id["poetry-bar"]["runner"] == ["poetry", "run", "bar"]


def test_workshop_commands_handles_missing_or_malformed_manifests(tmp_path: Path) -> None:
    payload = workshop_commands_payload(tmp_path)
    assert payload["state"] == "empty"
    assert payload["commands"] == []

    (tmp_path / "package.json").write_text("{not json", encoding="utf-8")
    (tmp_path / "pyproject.toml").write_text("[broken", encoding="utf-8")
    payload = workshop_commands_payload(tmp_path)
    assert payload["state"] == "empty"


@pytest.mark.skipif(not workshop_terminals_available(), reason="stdlib pty is unavailable on this host")
def test_workshop_terminal_session_runs_command_via_pty(tmp_path: Path) -> None:
    import time as _time

    registry = WorkshopTerminalRegistry()
    session = registry.create(["/bin/echo", "hello-pty"], tmp_path, label="echo-pty")
    for _ in range(50):
        if session.state in {"finished", "failed", "stopped"}:
            break
        _time.sleep(0.05)
    status = session.status_payload()
    _, chunks = session.tail(0)
    output = "".join(c for _, c in chunks)
    registry.shutdown()

    assert status["state"] == "finished"
    assert status["exitCode"] == 0
    assert "hello-pty" in output


@pytest.mark.skipif(not workshop_terminals_available(), reason="stdlib pty is unavailable on this host")
def test_workshop_terminal_session_stop_terminates_long_running(tmp_path: Path) -> None:
    import time as _time

    registry = WorkshopTerminalRegistry()
    session = registry.create(["/bin/sh", "-c", "sleep 30"], tmp_path, label="sleep")
    _time.sleep(0.2)
    session.stop(timeout=3.0)
    for _ in range(50):
        if session.state in {"stopped", "failed", "finished"}:
            break
        _time.sleep(0.05)
    status = session.status_payload()
    registry.shutdown()

    assert status["state"] in {"stopped", "failed", "finished"}
    assert status["exitCode"] is not None


@pytest.mark.skipif(not workshop_terminals_available(), reason="stdlib pty is unavailable on this host")
def test_workshop_terminal_session_survives_with_no_listeners(tmp_path: Path) -> None:
    """Sessions must stay alive while their process runs, even when no SSE
    consumer is attached — multiple terminals share one focused viewer."""
    import time as _time

    registry = WorkshopTerminalRegistry()
    session = registry.create(["/bin/sh", "-c", "sleep 2"], tmp_path, label="no-listener")
    _time.sleep(0.8)
    assert session.state == "running", f"unexpected state {session.state}"
    for _ in range(40):
        if session.state in {"finished", "failed", "stopped"}:
            break
        _time.sleep(0.1)
    registry.shutdown()
    assert session.state in {"finished", "failed", "stopped"}


def test_workshop_terminal_registry_rejects_when_no_workspace(tmp_path: Path) -> None:
    missing = tmp_path / "does-not-exist"
    registry = WorkshopTerminalRegistry()
    if not workshop_terminals_available():
        with pytest.raises(ValueError):
            registry.create(["/bin/sh"], missing)
        return
    with pytest.raises(ValueError):
        registry.create(["/bin/sh"], missing)
    registry.shutdown()


def test_workshop_mutating_routes_cover_terminal_endpoints() -> None:
    assert "/api/workshop-terminal-start" in VIEWER_MUTATING_ROUTES
    assert "/api/workshop-terminal-stop" in VIEWER_MUTATING_ROUTES
    assert "/api/workshop-terminal-input" in VIEWER_MUTATING_ROUTES
    assert "/api/workshop-terminal-resize" in VIEWER_MUTATING_ROUTES


def test_workshop_session_runs_to_completion_and_streams_output(tmp_path: Path) -> None:
    import sys as _sys
    import time as _time

    registry = WorkshopSessionRegistry()
    entry = {
        "id": "echo",
        "runner": [_sys.executable, "-c", "print('alpha'); print('beta')"],
    }
    session = registry.create(entry, tmp_path)
    for _ in range(50):
        if session.state in {"finished", "failed", "stopped"}:
            break
        _time.sleep(0.05)
    status = session.status_payload()
    _, lines = session.tail(0)
    text_lines = [line.partition("\t")[2] for _seq, line in lines]
    registry.shutdown()

    assert status["state"] == "finished"
    assert status["exitCode"] == 0
    assert text_lines == ["alpha", "beta"]


def test_workshop_session_stop_terminates_long_running_process(tmp_path: Path) -> None:
    import sys as _sys
    import time as _time

    registry = WorkshopSessionRegistry()
    entry = {
        "id": "sleep",
        "runner": [_sys.executable, "-c", "import time; time.sleep(30)"],
    }
    session = registry.create(entry, tmp_path)
    _time.sleep(0.2)
    session.stop(timeout=3.0)
    for _ in range(50):
        if session.state in {"stopped", "failed", "finished"}:
            break
        _time.sleep(0.05)
    status = session.status_payload()
    registry.shutdown()

    assert status["state"] in {"stopped", "failed"}
    assert status["exitCode"] is not None
