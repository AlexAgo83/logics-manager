from __future__ import annotations

import json
from importlib import metadata as importlib_metadata
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
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
    cdx_import_payload,
    cdx_mission_apply_plan_payload,
    cdx_mission_plan_payload,
    cdx_mission_run_payload,
    cdx_config_payload,
    cdx_permission_payload,
    cdx_remove_payload,
    cdx_history_payload,
    cdx_run_report_payload,
    cdx_runs_payload,
    cdx_status_payload,
    ci_status_payload,
    collect_viewer_items,
    create_request_from_cdx_report,
    create_request_from_viewer_draft,
    create_viewer_server,
    edit_doc_payload,
    file_preview_payload,
    gitlab_repo_url,
    github_repo_url,
    git_commit_payload,
    git_diff_payload,
    git_fetch_payload,
    git_file_preview_payload,
    git_status_payload,
    normalize_viewer_focus_target,
    open_file_payload,
    open_repo_folder_payload,
    open_system_terminal_payload,
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

from conftest import (
    _cdx_test_status_response,
    _write_minimal_workflow_doc,
    create_viewer_server_or_skip,
)


def test_viewer_collects_items_with_relationships(tmp_path: Path) -> None:
    repo_root = tmp_path
    (repo_root / "logics" / "request").mkdir(parents=True)
    (repo_root / "logics" / "backlog").mkdir(parents=True)
    (repo_root / "logics" / "tasks").mkdir(parents=True)
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
        backlog_path.read_text(encoding="utf-8") + "\nPromoted from `logics/request/req_001_demo.md`\n\n# Priority\n- Priority: High\n",
        encoding="utf-8",
    )
    _write_minimal_workflow_doc(
        repo_root / "logics" / "tasks" / "task_001_demo.md",
        title="Demo task",
        kind="task",
        status="Ready",
        links=[],
    )
    task_path = repo_root / "logics" / "tasks" / "task_001_demo.md"
    task_path.write_text(
        task_path.read_text(encoding="utf-8") + "\n# Backlog\n- `item_001_demo`\n",
        encoding="utf-8",
    )

    items = collect_viewer_items(repo_root)

    request = next(item for item in items if item["id"] == "req_001_demo")
    backlog = next(item for item in items if item["id"] == "item_001_demo")
    task = next(item for item in items if item["id"] == "task_001_demo")
    assert request["isPromoted"] is True
    assert request["usedBy"][0]["id"] == "item_001_demo"
    assert backlog["isPromoted"] is True
    assert backlog["indicators"]["Priority"] == "High"
    assert backlog["usedBy"][0]["id"] == "task_001_demo"
    assert backlog["references"][0]["path"] == "logics/request/req_001_demo.md"
    assert task["references"][0]["path"] == "logics/backlog/item_001_demo.md"


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


def test_viewer_open_file_launches_system_editor_for_repo_files(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    repo_file = repo_root / "logics.log"
    repo_file.write_text("repo log\n", encoding="utf-8")
    nested_repo_file = repo_root / "logs" / "cdx-run.log"
    nested_repo_file.parent.mkdir()
    nested_repo_file.write_text("nested log\n", encoding="utf-8")
    external_file = tmp_path / "cdx-run.log"
    external_file.write_text("external log\n", encoding="utf-8")
    launched: list[list[str]] = []

    relative_payload = open_file_payload(repo_root, "logics.log", launcher=launched.append)
    nested_payload = open_file_payload(repo_root, "logs/cdx-run.log", launcher=launched.append)

    assert relative_payload["path"] == str(repo_file)
    assert nested_payload["path"] == str(nested_repo_file)
    assert launched[0][-1] == str(repo_file)
    assert launched[1][-1] == str(nested_repo_file)
    with pytest.raises(ValueError):
        open_file_payload(repo_root, str(external_file), launcher=launched.append)
    with pytest.raises(ValueError):
        open_file_payload(repo_root, "../outside.log", launcher=launched.append)
    with pytest.raises(FileNotFoundError):
        open_file_payload(repo_root, "missing.log", launcher=launched.append)


def test_viewer_file_preview_reads_repo_files_with_truncation(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    repo_file = repo_root / "logics.log"
    repo_file.write_text("abcdef", encoding="utf-8")
    nested_repo_file = repo_root / "logs" / "cdx-run.log"
    nested_repo_file.parent.mkdir()
    nested_repo_file.write_text("nested log\n", encoding="utf-8")
    external_file = tmp_path / "cdx-run.log"
    external_file.write_text("external log\n", encoding="utf-8")

    relative_payload = file_preview_payload(repo_root, "logics.log", max_bytes=3, max_chars=10)
    nested_payload = file_preview_payload(repo_root, "logs/cdx-run.log")

    assert relative_payload["path"] == str(repo_file)
    assert relative_payload["name"] == "logics.log"
    assert relative_payload["content"] == "def"
    assert relative_payload["truncated"] is True
    assert nested_payload["path"] == str(nested_repo_file)
    assert "nested log" in nested_payload["content"]
    with pytest.raises(ValueError):
        file_preview_payload(repo_root, str(external_file))
    with pytest.raises(ValueError):
        file_preview_payload(repo_root, "../outside.log")
    with pytest.raises(FileNotFoundError):
        file_preview_payload(repo_root, "missing.log")


def test_viewer_cdx_artifact_preview_allows_repo_and_cdx_logs_only(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    repo_file = repo_root / "logics.log"
    repo_file.write_text("repo artifact", encoding="utf-8")
    home = tmp_path / "home"
    cdx_file = home / ".cdx" / "profiles" / "work3" / "log" / "cdx-run.log"
    cdx_file.parent.mkdir(parents=True)
    cdx_file.write_text("cdx artifact", encoding="utf-8")
    external_file = tmp_path / "cdx-run.log"
    external_file.write_text("external log", encoding="utf-8")
    monkeypatch.setattr(Path, "home", lambda: home)

    repo_payload = cdx_artifact_preview_payload(repo_root, "logics.log")
    cdx_payload = cdx_artifact_preview_payload(repo_root, str(cdx_file))
    legacy_payload = file_preview_payload(repo_root, str(cdx_file))

    assert repo_payload["content"] == "repo artifact"
    assert cdx_payload["content"] == "cdx artifact"
    assert legacy_payload["content"] == "cdx artifact"
    with pytest.raises(ValueError):
        cdx_artifact_preview_payload(repo_root, str(external_file))
    with pytest.raises(FileNotFoundError):
        cdx_artifact_preview_payload(repo_root, str(home / ".cdx" / "missing.log"))


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
    assert text["lineCount"] == 1
    assert text["truncated"] is False
    assert text["canForce"] is False
    assert binary["state"] == "unsupported"
    assert large["state"] == "oversized"
    # A small-cap oversized file can still be force-loaded (within the hard cap).
    assert large["canForce"] is True
    with pytest.raises(ValueError):
        workspace_preview_payload(tmp_path, "../outside.md")


def test_viewer_workspace_preview_force_load_raises_cap_and_reports_lines(tmp_path: Path) -> None:
    (tmp_path / "big.py").write_text("a = 1\nb = 2\nc = 3\n", encoding="utf-8")

    # Default small cap truncates by chars and offers a forced load.
    capped = workspace_preview_payload(tmp_path, "big.py", max_chars=6)
    assert capped["state"] == "ok"
    assert capped["truncated"] is True
    assert capped["canForce"] is True

    # Forcing the load returns the full content, the line count, and no force flag.
    full = workspace_preview_payload(tmp_path, "big.py", max_chars=6, full=True)
    assert full["state"] == "ok"
    assert full["truncated"] is False
    assert full["canForce"] is False
    assert full["lineCount"] == 3
    assert "c = 3" in full["content"]


def test_viewer_lan_mode_generates_per_launch_token_and_share_url(tmp_path: Path) -> None:
    server = viewer_module.create_viewer_server(tmp_path, host="127.0.0.1", port=0, lan_mode=True)
    try:
        token = server.lan_token
        assert server.lan_mode is True
        assert isinstance(token, str) and len(token) >= 32
        # A second server gets a different token (no persistence).
        other = viewer_module.create_viewer_server(tmp_path, host="127.0.0.1", port=0, lan_mode=True)
        try:
            assert other.lan_token != token
        finally:
            other.server_close()

        share = _append_lan_token("http://192.168.1.42:8765/", token)
        assert share.startswith("http://192.168.1.42:8765/?t=")
        assert token in share
        share_with_focus = _append_lan_token("http://host/?focus=req_001", token)
        assert "?focus=req_001" in share_with_focus
        assert "&t=" in share_with_focus

        banner = render_start_status(
            "http://127.0.0.1:8765/",
            tmp_path,
            lan_mode=True,
            lan_token=token,
            lan_url=share,
        )
        assert "LAN read-only" in banner
        assert "Share URL" in banner
        assert token in banner
    finally:
        server.server_close()


def test_viewer_lan_mode_disabled_by_default(tmp_path: Path) -> None:
    server = viewer_module.create_viewer_server(tmp_path, host="127.0.0.1", port=0)
    try:
        assert server.lan_mode is False
        assert server.lan_token == ""
        banner = render_start_status("http://127.0.0.1:8765/", tmp_path)
        assert "Mode: read-only" in banner
        assert "LAN exposure" not in banner
    finally:
        server.server_close()


def test_viewer_lan_rw_pairing_flow_round_trips(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    monkeypatch.setattr(viewer_module, "_viewer_state_dir", lambda: tmp_path / "state")
    server = viewer_module.create_viewer_server(
        tmp_path,
        host="127.0.0.1",
        port=0,
        lan_mode=True,
        lan_rw_mode=True,
    )
    try:
        broker = server.pairing_broker
        registry = server.device_registry
        assert broker is not None and registry is not None
        entry = broker.start(label="iPhone", requester_ip="127.0.0.1")
        # Wrong PIN does not complete the pairing.
        result = broker.try_complete(pairing_id=entry.pairing_id, pin="000000")
        assert result is not None and result[0] == "wrong"
        # Right PIN completes and registers a device once.
        completed = broker.try_complete(pairing_id=entry.pairing_id, pin=entry.pin)
        assert completed is not None and completed[0] == "ok"
        token = "tok_" + "x" * 40
        device = registry.register("iPhone", token)
        assert registry.find_matching(token) is not None
        # A replay against the same pairing must fail because the entry was consumed.
        again = broker.try_complete(pairing_id=entry.pairing_id, pin=entry.pin)
        assert again is None
        # Revocation removes the match.
        assert registry.revoke(device.id) is True
        assert registry.find_matching(token) is None
    finally:
        server.server_close()


def test_viewer_mutating_routes_registry_covers_every_state_changing_post() -> None:
    must_be_gated = {
        "/api/edit",
        "/api/open-file",
        "/api/open-repo-folder",
        "/api/bootstrap-logics",
        "/api/new-request",
        "/api/restart-viewer",
        "/api/switch-project",
        "/api/select-project-root",
        "/api/select-project-root-path",
        "/api/cdx-report-request",
        "/api/cdx-mission-run",
        "/api/cdx-mission-apply-plan",
        "/api/workshop-command-start",
        "/api/workshop-command-stop",
        "/api/cdx-remove",
        "/api/lan/devices/revoke",
    }
    assert must_be_gated.issubset(VIEWER_MUTATING_ROUTES)


def test_create_request_from_viewer_draft_writes_request_doc(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    created = create_request_from_viewer_draft(
        repo_root,
        {
            "title": "Capture toolbar request",
            "intent": "Add a New Request action to the standalone viewer toolbar.",
            "context": "Keep search available in Activity mode.\nPlace the button before filters.",
        },
    )

    assert created["id"].startswith("req_000_capture_toolbar_request")
    path = repo_root / created["path"]
    text = path.read_text(encoding="utf-8")
    assert "> Status: Draft" in text
    assert "- Add a New Request action to the standalone viewer toolbar." in text
    assert "- Keep search available in Activity mode." in text
    assert "- Place the button before filters." in text
    assert "- This request was created directly by the user from the viewer." in text
    assert "translate it to English" in text


def test_viewer_post_routes_are_classified_for_lan_gating() -> None:
    source = (Path(__file__).resolve().parents[2] / "logics_manager" / "viewer.py").read_text(encoding="utf-8")
    post_routes = set(re.findall(r'if parsed\.path == "(/api/[^"]+)"', source))
    intentionally_bootstrap_or_readonly = {
        "/api/lan/pair/start",
        "/api/lan/pair/complete",
        "/api/refresh",
        "/api/cdx-mission-plan",
        "/api/file-preview",
        "/api/cdx-artifact-preview",
    }
    unclassified = post_routes - VIEWER_MUTATING_ROUTES - intentionally_bootstrap_or_readonly

    assert unclassified == set()


def test_viewer_lan_auth_helpers_accept_token_and_loopback() -> None:
    handler = viewer_module.LogicsViewerRequestHandler.__new__(viewer_module.LogicsViewerRequestHandler)
    handler.client_address = ("127.0.0.1", 12345)
    assert handler._client_is_loopback() is True
    handler.client_address = ("192.168.1.42", 12345)
    assert handler._client_is_loopback() is False
    handler.client_address = ("::ffff:127.0.0.1", 0)
    assert handler._client_is_loopback() is True


def test_viewer_status_route_table_covers_all_status_endpoints() -> None:
    table = viewer_module._STATUS_ROUTE_TABLE
    assert set(table) == {
        "/api/git-status",
        "/api/ci-status",
        "/api/release-status",
        "/api/release-runs",
        "/api/cdx-status",
        "/api/cdx-runs",
        "/api/cdx-history",
    }
    # Each route maps to a (label, component) the status producer understands.
    assert table["/api/git-status"] == ("git-status", "git")
    assert table["/api/cdx-history"] == ("cdx-history", "cdxHistory")


def test_viewer_read_json_body_handles_malformed_content_length() -> None:
    import io

    handler = viewer_module.LogicsViewerRequestHandler.__new__(viewer_module.LogicsViewerRequestHandler)
    handler.rfile = io.BytesIO(b'{"a": 1}')  # type: ignore[attr-defined]
    handler.headers = {"Content-Length": "not-a-number"}  # type: ignore[attr-defined]

    # Strict variant raises a catchable JSONDecodeError (callers turn it into 400).
    with pytest.raises(json.JSONDecodeError):
        handler._read_json_body_strict()

    # Tolerant variant swallows it and returns an empty dict.
    assert handler._read_json_body() == {}

    # Well-formed input still parses.
    handler.rfile = io.BytesIO(b'{"a": 1}')  # type: ignore[attr-defined]
    handler.headers = {"Content-Length": "8"}  # type: ignore[attr-defined]
    assert handler._read_json_body_strict() == {"a": 1}


def test_viewer_lan_device_revoke_requires_own_pairing(tmp_path: Path) -> None:
    registry = viewer_module.LanDeviceRegistry(tmp_path / "devices.json")
    own = registry.register("own", "own-token")
    other = registry.register("other", "other-token")
    handler = viewer_module.LogicsViewerRequestHandler.__new__(viewer_module.LogicsViewerRequestHandler)
    handler.server = SimpleNamespace(device_registry=registry)
    handler._client_is_loopback = lambda: False  # type: ignore[method-assign]
    handler._paired_device_for_request = lambda _parsed: own  # type: ignore[method-assign]
    errors: list[tuple[object, str]] = []
    responses: list[dict[str, object]] = []
    handler._send_error_json = lambda status, message: errors.append((status, message))  # type: ignore[method-assign]
    handler._send_json = lambda payload: responses.append(payload)  # type: ignore[method-assign]

    handler._read_json_body = lambda: {"deviceId": other.id}  # type: ignore[method-assign]
    handler._handle_device_revoke(object())

    assert errors == [(viewer_module.HTTPStatus.FORBIDDEN, "Device can only revoke its own pairing.")]
    assert registry.find_matching("other-token") is not None

    errors.clear()
    handler._read_json_body = lambda: {"deviceId": own.id}  # type: ignore[method-assign]
    handler._handle_device_revoke(object())

    assert errors == []
    assert responses[-1]["ok"] is True
    assert registry.find_matching("own-token") is None


def test_viewer_lan_share_url_renders_qr_or_textual_fallback() -> None:
    lines = _render_qr_lines("http://example/?t=abc")
    assert lines  # never empty when url is provided
    joined = "\n".join(lines)
    # Either the textual fallback (no segno installed) or a segno render
    # (block glyphs or ANSI inverse-video) is acceptable.
    assert "http://example" in joined or "█" in joined or "▀" in joined or "\x1b[" in joined


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


def test_viewer_system_terminal_payload_builds_iterm_command(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    launched: list[list[str]] = []
    monkeypatch.setattr(viewer_module.sys, "platform", "darwin")

    payload = open_system_terminal_payload(
        tmp_path,
        {"command": ["cdx", "resume", "work2"], "label": "cdx resume work2"},
        launcher=launched.append,
    )

    assert payload == {"label": "cdx resume work2", "command": ["cdx", "resume", "work2"], "terminal": "iTerm"}
    assert launched[0][:2] == ["osascript", "-e"]
    assert "iTerm" in launched[0][2]
    assert "cdx resume work2" in launched[0][2]


def test_viewer_system_terminal_payload_falls_back_to_terminal_app(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    launched: list[list[str]] = []
    monkeypatch.setattr(viewer_module.sys, "platform", "darwin")

    def launcher(command: list[str]) -> subprocess.CompletedProcess[str]:
        launched.append(command)
        if "iTerm" in command[2]:
            return subprocess.CompletedProcess(command, 1, "", "Application isn't running")
        return subprocess.CompletedProcess(command, 0, "", "")

    payload = open_system_terminal_payload(tmp_path, {"command": ["echo", "ok"]}, launcher=launcher)

    assert payload["terminal"] == "Terminal"
    assert len(launched) == 2
    assert "iTerm" in launched[0][2]
    assert "Terminal" in launched[1][2]


def test_viewer_repository_shortcuts_resolve_gitlab_remotes(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@gitlab.com:example/repo.git (fetch)\n", "")
        raise AssertionError(args)

    assert github_repo_url(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git") == ""
    assert gitlab_repo_url(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git") == "https://gitlab.com/example/repo"
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


def test_viewer_ci_status_payload_reports_unavailable_without_glab(tmp_path: Path) -> None:
    (tmp_path / ".gitlab-ci.yml").write_text("test:\n  script: echo test\n", encoding="utf-8")

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@gitlab.com:Example/repo.git (fetch)\n", "")
        raise AssertionError(args)

    payload = ci_status_payload(tmp_path, git_runner=runner, which=lambda name: "/usr/bin/git" if name == "git" else None)

    assert payload["state"] == "unavailable"
    assert payload["visible"] is True
    assert payload["provider"] == "gitlab"
    assert payload["message"] == "GitLab CLI is not available on PATH."
    assert payload["badgeState"] == "unavailable"
    assert payload["repositoryUrl"] == "https://gitlab.com/Example/repo"


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


def test_viewer_ci_status_payload_reads_gitlab_pipelines(tmp_path: Path) -> None:
    (tmp_path / ".gitlab-ci.yml").write_text("test:\n  script: echo test\n", encoding="utf-8")
    glab_calls: list[list[str]] = []

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@gitlab.com:Example/team/repo.git (fetch)\n", "")
        if args[1:] == ["rev-parse", "--abbrev-ref", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "feature/demo\n", "")
        if args[1:] == ["rev-parse", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "abc123\n", "")
        if args[1:] == ["log", "-1", "--pretty=format:%s"]:
            return subprocess.CompletedProcess(args, 0, "Implement GitLab CI view", "")
        if args[1:] == ["log", "-1", "--pretty=format:%an"]:
            return subprocess.CompletedProcess(args, 0, "Alex", "")
        raise AssertionError(args)

    def glab_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        glab_calls.append(args)
        if args[:2] == ["glab", "api"] and args[2] == "projects/Example%2Fteam%2Frepo/pipelines?per_page=30&ref=feature%2Fdemo":
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps(
                    [
                        {
                            "id": 42,
                            "name": "Pipeline",
                            "status": "failed",
                            "ref": "feature/demo",
                            "sha": "abc123",
                            "source": "push",
                            "web_url": "https://gitlab.com/Example/team/repo/-/pipelines/42",
                            "created_at": "2026-06-11T10:00:00Z",
                            "updated_at": "2026-06-11T10:03:00Z",
                            "user": {"name": "Alex"},
                        }
                    ]
                ),
                "",
            )
        if args[:2] == ["glab", "api"] and args[2] == "projects/Example%2Fteam%2Frepo/pipelines/42/jobs?per_page=100":
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps([{"name": "test", "status": "failed", "web_url": "https://gitlab.com/Example/team/repo/-/jobs/1", "started_at": "2026-06-11T10:01:00Z", "finished_at": "2026-06-11T10:03:00Z"}]),
                "",
            )
        raise AssertionError(args)

    payload = ci_status_payload(
        tmp_path,
        git_runner=git_runner,
        glab_runner=glab_runner,
        which=lambda name: f"/usr/bin/{name}" if name in {"git", "glab"} else None,
    )

    assert payload["state"] == "ok"
    assert payload["visible"] is True
    assert payload["provider"] == "gitlab"
    assert payload["branch"] == "feature/demo"
    assert payload["headSha"] == "abc123"
    assert payload["badgeState"] == "failing"
    assert payload["run"]["workflowName"] == "Pipeline"
    assert payload["run"]["matchSource"] == "head-failing"
    assert payload["run"]["commitMessage"] == "Implement GitLab CI view"
    assert payload["jobs"] == [{"name": "test", "status": "failed", "conclusion": "", "htmlUrl": "https://gitlab.com/Example/team/repo/-/jobs/1", "startedAt": "2026-06-11T10:01:00Z", "completedAt": "2026-06-11T10:03:00Z"}]
    assert ["glab", "api", "projects/Example%2Fteam%2Frepo/pipelines?per_page=30&ref=feature%2Fdemo"] in glab_calls


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
        if args[1:] == ["log", "-51", "--date=iso-strict", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"]:
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
    assert payload["badgeCounts"] == {"unpushedCommits": 2, "unpulledCommits": 1, "uncommittedFiles": 5}
    assert payload["badgeAvailability"] == {"unpushedCommits": True, "unpulledCommits": True, "uncommittedFiles": True}
    assert payload["badgeMessages"] == {"unpushedCommits": "", "unpulledCommits": "", "uncommittedFiles": ""}
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
    assert ["git", "log", "-51", "--date=iso-strict", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"] in calls
    assert not any("push" in call or "fetch" in call or "pull" in call for call in calls for _ in [call])


def test_git_fetch_payload_runs_prune_fetch_without_credential_prompt(tmp_path: Path) -> None:
    seen: dict[str, object] = {}

    def runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        seen["args"] = args
        seen["env"] = kwargs.get("env")
        return subprocess.CompletedProcess(args, 0, "", "Fetching origin\n")

    payload = git_fetch_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git")

    assert payload["state"] == "ok"
    assert seen["args"] == ["git", "fetch", "--prune"]
    assert isinstance(seen["env"], dict) and seen["env"]["GIT_TERMINAL_PROMPT"] == "0"


def test_git_fetch_payload_reports_first_error_line(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 1, "", "fatal: could not read Username\nmore noise")

    payload = git_fetch_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git")

    assert payload["state"] == "error"
    assert payload["message"] == "fatal: could not read Username"


def test_git_fetch_payload_handles_timeout(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        raise subprocess.TimeoutExpired(cmd=args, timeout=30)

    payload = git_fetch_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/git")

    assert payload["state"] == "error"
    assert payload["message"] == "Git fetch timed out."


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
        if args[1:] == ["log", "-51", "--date=iso-strict", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"]:
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


def test_viewer_git_commit_payload_stages_selected_files_and_commits(tmp_path: Path) -> None:
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
                        "## main...origin/main",
                        " M clients/viewer/browser-host.js",
                        "R  old.md -> renamed.md",
                        "?? new-file.md",
                    ]
                ),
                "",
            )
        if args[1:] in (
            ["diff", "--no-ext-diff", "--numstat", "--cached"],
            ["diff", "--no-ext-diff", "--numstat"],
            ["log", "-1", "--pretty=format:%h %s"],
            ["log", "-51", "--date=iso-strict", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"],
            ["rev-list", "--count", "@{u}..HEAD"],
        ):
            return subprocess.CompletedProcess(args, 0, "", "")
        if args[1:] == ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]:
            return subprocess.CompletedProcess(args, 0, "origin/main\n", "")
        if args[1:] == ["add", "--", "clients/viewer/browser-host.js", "old.md", "renamed.md"]:
            return subprocess.CompletedProcess(args, 0, "", "")
        if args[1:] == ["commit", "-m", "Add Git commit modal", "--", "clients/viewer/browser-host.js", "old.md", "renamed.md"]:
            return subprocess.CompletedProcess(args, 0, "[main abc1234] Add Git commit modal\n", "")
        if args[1:] == ["rev-parse", "HEAD"]:
            return subprocess.CompletedProcess(args, 0, "abc123456789\n", "")
        raise AssertionError(args)

    payload = git_commit_payload(
        tmp_path,
        ["clients/viewer/browser-host.js", "renamed.md"],
        " Add Git commit modal ",
        runner=runner,
        which=lambda _name: "/usr/bin/git",
    )

    assert payload == {
        "state": "ok",
        "message": "Commit created.",
        "hash": "abc123456789",
        "shortHash": "abc1234",
        "files": ["clients/viewer/browser-host.js", "renamed.md"],
    }
    assert ["git", "add", "--", "clients/viewer/browser-host.js", "old.md", "renamed.md"] in calls
    assert ["git", "commit", "-m", "Add Git commit modal", "--", "clients/viewer/browser-host.js", "old.md", "renamed.md"] in calls


def test_viewer_git_commit_payload_rejects_unknown_paths(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["rev-parse", "--is-inside-work-tree"]:
            return subprocess.CompletedProcess(args, 0, "true\n", "")
        if args[1:] == ["status", "--porcelain=v1", "-b"]:
            return subprocess.CompletedProcess(args, 0, "## main\n M changed.md\n", "")
        if args[1:] in (
            ["diff", "--no-ext-diff", "--numstat", "--cached"],
            ["diff", "--no-ext-diff", "--numstat"],
            ["log", "-1", "--pretty=format:%h %s"],
            ["log", "-51", "--date=iso-strict", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"],
        ):
            return subprocess.CompletedProcess(args, 0, "", "")
        if args[1:] == ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]:
            return subprocess.CompletedProcess(args, 1, "", "no upstream")
        raise AssertionError(args)

    payload = git_commit_payload(tmp_path, ["other.md"], "Message", runner=runner, which=lambda _name: "/usr/bin/git")

    assert payload["state"] == "error"
    assert payload["message"] == "No pending Git change found for other.md."


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
        if args[1:] == ["log", "-51", "--date=iso-strict", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"]:
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
    assert payload["canForce"] is True
    assert payload["hardCapHit"] is False
    assert payload["lineCount"] == 2
    assert payload["content"] == "## req_001_demo - Demo\nP"
    full = git_file_preview_payload(tmp_path, "logics/request/req_001_demo.md", max_chars=24, full=True)
    assert full["truncated"] is False
    assert full["canForce"] is False
    assert full["content"] == "## req_001_demo - Demo\nPreview body\n"
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
    assert too_large["canForce"] is True
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
        if args == ["cdx", "can-resume", "session-1", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"resumable": True, "reason": "supported", "strategy": "provider_last"}), "")
        if args == ["cdx", "configs", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"name": "session-1", "launch": {"permission": "auto"}}]}), "")
        raise AssertionError(args)

    payload = cdx_status_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload["state"] == "ok"
    assert payload["message"] == ""
    assert payload["status"]["availability"] == "ready"
    assert payload["status"]["providers"][0]["name"] == "openai"
    assert payload["status"]["sessions"][0]["resume_available"] is True
    assert payload["status"]["sessions"][0]["resume_reason"] == "supported"
    assert payload["status"]["sessions"][0]["permission"] == "auto"
    assert calls == [["cdx", "status", "--json"], ["cdx", "can-resume", "session-1", "--json"], ["cdx", "configs", "--json"]]


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


def test_viewer_cdx_remove_payload_uses_rmv_force_json(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        assert kwargs["cwd"] == tmp_path
        assert kwargs["timeout"] == 10
        return subprocess.CompletedProcess(args, 0, json.dumps({"message": "Removed work2."}), "")

    payload = cdx_remove_payload(tmp_path, "work2", runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload == {"ok": True, "message": "Removed work2."}
    assert calls == [["cdx", "rmv", "work2", "--force", "--json"]]
    assert cdx_remove_payload(tmp_path, "../bad", runner=runner, which=lambda _name: "/usr/bin/cdx") == {
        "ok": False,
        "error": "Invalid session name.",
    }


def test_viewer_cdx_permission_payload_uses_set_permission_json(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        assert kwargs["cwd"] == tmp_path
        assert kwargs["timeout"] == 10
        return subprocess.CompletedProcess(args, 0, json.dumps({"message": "Permission updated."}), "")

    payload = cdx_permission_payload(tmp_path, "work2", "full", runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload == {"ok": True, "message": "Permission updated.", "permission": "full"}
    assert calls == [["cdx", "set", "work2", "--permission", "full", "--json"]]
    assert cdx_permission_payload(tmp_path, "work2", "danger-full-access", runner=runner, which=lambda _name: "/usr/bin/cdx") == {
        "ok": False,
        "error": "Invalid permission value.",
    }


def test_viewer_cdx_config_payload_sets_power_and_model(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        assert kwargs["cwd"] == tmp_path
        assert kwargs["timeout"] == 10
        return subprocess.CompletedProcess(args, 0, json.dumps({"message": "Updated launch settings."}), "")

    payload = cdx_config_payload(tmp_path, "work2", power="high", model="gpt-5", runner=runner, which=lambda _name: "/usr/bin/cdx")
    assert payload == {"ok": True, "message": "Updated launch settings.", "power": "high", "model": "gpt-5"}
    assert calls == [["cdx", "set", "work2", "--power", "high", "--model", "gpt-5", "--json"]]


def test_viewer_cdx_config_payload_validates_and_requires_a_field(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        raise AssertionError(args)

    which = lambda _name: "/usr/bin/cdx"
    assert cdx_config_payload(tmp_path, "work2", power="ultra", runner=runner, which=which) == {"ok": False, "error": "Invalid power value."}
    assert cdx_config_payload(tmp_path, "work2", model="bad model!", runner=runner, which=which) == {"ok": False, "error": "Invalid model value."}
    assert cdx_config_payload(tmp_path, "work2", runner=runner, which=which) == {"ok": False, "error": "No settings to update."}


def test_viewer_cdx_import_prefers_stdin_when_cdx_supports_it(tmp_path: Path) -> None:
    captured: dict[str, object] = {}

    def runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        captured["args"] = args
        captured["kwargs"] = kwargs
        return subprocess.CompletedProcess(args, 0, json.dumps({"message": "ok"}), "")

    cdx_import_payload(
        tmp_path, b"cdx archive", "super-secret",
        runner=runner, which=lambda _name: "/usr/bin/cdx", supports_stdin=True,
    )
    args = captured["args"]
    kwargs = captured["kwargs"]
    # Newer cdx: secret goes on stdin, never the environment.
    assert "--passphrase-stdin" in args
    assert kwargs.get("input") == "super-secret"
    assert "CDX_IMPORT_PASS" not in kwargs["env"]


def test_viewer_cdx_import_falls_back_to_scoped_env_on_older_cdx(tmp_path: Path) -> None:
    captured: dict[str, object] = {}

    def runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        captured["args"] = args
        captured["kwargs"] = kwargs
        return subprocess.CompletedProcess(args, 0, json.dumps({"message": "ok"}), "")

    cdx_import_payload(
        tmp_path, b"cdx archive", "super-secret",
        runner=runner, which=lambda _name: "/usr/bin/cdx", supports_stdin=False,
    )
    args = captured["args"]
    kwargs = captured["kwargs"]
    # Older cdx: secret rides a per-child env dict, never the parent process env.
    assert "--passphrase-env" in args
    assert kwargs["env"]["CDX_IMPORT_PASS"] == "super-secret"
    assert kwargs.get("input") is None
    assert os.environ.get("CDX_IMPORT_PASS") is None


def test_cdx_capability_probe_detects_passphrase_stdin() -> None:
    def with_flag(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 0, "cdx import <file> [--passphrase-env VAR|--passphrase-stdin]", "")

    def without_flag(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 0, "cdx import <file> [--passphrase-env VAR]", "")

    assert viewer_module._cdx_supports_passphrase_stdin(runner=with_flag) is True
    assert viewer_module._cdx_supports_passphrase_stdin(runner=without_flag) is False


def test_viewer_cdx_import_payload_can_force_overwrite(tmp_path: Path) -> None:
    calls: list[list[str]] = []

    def runner(args: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        calls.append(args)
        assert kwargs["cwd"] == tmp_path
        assert kwargs["timeout"] == 30
        return subprocess.CompletedProcess(args, 0, json.dumps({"message": "Import complete."}), "")

    payload = cdx_import_payload(
        tmp_path,
        b"cdx archive",
        "",
        merge=True,
        force=True,
        runner=runner,
        which=lambda _name: "/usr/bin/cdx",
    )

    assert payload == {"ok": True, "message": "Import complete."}
    assert calls
    assert calls[0][0:2] == ["cdx", "import"]
    assert calls[0][-3:] == ["--json", "--merge", "--force"]


def test_viewer_cdx_runs_payload_reads_observable_runs(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        assert args[-2:] == ["runs", "--json"]
        return subprocess.CompletedProcess(args, 0, json.dumps({
            "ok": True,
            "runs": [
                {"run_id": "run-1", "kind": "code-review", "status": "running", "session": "work", "usage": {"input_tokens": 10, "output_tokens": 5}},
                {"run_id": "run-2", "kind": "assistant", "status": "succeeded", "session": "auto"},
            ],
        }), "")

    payload = cdx_runs_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload["state"] == "ok"
    assert [run["run_id"] for run in payload["runs"]] == ["run-1", "run-2"]
    assert payload["runs"][0]["usage"]["inputTokens"] == 10
    assert payload["runs"][0]["usage"]["outputTokens"] == 5
    assert payload["runs"][0]["usage"]["totalTokens"] == 15


def test_viewer_cdx_runs_payload_handles_unavailable_and_invalid_json(tmp_path: Path) -> None:
    assert cdx_runs_payload(tmp_path, which=lambda _name: None)["state"] == "unavailable"

    def invalid_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(args, 0, "{}", "")

    assert cdx_runs_payload(tmp_path, runner=invalid_runner, which=lambda _name: "/usr/bin/cdx")["state"] == "invalid-json"


def test_viewer_cdx_history_payload_reads_launch_history(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        assert args[-2:] == ["history", "--json"]
        return subprocess.CompletedProcess(args, 0, json.dumps({
            "ok": True,
            "message": "Listed launch history",
            "history": [
                {
                    "session_name": "work",
                    "provider": "codex",
                    "status": "success",
                    "action": "launch",
                    "duration_ms": 1200,
                    "usage": {"input_tokens": 30, "output_tokens": 12},
                }
            ],
            "period": {"from": None, "to": None},
        }), "")

    payload = cdx_history_payload(tmp_path, runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload["state"] == "ok"
    assert payload["message"] == "Listed launch history"
    assert payload["history"][0]["session_name"] == "work"
    assert payload["history"][0]["usage"]["inputTokens"] == 30
    assert payload["history"][0]["usage"]["outputTokens"] == 12
    assert payload["history"][0]["usage"]["totalTokens"] == 42


def test_viewer_cdx_run_report_payload_reads_report(tmp_path: Path) -> None:
    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        assert args[-3:] == ["run-report", "run-1", "--json"]
        return subprocess.CompletedProcess(args, 0, json.dumps({
            "ok": True,
            "report": {
                "run": {"run_id": "run-1", "status": "succeeded", "usage": {"input_tokens": 20, "output_tokens": 7}},
                "task_report": {"kind": "code-review", "summary": "One issue.", "findings": []},
            },
        }), "")

    payload = cdx_run_report_payload(tmp_path, "run-1", runner=runner, which=lambda _name: "/usr/bin/cdx")

    assert payload["state"] == "ok"
    assert payload["report"]["run"]["run_id"] == "run-1"
    assert payload["report"]["task_report"]["kind"] == "code-review"
    assert payload["report"]["usage"]["inputTokens"] == 20
    assert payload["report"]["usage"]["outputTokens"] == 7
    assert payload["report"]["usage"]["totalTokens"] == 27


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
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
        raise AssertionError(args)

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:4] == ["tag", "--sort=-version:refname", "--list"]:
            return subprocess.CompletedProcess(args, 0, "v2.4.0\nv2.3.0\n", "")
        raise AssertionError(args)

    payload = cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "release-review", "sessionId": "work", "strengthId": "deep", "model": "gpt-5.1-codex", "reasoningEffort": "xhigh", "power": "high"},
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
    assert command[command.index("--model") + 1] == "gpt-5.1-codex"
    assert "--json" in command
    prompt = command[command.index("--prompt") + 1]
    assert "since the latest release tag v2.4.0" in prompt
    assert payload["plan"]["model"] == "gpt-5.1-codex"
    assert payload["plan"]["reasoningEffort"] == "xhigh"
    assert payload["plan"]["power"] == "high"
    assert command[command.index("--reasoning-effort") + 1] == "xhigh"
    assert command[command.index("--power") + 1] == "high"
    # release-review always requires file writes, so the writable minimum timeout applies.
    assert command[command.index("--timeout-seconds") + 1] == "600"


def test_viewer_cdx_mission_plan_rejects_unknown_strength_and_unusable_session(tmp_path: Path) -> None:
    assert cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "full-audit", "sessionId": "work", "strengthId": "turbo"},
        which=lambda name: f"/usr/bin/{name}",
    )["state"] == "error"
    assert cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "full-audit", "sessionId": "work", "reasoningEffort": "reckless"},
        which=lambda name: f"/usr/bin/{name}",
    )["state"] == "error"
    assert cdx_mission_plan_payload(
        tmp_path,
        {"missionId": "full-audit", "sessionId": "work", "power": "reckless"},
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
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
        # full-audit always requires file writes: full plan and writable minimum timeout.
        assert kwargs["timeout"] == 690
        assert args[:4] == ["cdx", "run", "work", "--cwd"]
        assert args[4] == str(tmp_path)
        assert "--session" not in args
        assert "--mission" not in args
        assert "--scope" not in args
        assert args[args.index("--prompt") + 1].startswith("Run a full repository audit")
        assert args[args.index("--permission") + 1] == "full"
        assert args[args.index("--timeout-seconds") + 1] == "600"
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
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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


def test_viewer_cdx_runs_marks_permission_denials_as_blocked(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        assert args == ["cdx", "runs", "--json"]
        return subprocess.CompletedProcess(
            args,
            0,
            json.dumps(
                {
                    "runs": [
                        {
                            "run_id": "blocked-run",
                            "status": "succeeded",
                            "permission_denials": [{"tool_name": "Bash", "tool_input": {"command": "logics-manager audit"}}],
                        }
                    ]
                }
            ),
            "",
        )

    payload = cdx_runs_payload(tmp_path, runner=cdx_runner, which=lambda name: f"/usr/bin/{name}")

    assert payload["state"] == "ok"
    assert payload["runs"][0]["status"] == "blocked"
    assert payload["runs"][0]["raw_status"] == "succeeded"
    assert payload["runs"][0]["permissionDenials"][0]["tool_name"] == "Bash"


def test_viewer_cdx_mission_plan_allows_full_permission_when_writes_requested(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
    assert payload["plan"]["permission"] == "full"
    assert payload["plan"]["requestedFileWrites"] is True
    assert payload["plan"]["commitAtEnd"] is False
    assert payload["plan"]["supportsFileWrites"] is True
    args = payload["plan"]["arguments"]
    assert args[args.index("--permission") + 1] == "full"
    prompt = args[args.index("--prompt") + 1]
    assert "File edits are allowed" in prompt
    assert "Always capture the outcome as a bounded Logics request" in prompt
    assert "do not directly modify product/source files" in prompt
    assert "requestFiles" in prompt
    assert "validationEvidence" in prompt


def test_viewer_cdx_mission_plan_passes_commit_at_end_instruction(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
    assert payload["plan"]["permission"] == "full"
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "Fix safe, scoped issues directly" in prompt
    assert "capture the completed work as a full Logics workflow chain as proof" in prompt
    assert "directFixes" in prompt
    assert "changedFiles" in prompt
    assert "workflowRefs" in prompt


def test_viewer_cdx_mission_release_review_write_prompt_stays_guarded(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
    assert payload["plan"]["permission"] == "full"
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "Always capture the outcome as a bounded Logics request" in prompt
    assert "do not directly modify product/source files" in prompt
    assert "do not bump versions, tag, push, publish" in prompt
    assert "requestFiles" in prompt
    assert "validationEvidence" in prompt


def test_viewer_cdx_mission_release_review_direct_fix_prompt_stays_guarded(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
    assert payload["plan"]["permission"] == "full"
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert "Fix safe, scoped release-readiness issues directly" in prompt
    assert "Do not bump versions, tag, push, publish" in prompt
    assert "capture the completed work as a full Logics workflow chain as proof" in prompt
    assert "directFixes" in prompt
    assert "changedFiles" in prompt
    assert "workflowRefs" in prompt


def test_viewer_cdx_mission_plan_builds_corpus_prompt_for_current_cdx_cli(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
    assert write_payload["plan"]["permission"] == "full"
    write_prompt = write_payload["plan"]["arguments"][write_payload["plan"]["arguments"].index("--prompt") + 1]
    assert "Create the request draft file under logics/request/" in write_prompt
    assert "next available req_ slug" in write_prompt
    assert "Include the created path in generatedFiles" in write_prompt


def test_viewer_cdx_mission_plan_builds_guarded_pre_release_prompt(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
    assert payload["plan"]["permission"] == "full"
    prompt = payload["plan"]["arguments"][payload["plan"]["arguments"].index("--prompt") + 1]
    assert prompt == payload["plan"]["prompt"]
    assert payload["plan"]["promptEdited"] is False
    assert "version v2.8.0" in prompt
    assert "Run the release contract validation commands" in prompt
    assert "Prepare release metadata for the requested version" in prompt
    # No contract exists under tmp_path, so the mission instructs CDX to infer a draft.
    assert "No active release contract" in prompt
    assert "Infer a release contract draft" in prompt
    assert "create Git tags" in prompt
    assert "publish packages" in prompt


def test_viewer_cdx_mission_plan_keeps_pre_release_read_only_when_writes_disabled(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
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
    assert "Do not modify version sources" in prompt
    assert "Do not modify files." in prompt


def test_viewer_cdx_mission_pre_release_prompt_uses_release_contract(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
        raise AssertionError(args)

    contract_dir = tmp_path / "logics" / "release"
    contract_dir.mkdir(parents=True)
    (contract_dir / "contract.json").write_text(
        json.dumps({
            "schema_version": "1.0",
            "version_sources": [
                {"path": "VERSION", "format": "plain_text"},
                {"path": "pyproject.toml", "format": "toml", "selector": "project.version"},
            ],
            "changelog": {"version_heading_required": True, "paths": [{"path": "changelogs/CHANGELOGS_{version_underscore}.md"}]},
            "validation_commands": [{"id": "ci_check", "command": ["node", "scripts/ci-check.mjs"]}],
            "git": {"allowed_branches": ["main"], "tag_policy": {"pattern": "v{version}"}},
            "operator_intents": [{"utterance": "prepare release", "boundary": "Prepare metadata only; do not tag or publish."}],
            "gates": [],
        }),
        encoding="utf-8",
    )

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
    prompt = payload["plan"]["prompt"]
    assert "release contract (logics/release/contract.json) as the single source of truth" in prompt
    assert "pyproject.toml (project.version)" in prompt
    assert "changelogs/CHANGELOGS_{version_underscore}.md" in prompt
    assert "node scripts/ci-check.mjs" in prompt
    assert "release tag pattern: v{version}" in prompt
    assert "Prepare metadata only; do not tag or publish." in prompt
    assert "No active release contract" not in prompt


def test_viewer_cdx_mission_plan_respects_operator_prompt_override(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        response = _cdx_test_status_response(args)
        if response is not None:
            return response
        raise AssertionError(args)

    override = "Custom operator prompt.\nKeep changes scoped."
    payload = cdx_mission_plan_payload(
        tmp_path,
        {
            "missionId": "full-audit",
            "sessionId": "work",
            "strengthId": "standard",
            "promptOverride": override,
        },
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "ok"
    plan = payload["plan"]
    assert plan["promptEdited"] is True
    assert plan["prompt"] == override
    assert plan["arguments"][plan["arguments"].index("--prompt") + 1] == override
    # Structural flags stay server-enforced regardless of the edited prompt.
    assert "--permission" in plan["arguments"]
    assert any("operator-edited prompt" in warning for warning in plan["warnings"])


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


def test_viewer_cdx_mission_run_reports_permission_denials_as_blocked(tmp_path: Path) -> None:
    def cdx_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args == ["cdx", "status", "--json"]:
            return subprocess.CompletedProcess(args, 0, json.dumps({"sessions": [{"id": "work"}]}), "")
        return subprocess.CompletedProcess(
            args,
            0,
            json.dumps(
                {
                    "run_id": "run-42",
                    "permission_denials": [{"tool_name": "Write", "tool_input": {"file_path": "logics/request/req_251.md"}}],
                    "usage": {"total_tokens": 12},
                }
            ),
            "",
        )

    payload = cdx_mission_run_payload(
        tmp_path,
        {"missionId": "full-audit", "sessionId": "work", "strengthId": "standard"},
        cdx_runner=cdx_runner,
        which=lambda name: f"/usr/bin/{name}",
    )

    assert payload["state"] == "blocked"
    assert payload["run"]["permissionDenials"][0]["tool_name"] == "Write"
    assert payload["run"]["runId"] == "run-42"


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


def test_viewer_status_endpoint_caches_and_revalidates_with_etag(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    calls = {"count": 0}

    def fake_git_status_payload(repo_root: Path) -> dict[str, object]:
        calls["count"] += 1
        return {"state": "ok", "changes": []}

    monkeypatch.setattr(viewer_module, "git_status_payload", fake_git_status_payload)
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("GET", "/api/git-status")
        first = conn.getresponse()
        body = first.read().decode("utf-8")
        etag = first.getheader("ETag")
        assert first.status == 200
        assert etag
        assert first.getheader("Cache-Control") == "no-cache"
        assert json.loads(body)["payload"]["state"] == "ok"

        # Second poll within the TTL reuses the cached body (no recompute) and
        # revalidates to 304 when the client presents the ETag.
        conn.request("GET", "/api/git-status", headers={"If-None-Match": etag})
        second = conn.getresponse()
        second.read()
        assert second.status == 304
        assert second.getheader("ETag") == etag
        assert calls["count"] == 1
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_viewer_consolidated_status_endpoint_combines_and_shares_components(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    calls: dict[str, int] = {"git": 0, "ci": 0, "releaseRuns": 0, "cdx": 0, "cdxRuns": 0}

    def make(name: str, value: dict[str, object]):
        def producer(repo_root: Path) -> dict[str, object]:
            calls[name] += 1
            return value
        return producer

    monkeypatch.setattr(viewer_module, "git_status_payload", make("git", {"state": "ok"}))
    monkeypatch.setattr(viewer_module, "ci_status_payload", make("ci", {"visible": True}))
    monkeypatch.setattr(viewer_module, "release_runs_payload", make("releaseRuns", {"visible": True}))
    monkeypatch.setattr(viewer_module, "cdx_status_payload", make("cdx", {"state": "ok"}))
    monkeypatch.setattr(viewer_module, "cdx_runs_payload", make("cdxRuns", {"runs": []}))
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("GET", "/api/status")
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))["payload"]
        assert response.status == 200
        assert set(payload) == {"git", "ci", "releaseRuns", "cdx", "cdxRuns"}
        assert payload["git"]["state"] == "ok"

        # An individual endpoint hit within the TTL reuses the shared component
        # computed for the consolidated response (no second git computation).
        conn.request("GET", "/api/git-status")
        conn.getresponse().read()
        assert calls["git"] == 1
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_viewer_remote_status_components_use_longer_ttl(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    calls = {"ci": 0}
    now = {"value": 1000.0}

    def fake_ci_status_payload(repo_root: Path) -> dict[str, object]:
        calls["ci"] += 1
        return {"visible": True, "count": calls["ci"]}

    monkeypatch.setattr(viewer_module.time, "monotonic", lambda: now["value"])
    monkeypatch.setattr(viewer_module, "ci_status_payload", fake_ci_status_payload)
    server = create_viewer_server_or_skip(tmp_path)
    try:
        assert server.status_component("ci", lambda: viewer_module.ci_status_payload(tmp_path))["count"] == 1
        now["value"] += viewer_module.STATUS_CACHE_TTL_SECONDS + 1
        assert server.status_component("ci", lambda: viewer_module.ci_status_payload(tmp_path))["count"] == 1
        now["value"] += viewer_module.REMOTE_STATUS_CACHE_TTL_SECONDS
        assert server.status_component("ci", lambda: viewer_module.ci_status_payload(tmp_path))["count"] == 2
    finally:
        server.server_close()


def test_viewer_events_stream_reports_corpus_changes(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    logics_dir = tmp_path / "logics" / "request"
    logics_dir.mkdir(parents=True)
    request_path = logics_dir / "req_001_demo.md"
    request_path.write_text("## req_001_demo - Demo\n", encoding="utf-8")
    monkeypatch.setattr(viewer_module, "ci_status_payload", lambda _repo_root: {"visible": True, "badgeState": "passing"})
    monkeypatch.setattr(viewer_module, "cdx_status_payload", lambda _repo_root: {"state": "unavailable"})
    monkeypatch.setattr(viewer_module, "cdx_runs_payload", lambda _repo_root: {"runs": []})
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    conn: HTTPConnection | None = None
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=10)
        conn.request("GET", "/api/events")
        response = conn.getresponse()
        assert response.status == 200
        assert response.getheader("Content-Type", "").startswith("text/event-stream")

        deadline = time.time() + 5
        while time.time() < deadline:
            line = response.readline().decode("utf-8")
            if line.startswith("event: ready"):
                break
        else:
            raise AssertionError("viewer events stream did not emit ready")

        request_path.write_text("## req_001_demo - Demo\n\nChanged\n", encoding="utf-8")
        event_name = ""
        data = ""
        deadline = time.time() + 8
        while time.time() < deadline:
            line = response.readline().decode("utf-8").strip()
            if line.startswith("event:"):
                event_name = line.partition(":")[2].strip()
            elif line.startswith("data:"):
                data = line.partition(":")[2].strip()
            elif not line and event_name == "changed" and data:
                payload = json.loads(data)
                assert "corpus" in payload["components"]
                break
        else:
            raise AssertionError("viewer events stream did not report corpus change")
    finally:
        if conn is not None:
            conn.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_viewer_server_close_does_not_wait_for_open_event_stream(tmp_path: Path) -> None:
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
    close_thread: threading.Thread | None = None
    try:
        conn.request("GET", "/api/events")
        response = conn.getresponse()
        assert response.status == 200
        assert response.readline().startswith(b"event: ready")

        server.shutdown()
        close_thread = threading.Thread(target=server.server_close, daemon=True)
        close_thread.start()
        close_thread.join(timeout=1)

        assert close_thread.is_alive() is False
    finally:
        conn.close()
        if close_thread is not None:
            close_thread.join(timeout=5)
        thread.join(timeout=5)


def test_viewer_update_status_accepts_absolute_repo_path(tmp_path: Path) -> None:
    request_path = tmp_path / "logics" / "request" / "req_001_demo.md"
    request_path.parent.mkdir(parents=True)
    _write_minimal_workflow_doc(
        request_path,
        title="Demo request",
        kind="request",
        status="Ready",
        links=[],
    )
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request(
            "POST",
            "/api/update-status",
            body=json.dumps({"path": str(request_path), "status": "Done"}),
            headers={"Content-Type": "application/json"},
        )
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))

        assert response.status == 200
        assert payload["ok"] is True
        assert payload["payload"]["path"] == "logics/request/req_001_demo.md"
        assert payload["payload"]["updated_indicators"] == {"Status": "Done"}
        assert "> Status: Done" in request_path.read_text(encoding="utf-8")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


@pytest.mark.parametrize(
    ("rel_path", "next_status", "expected_kind"),
    [
        ("logics/product/prod_001_demo.md", "Accepted", "product"),
        ("logics/architecture/adr_001_demo.md", "Accepted", "architecture"),
        ("logics/specs/spec_001_demo.md", "Validated", "spec"),
    ],
)
def test_viewer_update_status_resolves_companion_doc_paths(tmp_path: Path, rel_path: str, next_status: str, expected_kind: str) -> None:
    doc_path = tmp_path / rel_path
    doc_path.parent.mkdir(parents=True)
    _write_minimal_workflow_doc(
        doc_path,
        title="Demo companion",
        kind=expected_kind,
        status="Draft",
        links=[],
    )
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request(
            "POST",
            "/api/update-status",
            body=json.dumps({"path": rel_path, "status": next_status}),
            headers={"Content-Type": "application/json"},
        )
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))

        assert response.status == 200
        assert payload["ok"] is True
        assert payload["payload"]["path"] == rel_path
        assert payload["payload"]["kind"] == expected_kind
        assert payload["payload"]["updated_indicators"] == {"Status": next_status}
        assert f"> Status: {next_status}" in doc_path.read_text(encoding="utf-8")
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
    assert payload["shouldPromptBootstrapLogics"] is True
    assert "Bootstrap Logics" in payload["bootstrapLogicsTitle"]


def test_viewer_payload_keeps_bootstrap_refresh_available_for_ready_projects(tmp_path: Path) -> None:
    bootstrap_payload(tmp_path, check=False)

    payload = viewer_module.viewer_data_payload(tmp_path)

    assert payload["capabilities"]["logics"]["state"] == "ready"
    assert payload["canBootstrapLogics"] is True
    assert payload["shouldPromptBootstrapLogics"] is False
    assert "Refresh Logics bootstrap files" in payload["bootstrapLogicsTitle"]
    assert payload["bootstrapWarning"] is None


def test_viewer_payload_warns_when_bootstrap_instructions_are_stale(tmp_path: Path) -> None:
    bootstrap_payload(tmp_path, check=False)
    (tmp_path / "LOGICS.md").write_text("# Old local instructions\n", encoding="utf-8")

    payload = viewer_module.viewer_data_payload(tmp_path)

    assert payload["capabilities"]["logics"]["state"] == "ready"
    assert payload["canBootstrapLogics"] is True
    assert payload["shouldPromptBootstrapLogics"] is False
    assert payload["bootstrapWarning"]["title"] == "Logics bootstrap refresh recommended"
    assert "LOGICS.md" in payload["bootstrapWarning"]["paths"]
    assert "logics-manager bootstrap" in payload["bootstrapWarning"]["message"]


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


def test_viewer_server_switch_project_root_adds_selected_project(tmp_path: Path) -> None:
    active = tmp_path / "logics-manager"
    selected = tmp_path / "selected-project"
    active_request = active / "logics" / "request"
    selected_request = selected / "logics" / "request"
    active_request.mkdir(parents=True)
    selected_request.mkdir(parents=True)
    (active_request / "req_001_active.md").write_text("## req_001_active - Active\n> Status: Ready\n", encoding="utf-8")
    (selected_request / "req_001_selected.md").write_text("## req_001_selected - Selected\n> Status: Ready\n", encoding="utf-8")

    server = create_viewer_server_or_skip(active)
    try:
        payload = server.switch_project_root(selected)

        assert payload["repoName"] == "selected-project"
        assert [item["id"] for item in payload["items"]] == ["req_001_selected"]
        assert next(entry for entry in payload["projects"] if entry["name"] == "selected-project")["active"] is True
    finally:
        server.server_close()


def test_viewer_server_switch_project_root_accepts_plain_folder(tmp_path: Path) -> None:
    active = tmp_path / "logics-manager"
    selected = tmp_path / "plain-folder"
    (active / "logics" / "request").mkdir(parents=True)
    selected.mkdir()

    server = create_viewer_server_or_skip(active)
    try:
        payload = server.switch_project_root(selected)

        assert payload["repoName"] == "plain-folder"
        assert payload["capabilities"]["logics"]["state"] == "missing"
        assert next(entry for entry in payload["projects"] if entry["name"] == "plain-folder")["active"] is True
    finally:
        server.server_close()


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
        assert payload["payload"]["canBootstrapLogics"] is True
        assert payload["payload"]["shouldPromptBootstrapLogics"] is False
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


def test_viewer_release_status_endpoint_returns_payload(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        viewer_module,
        "release_status_payload",
        lambda repo_root: {"state": "not_configured", "configured": False, "next_action": str(repo_root), "gates": []},
    )
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("GET", "/api/release-status")
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
        assert response.status == 200
        assert payload["ok"] is True
        assert payload["payload"]["state"] == "not_configured"
        assert payload["payload"]["next_action"] == str(tmp_path)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_viewer_release_runs_payload_hides_without_release_workflow(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "ci.yml").write_text("name: CI\n", encoding="utf-8")

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        raise AssertionError(args)

    payload = viewer_module.release_runs_payload(
        tmp_path,
        git_runner=runner,
        which=lambda name: "/usr/bin/git" if name == "git" else None,
    )

    assert payload["state"] == "hidden"
    assert payload["visible"] is False
    assert payload["message"] == "No release workflow detected."


def test_github_release_workflow_file_detects_non_release_named_triggers(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    # No release.yml; publish workflows triggered on a published GitHub release.
    (workflows / "ci.yml").write_text("name: CI\non:\n  push:\n    branches: [main]\njobs:\n  build: {}\n", encoding="utf-8")
    (workflows / "publish-pypi.yml").write_text("name: Publish PyPI\non:\n  release:\n    types: [published]\njobs:\n  publish: {}\n", encoding="utf-8")
    (workflows / "publish-npm.yml").write_text("name: Publish npm\non:\n  release:\n    types: [published]\njobs:\n  publish: {}\n", encoding="utf-8")

    # Deterministic pick among equal-ranked "publish*" candidates.
    assert viewer_module._github_release_workflow_file(tmp_path) == "publish-npm.yml"

    # Explicit release.yml still wins when present.
    (workflows / "release.yml").write_text("name: Release\non:\n  push:\n    tags: ['v*']\njobs:\n  release: {}\n", encoding="utf-8")
    assert viewer_module._github_release_workflow_file(tmp_path) == "release.yml"


def test_viewer_release_runs_payload_reports_unavailable_without_gh(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "release.yml").write_text("name: Release\n", encoding="utf-8")

    def runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        raise AssertionError(args)

    payload = viewer_module.release_runs_payload(
        tmp_path,
        git_runner=runner,
        which=lambda name: "/usr/bin/git" if name == "git" else None,
    )

    assert payload["state"] == "unavailable"
    assert payload["visible"] is True
    assert payload["badgeState"] == "unavailable"
    assert payload["repositoryUrl"] == "https://github.com/Example/repo"


def test_viewer_release_runs_payload_reads_release_workflow(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "release.yml").write_text("name: Release\n", encoding="utf-8")
    gh_calls: list[list[str]] = []

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        raise AssertionError(args)

    def gh_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        gh_calls.append(args)
        if args[:2] == ["gh", "api"] and args[2] == "repos/Example/repo/actions/workflows/release.yml/runs?per_page=10":
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps(
                    {
                        "workflow_runs": [
                            {
                                "id": 99,
                                "name": "Release",
                                "status": "completed",
                                "conclusion": "success",
                                "head_branch": "v2.12.3",
                                "head_sha": "def456",
                                "event": "push",
                                "html_url": "https://github.com/Example/repo/actions/runs/99",
                                "created_at": "2026-06-22T00:30:00Z",
                                "updated_at": "2026-06-22T00:37:00Z",
                                "run_started_at": "2026-06-22T00:30:10Z",
                                "head_commit": {"message": "Prepare release 2.12.3", "author": {"name": "Alex"}},
                            }
                        ]
                    }
                ),
                "",
            )
        if args[:2] == ["gh", "api"] and args[2] == "repos/Example/repo/actions/runs/99/jobs?per_page=100":
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps({"jobs": [{"name": "package", "status": "completed", "conclusion": "success", "html_url": "https://github.com/Example/repo/actions/runs/99/job/1"}]}),
                "",
            )
        raise AssertionError(args)

    payload = viewer_module.release_runs_payload(
        tmp_path,
        git_runner=git_runner,
        gh_runner=gh_runner,
        which=lambda name: f"/usr/bin/{name}" if name in {"git", "gh"} else None,
    )

    assert payload["state"] == "ok"
    assert payload["visible"] is True
    assert payload["badgeState"] == "passing"
    assert payload["version"] == "v2.12.3"
    assert payload["activeCount"] == 0
    assert payload["run"]["matchSource"] == "release-latest"
    assert payload["run"]["version"] == "v2.12.3"
    assert payload["run"]["commitMessage"] == "Prepare release 2.12.3"
    assert payload["jobs"] == [{"name": "package", "status": "completed", "conclusion": "success", "htmlUrl": "https://github.com/Example/repo/actions/runs/99/job/1", "startedAt": "", "completedAt": ""}]
    assert ["gh", "api", "repos/Example/repo/actions/workflows/release.yml/runs?per_page=10"] in gh_calls


def test_viewer_release_runs_payload_prefers_active_run(tmp_path: Path) -> None:
    workflows = tmp_path / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "release.yml").write_text("name: Release\n", encoding="utf-8")

    def git_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[1:] == ["remote", "-v"]:
            return subprocess.CompletedProcess(args, 0, "origin\tgit@github.com:Example/repo.git (fetch)\n", "")
        raise AssertionError(args)

    def gh_runner(args: list[str], **_kwargs: object) -> subprocess.CompletedProcess[str]:
        if args[2].startswith("repos/Example/repo/actions/workflows/release.yml/runs"):
            return subprocess.CompletedProcess(
                args,
                0,
                json.dumps(
                    {
                        "workflow_runs": [
                            {"id": 2, "name": "Release", "status": "completed", "conclusion": "success", "head_branch": "v2.12.3"},
                            {"id": 3, "name": "Release", "status": "in_progress", "conclusion": None, "head_branch": "v2.12.4"},
                        ]
                    }
                ),
                "",
            )
        return subprocess.CompletedProcess(args, 0, json.dumps({"jobs": []}), "")

    payload = viewer_module.release_runs_payload(
        tmp_path,
        git_runner=git_runner,
        gh_runner=gh_runner,
        which=lambda name: f"/usr/bin/{name}" if name in {"git", "gh"} else None,
    )

    assert payload["badgeState"] == "running"
    assert payload["version"] == "v2.12.4"
    assert payload["activeCount"] == 1
    assert payload["run"]["matchSource"] == "release-active"


def test_viewer_release_runs_endpoint_returns_payload(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(
        viewer_module,
        "release_runs_payload",
        lambda repo_root: {"state": "ok", "visible": True, "badgeState": "passing", "version": "v9.9.9", "run": None, "jobs": [], "activeCount": 0},
    )
    server = create_viewer_server_or_skip(tmp_path)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("GET", "/api/release-runs")
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
        assert response.status == 200
        assert payload["ok"] is True
        assert payload["payload"]["version"] == "v9.9.9"
        assert payload["payload"]["badgeState"] == "passing"
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
    absolute_request = repo_root / "logics" / "request" / "req_001_demo.md"

    assert normalize_viewer_focus_target(repo_root, "req_001_demo") == "logics/request/req_001_demo.md"
    assert normalize_viewer_focus_target(repo_root, "logics/tasks/task_001_demo.md") == "logics/tasks/task_001_demo.md"
    assert normalize_viewer_focus_target(repo_root, "logics%2Fbacklog%2Fitem_001_demo.md") == "logics/backlog/item_001_demo.md"
    assert normalize_viewer_focus_target(repo_root, str(absolute_request)) == "logics/request/req_001_demo.md"

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
        tls_enabled = False
        url_scheme = "http"
        lan_token = ""
        lan_rw_mode = False

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
    assert "Logics viewer running" in captured.out
    assert "Local: http://127.0.0.1:8765" in captured.out
    assert "focus=logics%2Frequest%2Freq_001_demo.md&read=1" in captured.out
    assert opened == ["http://127.0.0.1:8765?focus=logics%2Frequest%2Freq_001_demo.md&read=1"]
    assert fake_server.closed is True


def test_viewer_start_status_includes_version() -> None:
    status = viewer_module.render_start_status(
        "http://127.0.0.1:8765", Path("/repo/demo"), version="9.9.9"
    )

    assert status.splitlines()[0] == "Logics viewer running (v9.9.9):"


def test_viewer_styled_banner_is_a_boxed_aligned_panel() -> None:
    import re

    banner = viewer_module.render_start_status(
        "http://127.0.0.1:8765",
        Path("/x/logics-manager"),
        version="2.12.3",
        network_url="http://192.168.1.20:8765",
        focus="req_001_demo",
        styled=True,
    )
    ansi = re.compile(r"\x1b\[[0-9;]*m")
    box_lines = [
        ansi.sub("", line)
        for line in banner.splitlines()
        if ansi.sub("", line)[:1] in {"╭", "│", "╰"}
    ]
    # Every box line renders to the same display width (no misalignment).
    assert len({viewer_module._display_width(line) for line in box_lines}) == 1
    assert box_lines[0].startswith("╭─ Logics viewer")
    assert "v2.12.3" in box_lines[0]
    assert any("http://127.0.0.1:8765" in line for line in box_lines)
    assert any("http://192.168.1.20:8765" in line for line in box_lines)


def test_viewer_banner_style_gating_honors_no_color(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(viewer_module.sys.stdout, "isatty", lambda: True)
    monkeypatch.delenv("NO_COLOR", raising=False)
    monkeypatch.setenv("TERM", "xterm-256color")
    assert viewer_module._supports_banner_style() is True

    monkeypatch.setenv("NO_COLOR", "1")
    assert viewer_module._supports_banner_style() is False


def test_viewer_main_aborts_without_corpus_when_declined(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    created: list[object] = []
    monkeypatch.setattr(viewer_module, "find_repo_root", lambda _cwd: tmp_path)
    monkeypatch.setattr(
        viewer_module,
        "create_viewer_server",
        lambda *_a, **_k: created.append(object()),
    )
    monkeypatch.setattr(viewer_module.sys.stdin, "isatty", lambda: True)
    monkeypatch.setattr("builtins.input", lambda _prompt="": "n")

    exit_code = viewer_module.main(["--host", "127.0.0.1", "--port", "8765"])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "No Logics corpus" in captured.out
    assert created == []  # server never started


def test_viewer_main_proceeds_without_corpus_when_yes_flag(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    class FakeViewerServer:
        server_address = ("127.0.0.1", 8765)
        tls_enabled = False
        url_scheme = "http"
        lan_token = ""
        lan_rw_mode = False
        restart_requested = False

        def serve_forever(self) -> None:
            raise KeyboardInterrupt

        def server_close(self) -> None:
            return

    created: list[object] = []

    def _factory(_repo_root: Path, host: str, port: int, **_kwargs: object) -> FakeViewerServer:
        server = FakeViewerServer()
        created.append(server)
        return server

    monkeypatch.setattr(viewer_module, "find_repo_root", lambda _cwd: tmp_path)
    monkeypatch.setattr(viewer_module, "create_viewer_server", _factory)
    # --yes must skip the prompt even when a TTY is attached.
    monkeypatch.setattr(viewer_module.sys.stdin, "isatty", lambda: True)

    def _no_prompt(_prompt: str = "") -> str:
        raise AssertionError("prompt should be skipped with --yes")

    monkeypatch.setattr("builtins.input", _no_prompt)

    assert viewer_module.main(["--host", "127.0.0.1", "--port", "8765", "--yes"]) == 0
    assert len(created) == 1  # server started despite missing corpus


def test_viewer_main_ignores_repeated_keyboard_interrupt_during_close(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    class FakeViewerServer:
        server_address = ("127.0.0.1", 8765)
        tls_enabled = False
        url_scheme = "http"
        lan_token = ""
        lan_rw_mode = False
        restart_requested = False

        def serve_forever(self) -> None:
            raise KeyboardInterrupt

        def server_close(self) -> None:
            raise KeyboardInterrupt

    monkeypatch.setattr(viewer_module, "find_repo_root", lambda _cwd: tmp_path)
    monkeypatch.setattr(viewer_module, "create_viewer_server", lambda _repo_root, host, port, **_kwargs: FakeViewerServer())

    assert viewer_module.main(["--host", "127.0.0.1", "--port", "8765"]) == 0


def test_viewer_main_execs_after_restart_request(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    class FakeViewerServer:
        server_address = ("127.0.0.1", 8765)
        tls_enabled = False
        url_scheme = "http"
        lan_token = ""
        lan_rw_mode = False
        restart_requested = True

        def __init__(self) -> None:
            self.closed = False

        def serve_forever(self) -> None:
            return

        def server_close(self) -> None:
            self.closed = True

    fake_server = FakeViewerServer()
    exec_calls: list[tuple[str, list[str]]] = []

    def fake_execv(executable: str, command: list[str]) -> None:
        exec_calls.append((executable, command))
        raise RuntimeError("execv called")

    monkeypatch.setattr(viewer_module, "find_repo_root", lambda _cwd: tmp_path)
    monkeypatch.setattr(viewer_module, "create_viewer_server", lambda _repo_root, host, port, **_kwargs: fake_server)
    monkeypatch.setattr(viewer_module.os, "execv", fake_execv)

    with pytest.raises(RuntimeError, match="execv called"):
        viewer_module.main(["--host", "127.0.0.1", "--port", "8765"])

    capsys.readouterr()
    assert fake_server.closed is True
    assert exec_calls == [(sys.executable, [sys.executable, *sys.argv])]


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
            # Read the whole body: bundle ordering (esbuild) can push a sentinel
            # past any fixed prefix window, so a bounded read would flake.
            body = response.read()
            assert response.status == 200, route
            assert expected in body, route
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def test_resolve_viewer_root_falls_back_when_no_logics_corpus(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    # With a logics/ corpus, it resolves to that repo root.
    repo = tmp_path / "withlogics"
    (repo / "logics").mkdir(parents=True)
    assert viewer_module._resolve_viewer_root(repo) == repo.resolve()

    # Without logics/ and outside any git repo, it falls back to the start dir
    # (so the viewer can still launch and offer in-app bootstrap).
    bare = tmp_path / "bare"
    bare.mkdir()
    monkeypatch.setattr(
        viewer_module.subprocess,
        "run",
        lambda *a, **k: (_ for _ in ()).throw(OSError("no git")),
    )
    assert viewer_module._resolve_viewer_root(bare) == bare.resolve()


def test_demo_corpus_covers_board_states(tmp_path):
    """The dev demo corpus exercises every stage, progress band, and attention signal."""
    root = viewer_module.ensure_demo_corpus(tmp_path)
    items = collect_viewer_items(root)
    by_stage = {item["stage"] for item in items}
    assert by_stage == {"request", "backlog", "task", "product", "architecture", "spec"}

    def status_of(doc_id):
        return next(i for i in items if i["id"] == doc_id)["indicators"].get("Status")

    def progress_of(doc_id):
        return next(i for i in items if i["id"] == doc_id)["indicators"].get("Progress")

    # Progress bands: zero (blue), active (teal), done (green).
    assert progress_of("item_demo_ready") == "0"
    assert progress_of("item_demo_auth_login") == "60"
    assert progress_of("task_demo_export") == "100"

    # Attention signals are reachable from the fixture data.
    assert status_of("req_demo_blocked").lower() == "blocked"
    # progress 100 while not done -> workflow-inconsistent
    mismatch = next(i for i in items if i["id"] == "req_demo_mismatch")
    assert mismatch["indicators"]["Progress"] == "100"
    assert "done" not in mismatch["indicators"]["Status"].lower()
    # orphaned supporting doc has no usedBy links
    orphan = next(i for i in items if i["id"] == "prod_demo_orphan")
    assert orphan["usedBy"] == []

    # Promotion chain: the active request has linked delivery children.
    promoted = next(i for i in items if i["id"] == "req_demo_auth_login")
    assert promoted["isPromoted"] is True
    assert promoted["usedBy"]


def test_demo_corpus_disabled_outside_dev_checkout(monkeypatch):
    monkeypatch.setattr(viewer_module, "_is_dev_checkout", lambda: False)
    assert viewer_module.ensure_demo_corpus_if_dev() is None
