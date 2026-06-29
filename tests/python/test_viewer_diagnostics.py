from __future__ import annotations

import json
from http.client import HTTPConnection
from pathlib import Path
import threading

from logics_manager import viewer_diagnostics
from logics_manager.cli import main
from logics_manager.viewer import create_viewer_server


def test_diagnostics_are_bounded_sanitized_and_scoped_by_repo(tmp_path: Path, monkeypatch) -> None:
    journal = tmp_path / "viewer-diagnostics.jsonl"
    monkeypatch.setenv("LOGICS_MANAGER_VIEWER_DIAGNOSTICS", str(journal))
    first_repo = tmp_path / "first"
    second_repo = tmp_path / "second"
    first_repo.mkdir()
    second_repo.mkdir()

    saved = viewer_diagnostics.append_diagnostic(first_repo, {
        "kind": "blank-screen",
        "message": "screen disappeared",
        "url": "http://127.0.0.1:8765/?t=secret#fragment",
        "stack": "line one\nline two",
    }, now=10)
    viewer_diagnostics.append_diagnostic(second_repo, {"message": "other repo"}, now=11)

    assert saved["url"] == "http://127.0.0.1:8765/"
    assert len(saved["fingerprint"]) == 16
    payload = viewer_diagnostics.diagnostics_payload(first_repo)
    assert [entry["message"] for entry in payload["entries"]] == ["screen disappeared"]
    assert payload["path"] == str(journal)


def test_stale_unclean_session_is_reported_on_a_later_heartbeat(tmp_path: Path, monkeypatch) -> None:
    journal = tmp_path / "viewer-diagnostics.jsonl"
    monkeypatch.setenv("LOGICS_MANAGER_VIEWER_DIAGNOSTICS", str(journal))
    repo = tmp_path / "repo"
    repo.mkdir()

    assert viewer_diagnostics.update_session(repo, {
        "sessionId": "crashed",
        "event": "start",
        "screen": "Workshop",
        "url": "http://127.0.0.1:8765/",
    }, now=100) == []
    assert viewer_diagnostics.update_session(repo, {
        "sessionId": "replacement",
        "event": "start",
        "screen": "Project",
        "url": "http://127.0.0.1:8765/",
    }, now=110) == []

    interrupted = viewer_diagnostics.update_session(repo, {
        "sessionId": "replacement",
        "event": "heartbeat",
        "screen": "Project",
        "url": "http://127.0.0.1:8765/",
    }, now=131)

    assert len(interrupted) == 1
    assert interrupted[0]["kind"] == "unclean-session"
    assert interrupted[0]["screen"] == "Workshop"
    assert viewer_diagnostics.update_session(repo, {
        "sessionId": "replacement",
        "event": "heartbeat",
    }, now=140) == []
    persisted = [json.loads(line) for line in journal.read_text(encoding="utf-8").splitlines()]
    assert [entry["kind"] for entry in persisted] == ["unclean-session"]


def test_clean_session_is_not_reported_as_interrupted(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("LOGICS_MANAGER_VIEWER_DIAGNOSTICS", str(tmp_path / "diagnostics.jsonl"))
    repo = tmp_path / "repo"
    repo.mkdir()
    viewer_diagnostics.update_session(repo, {"sessionId": "closed", "event": "start"}, now=10)
    viewer_diagnostics.update_session(repo, {"sessionId": "closed", "event": "end"}, now=11)

    interrupted = viewer_diagnostics.update_session(repo, {"sessionId": "next", "event": "start"}, now=100)

    assert interrupted == []


def test_repeated_diagnostics_are_grouped_and_cli_can_render_them(tmp_path: Path, monkeypatch, capsys) -> None:
    journal = tmp_path / "viewer-diagnostics.jsonl"
    monkeypatch.setenv("LOGICS_MANAGER_VIEWER_DIAGNOSTICS", str(journal))
    repo = tmp_path / "repo"
    (repo / "logics").mkdir(parents=True)
    monkeypatch.chdir(repo)

    viewer_diagnostics.append_diagnostic(repo, {"kind": "render-error", "message": "same failure"}, now=100)
    viewer_diagnostics.append_diagnostic(repo, {"kind": "render-error", "message": "same failure"}, now=120)

    entries = viewer_diagnostics.diagnostics_payload(repo)["entries"]
    assert len(entries) == 1
    assert entries[0]["count"] == 2
    assert entries[0]["lastAt"] != entries[0]["at"]
    assert main(["view", "diagnostics", "--format", "json"]) == 0
    rendered = json.loads(capsys.readouterr().out)
    assert rendered["entries"][0]["message"] == "same failure"
    assert rendered["entries"][0]["count"] == 2


def test_viewer_diagnostics_http_routes_round_trip(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("LOGICS_MANAGER_VIEWER_DIAGNOSTICS", str(tmp_path / "diagnostics.jsonl"))
    server = create_viewer_server(tmp_path, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        connection = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        body = json.dumps({"entry": {"kind": "blank-board", "message": "board vanished", "url": "http://127.0.0.1/?t=secret"}})
        connection.request("POST", "/api/viewer-diagnostics", body=body, headers={"Content-Type": "application/json"})
        posted = connection.getresponse()
        assert posted.status == 200
        assert json.loads(posted.read())["payload"]["url"] == "http://127.0.0.1/"

        connection.request("GET", "/api/viewer-diagnostics?limit=5")
        fetched = connection.getresponse()
        payload = json.loads(fetched.read())["payload"]
        assert fetched.status == 200
        assert payload["entries"][0]["message"] == "board vanished"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
