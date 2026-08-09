"""req_318/item_657: each detected harness's MCP config gets wired safely,
or gets a printed snippet when auto-writing would be unsafe. Every test here
uses a throwaway `home` fixture - never the real machine's home directory,
so this can never touch a real ~/.codex, ~/.hermes, or ~/.gemini.
"""

from __future__ import annotations

import json
from pathlib import Path

from logics_manager.harness_mcp import wire_harness_mcp_configs


def test_claude_project_mcp_json_gets_wired_when_it_already_exists(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    (repo_root / ".mcp.json").write_text(json.dumps({"mcpServers": {}}), encoding="utf-8")
    home = tmp_path / "home"
    home.mkdir()

    results = wire_harness_mcp_configs(repo_root, home=home)

    claude_result = next(r for r in results if r["harness"] == "claude-code (project)")
    assert claude_result["action"] == "wired"
    data = json.loads((repo_root / ".mcp.json").read_text(encoding="utf-8"))
    assert data["mcpServers"]["logics-manager"] == {"command": "logics-manager", "args": ["mcp", "serve"]}


def test_claude_project_mcp_json_is_skipped_when_missing(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    home = tmp_path / "home"
    home.mkdir()

    results = wire_harness_mcp_configs(repo_root, home=home)
    assert not any(r["harness"] == "claude-code (project)" for r in results)


def test_rerunning_is_idempotent(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    (repo_root / ".mcp.json").write_text(json.dumps({"mcpServers": {}}), encoding="utf-8")
    home = tmp_path / "home"
    home.mkdir()

    wire_harness_mcp_configs(repo_root, home=home)
    after_first = (repo_root / ".mcp.json").read_text(encoding="utf-8")
    results = wire_harness_mcp_configs(repo_root, home=home)

    assert (repo_root / ".mcp.json").read_text(encoding="utf-8") == after_first
    claude_result = next(r for r in results if r["harness"] == "claude-code (project)")
    assert claude_result["action"] == "already-wired"


def test_a_differing_existing_entry_is_left_alone(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    (repo_root / ".mcp.json").write_text(
        json.dumps({"mcpServers": {"logics-manager": {"command": "something-else"}}}), encoding="utf-8",
    )
    home = tmp_path / "home"
    home.mkdir()

    results = wire_harness_mcp_configs(repo_root, home=home)

    claude_result = next(r for r in results if r["harness"] == "claude-code (project)")
    assert claude_result["action"] == "left-alone"
    data = json.loads((repo_root / ".mcp.json").read_text(encoding="utf-8"))
    assert data["mcpServers"]["logics-manager"] == {"command": "something-else"}


def test_codex_gets_a_safe_toml_append_when_detected(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    home = tmp_path / "home"
    (home / ".codex").mkdir(parents=True)
    (home / ".codex" / "config.toml").write_text('# a comment the append must not disturb\nother_key = "value"\n', encoding="utf-8")

    results = wire_harness_mcp_configs(repo_root, home=home)

    codex_result = next(r for r in results if r["harness"] == "codex")
    assert codex_result["action"] == "wired"
    text = (home / ".codex" / "config.toml").read_text(encoding="utf-8")
    assert "# a comment the append must not disturb" in text
    assert 'other_key = "value"' in text
    assert "[mcp_servers.logics-manager]" in text


def test_codex_append_is_idempotent(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    home = tmp_path / "home"
    (home / ".codex").mkdir(parents=True)

    wire_harness_mcp_configs(repo_root, home=home)
    after_first = (home / ".codex" / "config.toml").read_text(encoding="utf-8")
    results = wire_harness_mcp_configs(repo_root, home=home)

    assert (home / ".codex" / "config.toml").read_text(encoding="utf-8") == after_first
    codex_result = next(r for r in results if r["harness"] == "codex")
    assert codex_result["action"] == "already-wired"


def test_hermes_only_ever_gets_a_printed_snippet(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    home = tmp_path / "home"
    (home / ".hermes").mkdir(parents=True)

    results = wire_harness_mcp_configs(repo_root, home=home)

    hermes_result = next(r for r in results if r["harness"] == "hermes")
    assert hermes_result["action"] == "print-snippet"
    assert "mcp_servers" in hermes_result["snippet"]
    assert not (home / ".hermes" / "config.yaml").exists()


def test_antigravity_prints_a_snippet_when_its_config_file_is_missing(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    home = tmp_path / "home"
    (home / ".gemini").mkdir(parents=True)

    results = wire_harness_mcp_configs(repo_root, home=home)

    antigravity_result = next(r for r in results if r["harness"] == "antigravity")
    assert antigravity_result["action"] == "print-snippet"
    assert not (home / ".gemini" / "config" / "mcp_config.json").exists()


def test_antigravity_gets_wired_when_its_config_file_already_exists(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    home = tmp_path / "home"
    config_dir = home / ".gemini" / "config"
    config_dir.mkdir(parents=True)
    (config_dir / "mcp_config.json").write_text(json.dumps({"mcpServers": {}}), encoding="utf-8")

    results = wire_harness_mcp_configs(repo_root, home=home)

    antigravity_result = next(r for r in results if r["harness"] == "antigravity")
    assert antigravity_result["action"] == "wired"


def test_undetected_harnesses_produce_no_result(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    home = tmp_path / "home"
    home.mkdir()

    results = wire_harness_mcp_configs(repo_root, home=home)
    assert results == []
