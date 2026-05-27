from __future__ import annotations

import subprocess
import json
import threading
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path

import pytest

from logics_manager.bootstrap import bootstrap_payload
from logics_manager.mcp import McpToolError, call_tool, connector_plan, handle_jsonrpc, make_http_handler


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
        assert exc.code == "unsupported_argument"
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
    assert created["next_suggested_tool"] == "promote_request_to_backlog"
    assert "document_preview" in created
    request_path = created["path"]
    request_text = (repo_root / request_path).read_text(encoding="utf-8")
    assert "Let an agent create a request through MCP." in request_text
    assert "AC1: The request is created with framed content." in request_text

    backlog = call_tool("promote_request_to_backlog", {"request_path": request_path}, repo_root=repo_root)
    assert backlog["ok"] is True
    assert backlog["lint_status"]["ok"] is True
    assert backlog["created_path"].startswith("logics/backlog/item_")
    assert backlog["next_suggested_tool"] == "promote_backlog_to_task"

    task = call_tool("promote_backlog_to_task", {"backlog_path": backlog["created_path"]}, repo_root=repo_root)
    assert task["ok"] is True
    assert task["lint_status"]["ok"] is True
    assert task["created_path"].startswith("logics/tasks/task_")
    assert task["next_suggested_tool"] == "run_logics_lint"

    lint = call_tool("run_logics_lint", {}, repo_root=repo_root)
    assert lint["status"]["ok"] is True


def test_mcp_read_list_search_and_context_tools(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    created = call_tool(
        "create_request",
        {
            "title": "Readable MCP context",
            "needs": ["Let agents read a bounded Logics document."],
            "context": ["Search should find this unique marker: bounded-context-marker."],
            "acceptance_criteria": ["The document can be read and searched."],
        },
        repo_root=repo_root,
    )

    read = call_tool("read_logics_doc", {"source": created["ref"], "max_chars": 300}, repo_root=repo_root)
    assert read["ok"] is True
    assert read["ref"] == created["ref"]
    assert read["title"] == "Readable MCP context"
    assert read["status"] == "Draft"
    assert "Needs" in read["sections"]
    assert len(read["content"]) <= 300

    listed = call_tool("list_logics_docs", {"kind": "request", "status": "Draft", "ref_prefix": "req_", "limit": 5}, repo_root=repo_root)
    assert listed["ok"] is True
    assert any(item["ref"] == created["ref"] for item in listed["items"])

    searched = call_tool("search_logics_docs", {"query": "bounded-context-marker", "kind": "request"}, repo_root=repo_root)
    assert searched["ok"] is True
    assert searched["matches"][0]["ref"] == created["ref"]
    assert "bounded-context-marker" in searched["matches"][0]["snippet"]

    pack = call_tool("build_context_pack", {"ref": created["ref"], "mode": "summary-only", "profile": "tiny"}, repo_root=repo_root)
    assert pack["ok"] is True
    assert pack["ref"] == created["ref"]
    assert pack["estimates"]["doc_count"] >= 1


def test_mcp_read_rejects_absolute_paths(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    request = repo_root / "logics" / "request" / "req_000_existing.md"
    request.write_text(
        "\n".join(
            [
                "## req_000_existing - Existing",
                "> From version: 1.0.0",
                "> Schema version: 1.0",
                "> Status: Draft",
                "",
                "# Needs",
                "- Existing need",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    response = handle_jsonrpc(
        {
            "jsonrpc": "2.0",
            "id": 8,
            "method": "tools/call",
            "params": {
                "name": "read_logics_doc",
                "arguments": {"source": str(request)},
            },
        },
        repo_root=repo_root,
    )

    assert response is not None
    result = response["result"]
    assert result["isError"] is True
    assert result["structuredContent"]["error"] == "invalid_reference"


def test_mcp_closure_and_maintenance_tools(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    created = call_tool(
        "create_request",
        {
            "title": "Closable MCP workflow",
            "needs": ["Let agents close workflow chains deterministically."],
            "context": ["This validates finish and close tools."],
            "acceptance_criteria": ["The task, backlog item, and request are closed."],
        },
        repo_root=repo_root,
    )
    backlog = call_tool("promote_request_to_backlog", {"request_path": created["path"]}, repo_root=repo_root)
    task = call_tool("promote_backlog_to_task", {"backlog_path": backlog["created_path"]}, repo_root=repo_root)

    finished = call_tool("finish_task", {"task_path": task["created_path"]}, repo_root=repo_root)
    assert finished["ok"] is True
    assert finished["lint_status"]["ok"] is True
    assert finished["audit_status"]["ok"] is True
    assert "changed_paths" in finished
    assert "diff_summary" in finished

    assert call_tool("read_logics_doc", {"source": task["created_ref"]}, repo_root=repo_root)["status"] == "Done"
    assert call_tool("read_logics_doc", {"source": backlog["created_ref"]}, repo_root=repo_root)["status"] == "Done"
    assert call_tool("read_logics_doc", {"source": created["ref"]}, repo_root=repo_root)["status"] == "Done"

    standalone = call_tool(
        "create_request",
        {
            "title": "Direct MCP close",
            "needs": ["Let agents close one request."],
            "context": ["This validates close_workflow_doc."],
            "acceptance_criteria": ["The request is closed."],
        },
        repo_root=repo_root,
    )
    closed = call_tool("close_workflow_doc", {"kind": "request", "source_path": standalone["path"]}, repo_root=repo_root)
    assert closed["ok"] is True
    assert closed["lint_status"]["ok"] is True
    assert call_tool("read_logics_doc", {"source": standalone["ref"]}, repo_root=repo_root)["status"] == "Done"

    eligible = call_tool("close_eligible_requests", {"dry_run": True}, repo_root=repo_root)
    assert eligible["ok"] is True
    assert eligible["dry_run"] is True
    assert "diff_summary" in eligible

    refreshed = call_tool("refresh_mermaid_signatures", {"dry_run": True}, repo_root=repo_root)
    assert refreshed["ok"] is True
    assert refreshed["dry_run"] is True
    assert "modified_files" in refreshed


def test_mcp_controlled_mutation_tools(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    created = call_tool(
        "create_request",
        {
            "title": "Mutable MCP workflow",
            "needs": ["Let agents update bounded workflow fields."],
            "context": ["This validates controlled mutation tools."],
            "acceptance_criteria": ["The task can receive indicators and scoped notes."],
        },
        repo_root=repo_root,
    )
    backlog = call_tool("promote_request_to_backlog", {"request_path": created["path"]}, repo_root=repo_root)
    task = call_tool("promote_backlog_to_task", {"backlog_path": backlog["created_path"]}, repo_root=repo_root)

    updated = call_tool(
        "update_workflow_indicators",
        {"source": task["created_ref"], "progress": "25%", "theme": "Mutation safety"},
        repo_root=repo_root,
    )
    assert updated["ok"] is True
    assert updated["updated_indicators"] == {"Progress": "25%", "Theme": "Mutation safety"}
    task_doc = call_tool("read_logics_doc", {"source": task["created_ref"]}, repo_root=repo_root)
    assert task_doc["indicators"]["Progress"] == "25%"
    assert task_doc["indicators"]["Theme"] == "Mutation safety"

    report = call_tool("append_report_entry", {"source": task["created_path"], "text": "Report note from MCP."}, repo_root=repo_root)
    assert report["section"] == "Report"
    validation = call_tool("append_validation_note", {"source": created["ref"], "text": "Validation note from MCP."}, repo_root=repo_root)
    assert validation["section"] == "Validation"
    decision = call_tool("append_decision_note", {"source": backlog["created_ref"], "text": "Decision rationale from MCP."}, repo_root=repo_root)
    assert decision["section"] == "Decision framing"

    task_sections = call_tool("read_logics_doc", {"source": task["created_ref"], "sections": ["Report"]}, repo_root=repo_root)["sections"]
    request_sections = call_tool("read_logics_doc", {"source": created["ref"], "sections": ["Validation"]}, repo_root=repo_root)["sections"]
    backlog_sections = call_tool("read_logics_doc", {"source": backlog["created_ref"], "sections": ["Decision framing"]}, repo_root=repo_root)["sections"]
    assert "- Report note from MCP." in task_sections["Report"]
    assert "- Validation note from MCP." in request_sections["Validation"]
    assert "- Decision rationale from MCP." in backlog_sections["Decision framing"]


def test_mcp_mutation_rejects_oversized_text(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    created = call_tool(
        "create_request",
        {
            "title": "Bounded mutation",
            "needs": ["Reject oversized notes."],
            "context": ["This validates mutation bounds."],
            "acceptance_criteria": ["Oversized text is rejected."],
        },
        repo_root=repo_root,
    )

    response = handle_jsonrpc(
        {
            "jsonrpc": "2.0",
            "id": 9,
            "method": "tools/call",
            "params": {
                "name": "append_validation_note",
                "arguments": {"source": created["ref"], "text": "x" * 2001},
            },
        },
        repo_root=repo_root,
    )

    assert response is not None
    result = response["result"]
    assert result["isError"] is True
    assert result["structuredContent"]["error"] == "invalid_argument_value"


def test_mcp_split_and_audit_repair_tools(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    created = call_tool(
        "create_request",
        {
            "title": "Splittable MCP workflow",
            "needs": ["Let agents split oversized workflow docs."],
            "context": ["This validates split tools."],
            "acceptance_criteria": ["The request is split into backlog items."],
        },
        repo_root=repo_root,
    )

    split_request = call_tool(
        "split_request",
        {"request_path": created["path"], "titles": ["First split backlog", "Second split backlog"]},
        repo_root=repo_root,
    )
    assert split_request["ok"] is True
    assert len(split_request["created_refs"]) == 2
    assert all(path.startswith("logics/backlog/item_") for path in split_request["created_paths"])
    assert "diff_summary" in split_request

    split_backlog = call_tool(
        "split_backlog",
        {"backlog_path": split_request["created_paths"][0], "titles": ["First split task"]},
        repo_root=repo_root,
    )
    assert split_backlog["ok"] is True
    assert len(split_backlog["created_refs"]) == 1
    assert split_backlog["created_paths"][0].startswith("logics/tasks/task_")

    ac_fix = call_tool("autofix_ac_traceability", {"refs": [created["ref"]]}, repo_root=repo_root)
    assert ac_fix["ok"] is True
    assert "modified_paths" in ac_fix

    structure_fix = call_tool("autofix_structure", {"paths": [created["path"]]}, repo_root=repo_root)
    assert structure_fix["ok"] is True
    assert "audit_payload" in structure_fix


def test_mcp_connector_plan_generates_chatgpt_setup(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    plan = connector_plan(repo_root=repo_root, host="127.0.0.1", port=8765, bearer_token="test-token", public_url="https://example.test")

    assert plan["ok"] is True
    assert plan["bearer_token"] == "test-token"
    assert plan["local_mcp_url"] == "http://127.0.0.1:8765/mcp"
    assert plan["mcp_url"] == "https://example.test/mcp"
    assert plan["health_url"] == "https://example.test/health"
    assert plan["chatgpt"]["mcp_url"] == "https://example.test/mcp"
    assert plan["auth_header"] == "Authorization: Bearer test-token"
    assert "serve-http" in plan["server_command"]
    assert plan["cleanup"]


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


def test_mcp_audit_top_level_ok_matches_audit_status(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)

    monkeypatch.setattr(
        "logics_manager.mcp.audit_payload",
        lambda *args, **kwargs: {"ok": False, "issue_count": 1, "issues": [{"code": "demo"}], "issues_by_doc": {"demo.md": [{"code": "demo"}]}},
    )

    audit = call_tool("run_logics_audit", {}, repo_root=repo_root)

    assert audit["ok"] is False
    assert audit["status"]["ok"] is False


def test_mcp_http_transport_lists_tools(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_http_handler(repo_root))
    except PermissionError:
        pytest.skip("sandbox does not allow binding a local HTTP socket")
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        body = json.dumps({"jsonrpc": "2.0", "id": 3, "method": "tools/list", "params": {}})
        conn.request("POST", "/mcp", body=body, headers={"Content-Type": "application/json"})
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert response.status == 200
    assert payload["id"] == 3
    assert payload["result"]["tools"][0]["name"] == "create_request"


def test_mcp_http_transport_accepts_sse_get(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_http_handler(repo_root))
    except PermissionError:
        pytest.skip("sandbox does not allow binding a local HTTP socket")
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        conn.request("GET", "/mcp", headers={"Accept": "text/event-stream"})
        response = conn.getresponse()
        content_type = response.getheader("Content-Type")
    finally:
        conn.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert response.status == 200
    assert content_type == "text/event-stream"


def test_mcp_http_transport_rejects_missing_bearer_token(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_http_handler(repo_root, bearer_token="secret-token"))
    except PermissionError:
        pytest.skip("sandbox does not allow binding a local HTTP socket")
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        body = json.dumps({"jsonrpc": "2.0", "id": 3, "method": "tools/list", "params": {}})
        conn.request("POST", "/mcp", body=body, headers={"Content-Type": "application/json"})
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert response.status == 401
    assert response.getheader("WWW-Authenticate") == 'Bearer realm="logics-mcp"'
    assert payload["error"] == "unauthorized"


def test_mcp_http_transport_accepts_bearer_token(tmp_path: Path) -> None:
    repo_root = _repo(tmp_path)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_http_handler(repo_root, bearer_token="secret-token"))
    except PermissionError:
        pytest.skip("sandbox does not allow binding a local HTTP socket")
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        body = json.dumps({"jsonrpc": "2.0", "id": 3, "method": "tools/list", "params": {}})
        conn.request("POST", "/mcp", body=body, headers={"Content-Type": "application/json", "Authorization": "Bearer secret-token"})
        response = conn.getresponse()
        payload = json.loads(response.read().decode("utf-8"))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert response.status == 200
    assert payload["result"]["tools"][0]["name"] == "create_request"
