#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from logics_manager.mcp import handle_jsonrpc


def _call(repo_root: Path, request_id: int, name: str, arguments: dict[str, object]) -> dict[str, object]:
    response = handle_jsonrpc(
        {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        },
        repo_root=repo_root,
    )
    if response is None:
        raise RuntimeError(f"No response for {name}")
    result = response.get("result")
    if not isinstance(result, dict):
        raise RuntimeError(f"Invalid response for {name}: {response}")
    structured = result.get("structuredContent")
    if not isinstance(structured, dict):
        raise RuntimeError(f"Missing structuredContent for {name}: {response}")
    if result.get("isError"):
        raise RuntimeError(json.dumps(structured, indent=2, sort_keys=True))
    return structured


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Dogfood the Logics MCP request-to-task flow through JSON-RPC handlers.")
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--title", default="Dogfood MCP agent flow")
    args = parser.parse_args(argv)
    repo_root = Path(args.repo_root).resolve()

    created = _call(
        repo_root,
        1,
        "create_request",
        {
            "title": args.title,
            "needs": ["Verify that an agent can create Logics workflow docs through MCP."],
            "context": ["This scenario exercises the same JSON-RPC tool call shape a client agent uses."],
            "acceptance_criteria": ["The MCP flow creates a request, backlog item, and task with validation results."],
            "theme": "Operator workflow",
            "complexity": "Low",
        },
    )
    backlog = _call(repo_root, 2, "promote_request_to_backlog", {"request_path": str(created["path"])})
    task = _call(repo_root, 3, "promote_backlog_to_task", {"backlog_path": str(backlog["created_path"])})
    lint = _call(repo_root, 4, "run_logics_lint", {})
    audit = _call(repo_root, 5, "run_logics_audit", {})
    diff = _call(repo_root, 6, "show_git_diff", {})

    print(json.dumps({"created": created, "backlog": backlog, "task": task, "lint": lint, "audit": audit, "diff": diff}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
