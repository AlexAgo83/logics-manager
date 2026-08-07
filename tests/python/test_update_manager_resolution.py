"""Self-update must act on the copy that is actually running.

Automatic manager resolution used to infer the install source from packaging
heuristics rather than from the running executable. It twice resolved a
package-manager-installed copy to a different manager, each time installing a
second executable earlier on PATH that silently shadowed the first and needed
manual removal.

The installer is never invoked here: these tests fake the executable layout and
assert what would be chosen, and what is refused.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from logics_manager import cli
from logics_manager.doctor import _check_duplicate_executables

REPO_ROOT = Path(__file__).resolve().parents[2]


def _make_executable(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    path.chmod(0o755)
    return path


def _run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "logics_manager", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=60,
    )


# ---- manager resolution, per install layout ----


def test_pipx_layout_resolves_to_pipx(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    executable = _make_executable(tmp_path / "pipx" / "venvs" / "logics-manager" / "bin" / "logics-manager")
    monkeypatch.setattr(sys, "argv", [str(executable)])
    manager, resolved = cli.detect_running_manager()
    assert manager == "pipx"
    assert resolved == executable.resolve()


def test_npm_layout_resolves_to_npm(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    package_root = tmp_path / "node_modules" / "@grifhinz" / "logics-manager"
    package_root.mkdir(parents=True)
    (package_root / "package.json").write_text(
        json.dumps({"name": cli.DEFAULT_SELF_UPDATE_PACKAGE}), encoding="utf-8"
    )
    executable = _make_executable(package_root / "scripts" / "logics-manager.py")
    monkeypatch.setattr(sys, "argv", [str(executable)])
    manager, _ = cli.detect_running_manager()
    assert manager == "npm"


def test_site_packages_layout_resolves_to_pip(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    executable = _make_executable(tmp_path / "lib" / "python3.11" / "site-packages" / "bin" / "logics-manager")
    monkeypatch.setattr(sys, "argv", [str(executable)])
    monkeypatch.setattr(cli, "_npm_package_root_for", lambda path: None)
    manager, _ = cli.detect_running_manager()
    assert manager == "pip"


def test_an_unrecognised_layout_reports_no_manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """No evidence must mean "unknown", so the caller can fall back rather than guess wrong."""
    executable = _make_executable(tmp_path / "somewhere" / "logics-manager")
    monkeypatch.setattr(sys, "argv", [str(executable)])
    monkeypatch.setattr(cli, "_npm_package_root_for", lambda path: None)
    monkeypatch.setattr(cli.metadata, "version", _raise_not_found)
    manager, resolved = cli.detect_running_manager()
    assert manager is None
    assert resolved == executable.resolve()


def _raise_not_found(name: str):
    raise cli.metadata.PackageNotFoundError(name)


def test_npm_layout_wins_over_a_pip_lookalike_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """The npm install lives under site-packages-free paths, but bundles its own
    package.json; that evidence must outrank a metadata lookup."""
    package_root = tmp_path / "pkg"
    package_root.mkdir()
    (package_root / "package.json").write_text(
        json.dumps({"name": cli.DEFAULT_SELF_UPDATE_PACKAGE}), encoding="utf-8"
    )
    executable = _make_executable(package_root / "logics-manager")
    monkeypatch.setattr(sys, "argv", [str(executable)])
    manager, _ = cli.detect_running_manager()
    assert manager == "npm"


# ---- shadow refusal ----


def test_shadowing_executables_lists_only_other_copies(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    running = _make_executable(tmp_path / "a" / "logics-manager")
    other = _make_executable(tmp_path / "b" / "logics-manager")
    monkeypatch.setenv("PATH", f"{running.parent}:{other.parent}")
    found = cli.shadowing_executables(running.resolve())
    assert [Path(path).resolve() for path in found] == [other.resolve()]


def test_no_shadow_when_only_one_copy_exists(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    running = _make_executable(tmp_path / "a" / "logics-manager")
    monkeypatch.setenv("PATH", str(running.parent))
    assert cli.shadowing_executables(running.resolve()) == []


def test_update_refuses_to_guess_while_duplicates_exist(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys
) -> None:
    """Unrecognised layout + another copy on PATH = the case that shadowed in the field."""
    running = _make_executable(tmp_path / "a" / "logics-manager")
    _make_executable(tmp_path / "b" / "logics-manager")
    monkeypatch.setenv("PATH", f"{tmp_path / 'a'}:{tmp_path / 'b'}")
    monkeypatch.setattr(sys, "argv", [str(running)])
    monkeypatch.setattr(cli, "detect_running_manager", lambda _p=None: (None, running.resolve()))

    def _fail(*args, **kwargs):  # pragma: no cover - must never run
        raise AssertionError("the installer was invoked despite an ambiguous install")

    monkeypatch.setattr(cli.subprocess, "run", _fail)
    exit_code = cli.main(["update", "--format", "json"])
    assert exit_code == 1
    assert json.loads(capsys.readouterr().out)["error"] == "ambiguous_install"


def test_a_recognised_layout_updates_despite_duplicates(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys
) -> None:
    """Knowing the owning manager means no shadow can be created, so do not block."""
    running = _make_executable(tmp_path / "a" / "logics-manager")
    _make_executable(tmp_path / "b" / "logics-manager")
    monkeypatch.setenv("PATH", f"{tmp_path / 'a'}:{tmp_path / 'b'}")
    monkeypatch.setattr(sys, "argv", [str(running)])
    monkeypatch.setattr(cli, "detect_running_manager", lambda _p=None: ("pip", running.resolve()))
    monkeypatch.setattr(cli, "_is_externally_managed_python", lambda: False)
    assert cli.main(["update", "--dry-run"]) == 0
    captured = capsys.readouterr()
    assert "Dry run:" in captured.out
    assert "other logics-manager executables" in captured.err


def test_an_explicit_manager_is_never_refused(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys
) -> None:
    running = _make_executable(tmp_path / "a" / "logics-manager")
    _make_executable(tmp_path / "b" / "logics-manager")
    monkeypatch.setenv("PATH", f"{tmp_path / 'a'}:{tmp_path / 'b'}")
    monkeypatch.setattr(sys, "argv", [str(running)])
    monkeypatch.setattr(cli, "detect_running_manager", lambda _p=None: (None, running.resolve()))
    monkeypatch.setattr(cli, "_is_externally_managed_python", lambda: False)
    assert cli.main(["update", "--manager", "pip", "--dry-run"]) == 0


def test_allow_shadow_overrides_the_refusal(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys) -> None:
    running = _make_executable(tmp_path / "a" / "logics-manager")
    _make_executable(tmp_path / "b" / "logics-manager")
    monkeypatch.setenv("PATH", f"{tmp_path / 'a'}:{tmp_path / 'b'}")
    monkeypatch.setattr(sys, "argv", [str(running)])
    # pin the manager: the fake PATH has no npm/pipx to resolve against
    exit_code = cli.main(["update", "--allow-shadow", "--dry-run", "--manager", "pip"])
    assert exit_code == 0
    assert "Dry run:" in capsys.readouterr().out


# ---- machine-readable reporting ----


def test_check_reports_state_as_json_without_installing() -> None:
    result = _run(["update", "--check", "--format", "json"])
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    for key in ("manager", "path", "current_version", "latest_version", "updated", "ok"):
        assert key in payload, f"missing {key}"
    assert payload["updated"] is False


def test_check_does_not_run_the_installer(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fail(*args, **kwargs):  # pragma: no cover - must never run
        raise AssertionError("--check invoked the installer")

    monkeypatch.setattr(cli.subprocess, "run", _fail)
    assert cli.main(["update", "--check", "--format", "json"]) == 0


def test_help_flag_prints_usage() -> None:
    result = _run(["update", "--help"])
    assert result.returncode == 0
    assert "--manager" in result.stdout


# ---- doctor surfaces the same conflict ----


def test_doctor_reports_duplicate_executables(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    running = _make_executable(tmp_path / "a" / "logics-manager")
    _make_executable(tmp_path / "b" / "logics-manager")
    monkeypatch.setenv("PATH", f"{tmp_path / 'a'}:{tmp_path / 'b'}")
    monkeypatch.setattr(sys, "argv", [str(running)])
    issues = _check_duplicate_executables()
    assert [issue.code for issue in issues] == ["duplicate_executables"]


def test_doctor_is_quiet_with_a_single_install(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    running = _make_executable(tmp_path / "a" / "logics-manager")
    monkeypatch.setenv("PATH", str(running.parent))
    monkeypatch.setattr(sys, "argv", [str(running)])
    assert _check_duplicate_executables() == []


def test_duplicates_do_not_change_the_corpus_verdict(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """A PATH problem must not make a repo-level doctor result vary per machine."""
    from logics_manager.doctor import doctor_payload

    corpus = tmp_path / "corpus"
    (corpus / "logics" / "request").mkdir(parents=True)
    running = _make_executable(tmp_path / "a" / "logics-manager")
    _make_executable(tmp_path / "b" / "logics-manager")
    monkeypatch.setenv("PATH", f"{tmp_path / 'a'}:{tmp_path / 'b'}")
    monkeypatch.setattr(sys, "argv", [str(running)])

    payload = doctor_payload(corpus)
    assert payload["environment_warnings"], "the duplicate was not reported at all"
    assert all(
        issue["code"] != "duplicate_executables" for issue in payload["issues"]
    ), "an install-layout warning leaked into the corpus issue list"


# ---- the viewer surfaces the same install details (item_602) ----


def test_viewer_update_info_names_the_resolved_install(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from logics_manager import viewer as viewer_module

    running = _make_executable(tmp_path / "a" / "logics-manager")
    _make_executable(tmp_path / "b" / "logics-manager")
    monkeypatch.setenv("PATH", f"{tmp_path / 'a'}:{tmp_path / 'b'}")
    monkeypatch.setattr(sys, "argv", [str(running)])
    monkeypatch.setattr(cli, "detect_running_manager", lambda _p=None: ("pipx", running.resolve()))

    payload = viewer_module._viewer_update_info()
    assert payload["manager"] == "pipx"
    assert payload["executablePath"] == str(running.resolve())
    assert len(payload["shadowingExecutables"]) == 1


def test_viewer_update_info_is_quiet_with_a_single_install(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from logics_manager import viewer as viewer_module

    running = _make_executable(tmp_path / "a" / "logics-manager")
    monkeypatch.setenv("PATH", str(running.parent))
    monkeypatch.setattr(sys, "argv", [str(running)])
    assert viewer_module._viewer_update_info()["shadowingExecutables"] == []


def test_viewer_update_info_keeps_the_existing_fields() -> None:
    from logics_manager import viewer as viewer_module

    payload = viewer_module._viewer_update_info()
    for key in ("currentVersion", "latestVersion", "updateAvailable", "checkedAt", "updateCommand", "source"):
        assert key in payload, f"{key} was dropped from the viewer update payload"


def test_viewer_update_info_survives_a_detection_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Install introspection must never take the viewer's payload down."""
    from logics_manager import viewer as viewer_module

    def explode(*args, **kwargs):
        raise OSError("no PATH here")

    monkeypatch.setattr(cli, "detect_running_manager", explode)
    payload = viewer_module._viewer_update_info()
    assert "currentVersion" in payload
