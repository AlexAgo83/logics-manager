from __future__ import annotations

import argparse
import contextlib
import io
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

from .audit import audit_payload
from .config import ConfigError, find_repo_root
from .flow import flow_list_payload
from .lint import expected_workflow_mermaid_signature, lint_payload


ALLOWED_WRITE_DIRS = (
    "logics/request",
    "logics/backlog",
    "logics/tasks",
    "logics/product",
    "logics/architecture",
)
MAX_RAW_DIFF_CHARS = 12000
JSONRPC_VERSION = "2.0"


class McpToolError(Exception):
    def __init__(self, code: str, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"ok": False, "error": self.code, "message": self.message}
        if self.details:
            payload["details"] = self.details
        return payload


def _tool_schema(properties: dict[str, Any], required: list[str] | None = None) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": properties,
        "required": required or [],
        "additionalProperties": False,
    }


TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "create_request",
        "description": "Create a Logics request from framed product conversation.",
        "inputSchema": _tool_schema(
            {
                "title": {"type": "string"},
                "needs": {"type": "array", "items": {"type": "string"}},
                "context": {"type": "array", "items": {"type": "string"}},
                "acceptance_criteria": {"type": "array", "items": {"type": "string"}},
                "theme": {"type": "string"},
                "complexity": {"type": "string", "enum": ["Low", "Medium", "High"]},
            },
            ["title", "needs", "context", "acceptance_criteria"],
        ),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "promote_request_to_backlog",
        "description": "Promote an existing Logics request to a backlog item.",
        "inputSchema": _tool_schema({"request_path": {"type": "string"}}, ["request_path"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "promote_backlog_to_task",
        "description": "Promote an existing Logics backlog item to an executable task.",
        "inputSchema": _tool_schema({"backlog_path": {"type": "string"}}, ["backlog_path"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "create_product_brief",
        "description": "Create a Logics product companion document.",
        "inputSchema": _tool_schema(
            {
                "title": {"type": "string"},
                "request_path": {"type": "string"},
                "backlog_path": {"type": "string"},
                "task_path": {"type": "string"},
            },
            ["title"],
        ),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "create_architecture_decision",
        "description": "Create a Logics architecture companion document.",
        "inputSchema": _tool_schema(
            {
                "title": {"type": "string"},
                "request_path": {"type": "string"},
                "backlog_path": {"type": "string"},
                "task_path": {"type": "string"},
            },
            ["title"],
        ),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "list_active_work",
        "description": "List active Logics request, backlog, and task documents.",
        "inputSchema": _tool_schema({"kind": {"type": "string", "enum": ["all", "request", "backlog", "task"]}}),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "run_logics_lint",
        "description": "Run Logics lint with required status indicators.",
        "inputSchema": _tool_schema({}),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "run_logics_audit",
        "description": "Run the standard Logics workflow audit.",
        "inputSchema": _tool_schema({}),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "show_git_diff",
        "description": "Show a size-limited Git diff summary for Logics paths.",
        "inputSchema": _tool_schema({"paths": {"type": "array", "items": {"type": "string"}}}),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
]
TOOLS_BY_NAME = {str(tool["name"]): tool for tool in TOOL_DEFINITIONS}


def _server_version() -> str:
    version_file = Path(__file__).resolve().parents[1] / "VERSION"
    try:
        version = version_file.read_text(encoding="utf-8").strip()
    except OSError:
        return "0.0.0"
    return version or "0.0.0"


def _repo_root(repo_root: Path | None = None) -> Path:
    if repo_root is not None:
        root = repo_root.resolve()
    else:
        try:
            root = find_repo_root(Path.cwd()).resolve()
        except ConfigError as exc:
            raise McpToolError("command_failed", str(exc)) from exc
    if not (root / "logics").is_dir():
        raise McpToolError("command_failed", f"Repository root has no logics directory: {root}")
    return root


def _validate_arguments(name: str, arguments: dict[str, Any]) -> None:
    schema = TOOLS_BY_NAME[name]["inputSchema"]
    properties = schema.get("properties", {})
    required = schema.get("required", [])
    for key in required:
        if key not in arguments:
            raise McpToolError("unsupported_action", f"Missing required argument: {key}")
    unknown = sorted(set(arguments) - set(properties))
    if unknown:
        raise McpToolError("unsupported_action", "Unsupported argument(s).", details={"arguments": unknown})
    for key, value in arguments.items():
        expected = properties.get(key, {})
        expected_type = expected.get("type")
        if expected_type == "string" and not isinstance(value, str):
            raise McpToolError("unsupported_action", f"Argument `{key}` must be a string.")
        if expected_type == "array":
            if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
                raise McpToolError("unsupported_action", f"Argument `{key}` must be an array of strings.")
        enum = expected.get("enum")
        if enum and value not in enum:
            raise McpToolError("unsupported_action", f"Argument `{key}` has an unsupported value.", details={"allowed": enum, "value": value})


def _relative_path(repo_root: Path, raw_path: str, allowed_dirs: tuple[str, ...]) -> Path:
    if not raw_path or not raw_path.strip():
        raise McpToolError("invalid_path", "Path is required.")
    candidate = Path(raw_path)
    if candidate.is_absolute():
        raise McpToolError("invalid_path", "Absolute paths are not accepted.", details={"path": raw_path})
    if any(part == ".." for part in candidate.parts):
        raise McpToolError("invalid_path", "Path traversal is not accepted.", details={"path": raw_path})
    normalized = Path(*candidate.parts)
    normalized_posix = normalized.as_posix()
    if normalized_posix == ".":
        raise McpToolError("invalid_path", "Path is required.")
    if not any(normalized_posix == directory or normalized_posix.startswith(f"{directory}/") for directory in allowed_dirs):
        raise McpToolError("invalid_path", "Path is outside the allowed Logics area.", details={"path": raw_path, "allowed_dirs": list(allowed_dirs)})
    resolved = (repo_root / normalized).resolve()
    try:
        resolved.relative_to(repo_root)
    except ValueError as exc:
        raise McpToolError("invalid_path", "Resolved path escapes the repository root.", details={"path": raw_path}) from exc
    if resolved.is_symlink():
        raise McpToolError("invalid_path", "Symlink paths are not accepted.", details={"path": raw_path})
    return normalized


def _run_command(repo_root: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    command = [sys.executable, "-m", "logics_manager", *args]
    result = subprocess.run(command, cwd=repo_root, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise McpToolError(
            "command_failed",
            "Underlying logics-manager command failed.",
            details={"command": ["python3", "-m", "logics_manager", *args], "stdout": result.stdout, "stderr": result.stderr, "returncode": result.returncode},
        )
    return result


def _json_from_stdout(stdout: str) -> dict[str, Any]:
    start = stdout.find("{")
    end = stdout.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise McpToolError("command_failed", "Expected JSON output from logics-manager.", details={"stdout": stdout})
    try:
        payload = json.loads(stdout[start : end + 1])
    except json.JSONDecodeError as exc:
        raise McpToolError("command_failed", "Could not parse JSON output from logics-manager.", details={"stdout": stdout}) from exc
    if not isinstance(payload, dict):
        raise McpToolError("command_failed", "Expected a JSON object from logics-manager.", details={"stdout": stdout})
    return payload


def _created_doc_from_stdout(stdout: str, *, command: str, kind: str) -> dict[str, Any]:
    payload = _json_from_stdout_or_none(stdout)
    if payload is not None:
        return payload
    match = re.search(rf"Created\s+{re.escape(kind)}:\s+(\S+)", stdout)
    if match is None:
        raise McpToolError("command_failed", "Could not find created document path in logics-manager output.", details={"stdout": stdout})
    path = match.group(1)
    return {"command": command, "kind": kind, "path": path, "ref": Path(path).stem, "dry_run": False}


def _json_from_stdout_or_none(stdout: str) -> dict[str, Any] | None:
    start = stdout.find("{")
    end = stdout.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        payload = json.loads(stdout[start : end + 1])
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _run_git(repo_root: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(["git", *args], cwd=repo_root, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise McpToolError("command_failed", "Git command failed.", details={"command": ["git", *args], "stderr": result.stderr, "returncode": result.returncode})
    return result


def _git_status_entries(repo_root: Path, paths: list[str]) -> dict[str, str]:
    result = _run_git(repo_root, ["status", "--short", "--", *paths])
    entries: dict[str, str] = {}
    for line in result.stdout.splitlines():
        if len(line) < 4:
            continue
        status = line[:2]
        path = line[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1].strip()
        if path:
            entries[path] = status
    return entries


def _ensure_no_dirty_conflict(repo_root: Path, paths: list[str]) -> None:
    statuses = _git_status_entries(repo_root, paths)
    conflicts = {
        path: status
        for path, status in statuses.items()
        if status != "??"
    }
    if conflicts:
        raise McpToolError(
            "dirty_conflict",
            "Refusing to modify existing uncommitted Logics changes.",
            details={"paths": conflicts},
        )


def _diff_summary(raw_diff: str, *, untracked_count: int = 0) -> str:
    files = 0
    added = 0
    removed = 0
    for line in raw_diff.splitlines():
        if line.startswith("diff --git "):
            files += 1
        elif line.startswith("+") and not line.startswith("+++"):
            added += 1
        elif line.startswith("-") and not line.startswith("---"):
            removed += 1
    suffix = f", {untracked_count} untracked file(s)" if untracked_count else ""
    return f"{files} tracked diff file(s), {added} insertion(s), {removed} deletion(s){suffix}"


def _show_git_diff(repo_root: Path, paths: list[str] | None = None) -> dict[str, Any]:
    path_args: list[str] = []
    if paths:
        for raw_path in paths:
            path_args.append(_relative_path(repo_root, raw_path, ("logics",)).as_posix())
    else:
        path_args = ["logics"]
    diff_result = _run_git(repo_root, ["diff", "--", *path_args])
    status_result = _run_git(repo_root, ["status", "--short", "-uall", "--", *path_args])
    raw_diff = diff_result.stdout
    truncated = len(raw_diff) > MAX_RAW_DIFF_CHARS
    changed_paths = [line[3:].strip() for line in status_result.stdout.splitlines() if line[3:].strip()]
    untracked_count = sum(1 for line in status_result.stdout.splitlines() if line.startswith("?? "))
    if truncated and paths:
        raise McpToolError(
            "output_too_large",
            "Diff output exceeded the MCP response limit.",
            details={"limit": MAX_RAW_DIFF_CHARS, "diff_summary": _diff_summary(raw_diff, untracked_count=untracked_count)},
        )
    return {
        "ok": True,
        "changed_paths": changed_paths,
        "diff_summary": _diff_summary(raw_diff, untracked_count=untracked_count),
        "raw_diff": raw_diff[:MAX_RAW_DIFF_CHARS],
        "truncated": truncated,
    }


def _lint_status(repo_root: Path) -> dict[str, Any]:
    payload = lint_payload(repo_root, require_status=True)
    return {
        "ok": bool(payload.get("ok")),
        "issue_count": payload.get("issue_count", 0),
        "warning_count": payload.get("warning_count", 0),
        "issues": payload.get("issues", []),
        "warnings": payload.get("warnings", []),
    }


def _audit_status(repo_root: Path) -> dict[str, Any]:
    payload = audit_payload(repo_root, legacy_cutoff_version="1.1.0", group_by_doc=True)
    return {
        "ok": bool(payload.get("ok")),
        "issue_count": payload.get("issue_count", 0),
        "issues": payload.get("issues", []),
        "issues_by_doc": payload.get("issues_by_doc", {}),
    }


def _bullets(values: Any) -> list[str]:
    if not isinstance(values, list):
        raise McpToolError("unsupported_action", "Expected a list of strings.")
    out = [str(value).strip() for value in values if str(value).strip()]
    if not out:
        raise McpToolError("unsupported_action", "Expected at least one non-empty string.")
    return out


def _replace_section(lines: list[str], heading: str, replacement: list[str]) -> list[str]:
    start = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.lower():
            start = idx + 1
            break
    if start is None:
        return lines
    end = len(lines)
    for idx in range(start, len(lines)):
        if lines[idx].startswith("# "):
            end = idx
            break
    return [*lines[:start], *replacement, "", *lines[end:]]


def _refresh_mermaid_signature(path: Path, kind: str) -> None:
    lines = path.read_text(encoding="utf-8").splitlines()
    expected = expected_workflow_mermaid_signature(kind, lines)
    if not expected:
        return
    updated = re.sub(
        r"^(\s*%%\s*logics-signature:\s*).+$",
        rf"\g<1>{expected}",
        "\n".join(lines),
        count=1,
        flags=re.MULTILINE,
    )
    path.write_text(updated.rstrip() + "\n", encoding="utf-8")


def _update_created_request(repo_root: Path, rel_path: str, arguments: dict[str, Any]) -> None:
    path = repo_root / rel_path
    lines = path.read_text(encoding="utf-8").splitlines()
    needs = [f"- {item}" for item in _bullets(arguments.get("needs"))]
    context = [f"- {item}" for item in _bullets(arguments.get("context"))]
    acceptance = []
    for index, item in enumerate(_bullets(arguments.get("acceptance_criteria")), start=1):
        text = re.sub(r"^AC\d+\s*:\s*", "", item).strip()
        acceptance.append(f"- AC{index}: {text}")
    lines = _replace_section(lines, "Needs", needs)
    lines = _replace_section(lines, "Context", context)
    lines = _replace_section(lines, "Acceptance criteria", acceptance)
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    _refresh_mermaid_signature(path, "request")


def _flow_path_ref(path_value: str | None) -> str | None:
    if not path_value:
        return None
    return Path(path_value).stem


def _validation_result(repo_root: Path, *, include_audit: bool = False) -> dict[str, Any]:
    lint = _lint_status(repo_root)
    payload: dict[str, Any] = {"lint_status": lint}
    if include_audit:
        payload["audit_status"] = _audit_status(repo_root)
    return payload


def call_tool(name: str, arguments: dict[str, Any] | None = None, *, repo_root: Path | None = None) -> dict[str, Any]:
    root = _repo_root(repo_root)
    args = arguments or {}
    if name not in TOOLS_BY_NAME:
        raise McpToolError("unsupported_action", f"Unsupported MCP tool: {name}")
    _validate_arguments(name, args)

    if name == "run_logics_lint":
        return {"ok": True, "status": _lint_status(root)}
    if name == "run_logics_audit":
        return {"ok": True, "status": _audit_status(root)}
    if name == "list_active_work":
        kind = str(args.get("kind") or "all")
        if kind not in {"all", "request", "backlog", "task"}:
            raise McpToolError("unsupported_action", "Unsupported list kind.", details={"kind": kind})
        return {"ok": True, "items": flow_list_payload(root, kind=kind)["entries"]}
    if name == "show_git_diff":
        raw_paths = args.get("paths")
        paths = [str(path) for path in raw_paths] if isinstance(raw_paths, list) else None
        return _show_git_diff(root, paths)

    if name == "create_request":
        title = str(args.get("title") or "").strip()
        if not title:
            raise McpToolError("unsupported_action", "title is required.")
        command = ["flow", "new", "request", "--title", title, "--format", "json"]
        if args.get("theme"):
            command.extend(["--theme", str(args["theme"])])
        if args.get("complexity"):
            command.extend(["--complexity", str(args["complexity"])])
        payload = _created_doc_from_stdout(_run_command(root, command).stdout, command="new", kind="request")
        _update_created_request(root, str(payload["path"]), args)
        return {
            "ok": True,
            "path": payload["path"],
            "ref": payload["ref"],
            "summary": f"Created request {payload['ref']}",
            **_validation_result(root),
            **_show_git_diff(root, [str(payload["path"])]),
        }

    if name == "promote_request_to_backlog":
        rel_path = _relative_path(root, str(args.get("request_path") or ""), ("logics/request",))
        _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
        payload = _json_from_stdout(_run_command(root, ["flow", "promote", "request-to-backlog", rel_path.as_posix(), "--format", "json"]).stdout)
        return {
            "ok": True,
            "source_path": payload["source"],
            "created_path": payload["created_path"],
            "created_ref": payload["created_ref"],
            **_validation_result(root),
            **_show_git_diff(root, [str(payload["source"]), str(payload["created_path"])]),
        }

    if name == "promote_backlog_to_task":
        rel_path = _relative_path(root, str(args.get("backlog_path") or ""), ("logics/backlog",))
        _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
        payload = _json_from_stdout(_run_command(root, ["flow", "promote", "backlog-to-task", rel_path.as_posix(), "--format", "json"]).stdout)
        return {
            "ok": True,
            "source_path": payload["source"],
            "created_path": payload["created_path"],
            "created_ref": payload["created_ref"],
            **_validation_result(root),
            **_show_git_diff(root, [str(payload["source"]), str(payload["created_path"])]),
        }

    if name in {"create_product_brief", "create_architecture_decision"}:
        title = str(args.get("title") or "").strip()
        if not title:
            raise McpToolError("unsupported_action", "title is required.")
        companion_kind = "product" if name == "create_product_brief" else "architecture"
        command = ["flow", "companion", companion_kind, "--title", title, "--format", "json"]
        ref_args = (
            ("request_path", "--request-ref", "logics/request"),
            ("backlog_path", "--backlog-ref", "logics/backlog"),
            ("task_path", "--task-ref", "logics/tasks"),
        )
        linked_refs: dict[str, str] = {}
        for key, flag, directory in ref_args:
            if args.get(key):
                rel_path = _relative_path(root, str(args[key]), (directory,))
                ref = _flow_path_ref(rel_path.as_posix())
                if ref:
                    command.extend([flag, ref])
                    linked_refs[key] = rel_path.as_posix()
        payload = _json_from_stdout(_run_command(root, command).stdout)
        return {
            "ok": True,
            "path": payload["path"],
            "ref": payload["ref"],
            "linked_refs": linked_refs,
            **_validation_result(root, include_audit=True),
            **_show_git_diff(root, [str(payload["path"])]),
        }

    raise McpToolError("unsupported_action", f"Unsupported MCP tool: {name}")


def mcp_result(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "content": [{"type": "text", "text": json.dumps(payload, indent=2, sort_keys=True)}],
        "structuredContent": payload,
        "isError": not bool(payload.get("ok", True)),
    }


def handle_jsonrpc(message: dict[str, Any], *, repo_root: Path | None = None) -> dict[str, Any] | None:
    method = message.get("method")
    request_id = message.get("id")
    if method == "notifications/initialized":
        return None
    try:
        if method == "initialize":
            result = {
                "protocolVersion": "2025-06-18",
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "logics-manager", "version": _server_version()},
            }
        elif method == "tools/list":
            result = {"tools": TOOL_DEFINITIONS}
        elif method == "tools/call":
            params = message.get("params") if isinstance(message.get("params"), dict) else {}
            name = str(params.get("name") or "")
            arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
            result = mcp_result(call_tool(name, arguments, repo_root=repo_root))
        else:
            raise McpToolError("unsupported_action", f"Unsupported JSON-RPC method: {method}")
        if request_id is None:
            return None
        return {"jsonrpc": JSONRPC_VERSION, "id": request_id, "result": result}
    except McpToolError as exc:
        error_payload = exc.to_payload()
        if method == "tools/call" and request_id is not None:
            return {"jsonrpc": JSONRPC_VERSION, "id": request_id, "result": mcp_result(error_payload)}
        return {"jsonrpc": JSONRPC_VERSION, "id": request_id, "error": {"code": -32000, "message": exc.message, "data": error_payload}}


def serve_stdio(*, repo_root: Path | None = None) -> int:
    root = _repo_root(repo_root)
    for line in sys.stdin:
        stripped = line.strip()
        if not stripped:
            continue
        try:
            message = json.loads(stripped)
            if not isinstance(message, dict):
                raise ValueError("JSON-RPC message must be an object.")
            response = handle_jsonrpc(message, repo_root=root)
        except Exception as exc:
            response = {"jsonrpc": JSONRPC_VERSION, "id": None, "error": {"code": -32700, "message": str(exc)}}
        if response is not None:
            print(json.dumps(response, separators=(",", ":")), flush=True)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="logics-manager mcp", description="Run or inspect the Logics MCP server.")
    sub = parser.add_subparsers(dest="command", required=True)
    serve = sub.add_parser("serve", help="Serve MCP JSON-RPC over stdio.")
    serve.add_argument("--repo-root", default=None)
    tools = sub.add_parser("tools", help="Print the exposed MCP tool definitions.")
    tools.add_argument("--format", choices=("json",), default="json")
    call = sub.add_parser("call", help="Call one MCP tool directly for local testing.")
    call.add_argument("name")
    call.add_argument("--arguments", default="{}")
    call.add_argument("--repo-root", default=None)
    parsed = parser.parse_args(argv)

    if parsed.command == "tools":
        print(json.dumps({"tools": TOOL_DEFINITIONS}, indent=2, sort_keys=True))
        return 0
    if parsed.command == "serve":
        return serve_stdio(repo_root=Path(parsed.repo_root) if parsed.repo_root else None)
    if parsed.command == "call":
        try:
            arguments = json.loads(parsed.arguments)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid JSON arguments: {exc}") from exc
        if not isinstance(arguments, dict):
            raise SystemExit("Arguments must be a JSON object.")
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                payload = call_tool(parsed.name, arguments, repo_root=Path(parsed.repo_root) if parsed.repo_root else None)
        except McpToolError as exc:
            print(json.dumps(exc.to_payload(), indent=2, sort_keys=True))
            return 1
        print(json.dumps(payload, indent=2, sort_keys=True))
        return 0
    return 1
