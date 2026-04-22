from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

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
        (["flow", "new", "request", "--title", "Demo"], None, None),
        (["flow", "close", "task", "logics/tasks/task_148_integrate_the_runtime_into_cdx_logics_vscode_and_remove_the_skills_checkout.md"], None, None),
        (["flow", "finish", "task", "logics/tasks/task_148_integrate_the_runtime_into_cdx_logics_vscode_and_remove_the_skills_checkout.md"], None, None),
        (["sync", "close-eligible-requests"], None, None),
        (["sync", "refresh-mermaid-signatures"], None, None),
        (["sync", "schema-status"], None, None),
        (["sync", "context-pack", "req_001_demo"], None, None),
        (["sync", "export-graph"], None, None),
        (["assist", "runtime-status"], None, None),
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
    if argv[:2] in (
        ["flow", "new"],
        ["flow", "close"],
        ["flow", "finish"],
        ["sync", "close-eligible-requests"],
        ["sync", "refresh-mermaid-signatures"],
        ["sync", "schema-status"],
        ["sync", "context-pack"],
        ["sync", "export-graph"],
        ["assist", "runtime-status"],
    ):
        monkeypatch.setattr("logics_manager.flow.main", lambda _argv: 0)
        monkeypatch.setattr("logics_manager.sync.main", lambda _argv: 0)
        monkeypatch.setattr("logics_manager.assist.main", lambda _argv: 0)

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


def test_main_runs_native_flow_new_request(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "skills" / "logics-flow-manager" / "assets" / "templates").mkdir(parents=True)
    (repo_root / "logics" / "skills" / "logics-flow-manager" / "assets" / "templates" / "request.md").write_text(
        "\n".join(
            [
                "## {{DOC_REF}} - {{TITLE}}",
                "> Status: {{STATUS}}",
                "> Schema version: {{SCHEMA_VERSION}}",
                "# Needs",
                "{{NEEDS_PLACEHOLDER}}",
                "# Context",
                "{{CONTEXT_PLACEHOLDER}}",
                "# Acceptance criteria",
                "{{ACCEPTANCE_PLACEHOLDER}}",
                "# AI Context",
                "- Summary: {{AI_SUMMARY_PLACEHOLDER}}",
                "- Keywords: {{AI_KEYWORDS_PLACEHOLDER}}",
                "- Use when: {{AI_USE_WHEN_PLACEHOLDER}}",
                "- Skip when: {{AI_SKIP_WHEN_PLACEHOLDER}}",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.flow._generate_workflow_mermaid", lambda *_args, **_kwargs: "```mermaid\nflowchart LR\nA-->B\n```")
    monkeypatch.setattr("logics_manager.flow.refresh_ai_context_text", lambda text, kind: (text, False))
    monkeypatch.setattr("logics_manager.flow.refresh_workflow_mermaid_signature_text", lambda text, kind, **_kwargs: (text, False))
    monkeypatch.setattr("logics_manager.flow.validate_generated_workflow_doc_text", lambda *_args, **_kwargs: None)

    exit_code = main(["flow", "new", "request", "--title", "Demo Request"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert (repo_root / "logics" / "request" / "req_000_demo_request.md").is_file()
    assert "Created request:" in captured.out


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
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_flow_support_workflow_core._generate_workflow_mermaid", lambda *_args, **_kwargs: "```mermaid\nflowchart LR\nA-->B\n```")
    monkeypatch.setattr("logics_flow_support_workflow_extra._generate_workflow_mermaid", lambda *_args, **_kwargs: "```mermaid\nflowchart LR\nA-->B\n```")
    monkeypatch.setattr("logics_flow_support_workflow_extra.validate_generated_workflow_doc_text", lambda *_args, **_kwargs: None)
    monkeypatch.setattr("logics_manager.flow.validate_generated_workflow_doc_text", lambda *_args, **_kwargs: None)

    exit_code = main(["flow", "promote", "request-to-backlog", str(source_path)])
    captured = capsys.readouterr()

    assert exit_code == 0
    created = repo_root / "logics" / "backlog" / "item_000_demo_request.md"
    assert created.is_file()
    assert "Created backlog slice from request" in captured.out


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
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    def fake_create_backlog(repo_root_arg: Path, source: Path, title: str, args: object) -> SimpleNamespace:
        created = repo_root_arg / "logics" / "backlog" / f"item_999_{title.lower().replace(' ', '_')}.md"
        created.write_text(f"## {created.stem} - {title}\n", encoding="utf-8")
        return SimpleNamespace(ref=created.stem, path=created)

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.flow._create_backlog_from_request", fake_create_backlog)

    exit_code = main(["flow", "split", "request", str(source_path), "--title", "Child A"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert (repo_root / "logics" / "backlog" / "item_999_child_a.md").is_file()
    assert "Split request into 1 backlog item(s)" in captured.out


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
        lambda _repo_root, ref, mode, profile, config=None: {
            "ref": ref,
            "mode": mode,
            "profile": profile,
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
    (repo_root / ".claude" / "commands").mkdir(parents=True)
    (repo_root / ".claude" / "agents").mkdir(parents=True)
    (repo_root / ".claude" / "commands" / "logics-assist.md").write_text("", encoding="utf-8")
    (repo_root / ".claude" / "agents" / "logics-hybrid-delivery-assistant.md").write_text("", encoding="utf-8")
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

    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["assist", "runtime-status"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "Assist runtime status:" in captured.out
    assert "- selected backend:" in captured.out
