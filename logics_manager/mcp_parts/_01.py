from __future__ import annotations

import argparse
import contextlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
import re
import secrets
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from .audit import audit_payload
from .config import ConfigError, find_repo_root
from .flow import flow_list_payload
from .insights import followups_payload, health_payload, product_consistency_payload, status_payload
from .lint import expected_workflow_mermaid_signature, lint_payload
from .release import release_plan_payload, release_status_payload
from .sync import append_workflow_note_payload, build_context_pack_payload, list_logics_docs_payload, read_logics_doc_payload, search_logics_docs_payload, update_workflow_indicators_payload


ALLOWED_WRITE_DIRS = (
    "logics/request",
    "logics/backlog",
    "logics/tasks",
    "logics/product",
    "logics/architecture",
)
MAX_RAW_DIFF_CHARS = 12000
MAX_ERROR_OUTPUT_CHARS = 2000
JSONRPC_VERSION = "2.0"
MAX_HTTP_BODY_BYTES = 2 * 1024 * 1024
AUTH_ENV_VAR = "LOGICS_MCP_BEARER_TOKEN"


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
        "name": "list_companion_docs",
        "description": "List Logics companion documents such as product briefs and architecture decisions.",
        "inputSchema": _tool_schema(
            {
                "kind": {"type": "string", "enum": ["all", "product", "architecture"]},
                "limit": {"type": "integer"},
            }
        ),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "list_active_work",
        "description": "List active Logics request, backlog, and task documents.",
        "inputSchema": _tool_schema({"kind": {"type": "string", "enum": ["all", "request", "backlog", "task"]}}),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "read_logics_doc",
        "description": "Read one approved Logics workflow document by ref or repo-relative path.",
        "inputSchema": _tool_schema(
            {
                "source": {"type": "string"},
                "max_chars": {"type": "integer"},
                "sections": {"type": "array", "items": {"type": "string"}},
            },
            ["source"],
        ),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "build_context_pack",
        "description": "Build a compact Logics context pack for a workflow ref.",
        "inputSchema": _tool_schema(
            {
                "ref": {"type": "string"},
                "mode": {"type": "string", "enum": ["summary-only", "diff-first", "full"]},
                "profile": {"type": "string", "enum": ["tiny", "normal", "deep"]},
            },
            ["ref"],
        ),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "get_release_status",
        "description": "Read project-owned release workflow status without publishing or mutating files.",
        "inputSchema": _tool_schema({}),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "get_release_plan",
        "description": "Build a non-mutating release plan for a target version; publication steps are explicitly marked.",
        "inputSchema": _tool_schema({"version": {"type": "string"}}, ["version"]),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "list_logics_docs",
        "description": "List Logics workflow documents by bounded criteria.",
        "inputSchema": _tool_schema(
            {
                "kind": {"type": "string", "enum": ["all", "request", "backlog", "task"]},
                "status": {"type": "string"},
                "ref_prefix": {"type": "string"},
                "limit": {"type": "integer"},
            }
        ),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "search_logics_docs",
        "description": "Search approved Logics workflow docs with bounded snippets.",
        "inputSchema": _tool_schema(
            {
                "query": {"type": "string"},
                "kind": {"type": "string", "enum": ["all", "request", "backlog", "task"]},
                "status": {"type": "string"},
                "limit": {"type": "integer"},
                "max_snippet_chars": {"type": "integer"},
            },
            ["query"],
        ),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "get_logics_status",
        "description": "Summarize open Logics workflow docs and next actions.",
        "inputSchema": _tool_schema({"limit": {"type": "integer"}}),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "get_logics_health",
        "description": "Show Logics workflow health counts and issue signals.",
        "inputSchema": _tool_schema({"limit": {"type": "integer"}}),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "list_logics_followups",
        "description": "List actionable Logics follow-up areas with request creation commands.",
        "inputSchema": _tool_schema(
            {
                "source_kind": {"type": "string", "enum": ["all", "request", "backlog", "task", "product", "architecture"]},
                "include_closed": {"type": "boolean"},
                "closed_only": {"type": "boolean"},
                "limit": {"type": "integer"},
            }
        ),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "check_product_consistency",
        "description": "Check product brief lineage links for active and validated product docs.",
        "inputSchema": _tool_schema({"limit": {"type": "integer"}}),
        "annotations": {"readOnlyHint": True, "idempotentHint": True, "destructiveHint": False},
    },
    {
        "name": "finish_task",
        "description": "Finish a Logics task through the canonical flow finish task command.",
        "inputSchema": _tool_schema({"task_path": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["task_path"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "close_workflow_doc",
        "description": "Close a Logics request, backlog item, or task through the canonical flow close command.",
        "inputSchema": _tool_schema({"kind": {"type": "string", "enum": ["request", "backlog", "task"]}, "source_path": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["kind", "source_path"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "close_eligible_requests",
        "description": "Close requests whose linked backlog items are already done.",
        "inputSchema": _tool_schema({"dry_run": {"type": "boolean"}}),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "refresh_mermaid_signatures",
        "description": "Refresh deterministic signatures for legacy workflow Mermaid blocks when present.",
        "inputSchema": _tool_schema({"dry_run": {"type": "boolean"}}),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "update_workflow_indicators",
        "description": "Update approved workflow indicators without free-form Markdown editing.",
        "inputSchema": _tool_schema(
            {
                "source": {"type": "string"},
                "status": {"type": "string"},
                "progress": {"type": "string"},
                "understanding": {"type": "string"},
                "confidence": {"type": "string"},
                "theme": {"type": "string"},
                "complexity": {"type": "string"},
                "dry_run": {"type": "boolean"},
            },
            ["source"],
        ),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "append_report_entry",
        "description": "Append bounded content to a task Report section.",
        "inputSchema": _tool_schema({"source": {"type": "string"}, "text": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["source", "text"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "append_validation_note",
        "description": "Append bounded content to a workflow Validation section.",
        "inputSchema": _tool_schema({"source": {"type": "string"}, "text": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["source", "text"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "append_decision_note",
        "description": "Append bounded rationale to an approved workflow decision or notes section.",
        "inputSchema": _tool_schema({"source": {"type": "string"}, "text": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["source", "text"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "split_request",
        "description": "Split one Logics request into multiple backlog items through the canonical flow split command.",
        "inputSchema": _tool_schema({"request_path": {"type": "string"}, "titles": {"type": "array", "items": {"type": "string"}}, "dry_run": {"type": "boolean"}}, ["request_path", "titles"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "split_backlog",
        "description": "Split one Logics backlog item into multiple tasks through the canonical flow split command.",
        "inputSchema": _tool_schema({"backlog_path": {"type": "string"}, "titles": {"type": "array", "items": {"type": "string"}}, "dry_run": {"type": "boolean"}}, ["backlog_path", "titles"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "autofix_ac_traceability",
        "description": "Run deterministic audit autofix for missing AC traceability skeleton entries.",
        "inputSchema": _tool_schema({"paths": {"type": "array", "items": {"type": "string"}}, "refs": {"type": "array", "items": {"type": "string"}}}),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
    },
    {
        "name": "autofix_structure",
        "description": "Run deterministic audit autofix for supported workflow document structure repairs.",
        "inputSchema": _tool_schema({"paths": {"type": "array", "items": {"type": "string"}}, "refs": {"type": "array", "items": {"type": "string"}}}),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
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
    {
        "name": "delete_logics_file",
        "description": "Delete one bounded Logics Markdown file from an approved Logics directory.",
        "inputSchema": _tool_schema({"path": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["path"]),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": True},
    },
    {
        "name": "rename_logics_file",
        "description": "Rename one bounded Logics Markdown file within approved Logics directories.",
        "inputSchema": _tool_schema(
            {
                "source_path": {"type": "string"},
                "destination_path": {"type": "string"},
                "dry_run": {"type": "boolean"},
            },
            ["source_path", "destination_path"],
        ),
        "annotations": {"readOnlyHint": False, "idempotentHint": False, "destructiveHint": False},
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
            raise McpToolError("missing_required_argument", f"Missing required argument: {key}", details={"argument": key})
    unknown = sorted(set(arguments) - set(properties))
    if unknown:
        raise McpToolError("unsupported_argument", "Unsupported argument(s).", details={"arguments": unknown})
    for key, value in arguments.items():
        expected = properties.get(key, {})
        expected_type = expected.get("type")
        if expected_type == "string" and not isinstance(value, str):
            raise McpToolError("invalid_argument_type", f"Argument `{key}` must be a string.", details={"argument": key, "expected": "string"})
        if expected_type == "array":
            if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
                raise McpToolError("invalid_argument_type", f"Argument `{key}` must be an array of strings.", details={"argument": key, "expected": "array[string]"})
        if expected_type == "integer" and (not isinstance(value, int) or isinstance(value, bool)):
            raise McpToolError("invalid_argument_type", f"Argument `{key}` must be an integer.", details={"argument": key, "expected": "integer"})
        if expected_type == "boolean" and not isinstance(value, bool):
            raise McpToolError("invalid_argument_type", f"Argument `{key}` must be a boolean.", details={"argument": key, "expected": "boolean"})
        enum = expected.get("enum")
        if enum and value not in enum:
            raise McpToolError("invalid_argument_value", f"Argument `{key}` has an unsupported value.", details={"argument": key, "allowed": enum, "value": value})


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
    current = repo_root
    for part in normalized.parts:
        current = current / part
        if current.exists() and current.is_symlink():
            raise McpToolError("invalid_path", "Symlink paths are not accepted.", details={"path": raw_path})
    return normalized


def _resolved_markdown_file_path(repo_root: Path, raw_path: str, allowed_dirs: tuple[str, ...] = ALLOWED_WRITE_DIRS) -> tuple[Path, Path]:
    rel_path = _markdown_file_path(repo_root, raw_path, allowed_dirs)
    return rel_path, (repo_root / rel_path).resolve(strict=False)


def _markdown_file_path(repo_root: Path, raw_path: str, allowed_dirs: tuple[str, ...] = ALLOWED_WRITE_DIRS) -> Path:
    rel_path = _relative_path(repo_root, raw_path, allowed_dirs)
    if rel_path.suffix != ".md":
        raise McpToolError("invalid_path", "Only Markdown files are accepted.", details={"path": raw_path, "extension": rel_path.suffix})
    return rel_path


def _safe_output_tail(repo_root: Path, value: str) -> str:
    scrubbed = value.replace(repo_root.as_posix(), "<repo>").replace(str(repo_root), "<repo>")
    return scrubbed[-MAX_ERROR_OUTPUT_CHARS:] if len(scrubbed) > MAX_ERROR_OUTPUT_CHARS else scrubbed


def _command_error_details(repo_root: Path, command: list[str], result: subprocess.CompletedProcess[str]) -> dict[str, Any]:
    return {
        "command": command,
        "stdout_tail": _safe_output_tail(repo_root, result.stdout),
        "stderr_tail": _safe_output_tail(repo_root, result.stderr),
        "returncode": result.returncode,
    }


def _run_command(repo_root: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    command = [sys.executable, "-m", "logics_manager", *args]
    result = subprocess.run(command, cwd=repo_root, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=_subprocess_env())
    if result.returncode != 0:
        raise McpToolError(
            "command_failed",
            "Underlying logics-manager command failed.",
            details=_command_error_details(repo_root, ["python3", "-m", "logics_manager", *args], result),
        )
    return result


