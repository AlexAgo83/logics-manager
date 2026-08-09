"""Regression tests for req_326, commands that reported failure and exited zero.

`doctor` printed FAILED and exited 0 while its `doctor packaging` sibling, fifteen lines
above it in the same function, did the right thing. Under `flow`, only `closeout` and
`validate-closeout` were named as allowed to fail, so `flow validate` reported blocking
findings and `flow roadmap validate` printed FAILED, both exiting 0.

AC5 asks for the general rule rather than a test per command, so the `flow` cases drive
the dispatcher with a stub handler instead of enumerating today's validators.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from logics_manager import flow as flow_module
from logics_manager.cli import main


def _repo(tmp_path: Path, *dirs: str) -> Path:
    repo_root = tmp_path / "logics-repo"
    for rel in dirs or ("request", "backlog", "tasks"):
        (repo_root / "logics" / rel).mkdir(parents=True, exist_ok=True)
    return repo_root


# --- item_679: doctor -------------------------------------------------------


@pytest.mark.parametrize("output_format", ["text", "json"])
def test_doctor_exits_non_zero_when_it_reports_a_problem(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], output_format: str
) -> None:
    repo_root = _repo(tmp_path)
    # A doc with no schema version is the corpus condition doctor fails on.
    (repo_root / "logics" / "request" / "req_001_probe.md").write_text(
        "## req_001_probe - Probe\n> Status: Draft\n", encoding="utf-8"
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["doctor", "--format", output_format])
    out = capsys.readouterr().out

    assert exit_code == 1
    assert ("FAILED" in out) or ('"ok": false' in out)


@pytest.mark.parametrize("output_format", ["text", "json"])
def test_doctor_exits_zero_on_a_clean_corpus(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], output_format: str
) -> None:
    repo_root = _repo(tmp_path)
    (repo_root / "logics" / "request" / "req_001_probe.md").write_text(
        "## req_001_probe - Probe\n> Schema version: 1.0\n> Status: Draft\n", encoding="utf-8"
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    assert main(["doctor", "--format", output_format]) == 0
    assert "FAILED" not in capsys.readouterr().out


# --- item_680: the flow dispatcher, stated as a rule ------------------------


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        ({"ok": False}, 1),
        ({"ok": True}, 0),
        # A handler that publishes no verdict is not claiming failure.
        ({"command": "show"}, 0),
        (None, 1),
    ],
)
def test_flow_exit_status_follows_the_payload_verdict(
    monkeypatch: pytest.MonkeyPatch, payload: object, expected: int
) -> None:
    """Any flow subcommand, not a named few: the dispatcher reads `ok` and nothing else."""
    monkeypatch.setattr(flow_module, "_find_repo_root", lambda _cwd: Path("."))

    real_build_parser = flow_module.build_parser

    def _stub_parser():
        parser = real_build_parser()
        for action in parser._subparsers._group_actions[0].choices.values():  # type: ignore[union-attr]
            action.set_defaults(func=lambda _args: payload)
        return parser

    monkeypatch.setattr(flow_module, "build_parser", _stub_parser)

    assert flow_module.main(["list"]) == expected


def test_flow_roadmap_validate_exits_non_zero_on_a_broken_roadmap(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    repo_root = _repo(tmp_path, "request", "backlog", "tasks", "roadmap")
    broken = repo_root / "logics" / "roadmap" / "road_999_broken.md"
    broken.write_text("## road_999_broken - Broken\n> Date: 2026-08-10\n> Status: Draft\n", encoding="utf-8")
    monkeypatch.setattr(flow_module, "_find_repo_root", lambda _cwd: repo_root)

    assert flow_module.main(["roadmap", "validate", broken.relative_to(repo_root).as_posix()]) == 1


def test_flow_roadmap_validate_exits_zero_on_a_valid_roadmap(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    repo_root = _repo(tmp_path, "request", "backlog", "tasks", "roadmap")
    (repo_root / "logics" / "request" / "req_001_probe.md").write_text(
        "## req_001_probe - Probe\n> Schema version: 1.0\n> Status: Draft\n", encoding="utf-8"
    )
    monkeypatch.setattr(flow_module, "_find_repo_root", lambda _cwd: repo_root)
    flow_module.main(["roadmap", "propose", "--title", "1.0: probe", "--milestone", "1.0.0: first", "--request-ref", "req_001"])

    roadmap = next((repo_root / "logics" / "roadmap").glob("road_*.md"))
    assert flow_module.main(["roadmap", "validate", roadmap.relative_to(repo_root).as_posix()]) == 0


# --- AC6: the commands that were already correct stay correct ---------------


def test_health_lint_and_audit_keep_their_exit_behaviour(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    repo_root = _repo(tmp_path, "request", "backlog", "tasks", "product", "architecture", "roadmap", "specs")
    (repo_root / "logics" / "request" / "req_001_probe.md").write_text(
        "\n".join(
            [
                "## req_001_probe - Probe",
                "> From version: 2.21.2",
                "> Schema version: 1.0",
                "> Status: Draft",
                "> Understanding: 90%",
                "> Confidence: 85%",
                "",
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.cli.find_repo_root", lambda _cwd: repo_root)

    for command in (["health"], ["lint"], ["audit"]):
        assert main(command) == 0, f"{command} regressed on a clean corpus"
        capsys.readouterr()
