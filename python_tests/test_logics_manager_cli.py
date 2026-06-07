from __future__ import annotations

import json
from importlib import metadata as importlib_metadata
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

from logics_manager.config import DEFAULT_LOGICS_CONFIG, load_repo_config, render_config_show
from logics_manager.audit import audit_payload, render_audit
from logics_manager.index import index_payload, render_index
from logics_manager.lint import lint_payload, render_lint
from logics_manager.doctor import doctor_payload, render_doctor
from logics_manager.bootstrap import bootstrap_payload
from logics_manager.cli import main
from logics_manager.flow import PlannedDoc
from logics_manager.insights import followups_payload, health_payload, product_consistency_payload, status_payload


def test_main_prints_help_and_fails_without_command(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main([])

    captured = capsys.readouterr()
    assert exit_code == 1
    assert "Logics Manager CLI" in captured.out
    assert "Common workflows:" in captured.out


def test_main_prints_version_and_exits(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["--version"])

    captured = capsys.readouterr()
    assert exit_code == 0
    version = (Path(__file__).resolve().parents[1] / "VERSION").read_text(encoding="utf-8").strip()
    assert f"logics-manager {version}" in captured.out


def test_main_prints_version_with_short_alias(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["-v"])

    captured = capsys.readouterr()
    assert exit_code == 0
    version = (Path(__file__).resolve().parents[1] / "VERSION").read_text(encoding="utf-8").strip()
    assert f"logics-manager {version}" in captured.out


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

    def fake_run(command: list[str], check: bool) -> subprocess.CompletedProcess[object]:
        recorded["command"] = command
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

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
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["src/app.ts"])
        monkeypatch.setattr("logics_manager.assist.doctor_payload", lambda _repo_root: {"ok": True, "issue_count": 0, "issues": [], "workflow_doc_count": 1, "missing_schema_version_count": 0})
        monkeypatch.setattr("logics_manager.assist.lint_payload", lambda _repo_root, require_status=False: {"ok": True, "issue_count": 0, "warning_count": 0, "issues": [], "warnings": []})
    if argv[:2] == ["assist", "validation-checklist"]:
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["src/app.ts"])
    if argv[:2] == ["assist", "validation-summary"]:
        monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["src/app.ts"])
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
    if argv[:1] == ["self-update"]:
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


def _write_minimal_product_doc(path: Path, *, title: str, status: str, body: str = "") -> None:
    path.write_text(
        "\n".join(
            [
                f"## {path.stem} - {title}",
                "> Date: 2026-06-05",
                f"> Status: {status}",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "> Related architecture: (none yet)",
                "> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.",
                "",
                "# Overview",
                body or "Early product framing without complete lineage yet.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _write_subprocess_json_repo(repo_root: Path) -> None:
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    _write_minimal_lint_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        status="Draft",
        include_progress=False,
    )
    _write_minimal_lint_doc(
        repo_root / "logics" / "backlog" / "item_001_demo.md",
        title="Demo backlog",
        status="Ready",
        include_progress=True,
    )
    _write_minimal_lint_doc(
        repo_root / "logics" / "tasks" / "task_001_demo.md",
        title="Demo task",
        status="Ready",
        include_progress=True,
    )


def _run_logics_manager_subprocess(repo_root: Path, argv: list[str]) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    source_root = Path(__file__).resolve().parents[1]
    env["PYTHONPATH"] = os.pathsep.join([str(source_root), env.get("PYTHONPATH", "")]).rstrip(os.pathsep)
    return subprocess.run(
        [sys.executable, "-m", "logics_manager", *argv],
        cwd=repo_root,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


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


def test_audit_reports_early_companion_mermaid_and_link_gaps_as_warnings(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product brief",
        status="Proposed",
    )

    payload = audit_payload(repo_root, group_by_doc=True)
    output = render_audit(repo_root, group_by_doc=True)

    assert payload["ok"] is True
    assert payload["can_continue"] is True
    assert payload["release_ready"] is False
    assert payload["issue_count"] == 0
    assert payload["warning_count"] == 2
    assert {warning["code"] for warning in payload["warnings"]} == {"companion_doc_missing_mermaid", "companion_doc_missing_primary_link"}
    assert "Workflow audit: OK (warnings)" in output
    assert "WARNING: [companion_doc_missing_mermaid]" in output


def test_strict_audit_blocks_companion_mermaid_and_link_gaps(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "product").mkdir(parents=True)
    _write_minimal_product_doc(
        repo_root / "logics" / "product" / "prod_001_demo.md",
        title="Demo product brief",
        status="Proposed",
    )

    payload = audit_payload(repo_root, governance_profile="strict", group_by_doc=True)

    assert payload["ok"] is False
    assert payload["can_continue"] is False
    assert payload["issue_count"] == 2
    assert payload["warning_count"] == 0
    assert {issue["code"] for issue in payload["issues"]} == {"companion_doc_missing_mermaid", "companion_doc_missing_primary_link"}


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

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "new", "request", "--title", "Demo Request"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert (repo_root / "logics" / "request" / "req_000_demo_request.md").is_file()
    assert "Created request:" in captured.out


def test_flow_new_does_not_overwrite_colliding_planned_ref(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    target_path = repo_root / "logics" / "request" / "req_000_demo_request.md"
    target_path.parent.mkdir(parents=True)
    target_path.write_text("existing content\n", encoding="utf-8")
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        "logics_manager.flow._plan_doc",
        lambda *_args, **_kwargs: PlannedDoc(ref="req_000_demo_request", path=target_path),
    )

    with pytest.raises(SystemExit, match="Ref collision while creating Logics doc"):
        main(["flow", "new", "request", "--title", "Demo Request"])

    assert target_path.read_text(encoding="utf-8") == "existing content\n"


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
    assert len(list((repo_root / "logics" / "backlog").glob("item_*.md"))) == 1
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
    assert "- Product brief(s): `prod_001_demo_product`" in request_text
    assert "`item_001_demo_product`" in request_text
    assert "- none" not in request_text
    assert "- [x] Problem statement is explicit and user impact is clear." in request_text
    assert "`task_001_demo_product`" in backlog_text
    assert "- Primary task(s): `task_001_demo_product`" in backlog_text
    assert "- Product brief(s): `prod_001_demo_product`" in backlog_text
    assert "request-AC3 -> This backlog slice. Proof:" in backlog_text
    assert "- Product brief(s): `prod_001_demo_product`" in task_text
    assert "request-AC3 -> This task. Proof:" in task_text


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
    assert (repo_root / "logics" / "backlog" / "item_001_child_a.md").is_file()
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
    assert "request-AC1 -> This backlog slice. Proof: Deliver demo." in backlog_text
    assert "request-AC1 -> This task. Proof: Deliver demo." in task_text
    assert "`task_001_demo`" in backlog_text
    assert "> Related task: `task_001_demo`" in product_text
    assert "```mermaid" in request_text
    assert "```mermaid" in backlog_text
    assert "```mermaid" in task_text


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
            "--validation",
            "pytest passed",
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
    assert "pytest passed" in (repo_root / "logics" / "tasks" / "task_001_demo_product.md").read_text(encoding="utf-8")


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
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["src/app.ts"])

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
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["src/app.ts", "logics_manager/assist.py"])

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
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["src/app.ts"])
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
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["src/app.ts"])

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
    monkeypatch.setattr("logics_manager.assist._git_changed_paths", lambda _repo_root: ["src/app.ts"])
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
    monkeypatch.setattr("logics_manager.assist._git_range_changed_paths", lambda _repo_root, _since: ["logics/tasks/task_001_demo.md", "logics_manager/assist.py"])
    monkeypatch.setattr("logics_manager.assist._git_range_commits", lambda _repo_root, _since: [{"commit": "abc1234", "subject": "feat: demo"}])

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
    assert "- python3 -m pytest python_tests/test_logics_manager_cli.py -q" in captured.out


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
    assert "python3 -m logics_manager flow finish task" in instructions_text


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


def test_flow_promote_accepts_request_ref_and_emits_clean_json(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    request_path = repo_root / "logics" / "request" / "req_001_demo.md"
    request_path.write_text(
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

    exit_code = main(["flow", "promote", "request-to-backlog", "req_001_demo", "--dry-run", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert captured.err == ""
    assert payload["source"] == "logics/request/req_001_demo.md"
    assert payload["created_path"] == "logics/backlog/item_001_demo_request.md"
    assert not (repo_root / payload["created_path"]).exists()


def test_flow_close_rejects_external_task_before_mutation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    external_task = tmp_path / "task_999_external.md"
    original = "\n".join(
        [
            "## task_999_external - External",
            "> Status: Ready",
            "> From version: 1.0.0",
            "> Schema version: 1.0",
            "> Progress: 0%",
            "# Backlog",
            "- none",
        ]
    ) + "\n"
    external_task.write_text(original, encoding="utf-8")
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit, match="Unsupported source"):
        main(["flow", "close", "task", external_task.as_posix()])

    assert external_task.read_text(encoding="utf-8") == original


def test_flow_close_accepts_task_ref_and_emits_clean_json(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    task_path.write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Ready",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "> Progress: 0%",
                "# Backlog",
                "- none",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "close", "task", "task_001_demo", "--dry-run", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert payload == {
        "command": "close",
        "dry_run": True,
        "kind": "task",
        "source": "logics/tasks/task_001_demo.md",
    }
    assert "> Status: Ready" in task_path.read_text(encoding="utf-8")


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


def test_sync_outside_output_is_rejected_even_in_dry_run(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr(
        "logics_manager.sync._build_context_pack",
        lambda _repo_root, ref, mode, profile, config=None: {
            "ref": ref,
            "mode": mode,
            "profile": profile,
            "estimates": {"doc_count": 0, "char_count": 0},
            "docs": [],
            "changed_paths": [],
            "budgets": {"max_docs": 0},
        },
    )

    with pytest.raises(SystemExit, match="Unsupported --out path"):
        main(["sync", "context-pack", "req_001_demo", "--out", "../ctx.json", "--dry-run"])

    assert not (tmp_path / "ctx.json").exists()


def test_assist_outside_output_is_rejected_even_in_dry_run(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "logics-repo"
    repo_root.mkdir()
    (repo_root / "logics").mkdir()
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    monkeypatch.setattr("logics_manager.assist.find_repo_root", lambda _cwd: repo_root)

    with pytest.raises(SystemExit, match="Unsupported --out path"):
        main(["assist", "runtime-status", "--out", "../runtime.json", "--dry-run"])

    assert not (tmp_path / "runtime.json").exists()


def test_sync_close_eligible_requests_json_is_clean(
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

    exit_code = main(["sync", "close-eligible-requests", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert payload["closed"] == 1
    assert payload["scanned"] == 1


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
