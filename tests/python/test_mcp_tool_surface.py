"""The served MCP tool surface must be selectable by capability.

Serving all 36 tools or none forced an integration that only needed a status
glance to either accept delete/rename/split as standing surface, or hand-wrap a
curated subset in a server of its own.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from logics_manager import mcp

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(autouse=True)
def _restore_surface():
    """Selection is process-level state; never leak it into another test."""
    yield
    mcp.set_exposed_tools(None)


def _run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "logics_manager", "mcp", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_every_tool_carries_a_capability() -> None:
    for tool in mcp.TOOL_DEFINITIONS:
        assert tool["capability"] in {mcp.READ_ONLY, mcp.MUTATING, mcp.DESTRUCTIVE}, tool["name"]
    assert set(mcp.TOOL_CAPABILITIES) == set(mcp.TOOLS_BY_NAME), (
        "TOOL_CAPABILITIES drifted from the tool definitions"
    )


def test_capability_is_visible_in_tool_definitions() -> None:
    result = _run(["tools"])
    payload = json.loads(result.stdout)
    assert payload["profile"] == "full"
    assert all("capability" in tool for tool in payload["tools"])


def test_read_only_profile_exposes_no_writer() -> None:
    names = mcp.select_tools(profile=mcp.READ_ONLY)
    assert names
    assert all(mcp.TOOL_CAPABILITIES[name] == mcp.READ_ONLY for name in names)


def test_curated_profile_excludes_destructive_tools() -> None:
    names = set(mcp.select_tools(profile="curated"))
    assert "create_request" in names
    for destructive in ("delete_logics_file", "rename_logics_file", "split_request", "split_backlog"):
        assert destructive not in names


def test_full_profile_is_the_whole_surface() -> None:
    assert set(mcp.select_tools(profile="full")) == set(mcp.TOOLS_BY_NAME)


def test_allow_adds_to_the_profile() -> None:
    names = set(mcp.select_tools(profile=mcp.READ_ONLY, allow=["create_request"]))
    assert "create_request" in names
    assert "delete_logics_file" not in names


def test_deny_takes_precedence_over_allow_and_profile() -> None:
    names = set(mcp.select_tools(profile="full", allow=["delete_logics_file"], deny=["delete_*"]))
    assert "delete_logics_file" not in names


def test_patterns_are_globs() -> None:
    names = set(mcp.select_tools(profile=mcp.READ_ONLY, deny=["list_*"]))
    assert not any(name.startswith("list_") for name in names)


def test_unmatched_pattern_is_reported() -> None:
    with pytest.raises(mcp.ToolSelectionError, match="No tool matches"):
        mcp.select_tools(deny=["definitely_not_a_tool_*"])
    with pytest.raises(mcp.ToolSelectionError, match="No tool matches"):
        mcp.select_tools(allow=["definitely_not_a_tool_*"])


def test_unknown_profile_is_reported() -> None:
    with pytest.raises(mcp.ToolSelectionError, match="Unknown tool profile"):
        mcp.select_tools(profile="nope")


def test_empty_selection_is_reported() -> None:
    with pytest.raises(mcp.ToolSelectionError, match="no tool exposed"):
        mcp.select_tools(profile="full", deny=["*"])


def test_default_selection_is_the_full_surface() -> None:
    result = _run(["tools"])
    payload = json.loads(result.stdout)
    assert len(payload["tools"]) == len(mcp.TOOL_DEFINITIONS)


def test_calling_an_unexposed_tool_is_refused() -> None:
    result = _run(
        ["call", "delete_logics_file", "--profile", "read-only", "--arguments", '{"path": "logics/x.md"}']
    )
    payload = json.loads(result.stdout)
    assert payload["ok"] is False
    assert "not exposed" in payload["message"]


def test_calling_an_exposed_tool_still_works() -> None:
    result = _run(["call", "get_logics_status", "--profile", "read-only", "--arguments", "{}"])
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)


def test_stdio_transport_applies_the_selection() -> None:
    request = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
    process = subprocess.run(
        [sys.executable, "-m", "logics_manager", "mcp", "serve", "--profile", "read-only"],
        cwd=REPO_ROOT,
        input=request + "\n",
        capture_output=True,
        text=True,
        timeout=60,
    )
    served = json.loads(process.stdout)["result"]["tools"]
    assert {tool["capability"] for tool in served} == {mcp.READ_ONLY}
    assert "profile=read-only" in process.stderr


def test_selection_is_reported_at_startup() -> None:
    request = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
    process = subprocess.run(
        [sys.executable, "-m", "logics_manager", "mcp", "serve", "--profile", "curated"],
        cwd=REPO_ROOT,
        input=request + "\n",
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert "Logics MCP surface: profile=curated" in process.stderr
    assert "Exposed tools:" in process.stderr
