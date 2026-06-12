from __future__ import annotations

import json
from importlib import metadata as importlib_metadata
import os
import subprocess
import sys
import tempfile
import threading
from http.client import HTTPConnection
from pathlib import Path

import pytest

from logics_manager.config import DEFAULT_LOGICS_CONFIG, load_repo_config, render_config_show
from logics_manager.audit import audit_payload, render_audit
from logics_manager.index import index_payload, render_index
from logics_manager.lint import lint_payload, render_lint
from logics_manager.doctor import doctor_payload, render_doctor
from logics_manager.bootstrap import bootstrap_payload
from logics_manager.cli import main
from logics_manager.flow import PlannedDoc, closeout_payload, validate_closeout_payload
from logics_manager.insights import followups_payload, health_payload, product_consistency_payload, status_payload
from logics_manager import viewer as viewer_module
from logics_manager.viewer import (
    build_viewer_url,
    cdx_mission_apply_plan_payload,
    cdx_mission_plan_payload,
    cdx_mission_run_payload,
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
    workspace_preview_payload,
    workspace_tree_payload,
)
from logics_manager.update_check import get_update_info, is_newer_version
from flow_fixtures import write_ac_traceability_chain


def create_viewer_server_or_skip(repo_root: Path):
    try:
        return create_viewer_server(repo_root, host="127.0.0.1", port=0)
    except PermissionError as exc:
        pytest.skip(f"local socket bind unavailable in this environment: {exc}")


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
    version = (Path(__file__).resolve().parents[2] / "VERSION").read_text(encoding="utf-8").strip()
    assert f"logics-manager {version}" in captured.out


def test_main_prints_version_with_short_alias(capsys: pytest.CaptureFixture[str]) -> None:
    exit_code = main(["-v"])

    captured = capsys.readouterr()
    assert exit_code == 0
    version = (Path(__file__).resolve().parents[2] / "VERSION").read_text(encoding="utf-8").strip()
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


def test_update_check_compares_versions_and_uses_cache(tmp_path: Path) -> None:
    cache_path = tmp_path / "update-check.json"
    calls = 0

    def fetch_latest() -> str:
        nonlocal calls
        calls += 1
        return "2.3.0"

    assert is_newer_version("2.3.0", "2.2.0") is True
    assert is_newer_version("2.2.0", "2.2.0") is False
    first = get_update_info("2.2.0", cache_path=cache_path, now=100, fetch_latest=fetch_latest)
    second = get_update_info("2.2.0", cache_path=cache_path, now=200, fetch_latest=lambda: "9.9.9")

    assert first.update_available is True
    assert first.latest_version == "2.3.0"
    assert second.latest_version == "2.3.0"
    assert calls == 1


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


def test_viewer_collects_items_with_relationships(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    _write_minimal_workflow_doc(
        repo_root / "logics" / "request" / "req_001_demo.md",
        title="Demo request",
        kind="request",
        status="Ready",
        links=[],
    )
    backlog_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    _write_minimal_workflow_doc(
        backlog_path,
        title="Demo backlog",
        kind="backlog",
        status="Ready",
        links=["logics/request/req_001_demo.md"],
    )
    backlog_path.write_text(
        backlog_path.read_text(encoding="utf-8") + "\nPromoted from `logics/request/req_001_demo.md`\n",
        encoding="utf-8",
    )

    items = collect_viewer_items(repo_root)

    request = next(item for item in items if item["id"] == "req_001_demo")
    backlog = next(item for item in items if item["id"] == "item_001_demo")
    assert request["isPromoted"] is True
    assert request["usedBy"][0]["id"] == "item_001_demo"
    assert backlog["references"][0]["path"] == "logics/request/req_001_demo.md"


def test_viewer_current_version_falls_back_to_installed_metadata(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(viewer_module, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(viewer_module.metadata, "version", lambda _name: "2.5.0")

    assert viewer_module._current_version() == "2.5.0"


def test_viewer_read_doc_rejects_paths_outside_repo(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    doc_path = repo_root / "logics" / "request" / "req_001_demo.md"
    doc_path.write_text("## req_001_demo - Demo\n", encoding="utf-8")

    payload = read_doc_payload(repo_root, "logics/request/req_001_demo.md")

    assert payload["path"] == "logics/request/req_001_demo.md"
    assert "Demo" in payload["content"]
    with pytest.raises(ValueError):
        read_doc_payload(repo_root, "../outside.md")


def test_viewer_edit_doc_launches_system_editor_for_repo_file(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    doc_path = repo_root / "logics" / "request" / "req_001_demo.md"
    doc_path.write_text("## req_001_demo - Demo\n", encoding="utf-8")
    launched: list[list[str]] = []

    payload = edit_doc_payload(repo_root, "logics/request/req_001_demo.md", launcher=launched.append)

    assert payload["path"] == "logics/request/req_001_demo.md"
    assert launched
    assert launched[0][-1] == str(doc_path)
    with pytest.raises(ValueError):
        edit_doc_payload(repo_root, "../outside.md", launcher=launched.append)


def test_viewer_open_file_launches_system_editor_for_repo_and_absolute_files(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    repo_file = repo_root / "logics.log"
    repo_file.write_text("repo log\n", encoding="utf-8")
    external_file = tmp_path / "cdx-run.log"
    external_file.write_text("external log\n", encoding="utf-8")
    launched: list[list[str]] = []

    relative_payload = open_file_payload(repo_root, "logics.log", launcher=launched.append)
    absolute_payload = open_file_payload(repo_root, str(external_file), launcher=launched.append)

    assert relative_payload["path"] == str(repo_file)
    assert absolute_payload["path"] == str(external_file)
    assert launched[0][-1] == str(repo_file)
    assert launched[1][-1] == str(external_file)
    with pytest.raises(FileNotFoundError):
        open_file_payload(repo_root, str(tmp_path / "missing.log"), launcher=launched.append)


def test_viewer_file_preview_reads_repo_and_absolute_files_with_truncation(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    repo_file = repo_root / "logics.log"
    repo_file.write_text("abcdef", encoding="utf-8")
    external_file = tmp_path / "cdx-run.log"
    external_file.write_text("external log\n", encoding="utf-8")

    relative_payload = file_preview_payload(repo_root, "logics.log", max_bytes=3, max_chars=10)
    absolute_payload = file_preview_payload(repo_root, str(external_file))

    assert relative_payload["path"] == str(repo_file)
    assert relative_payload["name"] == "logics.log"
    assert relative_payload["content"] == "def"
    assert relative_payload["truncated"] is True
    assert absolute_payload["path"] == str(external_file)
    assert "external log" in absolute_payload["content"]
    with pytest.raises(FileNotFoundError):
        file_preview_payload(repo_root, str(tmp_path / "missing.log"))


def test_viewer_file_preview_truncates_to_latest_characters(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    repo_file = repo_root / "logics.log"
    repo_file.write_text("first line\nmiddle line\nlatest line\n", encoding="utf-8")

    payload = file_preview_payload(repo_root, "logics.log", max_bytes=100, max_chars=12)

    assert payload["content"].replace("\r\n", "\n").endswith("atest line\n")
    assert payload["truncated"] is True


def test_viewer_workspace_tree_is_root_bounded_and_ignores_heavy_dirs(tmp_path: Path) -> None:
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "app.py").write_text("print('ok')\n", encoding="utf-8")
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "pkg.js").write_text("ignored\n", encoding="utf-8")

    root_payload = workspace_tree_payload(tmp_path)
    src_payload = workspace_tree_payload(tmp_path, "src")

    assert root_payload["state"] == "ok"
    names = {entry["name"]: entry for entry in root_payload["entries"]}
    assert names["src"]["kind"] == "directory"
    assert names["node_modules"]["ignored"] is True
    assert names["node_modules"]["childrenAvailable"] is False
    assert src_payload["entries"][0]["path"] == "src/app.py"
    with pytest.raises(ValueError):
        workspace_tree_payload(tmp_path, "../outside")


def test_viewer_workspace_preview_reports_text_directory_binary_and_large_files(tmp_path: Path) -> None:
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "app.py").write_text("print('ok')\n", encoding="utf-8")
    (tmp_path / "binary.dat").write_bytes(b"abc\x00def")
    (tmp_path / "large.txt").write_text("x" * 20, encoding="utf-8")

    directory = workspace_preview_payload(tmp_path, "src")
    text = workspace_preview_payload(tmp_path, "src/app.py")
    binary = workspace_preview_payload(tmp_path, "binary.dat")
    large = workspace_preview_payload(tmp_path, "large.txt", max_bytes=10)

    assert directory["state"] == "directory"
    assert directory["childrenAvailable"] is True
    assert text["state"] == "ok"
    assert text["path"] == "src/app.py"
    assert "print" in text["content"]
    assert binary["state"] == "unsupported"
    assert large["state"] == "oversized"
    with pytest.raises(ValueError):
        workspace_preview_payload(tmp_path, "../outside.md")


def test_viewer_repository_shortcuts_resolve_github_and_open_folder(tmp_path: Path) -> None:
    launched: list[list[str]] = []

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(
                args,
                0,
                "\n".join(
                    [
                        "backup\tgit@gitlab.com:example/ignored.git (fetch)",
                        "origin\tgit@github.com:AlexAgo83/logics-manager.git (fetch)",
                        "origin\tgit@github.com:AlexAgo83/logics-manager.git (push)",
                    ]
                ),
                "",
            )
        raise AssertionError(args)

    assert github_repo_url(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git") == "https://github.com/AlexAgo83/logics-manager"

    payload = open_repo_folder_payload(tmp_path, launcher=launched.append)

    assert payload["path"] == str(tmp_path.resolve())
    assert launched
    assert launched[0][-1] == str(tmp_path.resolve())


def test_viewer_repository_shortcuts_hide_non_github_remotes(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@gitlab.com:example/repo.git (fetch)\n", "")
        raise AssertionError(args)

    assert github_repo_url(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git") == ""
    assert github_repo_url(tmp_path, which=lambda _name: None) == ""


def test_viewer_ci_status_payload_hides_without_github_actions(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        raise AssertionError(args)

    payload = ci_status_payload(tmp_path, git_runner=runner, which=lambda name: "/usr/bin/tool" if name == "git" else None)

    assert payload["state"] == "hidden"
    assert payload["visible"] is False
    assert payload["message"] == "No GitHub Actions workflows detected."


def test_viewer_ci_status_payload_reports_unavailable_without_gh(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "ci.yml").write_text("name: CI\n", encoding="utf-8")

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        raise AssertionError(args)

    payload = ci_status_payload(tmp_path, git_runner=runner, which=lambda name: "/usr/bin/git" if name == "git" else None)

    assert payload["state"] == "unavailable"
    assert payload["visible"] is True
    assert payload["badgeState"] == "unavailable"
    assert payload["repositoryUrl"] == "https://github.com/Example/repo"


def test_viewer_ci_status_payload_reads_github_actions_runs(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "ci.yml").write_text("name: CI\n", encoding="utf-8")
    gh_calls: list[list[str]] = []

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        if args[1:] == ["rev-parse", "--abbrev-ref", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "feature/demo\n", "")
        if args[1:] == ["rev-parse", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "abc123\n", "")
        if args[1:] == ["log", "-1", "--pretty=format:%s"]:
            return subprocess.CompletedProcess(args, 0, "Implement CI view", "")
        if args[1:] == ["log", "-1", "--pretty=format:%an"]:
            return subprocess.CompletedProcess(args, 0, "Alex", "")
        raise AssertionError(args)

    def gh_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        gh_calls.append(args)
        if args[:2] == ["gh", "api"] and args[2].startswith("repos/Example/repo/actions/runs?"):
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps(
                    {
                        "workflow_runs": [
                            {
                                "id": 42,
                                "name": "CI",
                                "status": "completed",
                                "conclusion": "failure",
                                "head_branch": "feature/demo",
                                "head_sha": "abc123",
                                "event": "push",
                                "html_url": "https://github.com/Example/repo/actions/runs/42",
                                "created_at": "2026-06-11T10:00:00Z",
                                "updated_at": "2026-06-11T10:03:00Z",
                                "run_started_at": "2026-06-11T10:01:00Z",
                                "head_commit": {"message": "Implement CI view\n\nbody", "author": {"name": "Alex"}},
                            }
                        ]
                    }
                ),
                "",
            )
        if args[:2] == ["gh", "api"] and args[2] == "repos/Example/repo/actions/runs/42/jobs?per_page=100":
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps({"jobs": [{"name": "test", "status": "completed", "conclusion": "failure", "html_url": "https://github.com/Example/repo/actions/runs/42/job/1"}]}),
                "",
            )
        raise AssertionError(args)

    payload = ci_status_payload(
        tmp_path,
        git_runner=git_runner,
        gh_runner=gh_runner,
        which=lambda name: f"/usr/bin/{name}" if name in {"git", "gh"} else None,
    )

    assert payload["state"] == "ok"
    assert payload["visible"] is True
    assert payload["branch"] == "feature/demo"
    assert payload["headSha"] == "abc123"
    assert payload["badgeState"] == "failing"
    assert payload["run"]["matchSource"] == "head-failing"
    assert payload["run"]["commitMessage"] == "Implement CI view"
    assert payload["jobs"] == [{"name": "test", "status": "completed", "conclusion": "failure", "htmlUrl": "https://github.com/Example/repo/actions/runs/42/job/1", "startedAt": "", "completedAt": ""}]
    assert ["gh", "api", "repos/Example/repo/actions/runs?per_page=30&branch=feature%2Fdemo"] in gh_calls


def test_viewer_ci_status_payload_prioritizes_active_head_runs(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "ci.yml").write_text("name: CI\n", encoding="utf-8")

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        if args[1:] == ["rev-parse", "--abbrev-ref", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "main\n", "")
        if args[1:] == ["rev-parse", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "abc123\n", "")
        if args[1:] == ["log", "-1", "--pretty=format:%s"]:
            return subprocess.CompletedProcess(args, 0, "Update release notes", "")
        if args[1:] == ["log", "-1", "--pretty=format:%an"]:
            return subprocess.CompletedProcess(args, 0, "Alex", "")
        raise AssertionError(args)

    def gh_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[:2] == ["gh", "api"] and args[2].startswith("repos/Example/repo/actions/runs?"):
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps(
                    {
                        "workflow_runs": [
                            {"id": 41, "name": "lint", "status": "completed", "conclusion": "success", "head_branch": "main", "head_sha": "abc123"},
                            {"id": 42, "name": "test", "status": "in_progress", "conclusion": None, "head_branch": "main", "head_sha": "abc123"},
                        ]
                    }
                ),
                "",
            )
        if args[:2] == ["gh", "api"] and args[2] == "repos/Example/repo/actions/runs/42/jobs?per_page=100":
            return subprocess.CompletedProcess(args, 0, json.dumps({"jobs": [{"name": "test", "status": "in_progress"}]}), "")
        raise AssertionError(args)

    payload = ci_status_payload(
        tmp_path,
        git_runner=git_runner,
        gh_runner=gh_runner,
        which=lambda name: f"/usr/bin/{name}" if name in {"git", "gh"} else None,
    )

    assert payload["badgeState"] == "running"
    assert payload["run"]["id"] == 42
    assert payload["run"]["matchSource"] == "head-active"
    assert payload["jobs"] == [{"name": "test", "status": "in_progress", "conclusion": "", "htmlUrl": "", "startedAt": "", "completedAt": ""}]


def test_viewer_ci_status_payload_prioritizes_failed_head_runs_over_successful_dynamic_runs(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "ci.yml").write_text("name: CI\n", encoding="utf-8")

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        if args[1:] == ["rev-parse", "--abbrev-ref", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "main\n", "")
        if args[1:] == ["rev-parse", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "abc123\n", "")
        if args[1:] == ["log", "-1", "--pretty=format:%s"]:
            return subprocess.CompletedProcess(args, 0, "Update release notes", "")
        if args[1:] == ["log", "-1", "--pretty=format:%an"]:
            return subprocess.CompletedProcess(args, 0, "Alex", "")
        raise AssertionError(args)

    def gh_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[:2] == ["gh", "api"] and args[2].startswith("repos/Example/repo/actions/runs?"):
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps(
                    {
                        "workflow_runs": [
                            {"id": 41, "name": "Dependency Graph", "status": "completed", "conclusion": "success", "event": "dynamic", "head_branch": "main", "head_sha": "abc123"},
                            {"id": 42, "name": "CI", "status": "completed", "conclusion": "failure", "event": "push", "head_branch": "main", "head_sha": "abc123"},
                        ]
                    }
                ),
                "",
            )
        if args[:2] == ["gh", "api"] and args[2] == "repos/Example/repo/actions/runs/42/jobs?per_page=100":
            return subprocess.CompletedProcess(args, 0, json.dumps({"jobs": [{"name": "validate", "status": "completed", "conclusion": "failure"}]}), "")
        raise AssertionError(args)

    payload = ci_status_payload(
        tmp_path,
        git_runner=git_runner,
        gh_runner=gh_runner,
        which=lambda name: f"/usr/bin/{name}" if name in {"git", "gh"} else None,
    )

    assert payload["badgeState"] == "failing"
    assert payload["run"]["id"] == 42
    assert payload["run"]["matchSource"] == "head-failing"
    assert payload["run"]["workflowName"] == "CI"


def test_viewer_ci_status_payload_uses_latest_branch_ci_when_head_is_unpushed(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "ci.yml").write_text("name: CI\n", encoding="utf-8")

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        if args[1:] == ["rev-parse", "--abbrev-ref", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "main\n", "")
        if args[1:] == ["rev-parse", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "localhead\n", "")
        if args[1:] == ["log", "-1", "--pretty=format:%s"]:
            return subprocess.CompletedProcess(args, 0, "Local unpushed work", "")
        if args[1:] == ["log", "-1", "--pretty=format:%an"]:
            return subprocess.CompletedProcess(args, 0, "Alex", "")
        raise AssertionError(args)

    def gh_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[:2] == ["gh", "api"] and args[2].startswith("repos/Example/repo/actions/runs?"):
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps(
                    {
                        "workflow_runs": [
                            {"id": 45, "name": "CI", "status": "completed", "conclusion": "success", "event": "push", "head_branch": "main", "head_sha": "remotehead"},
                            {"id": 44, "name": "Push on main", "status": "completed", "conclusion": "success", "event": "dynamic", "head_branch": "main", "head_sha": "remotehead"},
                            {"id": 42, "name": "CI", "status": "completed", "conclusion": "failure", "event": "push", "head_branch": "main", "head_sha": "olderhead"},
                        ]
                    }
                ),
                "",
            )
        if args[:2] == ["gh", "api"] and args[2] == "repos/Example/repo/actions/runs/45/jobs?per_page=100":
            return subprocess.CompletedProcess(args, 0, json.dumps({"jobs": [{"name": "validate", "status": "completed", "conclusion": "success"}]}), "")
        raise AssertionError(args)

    payload = ci_status_payload(
        tmp_path,
        git_runner=git_runner,
        gh_runner=gh_runner,
        which=lambda name: f"/usr/bin/{name}" if name in {"git", "gh"} else None,
    )

    assert payload["badgeState"] == "passing"
    assert payload["run"]["id"] == 45
    assert payload["run"]["matchSource"] == "branch-latest"


def test_viewer_git_status_payload_reports_clean_and_dirty_states(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        if args[1:] == ["rev-parse", "--is-inside-work-tree"]:
            return subprocess.CompletedProcess(args, 0, "true\n", "")
        if args[1:] == ["status", "--porcelain=v1", "-b"]:
            return subprocess.CompletedProcess(
                args,
                0,
                "\n".join(
                    [
                        "## main...origin/main [ahead 2, behind 1]",
                        "M  staged.md",
                        " M modified.md",
                        " D deleted.md",
                        "R  old.md -> renamed.md",
                        "?? untracked.md",
                    ]
                ),
                "",
            )
        if args[1:] == ["diff", "--no-ext-diff", "--numstat", "--cached"]:
            return subprocess.CompletedProcess(args, 0, "3\t1\tstaged.md\n0\t2\trenamed.md\n", "")
        if args[1:] == ["diff", "--no-ext-diff", "--numstat"]:
            return subprocess.CompletedProcess(args, 0, "5\t0\tmodified.md\n0\t4\tdeleted.md\n", "")
        if args[1:] == ["log", "-1", "--pretty=format:%h %s"]:
            return subprocess.CompletedProcess(args, 0, "abc1234 latest commit", "")
        if args[1:] == ["log", "-51", "--date=short", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"]:
            return subprocess.CompletedProcess(
                args,
                0,
                "abc1234\x1flatest commit\x1fAlex\x1f2026-06-09\x1fHEAD -> main, tag: v2.4.0\n"
                "def5678\x1fprevious commit\x1fSam\x1f2026-06-08\x1forigin/main",
                "",
            )
        if args[1:] == ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]:
            return subprocess.CompletedProcess(args, 0, "origin/main\n", "")
        if args[1:] == ["rev-list", "--count", "@{u}..HEAD"]:
            return subprocess.CompletedProcess(args, 0, "2\n", "")
        raise AssertionError(args)

    payload = git_status_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git")

    assert payload["state"] == "ok"
    assert payload["branch"] == "main"
    assert payload["tracking"] == "origin/main"
    assert payload["ahead"] == 2
    assert payload["behind"] == 1
    assert payload["clean"] is False
    assert payload["counts"] == {"staged": 1, "modified": 1, "deleted": 1, "renamed": 1, "untracked": 1}
    assert payload["badgeCounts"] == {"unpushedCommits": 2, "uncommittedFiles": 5}
    assert payload["badgeAvailability"] == {"unpushedCommits": True, "uncommittedFiles": True}
    assert payload["badgeMessages"] == {"unpushedCommits": "", "uncommittedFiles": ""}
    assert payload["groups"]["renamed"][0] == {"path": "renamed.md", "from": "old.md", "logicsType": "", "additions": 0, "deletions": 2}
    assert payload["groups"]["modified"][0]["logicsType"] == ""
    assert payload["groups"]["modified"][0]["additions"] == 5
    assert payload["groups"]["modified"][0]["deletions"] == 0
    assert payload["groups"]["staged"][0]["additions"] == 3
    assert payload["groups"]["staged"][0]["deletions"] == 1
    assert payload["latestCommit"] == "abc1234 latest commit"
    assert payload["recentCommits"] == [
        {"hash": "abc1234", "subject": "latest commit", "author": "Alex", "date": "2026-06-09", "refs": "HEAD -> main, tag: v2.4.0"},
        {"hash": "def5678", "subject": "previous commit", "author": "Sam", "date": "2026-06-08", "refs": "origin/main"},
    ]
    assert payload["recentCommitsHasMore"] is False
    assert ["git", "status", "--porcelain=v1", "-b"] in calls
    assert ["git", "rev-list", "--count", "@{u}..HEAD"] in calls
    assert ["git", "log", "-51", "--date=short", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"] in calls
    assert not any("push" in call or "fetch" in call or "pull" in call for call in calls for _ in [call])


def test_viewer_git_status_payload_marks_logics_doc_types(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["rev-parse", "--is-inside-work-tree"]:
            return subprocess.CompletedProcess(args, 0, "true\n", "")
        if args[1:] == ["status", "--porcelain=v1", "-b"]:
            return subprocess.CompletedProcess(
                args,
                0,
                "\n".join(
                    [
                        "## main",
                        " M logics/request/req_001_demo.md",
                        "A  logics/tasks/task_001_demo.md",
                        "?? logics/product/prod_001_demo.md",
                    ]
                ),
                "",
            )
        if args[1:] == ["diff", "--no-ext-diff", "--numstat", "--cached"]:
            return subprocess.CompletedProcess(args, 0, "", "")
        if args[1:] == ["diff", "--no-ext-diff", "--numstat"]:
            return subprocess.CompletedProcess(args, 0, "", "")
        if args[1:] == ["log", "-1", "--pretty=format:%h %s"]:
            return subprocess.CompletedProcess(args, 0, "", "")
        if args[1:] == ["log", "-51", "--date=short", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"]:
            return subprocess.CompletedProcess(args, 0, "", "")
        if args[1:] == ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]:
            return subprocess.CompletedProcess(args, 128, "", "fatal: no upstream configured")
        raise AssertionError(args)

    payload = git_status_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git")

    assert payload["groups"]["modified"][0]["logicsType"] == "request"
    assert payload["groups"]["staged"][0]["logicsType"] == "task"
    assert payload["groups"]["untracked"][0]["logicsType"] == "product"
    assert payload["badgeCounts"]["unpushedCommits"] == 0
    assert payload["badgeCounts"]["uncommittedFiles"] == 3
    assert payload["badgeAvailability"]["unpushedCommits"] is False
    assert payload["badgeMessages"]["unpushedCommits"] == "No upstream branch detected."


def test_viewer_git_status_payload_marks_history_as_open_ended_after_display_limit(tmp_path: Path) -> None:
    commit_lines = "\n".join(
        f"c{index:02d}\x1fCommit {index}\x1fAlex\x1f2026-06-09\x1f"
        for index in range(1, 52)
    )

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["rev-parse", "--is-inside-work-tree"]:
            return subprocess.CompletedProcess(args, 0, "true\n", "")
        if args[1:] == ["status", "--porcelain=v1", "-b"]:
            return subprocess.CompletedProcess(args, 0, "## main", "")
        if args[1:] == ["diff", "--no-ext-diff", "--numstat", "--cached"]:
            return subprocess.CompletedProcess(args, 0, "", "")
        if args[1:] == ["diff", "--no-ext-diff", "--numstat"]:
            return subprocess.CompletedProcess(args, 0, "", "")
        if args[1:] == ["log", "-1", "--pretty=format:%h %s"]:
            return subprocess.CompletedProcess(args, 0, "c01 Commit 1", "")
        if args[1:] == ["log", "-51", "--date=short", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"]:
            return subprocess.CompletedProcess(args, 0, commit_lines, "")
        if args[1:] == ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]:
            return subprocess.CompletedProcess(args, 128, "", "fatal: no upstream configured")
        raise AssertionError(args)

    payload = git_status_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git")

    assert len(payload["recentCommits"]) == 50
    assert payload["recentCommits"][-1]["hash"] == "c50"
    assert payload["recentCommitsHasMore"] is True


def test_viewer_git_diff_payload_is_read_only_bounded_and_path_safe(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        if args[1:] == ["rev-parse", "--is-inside-work-tree"]:
            return subprocess.CompletedProcess(args, 0, "true\n", "")
        if args[1:] == ["diff", "--no-ext-diff", "--unified=80", "--cached", "--", "logics/request/req_001_demo.md"]:
            return subprocess.CompletedProcess(args, 0, "diff --git a/logics/request/req_001_demo.md b/logics/request/req_001_demo.md\n+" + ("x" * 20), "")
        raise AssertionError(args)

    payload = git_diff_payload(
        tmp_path,
        "logics/request/req_001_demo.md",
        cached=True,
        max_chars=32,
        runner=runner,
        which=lambda _name: "/usr/bin/git",
    )

    assert payload["state"] == "ok"
    assert payload["mode"] == "staged"
    assert payload["path"] == "logics/request/req_001_demo.md"
    assert payload["logicsType"] == "request"
    assert payload["truncated"] is True
    assert len(payload["diff"]) == 32
    assert ["git", "diff", "--no-ext-diff", "--unified=80", "--cached", "--", "logics/request/req_001_demo.md"] in calls
    assert not any("push" in call or "fetch" in call or "pull" in call for call in calls for _ in [call])
    assert git_diff_payload(tmp_path, "../outside.md", which=lambda _name: "/usr/bin/git")["state"] == "error"


def test_viewer_git_file_preview_payload_is_read_only_bounded_and_path_safe(tmp_path: Path) -> None:
    target = tmp_path / "logics" / "request" / "req_001_demo.md"
    target.parent.mkdir(parents=True)
    target.write_bytes(b"## req_001_demo - Demo\r\nPreview body\r\n")

    payload = git_file_preview_payload(tmp_path, "logics/request/req_001_demo.md", max_chars=24)

    assert payload["state"] == "ok"
    assert payload["path"] == "logics/request/req_001_demo.md"
    assert payload["mode"] == "file-preview"
    assert payload["logicsType"] == "request"
    assert payload["truncated"] is True
    assert payload["content"] == "## req_001_demo - Demo\nP"
    assert git_file_preview_payload(tmp_path, "../outside.md")["state"] == "error"


def test_viewer_git_file_preview_payload_reports_missing_binary_and_oversized(tmp_path: Path) -> None:
    binary = tmp_path / "binary.dat"
    binary.write_bytes(b"abc\x00def")
    oversized = tmp_path / "large.txt"
    oversized.write_text("x" * 20, encoding="utf-8")

    missing = git_file_preview_payload(tmp_path, "missing.md")
    unsupported = git_file_preview_payload(tmp_path, "binary.dat")
    too_large = git_file_preview_payload(tmp_path, "large.txt", max_bytes=10)

    assert missing["state"] == "missing"
    assert "missing or deleted" in missing["message"]
    assert unsupported["state"] == "unsupported"
    assert "Binary" in unsupported["message"]
    assert too_large["state"] == "oversized"
    assert "limited to 10 bytes" in too_large["message"]


def test_viewer_git_status_payload_handles_unavailable_non_repo_and_errors(tmp_path: Path) -> None:
    assert git_status_payload(tmp_path, which=lambda _name: None)["state"] == "unavailable"

    def non_repo(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 128, "", "not a git repository")

    assert git_status_payload(tmp_path, runner=non_repo, which=lambda _name: "/usr/bin/git")["state"] == "not-repository"

    def failing_status(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["rev-parse", "--is-inside-work-tree"]:
            return subprocess.CompletedProcess(args, 0, "true\n", "")
        return subprocess.CompletedProcess(args, 1, "", "fatal: bad revision")

    payload = git_status_payload(tmp_path, runner=failing_status, which=lambda _name: "/usr/bin/git")
    assert payload["state"] == "error"
    assert "fatal: bad revision" in payload["message"]


def test_viewer_cdx_status_payload_reports_structured_status(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        assert kwargs["cwd"] == tmp_path
        assert kwargs["timeout"] == 5
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps(
                    {
                        "availability": "ready",
                        "providers": [{"name": "openai", "state": "ready"}],
                        "sessions": [{"id": "session-1", "status": "active"}],
                        "nextCommands": ["cdx status", "cdx session list"],
                    }
                ),
                "",
            )
        raise AssertionError(args)

    payload = cdx_status_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload["state"] == "ok"
    assert payload["message"] == ""
    assert payload["status"]["availability"] == "ready"
    assert payload["status"]["providers"][0]["name"] == "openai"
    assert calls == [["cdx", "status", "--json"]]


def test_viewer_cdx_status_payload_handles_unavailable_timeout_errors_and_invalid_json(tmp_path: Path) -> None:
    assert cdx_status_payload(tmp_path, which=lambda _name: None)["state"] == "unavailable"

    def timeout_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        raise subprocess.TimeoutExpired(args, 5)

    assert cdx_status_payload(tmp_path, runner=timeout_runner, which=lambda _name: "/usr/bin/cdx")["state"] == "timeout"

    def failing_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 2, "", "cdx auth expired")

    failed = cdx_status_payload(tmp_path, runner=failing_runner, which=lambda _name: "/usr/bin/cdx")
    assert failed["state"] == "error"
    assert failed["message"] == "cdx auth expired"

    def invalid_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 0, "{not-json", "")

    assert cdx_status_payload(tmp_path, runner=invalid_runner, which=lambda _name: "/usr/bin/cdx")["state"] == "invalid-json"

    def array_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 0, "[]", "")

    assert cdx_status_payload(tmp_path, runner=array_runner, which=lambda _name: "/usr/bin/cdx")["state"] == "invalid-json"


def test_viewer_cdx_runs_payload_reads_observable_runs(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        assert args[-2:] == ["runs", "--json"]
        return subprocess.CompletedProcess(args, 0, json.dumps({
            "ok": True,
            "runs": [
                {"run_id": "run-1", "kind": "code-review", "status": "running", "session": "work"},
                {"run_id": "run-2", "kind": "assistant", "status": "succeeded", "session": "auto"},
            ],
        }), "")

    payload = cdx_runs_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload["state"] == "ok"
    assert [run["run_id"] for run in payload["runs"]] == ["run-1", "run-2"]


def test_viewer_cdx_runs_payload_handles_unavailable_and_invalid_json(tmp_path: Path) -> None:
    assert cdx_runs_payload(tmp_path, which=lambda _name: None)["state"] == "unavailable"

    def invalid_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 0, "{}", "")

    assert cdx_runs_payload(tmp_path, runner=invalid_runner, which=lambda _name: "/usr/bin/cdx")["state"] == "invalid-json"


def test_viewer_cdx_run_report_payload_reads_report(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        assert args[-3:] == ["run-report", "run-1", "--json"]
        return subprocess.CompletedProcess(args, 0, json.dumps({
            "ok": True,
            "report": {
                "run": {"run_id": "run-1", "status": "succeeded"},
                "task_report": {"kind": "code-review", "summary": "One issue.", "findings": []},
            },
        }), "")

    payload = cdx_run_report_payload(tmp_path, "run-1", runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload["state"] == "ok"
    assert payload["report"]["run"]["run_id"] == "run-1"
    assert payload["report"]["task_report"]["kind"] == "code-review"


def test_viewer_cdx_run_report_payload_extracts_mission_output(tmp_path: Path) -> None:
    output_path = tmp_path / "cdx-run.out"
    output_path.write_text(
        json.dumps({
            "summary": "Prepared release metadata.",
            "validationEvidence": ["npm test"],
            "generatedFiles": [{"path": "changelogs/CHANGELOGS_2_8_0.md"}],
        }),
        encoding="utf-8",
    )

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        assert args[-3:] == ["run-report", "run-1", "--json"]
        return subprocess.CompletedProcess(args, 0, json.dumps({
            "ok": True,
            "report": {
                "run": {"run_id": "run-1", "status": "succeeded", "kind": "assistant"},
                "artifacts": {"stdout_path": str(output_path)},
                "task_report": {"kind": "assistant", "summary": "Pre-release done.", "findings": []},
            },
        }), "")

    payload = cdx_run_report_payload(tmp_path, "run-1", runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload["state"] == "ok"
    assert payload["report"]["missionOutput"]["summary"] == "Prepared release metadata."
    assert payload["report"]["missionOutput"]["generatedFiles"] == [{"path": "changelogs/CHANGELOGS_2_8_0.md"}]


def test_viewer_cdx_mission_plan_builds_release_review_from_latest_tag(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:4] == ["tag", "--sort=-version:refname", "--list"]:
            return subprocess.CompletedProcess(args, 0, "v2.4.0\nv2.3.0\n", "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "release-review", "sessionId": "work", "strengthId": "deep"},
        cdx_runner=cdx_runner,
        git_runner=git_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["releaseTag"] == "v2.4.0"
    command = payload["plan"]["command"]
    assert command[:4] == ["cdx", "run", "work", "--cwd"]
    assert command[4] == str(tmp_path)
    assert "--session" not in command
    assert "--mission" not in command
    assert "--scope" not in command
    assert "--prompt" in command
    assert "--json" in command
    prompt = command[command.index("--prompt") + 1]
    assert "since the latest release tag v2.4.0" in prompt
    assert command[command.index("--reasoning-effort") + 1] == "high"
    assert command[command.index("--power") + 1] == "high"
    assert command[command.index("--timeout-seconds") + 1] == "300"


def test_viewer_cdx_mission_plan_rejects_unknown_strength_and_unusable_session(tmp_path: Path) -> None:
    assert cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "full-audit", "sessionId": "work", "strengthId": "turbo"},
        which=lambda name: f"/usr/bin/{name}",
    )["state"] == "error"

    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "known"}]}), "")

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "full-audit", "sessionId": "outside;rm", "strengthId": "standard"},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["sessionId"] == "known"


def test_viewer_cdx_mission_run_executes_known_template_and_extracts_usage(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def cdx_runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        assert kwargs["timeout"] == 270
        assert args[:4] == ["cdx", "run", "work", "--cwd"]
        assert args[4] == str(tmp_path)
        assert "--session" not in args
        assert "--mission" not in args
        assert "--scope" not in args
        assert args[args.index("--prompt") + 1].startswith("Run a full repository audit")
        assert args[args.index("--permission") + 1] == "read-only"
        assert args[args.index("--timeout-seconds") + 1] == "180"
        return subprocess.CompletedProcess(args, 0, json.dumps({"runId": "run-42", "usage": {"input_tokens": 10, "output_tokens": 5}}), "")

    payload = cdx_mission_run_payload(
        tmp_path,
        {"missionId": "full-audit", "sessionId": "work", "strengthId": "standard"},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["run"]["runId"] == "run-42"
    assert payload["run"]["usage"]["totalTokens"] == 15
    assert calls[0] == ["cdx", "status", "--json"]


def test_viewer_cdx_mission_run_extends_timeout_for_writable_closeout(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        assert args[args.index("--timeout-seconds") + 1] == "600"
        assert kwargs["timeout"] == 690
        return subprocess.CompletedProcess(args, 0, json.dumps({"run_id": "run-42"}), "")

    payload = cdx_mission_run_payload(
        tmp_path,
        {
            "missionId": "full-audit",
            "sessionId": "work",
            "strengthId": "deep",
            "allowFileWrites": True,
            "commitAtEnd": True,
        },
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["timeoutSeconds"] == 600
    assert payload["run"]["runId"] == "run-42"


def test_viewer_cdx_runs_normalizes_unended_stale_runs_as_running(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        assert args == ["cdx", "runs", "--json"]
        return subprocess.CompletedProcess(
            args,
            0,
            json.dumps(
                {
                    "runs": [
                        {"run_id": "active", "status": "stale", "started_at": "2026-06-12T07:20:08Z"},
                        {"run_id": "ended", "status": "stale", "ended_at": "2026-06-12T07:20:28Z"},
                    ]
                }
            ),
            "",
        )

    payload = cdx_runs_payload(tmp_path, runner=cdx_runner, which=lambda name: f"/usr/bin/{name}")

    assert payload["state"] == "ok"
    assert payload["runs"][0]["status"] == "running"
    assert payload["runs"][0]["raw_status"] == "stale"
    assert payload["runs"][1]["status"] == "stale"


def test_viewer_cdx_mission_plan_allows_workspace_writes_when_requested(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "full-audit", "sessionId": "work", "strengthId": "standard", "allowFileWrites": True},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["missionInputs"] == {"directFixes": "false"}
    assert payload["plan"]["allowFileWrites"] is True
    assert payload["plan"]["permission"] == "workspace-write"
    assert payload["plan"]["requestedFileWrites"] is True
    assert payload["plan"]["commitAtEnd"] is False
    assert payload["plan"]["supportsFileWrites"] is True
    args = payload["plan"]["arguments"]
    assert args[args.index("--permission") + 1] == "workspace-write"
    prompt = args[args.index("--prompt") + 1]
    assert "File edits are allowed" in prompt
    assert "Create or update a bounded Logics request under logics/request/" in prompt
    assert "Do not directly modify product/source files" in prompt
    assert "Do not write a separate audit corpus/report artifact" in prompt
    assert "requestFiles" in prompt
    assert "validationEvidence" in prompt


def test_viewer_cdx_mission_plan_passes_commit_at_end_instruction(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {
            "missionId": "full-audit",
            "sessionId": "work",
            "strengthId": "standard",
            "allowFileWrites": True,
            "commitAtEnd": True,
        },
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["allowFileWrites"] is True
    assert payload["plan"]["commitAtEnd"] is True
    assert payload["plan"]["requestedCommitAtEnd"] is True
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "if and only if files were added, deleted, or modified" in prompt
    assert "create one scoped git commit" in prompt
    assert "Do not push, tag, publish" in prompt


def test_viewer_cdx_mission_plan_ignores_commit_at_end_when_writes_disabled(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "corpus-ready", "sessionId": "work", "strengthId": "standard", "commitAtEnd": True},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["allowFileWrites"] is False
    assert payload["plan"]["commitAtEnd"] is False
    assert payload["plan"]["requestedCommitAtEnd"] is True
    assert any("Commit-at-end was requested" in warning for warning in payload["plan"]["warnings"])


def test_viewer_cdx_mission_full_audit_direct_fix_prompt_skips_corpus(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {
            "missionId": "full-audit",
            "sessionId": "work",
            "strengthId": "standard",
            "allowFileWrites": False,
            "directFixes": True,
        },
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["missionInputs"] == {"directFixes": "true"}
    assert payload["plan"]["allowFileWrites"] is True
    assert payload["plan"]["permission"] == "workspace-write"
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "Fix safe, scoped issues directly" in prompt
    assert "Do not write a separate audit corpus/report artifact" in prompt
    assert "directFixes" in prompt
    assert "changedFiles" in prompt


def test_viewer_cdx_mission_release_review_write_prompt_stays_guarded(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:4] == ["tag", "--sort=-version:refname", "--list"]:
            return subprocess.CompletedProcess(args, 0, "v2.7.0\n", "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "release-review", "sessionId": "work", "strengthId": "standard", "allowFileWrites": True},
        cdx_runner=cdx_runner,
        git_runner=git_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["missionInputs"] == {"directFixes": "false"}
    assert payload["plan"]["releaseTag"] == "v2.7.0"
    assert payload["plan"]["permission"] == "workspace-write"
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "Create or update a bounded Logics request under logics/request/" in prompt
    assert "Do not write a separate release-review corpus/report artifact under logics/external" in prompt
    assert "Do not directly modify product/source files" in prompt
    assert "Do not bump versions, tag, push, publish" in prompt
    assert "requestFiles" in prompt
    assert "validationEvidence" in prompt


def test_viewer_cdx_mission_release_review_direct_fix_prompt_stays_guarded(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:4] == ["tag", "--sort=-version:refname", "--list"]:
            return subprocess.CompletedProcess(args, 0, "v2.7.0\n", "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "release-review", "sessionId": "work", "strengthId": "standard", "directFixes": True},
        cdx_runner=cdx_runner,
        git_runner=git_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["missionInputs"] == {"directFixes": "true"}
    assert payload["plan"]["permission"] == "workspace-write"
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "Fix safe, scoped release-readiness issues directly" in prompt
    assert "Do not write a separate release-review corpus/report artifact" in prompt
    assert "Do not bump versions unless explicitly requested" in prompt
    assert "do not tag, push, publish" in prompt
    assert "directFixes" in prompt
    assert "changedFiles" in prompt


def test_viewer_cdx_mission_plan_builds_corpus_prompt_for_current_cdx_cli(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "corpus-ready", "sessionId": "work", "strengthId": "standard", "allowFileWrites": True},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["allowFileWrites"] is False
    assert payload["plan"]["requestedFileWrites"] is True
    assert payload["plan"]["supportsFileWrites"] is False
    assert payload["plan"]["permission"] == "read-only"
    assert any("plan-first" in warning for warning in payload["plan"]["warnings"])
    args = payload["plan"]["arguments"]
    assert args[:4] == ["run", "work", "--cwd", str(tmp_path)]
    assert args[args.index("--permission") + 1] == "read-only"
    assert "--session" not in args
    assert "--mission" not in args
    assert "--scope" not in args
    assert "--plan-only" not in args
    prompt = args[args.index("--prompt") + 1]
    assert "Do not modify files directly" in prompt
    assert "Return JSON only" in prompt
    assert "promote-request-to-backlog" in prompt
    assert "promote-backlog-to-task" in prompt
    assert "refresh-corpus-context" in prompt


def test_viewer_cdx_mission_plan_builds_wish_to_request_prompt(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    missing = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "wish-to-request", "sessionId": "work", "strengthId": "standard"},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )
    assert missing["state"] == "error"
    assert "wish or intent" in missing["message"]

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "wish-to-request", "sessionId": "work", "strengthId": "standard", "wishText": "Add a safer release checklist"},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["missionInputs"] == {"wishText": "Add a safer release checklist"}
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "structured Logics request draft" in prompt
    assert "Add a safer release checklist" in prompt
    assert "do not create tasks" in prompt

    write_payload = cdx_mission_plan_payload(
        tmp_path,
        {
            "missionId": "wish-to-request",
            "sessionId": "work",
            "strengthId": "standard",
            "wishText": "Add a safer release checklist",
            "allowFileWrites": True,
        },
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )
    assert write_payload["state"] == "ok"
    assert write_payload["plan"]["permission"] == "workspace-write"
    write_prompt = write_payload["plan"]["arguments"][write_payload["plan"]["arguments"].index("--prompt") + 1]
    assert "Create the request draft file under logics/request/" in write_prompt
    assert "next available req_ slug" in write_prompt
    assert "Include the created path in generatedFiles" in write_prompt


def test_viewer_cdx_mission_plan_builds_guarded_pre_release_prompt(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    invalid = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "pre-release", "sessionId": "work", "strengthId": "standard", "releaseVersion": "2.8"},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )
    assert invalid["state"] == "error"
    assert "vX.X.X" in invalid["message"]

    payload = cdx_mission_plan_payload(
        tmp_path,
        {
            "missionId": "pre-release",
            "sessionId": "work",
            "strengthId": "standard",
            "releaseVersion": "v2.8.0",
            "runFullValidation": True,
            "allowFileWrites": True,
        },
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["missionInputs"] == {"releaseVersion": "v2.8.0", "runFullValidation": "true"}
    assert payload["plan"]["permission"] == "workspace-write"
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "version v2.8.0" in prompt
    assert "Run the project-defined full validation path" in prompt
    assert "Prepare release metadata files" in prompt
    assert "package.json" in prompt
    assert "pyproject.toml" in prompt
    assert "VERSION" in prompt
    assert "changelogs/CHANGELOGS_X_Y_Z.md" in prompt
    assert "create Git tags" in prompt
    assert "publish packages" in prompt


def test_viewer_cdx_mission_plan_keeps_pre_release_read_only_when_writes_disabled(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "pre-release", "sessionId": "work", "strengthId": "standard", "releaseVersion": "v2.8.0"},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["plan"]["permission"] == "read-only"
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "Do not modify package versions" in prompt
    assert "Do not modify files." in prompt


def test_viewer_cdx_mission_run_extracts_actions_from_stdout_path(tmp_path: Path) -> None:
    output_path = tmp_path / "cdx-stdout.json"
    output_path.write_text(
        "\n".join([
            json.dumps({"type": "item.completed", "item": {"type": "command_execution", "aggregated_output": "x" * 20000}}),
            json.dumps({"type": "thread.started", "thread_id": "thread-1"}),
            json.dumps({
                "type": "item.completed",
                "item": {
                    "type": "agent_message",
                    "text": json.dumps({"summary": "Ready", "actions": [{"type": "refresh-corpus-context", "target": ""}]}),
                },
            }),
        ]),
        encoding="utf-8",
    )

    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        return subprocess.CompletedProcess(args, 0, json.dumps({"run_id": "run-42", "stdout_path": str(output_path), "usage": {"total_tokens": 12}}), "")

    payload = cdx_mission_run_payload(
        tmp_path,
        {"missionId": "corpus-ready", "sessionId": "work", "strengthId": "standard"},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert payload["run"]["parsed"]["actions"] == [{"type": "refresh-corpus-context", "target": ""}]
    assert payload["run"]["parsed"]["missionOutput"]["summary"] == "Ready"


def test_viewer_cdx_mission_apply_plan_runs_only_allowlisted_logics_actions(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        assert kwargs["cwd"] == tmp_path
        return subprocess.CompletedProcess(args, 0, "done", "")

    payload = cdx_mission_apply_plan_payload(
        tmp_path,
        {"actions": [{"type": "promote-request-to-backlog", "target": "req_239"}]},
        runner=runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    assert calls == [["logics-manager", "flow", "promote", "request-to-backlog", "req_239"]]

    calls.clear()
    refresh = cdx_mission_apply_plan_payload(
        tmp_path,
        {"actions": [{"type": "refresh-corpus-context", "target": "task_213"}]},
        runner=runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert refresh["state"] == "ok"
    assert calls == [["logics-manager", "sync", "refresh-mermaid-signatures"]]

    rejected = cdx_mission_apply_plan_payload(
        tmp_path,
        {"actions": [{"type": "shell", "target": "rm"}]},
        runner=runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert rejected["state"] == "error"
    assert "Unsupported" in rejected["message"]


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


def test_viewer_project_capabilities_report_missing_optional_bricks(tmp_path: Path) -> None:
    capabilities = viewer_project_capabilities(tmp_path, which=lambda _name: None)

    assert capabilities["logics"]["state"] == "missing"
    assert capabilities["git"]["state"] == "unavailable"
    assert capabilities["ci"]["state"] == "hidden"
    assert capabilities["cdx"]["state"] == "missing"
    assert capabilities["cdxRuns"]["state"] == "missing"


def test_viewer_project_capabilities_detect_ready_git_ci_and_cdx(tmp_path: Path) -> None:
    (tmp_path / "logics").mkdir()
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "ci.yml").write_text("name: CI\n", encoding="utf-8")

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[-2:] == ["rev-parse", "--is-inside-work-tree"]:
            return subprocess.CompletedProcess(args, 0, "true\n", "")
        if args[-2:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(
                args,
                0,
                "origin\thttps://github.com/example/project.git (fetch)\norigin\thttps://github.com/example/project.git (push)\n",
                "",
            )
        return subprocess.CompletedProcess(args, 1, "", "unexpected")

    capabilities = viewer_project_capabilities(
        tmp_path,
        git_runner=runner,
        which=lambda name: f"/usr/bin/{name}" if name in {"git", "gh", "cdx"} else None,
    )

    assert capabilities["logics"]["state"] == "ready"
    assert capabilities["git"]["state"] == "ready"
    assert capabilities["ci"]["state"] == "ready"
    assert capabilities["ci"]["detail"]["githubUrl"] == "https://github.com/example/project"
    assert capabilities["cdx"]["state"] == "ready"
    assert capabilities["cdxRuns"]["state"] == "unsupported"


def test_viewer_capabilities_endpoint_returns_payload(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        viewer_module,
        "viewer_project_capabilities",
        lambda repo_root: {
            "logics": {"state": "ready", "available": True, "message": str(repo_root)},
            "git": {"state": "missing", "available": False, "message": "No git"},
        },
    )
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("GET", "/api/capabilities")
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
        assert response.status == 200
        assert payload["ok"] is True
        assert payload["payload"]["logics"]["state"] == "ready"
        assert payload["payload"]["git"]["state"] == "missing"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_viewer_project_registry_marks_active_and_logics_availability(tmp_path: Path) -> None:
    active = tmp_path / "logics-manager"
    sibling = tmp_path / "cdx-manager"
    active.mkdir()
    sibling.mkdir()
    (active / "logics").mkdir()

    registry = viewer_project_registry(active, project_roots=[active, sibling])

    assert [entry["name"] for entry in registry] == ["logics-manager", "cdx-manager"]
    assert registry[0]["active"] is True
    assert registry[0]["hasLogics"] is True
    assert registry[1]["active"] is False
    assert registry[1]["hasLogics"] is False
    assert registry[0]["id"] != registry[1]["id"]


def test_viewer_payload_exposes_bootstrap_state_for_new_projects(tmp_path: Path) -> None:
    payload = viewer_module.viewer_data_payload(tmp_path)

    assert payload["capabilities"]["logics"]["state"] == "missing"
    assert payload["canBootstrapLogics"] is True
    assert "Bootstrap Logics" in payload["bootstrapLogicsTitle"]


def test_viewer_project_switch_endpoint_uses_known_project_allowlist(tmp_path: Path) -> None:
    active = tmp_path / "logics-manager"
    sibling = tmp_path / "cdx-manager"
    active_request = active / "logics" / "request"
    sibling_request = sibling / "logics" / "request"
    active_request.mkdir(parents=True)
    sibling_request.mkdir(parents=True)
    (active_request / "req_001_active.md").write_text("## req_001_active - Active\n> Status: Ready\n", encoding="utf-8")
    (sibling_request / "req_001_sibling.md").write_text("## req_001_sibling - Sibling\n> Status: Ready\n", encoding="utf-8")

    server = create_viewer_server_or_skip(active)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("GET", "/api/projects")
        projects_response = conn.getresponse()
        projects_payload = json.loads(projects_response.read().decode("utf-8"))
        sibling_entry = next(entry for entry in projects_payload["payload"]["projects"] if entry["name"] == "cdx-manager")

        body = json.dumps({"projectId": sibling_entry["id"]})
        conn.request("POST", "/api/switch-project", body=body, headers={"Content-Type": "application/json"})
        switch_response = conn.getresponse()
        switch_payload = json.loads(switch_response.read().decode("utf-8"))
        assert switch_response.status == 200
        assert switch_payload["payload"]["repoName"] == "cdx-manager"
        assert [item["id"] for item in switch_payload["payload"]["items"]] == ["req_001_sibling"]
        assert next(entry for entry in switch_payload["payload"]["projects"] if entry["name"] == "cdx-manager")["active"] is True

        conn.request("POST", "/api/switch-project", body=json.dumps({"projectId": "unknown"}), headers={"Content-Type": "application/json"})
        forbidden_response = conn.getresponse()
        forbidden_payload = json.loads(forbidden_response.read().decode("utf-8"))
        assert forbidden_response.status == 403
        assert forbidden_payload["ok"] is False
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_viewer_bootstrap_logics_endpoint_creates_workflow_skeleton(tmp_path: Path) -> None:
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("POST", "/api/bootstrap-logics", body="{}", headers={"Content-Type": "application/json"})
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
        assert response.status == 200
        assert payload["ok"] is True
        assert (tmp_path / "logics" / "instructions.md").is_file()
        assert payload["payload"]["canBootstrapLogics"] is False
        assert payload["payload"]["capabilities"]["logics"]["state"] == "ready"
        assert "logics/" in payload["bootstrap"]["created_paths"]
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_viewer_cdx_status_endpoint_returns_payload(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    (tmp_path / "logics").mkdir()
    monkeypatch.setattr(
        viewer_module,
        "cdx_status_payload",
        lambda repo_root: {"state": "ok", "message": "", "status": {"availability": "ready", "root": str(repo_root)}},
    )
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("GET", "/api/cdx-status")
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
        assert response.status == 200
        assert payload["ok"] is True
        assert payload["payload"]["state"] == "ok"
        assert payload["payload"]["status"]["availability"] == "ready"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_viewer_start_status_is_local_and_read_only(tmp_path: Path) -> None:
    output = render_start_status(
        "http://127.0.0.1:8765",
        tmp_path,
        focus="req_001_demo",
        network_url="http://192.168.1.20:8765",
        bind_host="0.0.0.0",
        auto_refresh_interval_seconds=15,
    )

    assert "http://127.0.0.1:8765" in output
    assert "http://192.168.1.20:8765" in output
    assert "Mode: read-only" in output
    assert "Bind: 0.0.0.0" in output
    assert "Auto refresh: 15s" in output
    assert "Focus: req_001_demo" in output


def test_viewer_refresh_interval_defaults_to_15_seconds() -> None:
    args = viewer_module.build_parser().parse_args([])

    assert args.refresh_interval is None


def test_viewer_refresh_interval_tracks_explicit_cli_override() -> None:
    args = viewer_module.build_parser().parse_args(["--refresh-interval", "30"])

    assert args.refresh_interval == 30


def test_viewer_focus_targets_are_normalized_and_safe(tmp_path: Path) -> None:
    repo_root = tmp_path

    assert normalize_viewer_focus_target(repo_root, "req_001_demo") == "logics/request/req_001_demo.md"
    assert normalize_viewer_focus_target(repo_root, "logics/tasks/task_001_demo.md") == "logics/tasks/task_001_demo.md"
    assert normalize_viewer_focus_target(repo_root, "logics%2Fbacklog%2Fitem_001_demo.md") == "logics/backlog/item_001_demo.md"

    with pytest.raises(ValueError):
        normalize_viewer_focus_target(repo_root, "../outside.md")
    with pytest.raises(ValueError):
        normalize_viewer_focus_target(repo_root, "/tmp/outside.md")
    with pytest.raises(ValueError):
        normalize_viewer_focus_target(repo_root, "README.md")


def test_viewer_url_encodes_focus_and_read_mode() -> None:
    url = build_viewer_url("127.0.0.1", 8765, focus="logics/request/req_001_demo.md", read=True)

    assert url == "http://127.0.0.1:8765?focus=logics%2Frequest%2Freq_001_demo.md&read=1"


def test_viewer_main_stops_cleanly_on_keyboard_interrupt(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    class FakeViewerServer:
        server_address = ("127.0.0.1", 8765)

        def __init__(self) -> None:
            self.closed = False

        def serve_forever(self) -> None:
            raise KeyboardInterrupt

        def server_close(self) -> None:
            self.closed = True

    fake_server = FakeViewerServer()
    monkeypatch.setattr(viewer_module, "find_repo_root", lambda _cwd: tmp_path)
    monkeypatch.setattr(viewer_module, "create_viewer_server", lambda _repo_root, host, port, **_kwargs: fake_server)
    opened: list[str] = []
    monkeypatch.setattr(viewer_module.webbrowser, "open", opened.append)

    exit_code = viewer_module.main(["--host", "127.0.0.1", "--port", "8765", "--focus", "req_001_demo", "--read", "--open"])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "Logics viewer running:" in captured.out
    assert "Local: http://127.0.0.1:8765" in captured.out
    assert "focus=logics%2Frequest%2Freq_001_demo.md&read=1" in captured.out
    assert opened == ["http://127.0.0.1:8765?focus=logics%2Frequest%2Freq_001_demo.md&read=1"]
    assert fake_server.closed is True


def test_viewer_serves_mermaid_vendor_asset(tmp_path: Path) -> None:
    (tmp_path / "logics").mkdir()
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("GET", "/vendor/mermaid.min.js")
        response = conn.getresponse()
        body = response.read(80)
        assert response.status == 200
        assert b"mermaid" in body.lower()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_viewer_serves_packaged_static_assets_when_source_clients_are_absent(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    (tmp_path / "logics").mkdir()
    monkeypatch.setattr(viewer_module, "VIEWER_ROOT", viewer_module.PACKAGE_VIEWER_ASSETS_ROOT / "viewer")
    monkeypatch.setattr(viewer_module, "SHARED_MEDIA_ROOT", viewer_module.PACKAGE_VIEWER_ASSETS_ROOT / "media")
    monkeypatch.setattr(viewer_module, "DIST_VENDOR_ROOT", tmp_path / "missing-vendor")
    monkeypatch.setattr(viewer_module, "NODE_MERMAID_ROOT", tmp_path / "missing-node-mermaid")

    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        for route, expected in (
            ("/", b"Logics Viewer"),
            ("/browser-host.js", b"stateKey"),
            ("/viewer.css", b"viewer-topbar"),
            ("/media/main.css", b":root"),
            ("/vendor/mermaid.min.js", b"mermaid"),
        ):
            conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
            conn.request("GET", route)
            response = conn.getresponse()
            body = response.read(4096)
            assert response.status == 200, route
            assert expected in body, route
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


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


def _write_minimal_architecture_doc(path: Path, *, title: str, status: str, body: str = "") -> None:
    path.write_text(
        "\n".join(
            [
                f"## {path.stem} - {title}",
                "> Date: 2026-06-05",
                f"> Status: {status}",
                "> Drivers: Keep the decision record explicit.",
                "> Related request: (none yet)",
                "> Related backlog: (none yet)",
                "> Related task: (none yet)",
                "> Reminder: Update status, linked refs, context, decision, consequences, and supersession markers when you edit this ADR.",
                "",
                "# Context",
                body or "Decision context.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def _write_minimal_spec_doc(path: Path, *, title: str, status: str) -> None:
    path.write_text(
        "\n".join(
            [
                f"## {path.stem} - {title}",
                "> From version: 1.0.0",
                f"> Status: {status}",
                "> Understanding: 100%",
                "> Confidence: 100%",
                "",
                "# Overview",
                "Spec context.",
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
    source_root = Path(__file__).resolve().parents[2]
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


def test_validate_closeout_rejects_weak_validation_evidence(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_weak_validation.md"
    task_path.write_text(
        "\n".join(
            [
                "## task_001_weak_validation - Weak Validation",
                "> Status: Ready",
                "> Progress: 0%",
                "# Plan",
                "- [x] Do the work.",
                "# Definition of Done (DoD)",
                "- [x] Validation passes.",
                "# Validation",
                "- ok",
                "- not ok yet",
                "- verification pending",
                "- ... passed",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    payload = validate_closeout_payload(repo_root, "task_001_weak_validation")

    assert "validation_evidence_missing" in {issue["code"] for issue in payload["issues"]}


def test_validate_closeout_accepts_structured_validation_evidence(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_structured_validation.md"
    task_path.write_text(
        "\n".join(
            [
                "## task_001_structured_validation - Structured Validation",
                "> Status: Ready",
                "> Progress: 0%",
                "# Plan",
                "- [x] Do the work.",
                "# Definition of Done (DoD)",
                "- [x] Validation passes.",
                "# Validation",
                "- command: `pytest tests/python -q` | result: passed | date: 2026-06-07 | note: 181 tests",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    payload = validate_closeout_payload(repo_root, "task_001_structured_validation")

    assert "validation_evidence_missing" not in {issue["code"] for issue in payload["issues"]}


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
    assert "```mermaid" in request_text
    assert "```mermaid" in backlog_text
    assert "```mermaid" not in task_text


def test_repair_ac_traceability_records_explicit_proof(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    repo_root = tmp_path / "logics-repo"
    paths = write_ac_traceability_chain(repo_root)
    backlog_path = paths["backlog"]
    task_path = paths["task"]

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    assert main(
        [
            "flow",
            "repair",
            "ac-traceability",
            "req_001_demo",
            "--proof",
            "AC1 covered by closeout regression.",
            "--proof-source",
            "task_001_demo",
        ]
    ) == 0

    assert "request-AC1 -> This backlog slice. Proof: AC1 covered by closeout regression. Source: `task_001_demo`" in backlog_path.read_text(encoding="utf-8")
    assert "request-AC1 -> This task. Proof: AC1 covered by closeout regression. Source: `task_001_demo`" in task_path.read_text(encoding="utf-8")
    payload = validate_closeout_payload(repo_root, "task_001_demo")
    issue_codes = {issue["code"] for issue in payload["issues"]}
    assert "ac_missing_item_traceability" not in issue_codes
    assert "ac_missing_task_traceability" not in issue_codes


def test_repair_ac_traceability_verify_rolls_back_without_proof(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    paths = write_ac_traceability_chain(repo_root)
    backlog_path = paths["backlog"]
    task_path = paths["task"]
    original_backlog_text = backlog_path.read_text(encoding="utf-8")
    original_task_text = task_path.read_text(encoding="utf-8")

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    assert main(
        [
            "flow",
            "repair",
            "ac-traceability",
            "req_001_demo",
            "--verify-closeout",
            "task_001_demo",
            "--format",
            "json",
        ]
    ) == 0
    payload = json.loads(capsys.readouterr().out)

    assert payload["rolled_back"] is True
    assert payload["changed_files"] == []
    assert "logics/backlog/item_001_demo.md" in payload["attempted_changed_files"]
    assert backlog_path.read_text(encoding="utf-8") == original_backlog_text
    assert task_path.read_text(encoding="utf-8") == original_task_text


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


def test_closeout_rolls_back_failed_repairs(tmp_path: Path) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    request_path = repo_root / "logics" / "request" / "req_001_demo.md"
    backlog_path = repo_root / "logics" / "backlog" / "item_001_demo.md"
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"

    request_path.write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
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
                "# Problem",
                "- Deliver demo.",
                "# Links",
                "- Request: `req_001_demo`",
                "- Primary task(s): `task_001_demo`",
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
                "# Plan",
                "- [ ] Do the work.",
                "# Backlog",
                "- `item_001_demo`",
                "# Definition of Done (DoD)",
                "- [ ] Validation passes.",
                "# Validation",
                "- validation pending",
                "# Links",
                "- Request: `req_001_demo`",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    original_request_text = request_path.read_text(encoding="utf-8")
    original_backlog_text = backlog_path.read_text(encoding="utf-8")
    original_task_text = task_path.read_text(encoding="utf-8")

    payload = closeout_payload(
        repo_root,
        "task_001_demo",
        validations=["pytest passed"],
        run_index=False,
        run_lint=False,
        run_audit=False,
        dry_run=False,
    )

    assert payload["ok"] is False
    assert payload["rolled_back"] is True
    assert payload["changed_files"] == []
    assert "logics/tasks/task_001_demo.md" in payload["attempted_changed_files"]
    assert "ac_missing_item_traceability" in {issue["code"] for issue in payload["preflight"]["issues"]}
    assert "ac_missing_task_traceability" in {issue["code"] for issue in payload["preflight"]["issues"]}
    assert request_path.read_text(encoding="utf-8") == original_request_text
    assert backlog_path.read_text(encoding="utf-8") == original_backlog_text
    assert task_path.read_text(encoding="utf-8") == original_task_text


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


def test_sync_read_doc_text_includes_bounded_content(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True)
    (request_dir / "req_001_demo.md").write_text(
        "\n".join(
            [
                "## req_001_demo - Demo Request",
                "> Status: Ready",
                "> Schema version: 1.0",
                "# Needs",
                "- Agents need useful body text.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "read-doc", "req_001_demo"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "req_001_demo (request): Demo Request" in captured.out
    assert "# Needs" in captured.out
    assert "Agents need useful body text." in captured.out


def test_flow_show_reads_workflow_doc_content(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    task_dir = repo_root / "logics" / "tasks"
    task_dir.mkdir(parents=True)
    (task_dir / "task_001_demo.md").write_text(
        "\n".join(
            [
                "## task_001_demo - Demo Task",
                "> Status: Ready",
                "> Schema version: 1.0",
                "# Validation",
                "- pytest will run.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    monkeypatch.setattr("logics_manager.flow._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["flow", "show", "task_001_demo", "--section", "Validation"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "task_001_demo (task): Demo Task" in captured.out
    assert "# Validation" in captured.out
    assert "pytest will run." in captured.out


def test_flow_unknown_subcommand_suggests_show(capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit, match=r"Unsupported flow subcommand: read\. Use `logics-manager flow show <ref>`"):
        main(["flow", "read", "task_001_demo"])


def test_sync_context_pack_accepts_multiple_refs(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text(
        "## req_001_demo - Demo Request\n> Status: Ready\n> Schema version: 1.0\n# Needs\n- One.\n",
        encoding="utf-8",
    )
    (repo_root / "logics" / "tasks" / "task_001_demo.md").write_text(
        "## task_001_demo - Demo Task\n> Status: Ready\n> Schema version: 1.0\n# Validation\n- Two.\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)

    exit_code = main(["sync", "context-pack", "req_001_demo", "task_001_demo", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert payload["refs"] == ["req_001_demo", "task_001_demo"]
    assert {doc["ref"] for doc in payload["docs"]} == {"req_001_demo", "task_001_demo"}


def test_sync_refresh_mermaid_signatures_can_scope_targets(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    repo_root = tmp_path / "logics-repo"
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    (repo_root / "logics" / "request" / "req_001_demo.md").write_text("## req_001_demo - Demo Request\n", encoding="utf-8")
    (repo_root / "logics" / "tasks" / "task_001_demo.md").write_text("## task_001_demo - Demo Task\n", encoding="utf-8")
    seen: list[str] = []

    def refresh(path: Path, _kind: str, _dry_run: bool, repo_root: Path | None = None) -> bool:
        assert repo_root is not None
        seen.append(path.relative_to(repo_root).as_posix())
        return True

    monkeypatch.setattr("logics_manager.sync._find_repo_root", lambda _cwd: repo_root)
    monkeypatch.setattr("logics_manager.sync.refresh_workflow_mermaid_signature_file", refresh)

    exit_code = main(["sync", "refresh-mermaid-signatures", "task_001_demo", "--format", "json"])
    captured = capsys.readouterr()
    payload = json.loads(captured.out)

    assert exit_code == 0
    assert seen == ["logics/tasks/task_001_demo.md"]
    assert payload["scanned_files"] == ["logics/tasks/task_001_demo.md"]


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


def test_assist_handoff_reports_changed_paths_for_committed_range(tmp_path: Path) -> None:
    from logics_manager.assist import _build_handoff

    repo_root = tmp_path / "git-handoff-repo"
    repo_root.mkdir()
    subprocess.run(["git", "init", "-q"], cwd=repo_root, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_root, check=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo_root, check=True)
    (repo_root / "logics.yaml").write_text("version: 1\n", encoding="utf-8")
    (repo_root / "logics" / "tasks").mkdir(parents=True)
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    task_path.write_text("## task_001_demo - Demo\n> Status: Ready\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_root, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "initial"], cwd=repo_root, check=True)
    since = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo_root, text=True).strip()

    task_path.write_text("## task_001_demo - Demo\n> Status: Done\n# Validation\n- pytest passed.\n", encoding="utf-8")
    (repo_root / "logics_manager").mkdir()
    (repo_root / "logics_manager" / "assist.py").write_text("# changed\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo_root, check=True)
    subprocess.run(["git", "commit", "-q", "-m", "update handoff surfaces"], cwd=repo_root, check=True)

    payload = _build_handoff(repo_root, since)

    assert payload["changed_paths"] == ["logics/tasks/task_001_demo.md", "logics_manager/assist.py"]
    assert payload["surface"]["counts"] == {"python-runtime": 1, "workflow-docs": 1}
    assert payload["logics_docs"][0]["path"] == "logics/tasks/task_001_demo.md"
    assert payload["validations"] == ["pytest passed."]


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
