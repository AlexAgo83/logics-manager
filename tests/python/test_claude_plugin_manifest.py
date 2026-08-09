"""req_318/item_654: the repo bundles skills and an MCP server but had no
`.claude-plugin/plugin.json`, so it could not be installed as a Claude Code
plugin through the normal marketplace/plugin flow. This is the install check
for AC7 - it launches the exact command plugin.json declares for its MCP
server and confirms the bundled skills path plugin.json declares is real.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = REPO_ROOT / ".claude-plugin" / "plugin.json"
MARKETPLACE_PATH = REPO_ROOT / ".claude-plugin" / "marketplace.json"


def _manifest() -> dict[str, object]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def test_marketplace_manifest_references_this_plugin_by_name() -> None:
    """Not live-tested against a real Claude Code marketplace install (that
    needs an actual Claude Code session) - this only checks internal
    consistency: the one plugin it lists matches plugin.json's own name."""
    marketplace = json.loads(MARKETPLACE_PATH.read_text(encoding="utf-8"))
    listed_names = {entry["name"] for entry in marketplace["plugins"]}
    assert _manifest()["name"] in listed_names


def test_manifest_is_valid_json_with_required_fields() -> None:
    manifest = _manifest()
    assert manifest["name"]
    assert manifest["version"]


def test_manifest_version_matches_the_VERSION_file() -> None:
    version_file = (REPO_ROOT / "VERSION").read_text(encoding="utf-8").strip()
    assert _manifest()["version"] == version_file


def test_declared_skills_path_contains_every_bundled_skill() -> None:
    manifest = _manifest()
    skills_paths = manifest["skills"]
    assert isinstance(skills_paths, list) and skills_paths

    from logics_manager.skills import available_skills

    known = {skill["name"] for skill in available_skills()}
    assert known, "expected at least one bundled skill"

    for raw_path in skills_paths:
        directory = REPO_ROOT / raw_path
        assert directory.is_dir(), f"declared skills path does not exist: {raw_path}"
        on_disk = {p.name for p in directory.iterdir() if (p / "SKILL.md").is_file()}
        assert known <= on_disk, f"{raw_path} is missing: {known - on_disk}"


def test_mcp_server_command_resolves_to_a_real_script() -> None:
    manifest = _manifest()
    server = manifest["mcpServers"]["logics-manager"]
    assert server["type"] == "stdio"
    assert server["command"] == "node"
    script_arg = server["args"][0]
    script_path = Path(script_arg.replace("${CLAUDE_PLUGIN_ROOT}", str(REPO_ROOT)))
    assert script_path.is_file()


@pytest.mark.skipif(shutil.which("node") is None, reason="node is not on PATH")
def test_declared_mcp_server_command_actually_serves_tools_list() -> None:
    """The install check: run the literal command plugin.json declares (with
    ${CLAUDE_PLUGIN_ROOT} substituted, exactly as Claude Code would), send a
    real JSON-RPC tools/list over stdio, and confirm a real tool list comes back."""
    manifest = _manifest()
    server = manifest["mcpServers"]["logics-manager"]
    args = [arg.replace("${CLAUDE_PLUGIN_ROOT}", str(REPO_ROOT)) for arg in server["args"]]
    args += ["--repo-root", str(REPO_ROOT)]

    process = subprocess.Popen(
        [server["command"], *args],
        cwd=REPO_ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    try:
        request = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}) + "\n"
        stdout, stderr = process.communicate(input=request, timeout=15)
    finally:
        if process.poll() is None:
            process.kill()

    response_line = next((line for line in stdout.splitlines() if line.strip().startswith("{")), None)
    assert response_line is not None, f"no JSON-RPC response; stderr:\n{stderr}"
    response = json.loads(response_line)
    tools = response["result"]["tools"]
    assert len(tools) > 40  # this project's MCP surface, not a stub
    assert any(tool["name"] == "get_logics_doctor" for tool in tools)
