"""Package-manager success is insufficient without a fresh version check."""
from __future__ import annotations

import json
import subprocess
import sys

import pytest

from logics_manager import cli


@pytest.fixture
def package_manager(monkeypatch):
    calls = []
    config = {"installed": "2.24.4", "target": "2.24.5", "scenario": "upgrade", "syncs": 0}
    monkeypatch.setattr(cli, "detect_running_manager", lambda _package: ("npm", None))
    monkeypatch.setattr(cli, "shadowing_executables", lambda _path: [])
    monkeypatch.setattr(cli, "_find_executable_paths", lambda _name: [])
    monkeypatch.setattr(cli, "_is_externally_managed_python", lambda: False)
    monkeypatch.setattr(cli, "which", lambda name: name)
    # A running process may retain old imported metadata after installation.
    monkeypatch.setattr(cli, "get_cli_version", lambda: "2.24.4")

    def sync():
        config["syncs"] += 1
        return {}

    monkeypatch.setattr(cli, "resync_all_harnesses", sync)

    def run(command, **kwargs):
        calls.append(command)
        assert kwargs["capture_output"] is True
        assert kwargs["text"] is True
        if "view" in command or "index" in command:
            assert "--prefer-online" in command or "--no-cache-dir" in command
            if config["scenario"] == "offline":
                return subprocess.CompletedProcess(command, 1, "", "registry unreachable")
            if config["scenario"] == "timeout":
                raise subprocess.TimeoutExpired(command, 60)
            output = config["target"] if "view" in command else f"logics-manager ({config['target']})\nAvailable versions: 2.24.5, 2.24.4"
        elif "install" in command:
            assert ("@grifhinz/logics-manager@2.24.5" if command[0] == "npm" else "logics-manager==2.24.5") in command
            assert "--prefer-online" in command or "--no-cache-dir" in command
            if config["scenario"] == "install_failed":
                return subprocess.CompletedProcess(command, 2, "", "install failed")
            if config["scenario"] != "stale":
                config["installed"] = config["target"]
            output = "changed 1 package"
        else:
            assert "list" in command or "show" in command
            if config["scenario"] == "unreadable" or (config["scenario"] == "verify_failed" and any("install" in c for c in calls)):
                return subprocess.CompletedProcess(command, 1, "", "package not found")
            output = (json.dumps({"dependencies": {"@grifhinz/logics-manager": {"version": config["installed"]}}})
                      if command[0] == "npm" else f"Name: logics-manager\nVersion: {config['installed']}\n")
        return subprocess.CompletedProcess(command, 0, output, "")

    monkeypatch.setattr(subprocess, "run", run)
    return config, calls


@pytest.mark.parametrize("manager", ["npm", "pip", "pipx"])
@pytest.mark.parametrize("scenario,error", [
    ("upgrade", None), ("stale", "version_mismatch"), ("current", None),
    ("newer", None), ("offline", "registry_unreachable"), ("timeout", "registry_unreachable"),
    ("unreadable", "installed_version_unknown"), ("verify_failed", "verification_failed"),
    ("install_failed", "install_failed"),
])
def test_update_verifies_exact_target(package_manager, capsys, manager, scenario, error):
    config, calls = package_manager
    config["scenario"] = scenario
    if scenario == "current":
        config["installed"] = config["target"]
    if scenario == "newer":
        config["installed"] = "2.24.6"
    code = cli.main(["update", "--manager", manager, "--format", "json"])
    payload = json.loads(capsys.readouterr().out)
    assert code == (1 if error else 0)
    assert payload["ok"] is (error is None)
    assert payload["updated"] is (scenario == "upgrade")
    assert config["syncs"] == (1 if scenario == "upgrade" else 0)
    if error:
        assert payload["error"] == error
    if scenario in {"upgrade", "stale", "current", "newer"}:
        assert payload["installed_version"] == config["installed"]
        assert payload["target_version"] == "2.24.5"
    installs = [c for c in calls if "install" in c]
    assert len(installs) == (1 if scenario in {"upgrade", "stale", "verify_failed", "install_failed"} else 0)
    if scenario in {"upgrade", "stale"}:
        assert calls[-1] == calls[0], "verification must requery the installed package"
    if manager == "pipx":
        assert all(c[:3] == ["pipx", "runpip", "logics-manager"] for c in calls)
    if manager == "pip":
        assert all(c[:3] == [sys.executable, "-m", "pip"] for c in calls)


@pytest.mark.parametrize("manager", ["npm", "pip", "pipx"])
@pytest.mark.parametrize("flag", ["--check", "--dry-run"])
@pytest.mark.parametrize("offline", [False, True])
def test_preview_resolves_online_without_installing(package_manager, capsys, manager, flag, offline):
    config, calls = package_manager
    if offline:
        config["scenario"] = "offline"
    assert cli.main(["update", "--manager", manager, flag, "--format", "json"]) == int(offline)
    payload = json.loads(capsys.readouterr().out)
    assert payload["installed_version"] == "2.24.4"
    assert payload["updated"] is False
    assert not any("install" in c for c in calls)
    if offline:
        assert payload["error"] == "registry_unreachable"
    else:
        assert payload["target_version"] == "2.24.5"
        assert payload["update_available"] is True


@pytest.mark.parametrize("flag", ["--check", "--dry-run"])
def test_text_preview_shows_installed_and_target_versions(package_manager, capsys, flag):
    assert cli.main(["update", flag]) == 0
    output = capsys.readouterr().out
    assert "2.24.4" in output and "2.24.5" in output
    if flag == "--dry-run":
        assert "@grifhinz/logics-manager@2.24.5 --prefer-online" in output


def test_stale_install_never_claims_success_in_text(package_manager, capsys):
    config, _calls = package_manager
    config["scenario"] = "stale"
    assert cli.main(["update"]) == 1
    output = capsys.readouterr().out
    assert "expected @grifhinz/logics-manager 2.24.5" in output
    assert "installed version is 2.24.4" in output
    assert "Updated " not in output
