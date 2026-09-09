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

    server.remove_fleet_root(root)
    assert fleet_roots() == []
    assert str(project.resolve()) not in {entry["root"] for entry in server.project_registry_payload()}


def test_a_fleet_root_lists_bootstrappable_projects(home: Path, tmp_path: Path) -> None:
    from logics_manager.viewer import create_viewer_server

    launch = _repo(tmp_path, "launch")
    root = tmp_path / "fleet"
    project = root / "package-only"
    project.mkdir(parents=True)
    (project / "package.json").write_text("{}", encoding="utf-8")
    server = create_viewer_server(launch, host="127.0.0.1", port=0, fleet=True)
    try:
        server.add_fleet_root(root)
        entry = next(item for item in server.project_registry_payload() if item["root"] == str(project.resolve()))
    finally:
        server.server_close()

    assert entry["hasLogics"] is False
    assert entry["message"] == "No Logics corpus found."


def test_fleet_home_can_start_without_claiming_the_current_directory(home: Path, tmp_path: Path) -> None:
    from logics_manager.viewer import create_viewer_server

    launch = tmp_path / "random"
    launch.mkdir()
    server = create_viewer_server(launch, host="127.0.0.1", port=0, fleet=True, include_launch_project=False)
    try:
        payload = server.viewer_payload(fleet_home=True)
    finally:
        server.server_close()

    assert payload["fleetHome"] is True
    assert str(launch.resolve()) not in {entry["root"] for entry in payload["projects"]}


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


# --- item_881: a reopened viewer restores its roots, projects and favourites ---


def test_reopening_restores_the_saved_root_its_projects_and_favourites(home: Path, tmp_path: Path) -> None:
    from logics_manager.viewer import create_viewer_server

    launch = _repo(tmp_path, "launch")
    root = tmp_path / "fleet"
    project = _repo(root, "project")
    first = create_viewer_server(launch, host="127.0.0.1", port=0, fleet=True)
    try:
        first.add_fleet_root(root)
        project_id = next(
            entry["id"] for entry in first.project_registry_payload() if entry["root"] == str(project.resolve())
        )
        update_preferences(launch, {"favoriteProjects": [project_id]})
    finally:
        first.server_close()

    # A restart of the viewer process under the same operator profile.
    second = create_viewer_server(launch, host="127.0.0.1", port=0, fleet=True)
    try:
        entries = second.project_registry_payload()
    finally:
        second.server_close()

    assert fleet_roots() == [root.resolve()]
    assert str(project.resolve()) in {entry["root"] for entry in entries}
    assert read_preferences(launch)["favoriteProjects"] == [project_id]


def test_one_unreadable_root_does_not_hide_the_others(home: Path, tmp_path: Path) -> None:
    from logics_manager.viewer import create_viewer_server

    launch = _repo(tmp_path, "launch")
    good = tmp_path / "good"
    project = _repo(good, "project")
    bad = tmp_path / "bad"
    bad.mkdir()
    update_preferences(launch, {"fleetRoots": [str(bad), str(good)]})
    bad.chmod(0o000)
    try:
        server = create_viewer_server(launch, host="127.0.0.1", port=0, fleet=True)
        try:
            roots = {entry["root"] for entry in server.project_registry_payload()}
        finally:
            server.server_close()
    finally:
        bad.chmod(0o755)

    assert str(project.resolve()) in roots


def test_a_missing_root_is_hidden_but_not_erased(home: Path, tmp_path: Path) -> None:
    from logics_manager.viewer import create_viewer_server

    launch = _repo(tmp_path, "launch")
    absent = tmp_path / "unmounted"
    added = tmp_path / "added"
    added.mkdir()
    update_preferences(launch, {"fleetRoots": [str(absent)]})

    server = create_viewer_server(launch, host="127.0.0.1", port=0, fleet=True)
    try:
        server.add_fleet_root(added)
    finally:
        server.server_close()

    stored = json.loads(operator_preferences_path().read_text(encoding="utf-8"))["preferences"]["fleetRoots"]
    assert str(absent) in stored
    assert fleet_roots() == [added.resolve()]

    absent.mkdir()
    assert fleet_roots() == [absent.resolve(), added.resolve()]


# --- item_885: the viewer says which operator record it opened ---------------


def test_the_active_store_is_reported_with_no_warning_when_it_is_the_only_one(
    home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from logics_manager import viewer_preferences

    repo = _repo(tmp_path, "one")
    update_preferences(repo, {"favoriteProjects": ["a"]})
    # No second candidate: HOME and the account home both resolve into this profile.
    monkeypatch.setenv("HOME", str(tmp_path / "process-home"))
    monkeypatch.setattr(viewer_preferences, "_account_home", lambda: tmp_path / "process-home")

    stores = fleet_stores = viewer_preferences.operator_preferences_stores()

    assert stores["path"] == str(operator_preferences_path())
    assert stores["exists"] is True
    assert stores["overridden"] is True
    assert fleet_stores["others"] == []


def test_a_store_forked_under_another_home_is_named_not_hidden(
    home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """item_885: the record follows $HOME, so a second one must be reported rather
    than left to read as lost favourites."""
    from logics_manager import viewer_preferences

    repo = _repo(tmp_path, "one")
    update_preferences(repo, {"favoriteProjects": ["active"]})
    account_home = tmp_path / "account-home"
    other = account_home / ".config" / "logics-manager" / "viewer-preferences.json"
    other.parent.mkdir(parents=True)
    other.write_text('{"version": 1, "preferences": {"favoriteProjects": ["elsewhere"]}}', encoding="utf-8")
    monkeypatch.setattr(viewer_preferences, "_account_home", lambda: account_home)
    monkeypatch.setenv("HOME", str(tmp_path / "process-home"))

    stores = viewer_preferences.operator_preferences_stores()

    assert stores["path"] == str(operator_preferences_path())
    assert stores["others"] == [str(other)]
    # Reporting only: the other store is untouched and the active one still wins.
    assert "elsewhere" not in read_preferences(repo).get("favoriteProjects", [])
    assert json.loads(other.read_text(encoding="utf-8"))["preferences"]["favoriteProjects"] == ["elsewhere"]


def test_the_override_still_decides_which_store_is_read_and_written(
    home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from logics_manager import viewer_preferences

    repo = _repo(tmp_path, "one")
    account_home = tmp_path / "account-home"
    (account_home / ".config" / "logics-manager").mkdir(parents=True)
    (account_home / ".config" / "logics-manager" / "viewer-preferences.json").write_text("{}", encoding="utf-8")
    monkeypatch.setattr(viewer_preferences, "_account_home", lambda: account_home)
    monkeypatch.setenv("HOME", str(tmp_path / "process-home"))

    update_preferences(repo, {"favoriteProjects": ["written-here"]})
    stores = viewer_preferences.operator_preferences_stores()

    assert stores["overridden"] is True
    assert stores["path"] == str(home / "viewer-preferences.json")
    assert json.loads(Path(stores["path"]).read_text(encoding="utf-8"))["preferences"]["favoriteProjects"] == ["written-here"]


def test_doctor_reports_a_forked_store_as_an_environment_warning(
    home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from logics_manager import viewer_preferences
    from logics_manager.doctor import doctor_payload

    repo = _repo(tmp_path, "one")
    (repo / "logics" / "backlog").mkdir(parents=True, exist_ok=True)
    account_home = tmp_path / "account-home"
    other = account_home / ".config" / "logics-manager" / "viewer-preferences.json"
    other.parent.mkdir(parents=True)
    other.write_text("{}", encoding="utf-8")

    monkeypatch.setenv("HOME", str(tmp_path / "process-home"))
    monkeypatch.setattr(viewer_preferences, "_account_home", lambda: tmp_path / "absent")
    assert [w for w in doctor_payload(repo)["environment_warnings"] if w["code"] == "forked_preference_stores"] == []

    monkeypatch.setattr(viewer_preferences, "_account_home", lambda: account_home)
    warnings = [w for w in doctor_payload(repo)["environment_warnings"] if w["code"] == "forked_preference_stores"]

    assert len(warnings) == 1
    assert str(other) in warnings[0]["message"]


# --- item_886 / adr_033: a forked record is adopted explicitly, never merged for you ---


def _forked(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, preferences: dict) -> Path:
    """A second operator record for this account, holding `preferences`."""
    from logics_manager import viewer_preferences

    account_home = tmp_path / "account-home"
    other = account_home / ".config" / "logics-manager" / "viewer-preferences.json"
    other.parent.mkdir(parents=True, exist_ok=True)
    other.write_text(json.dumps({"version": 1, "preferences": preferences}), encoding="utf-8")
    monkeypatch.setattr(viewer_preferences, "_account_home", lambda: account_home)
    monkeypatch.setenv("HOME", str(tmp_path / "process-home"))
    return other


def test_adoption_unions_the_sets_and_leaves_the_source_alone(
    home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from logics_manager.viewer_preferences import adopt_preferences

    repo = _repo(tmp_path, "one")
    root_here, root_there = tmp_path / "here", tmp_path / "there"
    root_here.mkdir()
    root_there.mkdir()
    update_preferences(repo, {"favoriteProjects": ["mine"], "fleetRoots": [str(root_here)], "autoRefreshIntervalSeconds": 30})
    other = _forked(
        tmp_path,
        monkeypatch,
        {"favoriteProjects": ["theirs", "mine"], "fleetRoots": [str(root_there)], "autoRefreshIntervalSeconds": 5},
    )
    before = other.read_bytes()

    merged = adopt_preferences(repo, other)

    assert sorted(merged["favoriteProjects"]) == ["mine", "theirs"]
    assert merged["fleetRoots"] == [str(root_here), str(root_there)]
    # A scalar is not adopted: the interval chosen here survives.
    assert merged["autoRefreshIntervalSeconds"] == 30
    assert other.read_bytes() == before


def test_adoption_is_repeatable_and_removes_nothing(
    home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from logics_manager.viewer_preferences import adopt_preferences

    repo = _repo(tmp_path, "one")
    update_preferences(repo, {"favoriteProjects": ["mine"]})
    other = _forked(tmp_path, monkeypatch, {"favoriteProjects": ["theirs"]})

    first = adopt_preferences(repo, other)
    second = adopt_preferences(repo, other)

    assert first["favoriteProjects"] == second["favoriteProjects"] == ["mine", "theirs"]


def test_adoption_refuses_a_path_this_account_does_not_have(
    home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The route takes its path from the client, so anything not already reported as a
    store of this account is refused rather than read."""
    from logics_manager.viewer_preferences import adopt_preferences

    repo = _repo(tmp_path, "one")
    _forked(tmp_path, monkeypatch, {"favoriteProjects": ["theirs"]})
    elsewhere = tmp_path / "elsewhere.json"
    elsewhere.write_text('{"version": 1, "preferences": {"favoriteProjects": ["injected"]}}', encoding="utf-8")

    with pytest.raises(ValueError):
        adopt_preferences(repo, elsewhere)
    with pytest.raises(ValueError):
        adopt_preferences(repo, Path("/etc/passwd"))
    assert read_preferences(repo).get("favoriteProjects") is None


def test_a_single_store_install_has_nothing_to_adopt(
    home: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from logics_manager import viewer_preferences
    from logics_manager.viewer_preferences import adopt_preferences

    repo = _repo(tmp_path, "one")
    update_preferences(repo, {"favoriteProjects": ["mine"]})
    monkeypatch.setenv("HOME", str(tmp_path / "process-home"))
    monkeypatch.setattr(viewer_preferences, "_account_home", lambda: tmp_path / "absent")

    assert viewer_preferences.operator_preferences_stores()["others"] == []
    with pytest.raises(ValueError):
        adopt_preferences(repo, tmp_path / "account-home" / ".config" / "logics-manager" / "viewer-preferences.json")
    assert read_preferences(repo)["favoriteProjects"] == ["mine"]
