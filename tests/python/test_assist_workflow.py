"""req_323/item_672: direct coverage for assist_workflow.py's own command
handlers, isolated from the CLI argument-parsing layer. `test_assist_cli.py`
and `test_cli_main.py` already exercise these through `main()`; these tests
call each `cmd_*` function directly with a constructed `argparse.Namespace`,
so a broken handler fails here even if the CLI wiring around it is fine.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pytest

from logics_manager import assist_workflow


def _repo(tmp_path: Path) -> Path:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "package.json").write_text('{"version":"1.2.3"}\n', encoding="utf-8")
    (repo_root / "logics").mkdir()
    (repo_root / "logics" / "request").mkdir(parents=True)
    return repo_root


def test_cmd_request_draft_dry_run_writes_nothing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = _repo(tmp_path)
    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    args = argparse.Namespace(intent="Draft a request for runtime bundling", format="json", execution_mode="execute", dry_run=True)

    payload = assist_workflow.cmd_request_draft(args)

    assert payload["written"] is False
    assert list((repo_root / "logics" / "request").glob("req_*.md")) == []


def test_cmd_request_draft_execute_writes_the_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = _repo(tmp_path)
    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    args = argparse.Namespace(intent="Draft a request for runtime bundling", format="json", execution_mode="execute", dry_run=False)

    payload = assist_workflow.cmd_request_draft(args)

    assert payload["written"] is True
    created = next((repo_root / "logics" / "request").glob("req_*.md"))
    assert created.is_file()
    assert "runtime bundling" in created.read_text(encoding="utf-8").lower()


def test_cmd_request_draft_suggestion_only_writes_nothing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = _repo(tmp_path)
    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)
    args = argparse.Namespace(intent="Draft a request for runtime bundling", format="text", execution_mode="suggestion-only", dry_run=False)

    payload = assist_workflow.cmd_request_draft(args)

    assert payload["written"] is False
    assert list((repo_root / "logics" / "request").glob("req_*.md")) == []


def test_cmd_request_draft_rejects_an_output_path_outside_the_repo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """The error path: a generated path that escapes the repo must be
    rejected before anything is written, not silently followed."""
    repo_root = _repo(tmp_path)
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
    args = argparse.Namespace(intent="demo", format="json", execution_mode="execute", dry_run=False)

    with pytest.raises(SystemExit, match="Unsupported output path"):
        assist_workflow.cmd_request_draft(args)

    assert not (tmp_path / "outside.md").exists()
