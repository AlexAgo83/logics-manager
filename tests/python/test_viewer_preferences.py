"""Regression tests for req_315: preferences that outlive the port.

The reported symptom is that favourites and preferences do not survive a session in the
extension. The cause is where they were stored: browser storage is scoped to an origin,
the extension serves the viewer on an ephemeral port, so each session opened an empty
store. These pin the record that replaces it.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from logics_manager.viewer_preferences import (
    OPERATOR_FIELDS,
    fleet_roots,
    operator_preferences_path,
    read_preferences,
    repo_preferences_path,
    split_scopes,
    update_preferences,
)


@pytest.fixture
def home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    operator_home = tmp_path / "user-config"
    monkeypatch.setenv("LOGICS_VIEWER_PREFERENCES_HOME", str(operator_home))
    return operator_home


def _repo(tmp_path: Path, name: str) -> Path:
    root = tmp_path / name
    (root / "logics").mkdir(parents=True, exist_ok=True)
    return root


# --- item_638: two scopes, one record ---------------------------------------


def test_an_operator_preference_applies_in_every_repository(home: Path, tmp_path: Path) -> None:
    first, second = _repo(tmp_path, "one"), _repo(tmp_path, "two")

    update_preferences(first, {"workshopUseSystemTerminal": True})

    assert read_preferences(second)["workshopUseSystemTerminal"] is True


def test_fleet_roots_are_operator_scoped_and_ignore_stale_paths(home: Path, tmp_path: Path) -> None:
    repo = _repo(tmp_path, "one")
    root = tmp_path / "fleet"
    root.mkdir()
    update_preferences(repo, {"fleetRoots": [str(root), str(tmp_path / "missing"), str(root)]})

    assert fleet_roots() == [root.resolve()]


def test_adding_a_fleet_root_discovers_only_its_immediate_projects(home: Path, tmp_path: Path) -> None:
    from logics_manager.viewer import create_viewer_server

    launch = _repo(tmp_path, "launch")
    root = tmp_path / "fleet"
    project = _repo(root, "project")
    _repo(project, "nested")
    server = create_viewer_server(launch, host="127.0.0.1", port=0, fleet=True)
    try:
        server.add_fleet_root(root)
        roots = {entry["root"] for entry in server.project_registry_payload()}
    finally:
        server.server_close()

    assert str(project.resolve()) in roots
    assert str((project / "nested").resolve()) not in roots
    assert fleet_roots() == [root.resolve()]


def test_a_corpus_preference_stays_with_its_corpus(home: Path, tmp_path: Path) -> None:
    first, second = _repo(tmp_path, "one"), _repo(tmp_path, "two")

    update_preferences(first, {"workshopActiveTab": "explorer"})

    assert read_preferences(first)["workshopActiveTab"] == "explorer"
    assert "workshopActiveTab" not in read_preferences(second)


def test_the_split_is_derived_from_one_declared_list() -> None:
    """A field added later has to be placed rather than silently becoming repo-scoped."""
    operator, repo = split_scopes(
        {"favoriteProjects": ["a"], "cdxRunColumns": ["kind"], "workshopActiveTab": "commands"}
    )

    assert set(operator) <= OPERATOR_FIELDS
    assert set(repo).isdisjoint(OPERATOR_FIELDS)
    assert set(operator) == {"favoriteProjects"}


def test_neither_scope_depends_on_the_port_it_was_served_from(home: Path, tmp_path: Path) -> None:
    repo = _repo(tmp_path, "one")
    update_preferences(repo, {"favoriteProjects": ["alpha"], "workshopActiveTab": "commands"})

    # Nothing in either path mentions a host or a port: that is the whole point.
    assert ":" not in operator_preferences_path().name
    assert repo_preferences_path(repo).is_relative_to(repo)
    assert read_preferences(repo)["favoriteProjects"] == ["alpha"]


# --- item_639: two windows agree on the favourites --------------------------


def test_two_windows_starring_at_once_keep_both_favourites(home: Path, tmp_path: Path) -> None:
    repo = _repo(tmp_path, "one")
    update_preferences(repo, {"favoriteProjects": ["alpha"]})

    # A second window read before the first wrote, so it posts only what it knows.
    update_preferences(repo, {"favoriteProjects": ["beta"]})

    assert read_preferences(repo)["favoriteProjects"] == ["alpha", "beta"]


def test_unstarring_removes_exactly_one_entry(home: Path, tmp_path: Path) -> None:
    repo = _repo(tmp_path, "one")
    update_preferences(repo, {"favoriteProjects": ["alpha", "beta", "gamma"]})

    update_preferences(repo, {}, removed={"favoriteProjects": ["beta"]})

    assert read_preferences(repo)["favoriteProjects"] == ["alpha", "gamma"]


def test_a_scalar_preference_is_last_writer_wins(home: Path, tmp_path: Path) -> None:
    repo = _repo(tmp_path, "one")
    update_preferences(repo, {"autoRefreshIntervalSeconds": 30})
    update_preferences(repo, {"autoRefreshIntervalSeconds": 60})

    assert read_preferences(repo)["autoRefreshIntervalSeconds"] == 60


def test_a_write_replaces_atomically(home: Path, tmp_path: Path) -> None:
    """A crash mid-write must leave the previous content readable, not a truncated file."""
    repo = _repo(tmp_path, "one")
    update_preferences(repo, {"favoriteProjects": ["alpha"]})
    path = operator_preferences_path()
    before = path.read_text(encoding="utf-8")

    leftovers = list(path.parent.glob("*.tmp"))

    assert json.loads(before)["preferences"]["favoriteProjects"] == ["alpha"]
    assert leftovers == [], "a temporary file survived the replace"


# --- item_638 / item_641: the record answers both hosts ----------------------


def test_the_viewer_serves_and_accepts_preferences(home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Both hosts read the same record, whatever port either was served from."""
    import json as _json
    import urllib.request

    from logics_manager.viewer import create_viewer_server

    repo = _repo(tmp_path, "served")
    (repo / "logics" / "request").mkdir(parents=True, exist_ok=True)
    server = create_viewer_server(repo, host="127.0.0.1", port=0)
    import threading

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = f"http://127.0.0.1:{server.server_address[1]}"
        request = urllib.request.Request(
            f"{base}/api/preferences",
            data=_json.dumps({"preferences": {"favoriteProjects": ["alpha"], "workshopActiveTab": "commands"}}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            posted = _json.loads(response.read())
        with urllib.request.urlopen(f"{base}/api/preferences", timeout=10) as response:
            fetched = _json.loads(response.read())
    finally:
        server.shutdown()
        server.server_close()

    assert posted["ok"] is True
    assert fetched["payload"]["favoriteProjects"] == ["alpha"]
    assert fetched["payload"]["workshopActiveTab"] == "commands"
    # Written where the scope says, not in one bucket.
    assert "favoriteProjects" in _json.loads(operator_preferences_path().read_text())["preferences"]
    assert "workshopActiveTab" in _json.loads(repo_preferences_path(repo).read_text())["preferences"]


def test_project_context_is_per_request_not_shared(tmp_path: Path) -> None:
    import json as _json
    import threading
    import urllib.request

    from logics_manager.viewer import _viewer_project_id, create_viewer_server

    first, second = _repo(tmp_path, "first"), _repo(tmp_path, "second")
    server = create_viewer_server(first, host="127.0.0.1", port=0)
    server.switch_project_root(second)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = f"http://127.0.0.1:{server.server_address[1]}/api/items?project="
        with urllib.request.urlopen(base + _viewer_project_id(first), timeout=10) as response:
            first_payload = _json.loads(response.read())["payload"]
        with urllib.request.urlopen(base + _viewer_project_id(second), timeout=10) as response:
            second_payload = _json.loads(response.read())["payload"]
    finally:
        server.shutdown()
        server.server_close()

    assert first_payload["root"] == str(first.resolve())
    assert second_payload["root"] == str(second.resolve())


# --- item_633: an ordinary project is not a client error ---------------------


def test_a_project_without_i18n_is_answered_normally(tmp_path: Path) -> None:
    """It used to raise, which the route turned into HTTP 400 on an ordinary project."""
    from logics_manager.viewer_project_tools import i18n_payload, theme_payload

    repo = _repo(tmp_path, "plain")

    i18n = i18n_payload(repo)
    theme = theme_payload(repo)

    assert i18n["state"] == "unavailable"
    assert "convention" in i18n["message"]
    assert theme["state"] == "unavailable"
    assert "convention" in theme["message"]


def test_the_route_reports_it_as_a_result_not_a_client_error(tmp_path: Path) -> None:
    import json as _json
    import threading
    import urllib.request

    from logics_manager.viewer import create_viewer_server

    repo = _repo(tmp_path, "plain-served")
    server = create_viewer_server(repo, host="127.0.0.1", port=0)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = f"http://127.0.0.1:{server.server_address[1]}"
        with urllib.request.urlopen(f"{base}/api/project-i18n", timeout=10) as response:
            status, body = response.status, _json.loads(response.read())
    finally:
        server.shutdown()
        server.server_close()

    assert status == 200
    assert body["ok"] is True
    assert body["payload"]["state"] == "unavailable"
