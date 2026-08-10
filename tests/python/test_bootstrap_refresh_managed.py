"""req_331/item_691: `bootstrap --refresh-managed` refreshes only generated
files and marked managed regions for an EXISTING corpus, and never creates a
new one, initializes Git, or commits.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from logics_manager.bootstrap import bootstrap_payload
from logics_manager.cli import main


def test_refresh_managed_never_creates_a_new_corpus(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()

    payload = bootstrap_payload(repo_root, check=False, refresh_managed=True)

    assert payload["ok"] is False
    assert payload["reason"] == "no_corpus"
    assert payload["created_paths"] == []
    assert not (repo_root / "logics").exists()


def test_refresh_managed_check_reports_no_corpus_without_writing(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()

    payload = bootstrap_payload(repo_root, check=True, refresh_managed=True)

    assert payload["ok"] is False
    assert payload["reason"] == "no_corpus"
    assert not (repo_root / "logics").exists()


def test_refresh_managed_refreshes_stale_managed_files_on_an_existing_corpus(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    bootstrap_payload(repo_root, check=False)  # normal bootstrap: create the corpus first

    (repo_root / "logics" / "instructions.md").write_text("stale\n", encoding="utf-8")

    check_payload = bootstrap_payload(repo_root, check=True, refresh_managed=True)
    assert check_payload["ok"] is False
    assert "logics/instructions.md" in check_payload["missing_paths"]

    apply_payload = bootstrap_payload(repo_root, check=False, refresh_managed=True)
    assert "logics/instructions.md" in apply_payload["updated_paths"]
    assert (repo_root / "logics" / "instructions.md").read_text(encoding="utf-8") != "stale\n"


def test_refresh_managed_preserves_user_content_outside_the_managed_block(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    bootstrap_payload(repo_root, check=False)

    logics_bridge = repo_root / "LOGICS.md"
    original = logics_bridge.read_text(encoding="utf-8")
    with_user_note = original + "\n## My own project notes\n- do not touch this\n"
    logics_bridge.write_text(with_user_note, encoding="utf-8")

    bootstrap_payload(repo_root, check=False, refresh_managed=True)

    refreshed = logics_bridge.read_text(encoding="utf-8")
    assert "## My own project notes" in refreshed
    assert "- do not touch this" in refreshed


def test_refresh_managed_is_a_no_op_when_nothing_is_stale(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    bootstrap_payload(repo_root, check=False)

    payload = bootstrap_payload(repo_root, check=True, refresh_managed=True)

    assert payload["ok"] is True
    assert payload["missing_paths"] == []


def test_refresh_managed_never_touches_git(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    bootstrap_payload(repo_root, check=False)

    bootstrap_payload(repo_root, check=False, refresh_managed=True)

    assert not (repo_root / ".git").exists()


def test_cli_bootstrap_refresh_managed_reports_no_corpus(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    monkeypatch.chdir(repo_root)

    exit_code = main(["bootstrap", "--refresh-managed", "--format", "json"])
    captured = json.loads(capsys.readouterr().out)

    assert exit_code == 1
    assert captured["reason"] == "no_corpus"
