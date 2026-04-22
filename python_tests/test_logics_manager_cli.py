from __future__ import annotations

import subprocess
import sys

import pytest

from logics_manager.cli import main


def test_main_prints_help_and_fails_without_command(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main([])

    captured = capsys.readouterr()
    assert exit_code == 1
    assert "Canonical Logics CLI" in captured.out
    assert "Examples:" in captured.out


def test_main_prints_version_and_exits(capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as exc_info:
        main(["--version"])

    captured = capsys.readouterr()
    assert exc_info.value.code == 0
    assert "logics-manager 0.0.0" in captured.out


@pytest.mark.parametrize(
    ("argv", "expected_script_suffix", "expected_args"),
    [
        (["flow", "new", "request", "--title", "Demo"], "logics_flow.py", ["new", "request", "--title", "Demo"]),
        (["doctor", "--format", "json"], "logics_flow.py", ["sync", "doctor", "--format", "json"]),
        (["config", "show", "--format", "json"], "logics_flow.py", ["sync", "show-config", "--format", "json"]),
    ],
)
def test_main_dispatches_to_expected_underlying_script(
    monkeypatch: pytest.MonkeyPatch,
    argv: list[str],
    expected_script_suffix: str,
    expected_args: list[str],
) -> None:
    recorded: dict[str, object] = {}

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(subprocess, "run", fake_run)

    exit_code = main(argv)

    assert exit_code == 0
    command = recorded["command"]
    assert isinstance(command, list)
    assert command[0] == sys.executable
    assert str(command[1]).endswith(expected_script_suffix)
    assert command[2:] == expected_args
    assert recorded["check"] is False


def test_main_rejects_invalid_config_subcommand() -> None:
    with pytest.raises(SystemExit, match="Usage: logics-manager config show"):
        main(["config", "list"])
