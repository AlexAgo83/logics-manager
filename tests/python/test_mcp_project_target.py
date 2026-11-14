"""One served repository answers for every sibling corpus: `project` and the fleet tools."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from logics_manager import mcp
from logics_manager.bootstrap import bootstrap_payload
from logics_manager.mcp import McpToolError, call_tool


def _corpus(path: Path) -> Path:
    path.mkdir()
    bootstrap_payload(path, check=False)
    subprocess.run(["git", "init"], cwd=path, check=True, capture_output=True)
    return path


def test_every_tool_accepts_a_project_target() -> None:
    for tool in mcp.TOOL_DEFINITIONS:
        assert tool["inputSchema"]["properties"]["project"]["type"] == "string", tool["name"]


def test_project_runs_a_per_repository_tool_against_a_sibling(tmp_path: Path) -> None:
    active, other = _corpus(tmp_path / "active"), _corpus(tmp_path / "other")
    created = call_tool("create_request", {"title": "Sibling work", "needs": ["n"], "context": ["c"],
                                           "acceptance_criteria": ["a"], "project": "other"}, repo_root=active)
    assert (other / created["path"]).is_file()
    assert not (active / created["path"]).exists()
    listed = call_tool("list_active_work", {"kind": "request", "project": "other"}, repo_root=active)
    assert created["ref"] in str(listed)
    assert created["ref"] not in str(call_tool("list_active_work", {"kind": "request"}, repo_root=active))


def test_project_never_leaves_the_discovered_set(tmp_path: Path) -> None:
    active = _corpus(tmp_path / "active")
    for target in ("missing", "..", "/etc"):
        with pytest.raises(McpToolError) as exc:
            call_tool("get_logics_status", {"project": target}, repo_root=active)
        assert exc.value.code in {"unknown_project", "ambiguous_project"}, target


def test_fleet_tools_report_every_sibling_without_a_local_path(tmp_path: Path) -> None:
    active = _corpus(tmp_path / "active")
    _corpus(tmp_path / "other")
    (tmp_path / "plain").mkdir()
    for name in ("fleet_status", "fleet_health"):
        payload = call_tool(name, {"limit": 5}, repo_root=active)
        assert set(payload["repositories"]) == {"active", "other"}, name
        assert payload["report"] == name.removeprefix("fleet_")
        assert "root" not in payload
        assert mcp.TOOL_CAPABILITIES[name] == mcp.READ_ONLY
