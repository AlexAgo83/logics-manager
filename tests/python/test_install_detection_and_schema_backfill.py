"""Regression tests for req_325's item_674 and item_675.

`doctor` reported the one npm install as a duplicate of itself, because the Node wrapper
on PATH and the Python entry it spawns are two different files inside one install. And
there was no way to close the schema-version gap the same `doctor` reports.
"""

from __future__ import annotations

from pathlib import Path

from logics_manager.cli import _executable_identity, _install_root, _shim_target, shadowing_executables
from logics_manager.sync import backfill_schema_versions


# Not under /home: macOS resolves that through autofs, which would rewrite one side
# of the comparison and not the other.
NPM_ROOT = "/opt/npm-global/lib/node_modules/@grifhinz/logics-manager"


# --- item_674: one install is not a duplicate of itself ---------------------


def test_the_wrapper_and_the_python_entry_it_spawns_are_one_install() -> None:
    wrapper = Path(f"{NPM_ROOT}/scripts/npm/logics-manager.mjs")
    spawned = Path(f"{NPM_ROOT}/scripts/logics-manager.py")

    assert _install_root(wrapper) == _install_root(spawned)


def test_two_installs_under_different_prefixes_stay_distinct() -> None:
    mine = Path(f"{NPM_ROOT}/scripts/logics-manager.py")
    other = Path("/usr/local/lib/node_modules/@grifhinz/logics-manager/scripts/npm/logics-manager.mjs")
    pipx = Path("/opt/pipx/venvs/logics-manager/bin/logics-manager")

    assert _install_root(mine) != _install_root(other)
    assert _install_root(mine) != _install_root(pipx)


def test_no_duplicate_reported_when_path_holds_only_this_installs_wrapper(monkeypatch) -> None:
    spawned = Path(f"{NPM_ROOT}/scripts/logics-manager.py")
    monkeypatch.setattr(
        "logics_manager.cli._find_executable_paths",
        lambda _command: [f"{NPM_ROOT}/scripts/npm/logics-manager.mjs"],
    )

    assert shadowing_executables(spawned.resolve()) == []


def test_a_second_install_is_still_reported(monkeypatch) -> None:
    spawned = Path(f"{NPM_ROOT}/scripts/logics-manager.py")
    other = "/usr/local/lib/node_modules/@grifhinz/logics-manager/scripts/npm/logics-manager.mjs"
    monkeypatch.setattr(
        "logics_manager.cli._find_executable_paths",
        lambda _command: [f"{NPM_ROOT}/scripts/npm/logics-manager.mjs", other],
    )

    assert shadowing_executables(spawned.resolve()) == [other]


# --- item_675: the backfill command -----------------------------------------


def _repo(tmp_path: Path) -> Path:
    repo_root = tmp_path / "logics-repo"
    for rel in ("request", "backlog", "tasks"):
        (repo_root / "logics" / rel).mkdir(parents=True, exist_ok=True)
    return repo_root


def test_backfill_writes_the_indicator_under_status(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    doc = repo_root / "logics" / "request" / "req_001_probe.md"
    doc.write_text("## req_001_probe - Probe\n> Understanding: 90%\n> Status: Done\n\nBody.\n", encoding="utf-8")

    written = backfill_schema_versions(repo_root, [])

    assert written == ["logics/request/req_001_probe.md"]
    assert doc.read_text(encoding="utf-8").splitlines()[:4] == [
        "## req_001_probe - Probe",
        "> Understanding: 90%",
        "> Status: Done",
        "> Schema version: 1.0",
    ]


def test_backfill_leaves_a_doc_that_already_has_the_indicator(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    doc = repo_root / "logics" / "request" / "req_001_probe.md"
    original = "## req_001_probe - Probe\n> Schema version: 1.0\n> Status: Done\n"
    doc.write_text(original, encoding="utf-8")

    assert backfill_schema_versions(repo_root, []) == []
    assert doc.read_text(encoding="utf-8") == original


def test_backfill_dry_run_reports_without_writing(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    doc = repo_root / "logics" / "request" / "req_001_probe.md"
    original = "## req_001_probe - Probe\n> Status: Done\n"
    doc.write_text(original, encoding="utf-8")

    assert backfill_schema_versions(repo_root, [], dry_run=True) == ["logics/request/req_001_probe.md"]
    assert doc.read_text(encoding="utf-8") == original


def test_backfill_falls_back_to_the_heading_when_there_is_no_status(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    doc = repo_root / "logics" / "request" / "req_001_probe.md"
    doc.write_text("## req_001_probe - Probe\n\nBody.\n", encoding="utf-8")

    backfill_schema_versions(repo_root, [])

    assert doc.read_text(encoding="utf-8").splitlines()[:2] == [
        "## req_001_probe - Probe",
        "> Schema version: 1.0",
    ]


# --- item_674 on Windows: the PATH entry is a launcher, not a symlink -------


def _npm_install(root: Path) -> tuple[Path, Path]:
    """A Windows-shaped npm install: a .cmd launcher beside its node_modules tree."""
    package = root / "node_modules" / "@grifhinz" / "logics-manager"
    (package / "scripts" / "npm").mkdir(parents=True)
    (package / "scripts" / "logics-manager.py").write_text("# python entry", encoding="utf-8")
    (package / "scripts" / "npm" / "logics-manager.mjs").write_text("// node wrapper", encoding="utf-8")
    shim = root / "logics-manager.cmd"
    shim.write_text(
        '@ECHO off\r\n"%~dp0\\node.exe"  '
        '"%~dp0\\node_modules\\@grifhinz\\logics-manager\\scripts\\npm\\logics-manager.mjs" %*\r\n',
        encoding="utf-8",
    )
    return shim, package / "scripts" / "logics-manager.py"


def test_a_windows_shim_resolves_to_the_package_it_launches(tmp_path: Path) -> None:
    shim, spawned = _npm_install(tmp_path / "npm")

    assert _executable_identity(shim) == _executable_identity(spawned)


def test_no_duplicate_reported_for_a_windows_style_install(tmp_path: Path, monkeypatch) -> None:
    shim, spawned = _npm_install(tmp_path / "npm")
    monkeypatch.setattr("logics_manager.cli._find_executable_paths", lambda _command: [str(shim)])

    assert shadowing_executables(spawned.resolve()) == []


def test_a_second_windows_install_is_still_reported(tmp_path: Path, monkeypatch) -> None:
    shim, spawned = _npm_install(tmp_path / "npm")
    other_shim, _ = _npm_install(tmp_path / "other-npm")
    monkeypatch.setattr(
        "logics_manager.cli._find_executable_paths", lambda _command: [str(shim), str(other_shim)]
    )

    assert shadowing_executables(spawned.resolve()) == [str(other_shim)]


def test_a_non_shim_path_is_left_alone(tmp_path: Path) -> None:
    plain = tmp_path / "logics-manager"
    plain.write_text("#!/bin/sh\n", encoding="utf-8")

    assert _shim_target(plain) is None
