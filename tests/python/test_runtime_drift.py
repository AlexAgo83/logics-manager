"""req_340/item_701: the tool must say when it is not the tool this repo expects.

Observed 2026-08-11: `logics-manager audit` answered "0 blocking" from a 2.21.6
runtime on a 2.21.7 working tree. The same corpus through `python3 -m logics_manager`
reported 4 blocking findings and 234 warnings, and a measurement taken from the first
answer had already been written into a request as acceptance proof.

The failure is one-sided, which is what makes it worth a check: an older runtime does
not know about newer rules, so it reports *fewer* findings and the corpus looks
healthier than it is.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from logics_manager import cli
from logics_manager.runtime_drift import drift_message, repository_version


def _repo_at(tmp_path: Path, version: str | None, *, self_checkout: bool = True) -> Path:
    repo_root = tmp_path / "repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    if self_checkout:
        # item_784/GH#20: repository_version() now only reads VERSION for what looks
        # like logics-manager's own checkout -- these tests are about the drift
        # *message*, so they mark the fixture as one unless told otherwise.
        pkg_dir = repo_root / "logics_manager"
        pkg_dir.mkdir(parents=True, exist_ok=True)
        (pkg_dir / "__init__.py").write_text("", encoding="utf-8")
    if version is not None:
        (repo_root / "VERSION").write_text(f"{version}\n", encoding="utf-8")
    return repo_root


def test_a_runtime_matching_the_repository_says_nothing(tmp_path: Path) -> None:
    repo_root = _repo_at(tmp_path, "2.21.7")

    assert repository_version(repo_root) == "2.21.7"
    assert drift_message(repo_root, "2.21.7") is None
    # Whitespace is not a disagreement.
    assert drift_message(repo_root, " 2.21.7 ") is None


def test_a_stale_runtime_names_both_versions_and_how_to_update(tmp_path: Path) -> None:
    repo_root = _repo_at(tmp_path, "2.21.7")

    message = drift_message(repo_root, "2.21.6")

    assert message is not None
    assert "2.21.6" in message and "2.21.7" in message
    # Both escape routes: update the install, or run the repository's own code.
    assert "npm install -g @grifhinz/logics-manager@2.21.7" in message
    assert "python3 -m logics_manager" in message


def test_an_unknown_version_on_either_side_is_not_a_disagreement(tmp_path: Path) -> None:
    """Guessing would produce a warning nobody can act on."""
    assert drift_message(_repo_at(tmp_path, None), "2.21.7") is None
    assert drift_message(_repo_at(tmp_path / "b", "2.21.7"), None) is None
    assert drift_message(_repo_at(tmp_path / "c", "2.21.7"), "   ") is None


def test_the_warning_goes_to_stderr_and_leaves_json_stdout_machine_readable(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """AC2: informing must not corrupt the output tooling parses."""
    repo_root = _repo_at(tmp_path, "9.9.9")
    monkeypatch.chdir(repo_root)
    monkeypatch.setattr(cli, "get_cli_version", lambda: "2.21.7")

    cli._warn_on_runtime_drift(["audit", "--format", "json"])

    captured = capsys.readouterr()
    assert captured.out == "", "stdout must stay clean for --format json"
    assert "9.9.9" in captured.err and "2.21.7" in captured.err


def test_only_commands_that_report_on_the_corpus_warn(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    repo_root = _repo_at(tmp_path, "9.9.9")
    monkeypatch.chdir(repo_root)
    monkeypatch.setattr(cli, "get_cli_version", lambda: "2.21.7")

    for command in ("audit", "lint", "doctor", "health", "status"):
        cli._warn_on_runtime_drift([command])
        assert "9.9.9" in capsys.readouterr().err, command

    # `view` and `config` serve rather than report: a stale runtime does not silently
    # change their answer, so they stay quiet.
    for command in ("view", "config", "skills", ""):
        cli._warn_on_runtime_drift([command] if command else [])
        assert capsys.readouterr().err == "", command


def test_a_consumer_repos_own_version_is_not_read_as_drift(tmp_path: Path) -> None:
    """item_784/GH#20: a consumer repo's own VERSION (its own release, unrelated to
    logics-manager's) must not be compared against the runtime at all."""
    repo_root = _repo_at(tmp_path, "0.19.3", self_checkout=False)

    assert repository_version(repo_root) is None
    assert drift_message(repo_root, "2.21.9") is None


def test_running_from_source_never_reports_drift_against_itself(tmp_path: Path) -> None:
    """The runtime reads the VERSION beside its own code, not the working directory.

    Running `python3 -m logics_manager` inside this repository therefore compares a
    file with itself, and there is genuinely no drift to report.
    """
    from logics_manager.update_check import PACKAGE_ROOT

    assert drift_message(PACKAGE_ROOT, repository_version(PACKAGE_ROOT)) is None


def test_a_drifting_runtime_never_changes_the_exit_code(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """AC2: a deliberately pinned runtime has to stay usable."""
    repo_root = _repo_at(tmp_path, "9.9.9")
    monkeypatch.chdir(repo_root)
    monkeypatch.setattr(cli, "get_cli_version", lambda: "2.21.7")

    drifting = cli.main(["doctor", "--format", "json"])
    drift_output = capsys.readouterr()

    # Same repository, same command, runtime that agrees: the verdict must be identical.
    monkeypatch.setattr(cli, "get_cli_version", lambda: "9.9.9")
    agreeing = cli.main(["doctor", "--format", "json"])
    agreeing_output = capsys.readouterr()

    assert drifting == agreeing
    assert json.loads(drift_output.out) == json.loads(agreeing_output.out)
    assert "9.9.9" in drift_output.err
    assert agreeing_output.err == ""
