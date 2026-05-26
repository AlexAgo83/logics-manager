from __future__ import annotations

import subprocess
from pathlib import Path

from logics_manager.bootstrap import bootstrap_payload
from logics_manager.mcp import McpToolError, call_tool, handle_jsonrpc


def _repo(tmp_path: Path) -> Path:
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    bootstrap_payload(repo_root, check=False)
    subprocess.run(["git", "init"], cwd=repo_root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return repo_root


def test_mcp_lists_tools() -> None:
    response = handle_jsonrpc({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})

    assert response is not None
    tools = response["result"]["tools"]
    assert [tool["name"] for tool in tools][:3] == [
        "create_request",
        "promote_request_to_backlog",
        "promote_backlog_to_task",
    ]


def test_mcp_rejects_absolute_paths(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    try:
        call_tool("promote_request_to_backlog", {"request_path": str(repo_root / "logics/request/req_001_demo.md")}, repo_root=repo_root)
    except McpToolError as exc:
        assert exc.code == "invalid_path"
    else:
        raise AssertionError("Expected absolute paths to be rejected.")


def test_mcp_rejects_path_traversal(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    try:
        call_tool("show_git_diff", {"paths": ["logics/../pyproject.toml"]}, repo_root=repo_root)
    except McpToolError as exc:
        assert exc.code == "invalid_path"
    else:
        raise AssertionError("Expected path traversal to be rejected.")


def test_mcp_rejects_unknown_arguments(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    try:
        call_tool("run_logics_lint", {"shell": "echo nope"}, repo_root=repo_root)
    except McpToolError as exc:
        assert exc.code == "unsupported_action"
        assert exc.details == {"arguments": ["shell"]}
    else:
        raise AssertionError("Expected unknown arguments to be rejected.")


def test_mcp_rejects_dirty_tracked_source_conflicts(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    request_dir = repo_root / "logics/request"
    request_path = request_dir / "req_000_existing.md"
    request_path.write_text(
        "\n".join(
            [
                "## req_000_existing - Existing",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "> Status: Draft",
                "> Understanding: 90%",
                "> Confidence: 80%",
                "> Complexity: Low",
                "> Theme: Test",
                "",
                "# Needs",
                "- Existing need",
                "",
                "# Context",
                "- Existing context",
                "",
                "# Acceptance criteria",
                "- AC1: Existing acceptance",
                "",
                "# Backlog",
                "- none",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "add", "logics/request/req_000_existing.md"], cwd=repo_root, check=True)
    subprocess.run(
        ["git", "-c", "user.email=test@example.com", "-c", "user.name=Test User", "commit", "-m", "Add existing request"],
        cwd=repo_root,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    request_path.write_text(request_path.read_text(encoding="utf-8") + "\n# Local note\n", encoding="utf-8")

    try:
        call_tool("promote_request_to_backlog", {"request_path": "logics/request/req_000_existing.md"}, repo_root=repo_root)
    except McpToolError as exc:
        assert exc.code == "dirty_conflict"
        assert "logics/request/req_000_existing.md" in exc.details["paths"]
    else:
        raise AssertionError("Expected dirty tracked source conflicts to be rejected.")


def test_mcp_create_request_and_promote_flow(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    created = call_tool(
        "create_request",
        {
            "title": "Dogfood MCP request flow",
            "needs": ["Let an agent create a request through MCP."],
            "context": ["This verifies the local MCP contract without ChatGPT."],
            "acceptance_criteria": ["The request is created with framed content."],
            "theme": "Operator workflow",
            "complexity": "Medium",
        },
        repo_root=repo_root,
    )
    assert created["ok"] is True
    assert created["lint_status"]["ok"] is True
    request_path = created["path"]
    request_text = (repo_root / request_path).read_text(encoding="utf-8")
    assert "Let an agent create a request through MCP." in request_text
    assert "AC1: The request is created with framed content." in request_text

    backlog = call_tool("promote_request_to_backlog", {"request_path": request_path}, repo_root=repo_root)
    assert backlog["ok"] is True
    assert backlog["lint_status"]["ok"] is True
    assert backlog["created_path"].startswith("logics/backlog/item_")

    task = call_tool("promote_backlog_to_task", {"backlog_path": backlog["created_path"]}, repo_root=repo_root)
    assert task["ok"] is True
    assert task["lint_status"]["ok"] is True
    assert task["created_path"].startswith("logics/tasks/task_")

    lint = call_tool("run_logics_lint", {}, repo_root=repo_root)
    assert lint["status"]["ok"] is True


def test_mcp_jsonrpc_tool_call_returns_structured_error(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    response = handle_jsonrpc(
        {
            "jsonrpc": "2.0",
            "id": 7,
            "method": "tools/call",
            "params": {
                "name": "show_git_diff",
                "arguments": {"paths": ["/tmp/nope"]},
            },
        },
        repo_root=repo_root,
    )

    assert response is not None
    result = response["result"]
    assert result["isError"] is True
    assert result["structuredContent"]["error"] == "invalid_path"
