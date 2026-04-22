from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from logics_manager.config import DEFAULT_LOGICS_CONFIG, load_repo_config, render_config_show
from logics_manager.audit import audit_payload, render_audit
from logics_manager.index import index_payload, render_index
from logics_manager.lint import lint_payload, render_lint
from logics_manager.doctor import doctor_payload, render_doctor
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
        (["doctor", "--format", "json"], None, None),
        (["audit", "--format", "json"], None, None),
        (["index", "--format", "json"], None, None),
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

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(subprocess, "run", fake_run)

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


def _write_minimal_workflow_doc(path: Path, *, title: str, kind: str, status: str, links: list[str]) -> None:
    links_text = "\n".join(f"- {ref}" for ref in links) if links else "- none"
    path.write_text(
        "\n".join(
            [
                f"## {path.stem} - {title}",
                f"> Status: {status}",
                "> Schema version: 1.0",
                "# Links",
                links_text,
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _write_minimal_lint_doc(path: Path, *, title: str, status: str, include_progress: bool) -> None:
    lines = [
        f"## {path.stem} - {title}",
        f"> Status: {status}",
        "> From version: 1.0.0",
        "> Understanding: 100%",
        "> Confidence: 100%",
    ]
    if include_progress:
        lines.append("> Progress: 0%")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def test_render_audit_reports_ok_for_minimal_consistent_repo(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)

    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        kind="request",
        status="Draft",
        links=["item_001_demo_item"],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "backlog" / "item_001_demo_item.md",
        title="Demo backlog",
        kind="backlog",
        status="Ready",
        links=["req_001_demo"],
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "tasks" / "task_001_demo_task.md",
        title="Demo task",
        kind="task",
        status="Ready",
        links=["item_001_demo_item"],
    )

    payload = audit_payload(repo_root)

    assert payload["ok"] is True
    assert payload["issue_count"] == 0
    assert payload["workflow_doc_count"] == 3
    assert '"ok": true' in render_audit(repo_root, output_format="json")


def test_render_audit_reports_stale_pending_doc(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    doc_path = repo_root / "logics" / "request" / "req_001_demo.md"
    _write_minimal_workflow_doc(
        doc_path,
        title="Demo request",
        kind="request",
        status="Ready",
        links=[],
    )
    past = 1_600_000_000
    os.utime(doc_path, (past, past))

    payload = audit_payload(repo_root, stale_days=30, skip_ac_traceability=True, skip_gates=True)

    assert payload["ok"] is False
    assert payload["issue_count"] == 1
    assert payload["issues"][0]["code"] == "stale_pending_doc"


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
    assert "Wrote logics/INDEX.md" == render_index(repo_root, output_format="text")
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
