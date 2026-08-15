"""item_850: the ChatGPT connector over OpenAI's Secure MCP Tunnel.

`tunnel-client` is an optional external tool -- the same status `npx localtunnel`
already has -- so nothing here shells out to it. The suite asserts on the command
that would be built and on each missing-prerequisite branch, and passes on a
machine (or a CI runner) where the binary is not installed.
"""

from __future__ import annotations

import stat
from pathlib import Path

import pytest

from logics_manager import mcp_tunnel
from logics_manager import viewer as viewer_module

from conftest import create_viewer_server_or_skip


def _settings(tmp_path: Path, *, api_key: str = "k") -> dict[str, object]:
    env = {mcp_tunnel.CONFIG_ENV_VAR: str(tmp_path / "tunnel.env"), mcp_tunnel.API_KEY_ENV_VAR: api_key}
    return mcp_tunnel.tunnel_settings(env)


def test_run_command_targets_the_configured_profile_and_creates_no_public_url() -> None:
    """AC1: the profile owns the tunnel_id, so the command names only the profile."""
    assert mcp_tunnel.build_run_command("logics-manager") == ["tunnel-client", "run", "--profile", "logics-manager"]
    init = mcp_tunnel.build_init_command("logics-manager", "tun_123", "/repo")
    assert init[:6] == ["tunnel-client", "init", "--profile", "logics-manager", "--tunnel-id", "tun_123"]
    assert init[-1] == "logics-manager mcp serve --repo-root /repo"


def test_environment_beats_the_file_and_the_file_is_owner_only(tmp_path: Path) -> None:
    """AC4: the config file is created with owner-only permissions when missing."""
    path = tmp_path / "nested" / "tunnel.env"
    mcp_tunnel.ensure_config_file(path)
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    path.write_text(f"{mcp_tunnel.PROFILE_ENV_VAR}=from-file\n{mcp_tunnel.API_KEY_ENV_VAR}=file-key\n", encoding="utf-8")

    from_file = mcp_tunnel.tunnel_settings({mcp_tunnel.CONFIG_ENV_VAR: str(path)})
    assert from_file["profile"] == "from-file"
    assert from_file["api_key"] == "file-key"

    overridden = mcp_tunnel.tunnel_settings(
        {mcp_tunnel.CONFIG_ENV_VAR: str(path), mcp_tunnel.PROFILE_ENV_VAR: "from-env", mcp_tunnel.API_KEY_ENV_VAR: "env-key"}
    )
    assert overridden["profile"] == "from-env"
    assert overridden["api_key"] == "env-key"


def test_each_missing_prerequisite_reports_its_own_cause(tmp_path: Path) -> None:
    """AC3: a missing binary, a missing profile and a missing key are three outcomes."""
    settings = _settings(tmp_path)

    missing_binary = mcp_tunnel.check_prerequisites(settings, run_doctor=lambda _c: (0, ""), which=lambda _name: None)
    assert missing_binary["reason"] == mcp_tunnel.REASON_BINARY_MISSING
    assert "brew install openai/tools/tunnel-client" in missing_binary["message"]

    installed = lambda _name: "/usr/local/bin/tunnel-client"  # noqa: E731
    missing_profile = mcp_tunnel.check_prerequisites(
        settings, run_doctor=lambda _c: (2, "FAILED_CHECKS: profile"), which=installed
    )
    assert missing_profile["reason"] == mcp_tunnel.REASON_PROFILE_MISSING

    missing_key = mcp_tunnel.check_prerequisites(
        _settings(tmp_path, api_key=""),
        run_doctor=lambda _c: (2, "FAILED_CHECKS: control_plane_api_key"),
        which=installed,
    )
    assert missing_key["reason"] == mcp_tunnel.REASON_API_KEY_MISSING
    assert str(tmp_path / "tunnel.env") in missing_key["message"]

    ok = mcp_tunnel.check_prerequisites(settings, run_doctor=lambda _c: (0, "all checks passed"), which=installed)
    assert ok["ok"] is True and ok["reason"] == ""


def test_no_message_ever_carries_the_key_or_the_tunnel_id(tmp_path: Path) -> None:
    """AC7: the credentials appear in no screen and no log line."""
    settings = _settings(tmp_path, api_key="super-secret-key")
    messages = [mcp_tunnel.explain(reason, settings) for reason in (
        mcp_tunnel.REASON_BINARY_MISSING,
        mcp_tunnel.REASON_PROFILE_MISSING,
        mcp_tunnel.REASON_API_KEY_MISSING,
        mcp_tunnel.REASON_API_KEY_REJECTED,
    )]
    assert all("super-secret-key" not in message for message in messages)
    assert all(message for message in messages)


@pytest.mark.parametrize("line", ["control plane returned 401", "Unauthorized: invalid api key"])
def test_a_refused_key_is_read_as_refused(line: str) -> None:
    """AC6: doctor only checks the key is set; a rejected one repeats a 401."""
    assert mcp_tunnel.is_rejected_key(line) is True
    assert mcp_tunnel.is_rejected_key("tunnel established") is False


def test_the_setup_rows_offer_one_step_at_a_time_and_hold_no_secret(tmp_path: Path) -> None:
    """item_851: the steps have a forced order; later rows stay visible but inactive."""
    settings = _settings(tmp_path, api_key="")
    status = {"ok": False, "reason": mcp_tunnel.REASON_BINARY_MISSING, "message": "", "failed_checks": []}
    rows = mcp_tunnel.prerequisite_rows(settings, status, profile_exists=False)
    assert [row["id"] for row in rows] == ["binary", "api_key", "tunnel", "profile", "plugin"]
    assert [row["actionable"] for row in rows] == [True, False, False, False, False]

    with_key = _settings(tmp_path, api_key="sk-secret")
    met = mcp_tunnel.prerequisite_rows(
        with_key,
        {"ok": True, "reason": "", "message": "", "failed_checks": []},
        profile_exists=True,
        running=True,
        connected=True,
    )
    # Every row met is what makes the whole setup block disappear.
    assert all(row["met"] for row in met)
    assert "sk-secret" not in repr(met)


def test_saving_the_key_writes_it_owner_only_and_reports_a_refusal(tmp_path: Path, monkeypatch) -> None:
    """item_851/AC4: a key the control plane refuses is refused at the moment it is saved."""
    config = tmp_path / "tunnel.env"
    monkeypatch.setenv(mcp_tunnel.CONFIG_ENV_VAR, str(config))
    monkeypatch.delenv(mcp_tunnel.API_KEY_ENV_VAR, raising=False)
    monkeypatch.setattr(mcp_tunnel.shutil, "which", lambda _name: "/usr/local/bin/tunnel-client")

    server = create_viewer_server_or_skip(tmp_path)
    refused = subprocess_result("control plane returned 401 Unauthorized")
    monkeypatch.setattr(viewer_module.subprocess, "run", lambda *_a, **_kw: refused)
    try:
        outcome = server.save_mcp_tunnel_key("sk-wrong-key")
        assert outcome["ok"] is False
        assert "refused" in outcome["message"].lower()
        assert "sk-wrong-key" not in outcome["message"]
        # The key is stored where the operator was told it would be, owner-only.
        assert stat.S_IMODE(config.stat().st_mode) == 0o600
        assert "sk-wrong-key" in config.read_text(encoding="utf-8")
    finally:
        server.server_close()


def subprocess_result(output: str):
    class Completed:
        returncode = 1
        stdout = output
        stderr = ""

    return Completed()


def test_the_connector_refuses_to_start_and_says_which_prerequisite_is_missing(tmp_path: Path, monkeypatch) -> None:
    """AC3, end to end through the viewer: no child is spawned when a step is missing."""
    monkeypatch.setenv(mcp_tunnel.CONFIG_ENV_VAR, str(tmp_path / "tunnel.env"))
    monkeypatch.setattr(mcp_tunnel.shutil, "which", lambda _name: None)
    spawned: list[list[str]] = []
    server = create_viewer_server_or_skip(tmp_path)
    monkeypatch.setattr(viewer_module.subprocess, "Popen", lambda command, **_kw: spawned.append(command))
    try:
        payload = server.start_mcp_connector("tunnel")
        assert spawned == []
        assert payload["running"] is False
        assert payload["reason"] == mcp_tunnel.REASON_BINARY_MISSING
        assert "tunnel-client is not installed" in payload["error"]
    finally:
        server.server_close()


def test_the_connector_starts_tunnel_client_and_publishes_no_url(tmp_path: Path, monkeypatch) -> None:
    """AC1/AC2: the ChatGPT path runs tunnel-client, and holds no URL to hand over."""
    monkeypatch.setenv(mcp_tunnel.CONFIG_ENV_VAR, str(tmp_path / "tunnel.env"))
    monkeypatch.setenv(mcp_tunnel.API_KEY_ENV_VAR, "test-key")
    monkeypatch.setattr(mcp_tunnel.shutil, "which", lambda _name: "/usr/local/bin/tunnel-client")

    class FakeProcess:
        stdout: list[str] = []
        returncode = 0

        def poll(self) -> None:
            return None

        def wait(self) -> int:
            return 0

        def terminate(self) -> None:
            return None

    spawned: dict[str, object] = {}

    def fake_popen(command, **kwargs):
        spawned["command"] = command
        spawned["env"] = kwargs.get("env") or {}
        return FakeProcess()

    monkeypatch.setattr(viewer_module.subprocess, "Popen", fake_popen)
    server = create_viewer_server_or_skip(tmp_path)
    monkeypatch.setattr(type(server), "_run_tunnel_doctor", lambda _self, _command: (0, "ok"))
    try:
        payload = server.start_mcp_connector("tunnel")
        assert spawned["command"] == ["tunnel-client", "run", "--profile", mcp_tunnel.DEFAULT_PROFILE]
        assert spawned["env"][mcp_tunnel.API_KEY_ENV_VAR] == "test-key"
        assert payload["running"] is True and payload["ready"] is True
        assert payload["url"] == "" and payload["token"] == ""
        assert payload["mode"] == "tunnel"

        # AC2: the tunnel_id lives in the profile, so restarting changes nothing about it.
        server.stop_mcp_connector()
        again = server.start_mcp_connector("tunnel")
        assert spawned["command"] == ["tunnel-client", "run", "--profile", mcp_tunnel.DEFAULT_PROFILE]
        assert again["running"] is True
    finally:
        server.server_close()
