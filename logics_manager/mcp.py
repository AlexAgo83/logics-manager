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
from fnmatch import fnmatch
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
from .mcp_request import update_created_request
from .release import release_plan_payload, release_status_payload
from .sync import append_workflow_note_payload, build_context_pack_payload, list_logics_docs_payload, read_logics_doc_payload, search_logics_docs_payload, update_workflow_indicators_payload


ALLOWED_WRITE_DIRS = (
    "logics/request",
    "logics/backlog",
    "logics/tasks",
    "logics/product",
    "logics/roadmap",
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
                "origin": {"type": "string", "enum": ["human", "agent", "github"]},
                "external_url": {"type": "string"},
                "external_id": {"type": "string"},
                "actor": {"type": "string"},
                "dry_run": {"type": "boolean"},
            },
            ["title", "needs", "context", "acceptance_criteria"],
        ),
    },
    {
        "name": "promote_request_to_backlog",
        "description": "Promote an existing Logics request to a backlog item.",
        "inputSchema": _tool_schema(
            {"request_path": {"type": "string"}, "dry_run": {"type": "boolean"}},
            ["request_path"],
        ),
    },
    {
        "name": "promote_backlog_to_task",
        "description": "Promote an existing Logics backlog item to an executable task.",
        "inputSchema": _tool_schema(
            {"backlog_path": {"type": "string"}, "dry_run": {"type": "boolean"}},
            ["backlog_path"],
        ),
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
                "dry_run": {"type": "boolean"},
            },
            ["title"],
        ),
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
                "dry_run": {"type": "boolean"},
            },
            ["title"],
        ),
    },
    {
        "name": "create_roadmap",
        "description": "Create a Logics roadmap companion document with versioned milestones.",
        "inputSchema": _tool_schema(
            {
                "title": {"type": "string"},
                "milestones": {"type": "array", "items": {"type": "string"}},
                "product_path": {"type": "string"},
                "request_paths": {"type": "array", "items": {"type": "string"}},
                "backlog_paths": {"type": "array", "items": {"type": "string"}},
                "task_paths": {"type": "array", "items": {"type": "string"}},
                "dry_run": {"type": "boolean"},
            },
            ["title"],
        ),
    },
    {
        "name": "list_companion_docs",
        "description": "List Logics companion documents such as product briefs, roadmaps, and architecture decisions.",
        "inputSchema": _tool_schema(
            {
                "kind": {"type": "string", "enum": ["all", "product", "roadmap", "architecture"]},
                "limit": {"type": "integer"},
            }
        ),
    },
    {
        "name": "list_active_work",
        "description": "List active Logics request, backlog, and task documents.",
        "inputSchema": _tool_schema({"kind": {"type": "string", "enum": ["all", "request", "backlog", "task"]}}),
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
    },
    {
        "name": "get_release_status",
        "description": "Read project-owned release workflow status without publishing or mutating files.",
        "inputSchema": _tool_schema({}),
    },
    {
        "name": "get_release_plan",
        "description": "Build a non-mutating release plan for a target version; publication steps are explicitly marked.",
        "inputSchema": _tool_schema({"version": {"type": "string"}}, ["version"]),
    },
    {
        "name": "list_logics_docs",
        "description": "List Logics workflow documents by bounded criteria.",
        "inputSchema": _tool_schema(
            {
                "kind": {"type": "string", "enum": ["all", "request", "backlog", "task", "product", "roadmap", "architecture", "spec"]},
                "status": {"type": "string"},
                "ref_prefix": {"type": "string"},
                "limit": {"type": "integer"},
            }
        ),
    },
    {
        "name": "search_logics_docs",
        "description": "Search approved Logics workflow docs with bounded snippets.",
        "inputSchema": _tool_schema(
            {
                "query": {"type": "string"},
                "kind": {"type": "string", "enum": ["all", "request", "backlog", "task", "product", "roadmap", "architecture", "spec"]},
                "status": {"type": "string"},
                "limit": {"type": "integer"},
                "max_snippet_chars": {"type": "integer"},
            },
            ["query"],
        ),
    },
    {
        "name": "get_logics_status",
        "description": "Summarize open Logics workflow docs and next actions.",
        "inputSchema": _tool_schema({"limit": {"type": "integer"}}),
    },
    {
        "name": "get_logics_health",
        "description": "Show Logics workflow health counts and issue signals.",
        "inputSchema": _tool_schema({"limit": {"type": "integer"}}),
    },
    {
        "name": "list_logics_followups",
        "description": "List actionable Logics follow-up areas with request creation commands.",
        "inputSchema": _tool_schema(
            {
                "source_kind": {"type": "string", "enum": ["all", "request", "backlog", "task", "product", "roadmap", "architecture"]},
                "include_closed": {"type": "boolean"},
                "closed_only": {"type": "boolean"},
                "limit": {"type": "integer"},
            }
        ),
    },
    {
        "name": "check_product_consistency",
        "description": "Check product brief lineage links for active and validated product docs.",
        "inputSchema": _tool_schema({"limit": {"type": "integer"}}),
    },
    {
        "name": "finish_task",
        "description": "Finish a Logics task through the canonical flow finish task command.",
        "inputSchema": _tool_schema({"task_path": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["task_path"]),
    },
    {
        "name": "close_workflow_doc",
        "description": "Close a Logics request, backlog item, or task through the canonical flow close command.",
        "inputSchema": _tool_schema({"kind": {"type": "string", "enum": ["request", "backlog", "task"]}, "source_path": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["kind", "source_path"]),
    },
    {
        "name": "close_eligible_requests",
        "description": "Close requests whose linked backlog items are already done.",
        "inputSchema": _tool_schema({"dry_run": {"type": "boolean"}}),
    },
    {
        "name": "refresh_mermaid_signatures",
        "description": "Refresh deterministic signatures for legacy workflow Mermaid blocks when present.",
        "inputSchema": _tool_schema({"dry_run": {"type": "boolean"}}),
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
    },
    {
        "name": "append_report_entry",
        "description": "Append bounded content to a task Report section.",
        "inputSchema": _tool_schema({"source": {"type": "string"}, "text": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["source", "text"]),
    },
    {
        "name": "append_validation_note",
        "description": "Append bounded content to a workflow Validation section.",
        "inputSchema": _tool_schema({"source": {"type": "string"}, "text": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["source", "text"]),
    },
    {
        "name": "append_decision_note",
        "description": "Append bounded rationale to an approved workflow decision or notes section.",
        "inputSchema": _tool_schema({"source": {"type": "string"}, "text": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["source", "text"]),
    },
    {
        "name": "split_request",
        "description": "Split one Logics request into multiple backlog items through the canonical flow split command.",
        "inputSchema": _tool_schema({"request_path": {"type": "string"}, "titles": {"type": "array", "items": {"type": "string"}}, "dry_run": {"type": "boolean"}}, ["request_path", "titles"]),
    },
    {
        "name": "split_backlog",
        "description": "Split one Logics backlog item into multiple tasks through the canonical flow split command.",
        "inputSchema": _tool_schema({"backlog_path": {"type": "string"}, "titles": {"type": "array", "items": {"type": "string"}}, "dry_run": {"type": "boolean"}}, ["backlog_path", "titles"]),
    },
    {
        "name": "autofix_ac_traceability",
        "description": "Run deterministic audit autofix for missing AC traceability skeleton entries.",
        "inputSchema": _tool_schema({"paths": {"type": "array", "items": {"type": "string"}}, "refs": {"type": "array", "items": {"type": "string"}},
                "dry_run": {"type": "boolean"},
            }),
    },
    {
        "name": "autofix_structure",
        "description": "Run deterministic audit autofix for supported workflow document structure repairs.",
        "inputSchema": _tool_schema({"paths": {"type": "array", "items": {"type": "string"}}, "refs": {"type": "array", "items": {"type": "string"}},
                "dry_run": {"type": "boolean"},
            }),
    },
    {
        "name": "run_logics_lint",
        "description": "Run Logics lint with required status indicators.",
        "inputSchema": _tool_schema({}),
    },
    {
        "name": "run_logics_audit",
        "description": "Run the standard Logics workflow audit.",
        "inputSchema": _tool_schema({}),
    },
    {
        "name": "show_git_diff",
        "description": "Show a size-limited Git diff summary for Logics paths.",
        "inputSchema": _tool_schema({"paths": {"type": "array", "items": {"type": "string"}}}),
    },
    {
        "name": "delete_logics_file",
        "description": "Delete one bounded Logics Markdown file from an approved Logics directory.",
        "inputSchema": _tool_schema({"path": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["path"]),
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
    },
    {
        "name": "scaffold_request_chain",
        "description": "Author a full Logics request chain (request + product brief + backlog slices + orchestration task + optional context pack) in one call. `input` is the request-chain JSON; run the CLI with --print-schema/--example for its shape.",
        "inputSchema": _tool_schema(
            {
                "input": {"type": "object", "description": "request-chain JSON: title, request, product, backlog_items[], orchestration_task, context_pack."},
                "context_pack_out": {"type": "string"},
                "dry_run": {"type": "boolean"},
            },
            ["input"],
        ),
    },
]
READ_ONLY = "read-only"
MUTATING = "mutating"
DESTRUCTIVE = "destructive"

# What each tool can do to the corpus. Serving the whole set is all-or-nothing
# without this: an integration that only needs a status glance would otherwise
# have to accept delete/rename/split as standing surface, or wrap a curated
# subset in a server of its own.
TOOL_CAPABILITIES: dict[str, str] = {
    # read-only
    "list_companion_docs": READ_ONLY,
    "list_active_work": READ_ONLY,
    "read_logics_doc": READ_ONLY,
    "build_context_pack": READ_ONLY,
    "get_release_status": READ_ONLY,
    "get_release_plan": READ_ONLY,
    "list_logics_docs": READ_ONLY,
    "search_logics_docs": READ_ONLY,
    "get_logics_status": READ_ONLY,
    "get_logics_health": READ_ONLY,
    "list_logics_followups": READ_ONLY,
    "check_product_consistency": READ_ONLY,
    "run_logics_lint": READ_ONLY,
    "run_logics_audit": READ_ONLY,
    "show_git_diff": READ_ONLY,
    # mutating: creates or edits documents, never removes or restructures them
    "create_request": MUTATING,
    "promote_request_to_backlog": MUTATING,
    "promote_backlog_to_task": MUTATING,
    "create_product_brief": MUTATING,
    "create_architecture_decision": MUTATING,
    "create_roadmap": MUTATING,
    "scaffold_request_chain": MUTATING,
    "finish_task": MUTATING,
    "close_workflow_doc": MUTATING,
    "close_eligible_requests": MUTATING,
    "refresh_mermaid_signatures": MUTATING,
    "update_workflow_indicators": MUTATING,
    "append_report_entry": MUTATING,
    "append_validation_note": MUTATING,
    "append_decision_note": MUTATING,
    "autofix_ac_traceability": MUTATING,
    "autofix_structure": MUTATING,
    # destructive: removes a document, or restructures the corpus around it
    "delete_logics_file": DESTRUCTIVE,
    "rename_logics_file": DESTRUCTIVE,
    "split_request": DESTRUCTIVE,
    "split_backlog": DESTRUCTIVE,
}

TOOL_PROFILES: dict[str, tuple[str, ...]] = {
    READ_ONLY: (READ_ONLY,),
    "curated": (READ_ONLY, MUTATING),
    "full": (READ_ONLY, MUTATING, DESTRUCTIVE),
}
DEFAULT_TOOL_PROFILE = "full"

for _tool in TOOL_DEFINITIONS:
    _tool["capability"] = TOOL_CAPABILITIES.get(str(_tool["name"]), MUTATING)

TOOLS_BY_NAME = {str(tool["name"]): tool for tool in TOOL_DEFINITIONS}

_EXPOSED_TOOLS: frozenset[str] | None = None
_ACTIVE_PROFILE: str = DEFAULT_TOOL_PROFILE


class ToolSelectionError(ValueError):
    """Raised for an unusable --profile/--allow-tools/--deny-tools selection."""


def _match_patterns(patterns: list[str] | None) -> tuple[set[str], list[str]]:
    """Expand glob patterns against the tool names; report the ones that match nothing."""
    matched: set[str] = set()
    unmatched: list[str] = []
    for pattern in patterns or []:
        hits = {name for name in TOOLS_BY_NAME if fnmatch(name, pattern)}
        if hits:
            matched |= hits
        else:
            unmatched.append(pattern)
    return matched, unmatched


def select_tools(
    *,
    profile: str = DEFAULT_TOOL_PROFILE,
    allow: list[str] | None = None,
    deny: list[str] | None = None,
) -> list[str]:
    """Resolve the served tool names. Deny always wins over allow and profile."""
    if profile not in TOOL_PROFILES:
        raise ToolSelectionError(
            f"Unknown tool profile: {profile!r} (choose from {', '.join(sorted(TOOL_PROFILES))})"
        )
    capabilities = TOOL_PROFILES[profile]
    selected = {name for name, capability in TOOL_CAPABILITIES.items() if capability in capabilities}
    selected &= set(TOOLS_BY_NAME)

    allowed, unmatched_allow = _match_patterns(allow)
    denied, unmatched_deny = _match_patterns(deny)
    unmatched = unmatched_allow + unmatched_deny
    if unmatched:
        raise ToolSelectionError(
            "No tool matches: " + ", ".join(sorted(unmatched))
            + ". Check the names with `logics-manager mcp tools`."
        )
    if allow:
        selected |= allowed
    selected -= denied
    if not selected:
        raise ToolSelectionError("The selection leaves no tool exposed.")
    return sorted(selected)


def set_exposed_tools(names: list[str] | None, *, profile: str = DEFAULT_TOOL_PROFILE) -> None:
    global _EXPOSED_TOOLS, _ACTIVE_PROFILE
    _EXPOSED_TOOLS = None if names is None else frozenset(names)
    _ACTIVE_PROFILE = profile


def exposed_tool_names() -> list[str]:
    if _EXPOSED_TOOLS is None:
        return sorted(TOOLS_BY_NAME)
    return sorted(_EXPOSED_TOOLS)


def exposed_tool_definitions() -> list[dict[str, Any]]:
    if _EXPOSED_TOOLS is None:
        return TOOL_DEFINITIONS
    return [tool for tool in TOOL_DEFINITIONS if str(tool["name"]) in _EXPOSED_TOOLS]


def active_tool_profile() -> str:
    return _ACTIVE_PROFILE


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


def _run_json_command(repo_root: Path, args: list[str]) -> dict[str, Any]:
    command = [sys.executable, "-m", "logics_manager", *args]
    result = subprocess.run(command, cwd=repo_root, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=_subprocess_env())
    payload = _json_from_stdout_or_none(result.stdout)
    if payload is None:
        raise McpToolError(
            "command_failed",
            "Underlying logics-manager command failed.",
            details=_command_error_details(repo_root, ["python3", "-m", "logics_manager", *args], result),
        )
    return payload


def _subprocess_env() -> dict[str, str]:
    env = os.environ.copy()
    source_root = str(Path(__file__).resolve().parents[1])
    existing = env.get("PYTHONPATH")
    env["PYTHONPATH"] = source_root if not existing else os.pathsep.join([source_root, existing])
    return env


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
        raise McpToolError("command_failed", "Git command failed.", details=_command_error_details(repo_root, ["git", *args], result))
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
        "can_continue": bool(payload.get("can_continue", payload.get("ok"))),
        "release_ready": bool(payload.get("release_ready", payload.get("ok"))),
        "issue_count": payload.get("issue_count", 0),
        "warning_count": payload.get("warning_count", 0),
        "strict_count": payload.get("strict_count", 0),
        "finding_count": payload.get("finding_count", payload.get("issue_count", 0)),
        "issues": payload.get("issues", []),
        "warnings": payload.get("warnings", []),
        "strict": payload.get("strict", []),
        "findings": payload.get("findings", payload.get("issues", [])),
        "issues_by_doc": payload.get("issues_by_doc", {}),
    }


def _bullets(values: Any) -> list[str]:
    if not isinstance(values, list):
        raise McpToolError("invalid_argument_type", "Expected a list of strings.")
    out = [str(value).strip() for value in values if str(value).strip()]
    if not out:
        raise McpToolError("invalid_argument_value", "Expected at least one non-empty string.")
    return out




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


def _document_preview(repo_root: Path, rel_path: str, *, max_chars: int = 1600) -> dict[str, Any]:
    path = repo_root / rel_path
    text = path.read_text(encoding="utf-8")
    return {
        "path": rel_path,
        "content": text[:max_chars],
        "truncated": len(text) > max_chars,
    }


def _indicator_from_lines(lines: list[str], key: str) -> str | None:
    prefix = f"> {key}:"
    for line in lines:
        if line.startswith(prefix):
            return line.split(":", 1)[1].strip()
    return None


def _title_from_heading(lines: list[str], fallback: str) -> str:
    for line in lines:
        if not line.startswith("## "):
            continue
        heading = line[3:].strip()
        if " - " in heading:
            return heading.split(" - ", 1)[1].strip()
        return heading
    return fallback


def _parse_companion_refs(value: str | None) -> list[str]:
    if not value or value == "(none yet)":
        return []
    refs = re.findall(r"`([^`]+)`", value)
    if refs:
        return [ref for ref in refs if ref not in {"(none)", "(none yet)"}]
    return [part.strip() for part in value.split(",") if part.strip() and part.strip() not in {"(none)", "(none yet)"}]


def _companion_doc_entry(repo_root: Path, rel_path: Path, kind: str) -> dict[str, Any]:
    path = repo_root / rel_path
    lines = path.read_text(encoding="utf-8").splitlines()
    related = {
        "request": _parse_companion_refs(_indicator_from_lines(lines, "Related request")),
        "backlog": _parse_companion_refs(_indicator_from_lines(lines, "Related backlog")),
        "task": _parse_companion_refs(_indicator_from_lines(lines, "Related task")),
        "product": _parse_companion_refs(_indicator_from_lines(lines, "Related product")),
        "roadmap": _parse_companion_refs(_indicator_from_lines(lines, "Related roadmap")),
        "architecture": _parse_companion_refs(_indicator_from_lines(lines, "Related architecture")),
    }
    return {
        "kind": kind,
        "ref": rel_path.stem,
        "path": rel_path.as_posix(),
        "title": _title_from_heading(lines, rel_path.stem),
        "status": _indicator_from_lines(lines, "Status") or "Unknown",
        "related": {key: refs for key, refs in related.items() if refs},
    }


def _list_companion_docs(repo_root: Path, *, kind: str = "all", limit: int = 50) -> dict[str, Any]:
    allowed = {"all", "product", "roadmap", "architecture"}
    if kind not in allowed:
        raise McpToolError("invalid_argument_value", "Unsupported companion document kind.", details={"kind": kind, "allowed": sorted(allowed)})
    targets = []
    if kind in {"all", "product"}:
        targets.append(("product", Path("logics/product"), "prod_*.md"))
    if kind in {"all", "roadmap"}:
        targets.append(("roadmap", Path("logics/roadmap"), "road_*.md"))
    if kind in {"all", "architecture"}:
        targets.append(("architecture", Path("logics/architecture"), "adr_*.md"))
    items: list[dict[str, Any]] = []
    for doc_kind, directory, pattern in targets:
        root = repo_root / directory
        if not root.is_dir():
            continue
        for path in sorted(root.glob(pattern)):
            if path.is_file() and not path.is_symlink():
                items.append(_companion_doc_entry(repo_root, path.relative_to(repo_root), doc_kind))
    items.sort(key=lambda item: str(item["path"]))
    bounded_items = items[:limit]
    return {"kind": kind, "limit": limit, "count": len(bounded_items), "total_count": len(items), "items": bounded_items}


def _bounded_int(value: Any, *, default: int, maximum: int) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        return default
    if value <= 0:
        return default
    return min(value, maximum)


def _mcp_read_error(exc: BaseException) -> McpToolError:
    if isinstance(exc, McpToolError):
        return exc
    return McpToolError("invalid_reference", str(exc))


def _mcp_mutation_error(exc: BaseException) -> McpToolError:
    if isinstance(exc, McpToolError):
        return exc
    return McpToolError("invalid_argument_value", str(exc))


def _workflow_doc_path_for_source(repo_root: Path, source: str) -> str:
    try:
        payload = read_logics_doc_payload(repo_root, source, max_chars=1, sections=[])
    except SystemExit as exc:
        raise _mcp_read_error(exc) from exc
    return str(payload["path"])


def _nonempty_titles(values: Any) -> list[str]:
    titles = [str(value).strip() for value in values if str(value).strip()] if isinstance(values, list) else []
    if not titles:
        raise McpToolError("invalid_argument_value", "At least one non-empty title is required.", details={"argument": "titles"})
    return titles


def _dry_run_result(
    repo_root: Path,
    *,
    summary: str,
    paths: list[str] | None = None,
    refs: list[str] | None = None,
) -> dict[str, Any]:
    """One preview shape for every mutating tool.

    Some tools previewed a change and others applied immediately, with no
    principle telling them apart, so callers had to document the difference
    tool by tool. Every mutating tool now accepts `dry_run` and, when set,
    returns this: what would change, and nothing written.
    """
    return {
        "ok": True,
        "dry_run": True,
        "summary": summary,
        "planned_paths": sorted({path for path in (paths or []) if path}),
        "planned_refs": sorted({ref for ref in (refs or []) if ref}),
    }


def _workflow_write_result(repo_root: Path, payload: dict[str, Any], *, paths: list[str] | None = None) -> dict[str, Any]:
    return {
        "ok": True,
        **payload,
        **_validation_result(repo_root, include_audit=True),
        **_show_git_diff(repo_root, paths),
    }

def _tool_run_logics_lint(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    status = _lint_status(root)
    return {"ok": bool(status["ok"]), "status": status}

def _tool_run_logics_audit(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    status = _audit_status(root)
    return {"ok": bool(status["ok"]), "status": status}

def _tool_list_active_work(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    kind = str(args.get("kind") or "all")
    if kind not in {"all", "request", "backlog", "task"}:
        raise McpToolError("invalid_argument_value", "Unsupported list kind.", details={"kind": kind, "allowed": ["all", "request", "backlog", "task"]})
    return {"ok": True, "items": flow_list_payload(root, kind=kind)["entries"]}

def _tool_list_companion_docs(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    payload = _list_companion_docs(root, kind=str(args.get("kind") or "all"), limit=_bounded_int(args.get("limit"), default=50, maximum=200))
    return {"ok": True, **payload}

def _tool_read_logics_doc(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    try:
        payload = read_logics_doc_payload(root, str(args.get("source") or ""), max_chars=_bounded_int(args.get("max_chars"), default=4000, maximum=12000), sections=args.get("sections") if isinstance(args.get("sections"), list) else None)
    except SystemExit as exc:
        raise _mcp_read_error(exc) from exc
    return {"ok": True, **payload}

def _tool_build_context_pack(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    try:
        payload = build_context_pack_payload(root, str(args.get("ref") or ""), mode=str(args.get("mode") or "summary-only"), profile=str(args.get("profile") or "normal"), config=None)
    except SystemExit as exc:
        raise _mcp_read_error(exc) from exc
    return {"ok": True, **payload}

def _tool_get_release_status(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    return release_status_payload(root)

def _tool_get_release_plan(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    version = str(args.get("version") or "").strip()
    if not version:
        raise McpToolError("missing_required_argument", "version is required.", details={"argument": "version"})
    return release_plan_payload(root, version)

def _tool_list_logics_docs(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    payload = list_logics_docs_payload(
        root,
        kind=str(args.get("kind") or "all"),
        status=str(args["status"]) if args.get("status") else None,
        ref_prefix=str(args["ref_prefix"]) if args.get("ref_prefix") else None,
        limit=_bounded_int(args.get("limit"), default=50, maximum=200),
    )
    return {"ok": True, **payload}

def _tool_search_logics_docs(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    try:
        payload = search_logics_docs_payload(
            root,
            str(args.get("query") or ""),
            kind=str(args.get("kind") or "all"),
            status=str(args["status"]) if args.get("status") else None,
            limit=_bounded_int(args.get("limit"), default=20, maximum=100),
            max_snippet_chars=_bounded_int(args.get("max_snippet_chars"), default=240, maximum=1000),
        )
    except SystemExit as exc:
        raise _mcp_read_error(exc) from exc
    return {"ok": True, **payload}

def _tool_get_logics_status(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    return status_payload(root, limit=_bounded_int(args.get("limit"), default=10, maximum=100))

def _tool_get_logics_health(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    return health_payload(root, limit=_bounded_int(args.get("limit"), default=10, maximum=100))

def _tool_list_logics_followups(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    include_closed = bool(args.get("include_closed", False))
    closed_only = bool(args.get("closed_only", False))
    if include_closed and closed_only:
        raise McpToolError("invalid_argument_value", "include_closed and closed_only are mutually exclusive.", details={"arguments": ["include_closed", "closed_only"]})
    return followups_payload(
        root,
        limit=_bounded_int(args.get("limit"), default=50, maximum=200),
        source_kind=str(args.get("source_kind") or "all"),
        include_closed=include_closed,
        closed_only=closed_only,
    )

def _tool_check_product_consistency(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    return product_consistency_payload(root, limit=_bounded_int(args.get("limit"), default=50, maximum=200))

def _tool_finish_task(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    rel_path = _relative_path(root, str(args.get("task_path") or ""), ("logics/tasks",))
    dry_run = bool(args.get("dry_run", False))
    if not dry_run:
        _ensure_no_dirty_conflict(root, ["logics"])
    command = ["flow", "finish", "task", rel_path.as_posix(), "--format", "json"]
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    return _workflow_write_result(root, {"source_path": payload["source"], "dry_run": payload["dry_run"], "summary": f"Finished task {Path(payload['source']).stem}"}, paths=[rel_path.as_posix()])

def _tool_close_workflow_doc(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    kind = str(args.get("kind") or "")
    allowed_dir = {"request": "logics/request", "backlog": "logics/backlog", "task": "logics/tasks"}[kind]
    rel_path = _relative_path(root, str(args.get("source_path") or ""), (allowed_dir,))
    dry_run = bool(args.get("dry_run", False))
    if not dry_run:
        _ensure_no_dirty_conflict(root, ["logics"])
    command = ["flow", "close", kind, rel_path.as_posix(), "--format", "json"]
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    return _workflow_write_result(root, {"kind": payload["kind"], "source_path": payload["source"], "dry_run": payload["dry_run"], "summary": f"Closed {kind} {Path(payload['source']).stem}"}, paths=[rel_path.as_posix()])

def _tool_close_eligible_requests(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    dry_run = bool(args.get("dry_run", False))
    if not dry_run:
        _ensure_no_dirty_conflict(root, ["logics"])
    command = ["sync", "close-eligible-requests", "--format", "json"]
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    return _workflow_write_result(root, payload)

def _tool_refresh_mermaid_signatures(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    dry_run = bool(args.get("dry_run", False))
    if not dry_run:
        _ensure_no_dirty_conflict(root, ["logics"])
    command = ["sync", "refresh-mermaid-signatures", "--format", "json"]
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    paths = [str(path) for path in payload.get("modified_files", [])] or None
    return _workflow_write_result(root, payload, paths=paths)

def _tool_update_workflow_indicators(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    source = str(args.get("source") or "")
    dry_run = bool(args.get("dry_run", False))
    rel_path = _workflow_doc_path_for_source(root, source)
    if not dry_run:
        _ensure_no_dirty_conflict(root, [rel_path])
    indicators = {
        "Status": args.get("status"),
        "Progress": args.get("progress"),
        "Understanding": args.get("understanding"),
        "Confidence": args.get("confidence"),
        "Theme": args.get("theme"),
        "Complexity": args.get("complexity"),
    }
    try:
        payload = update_workflow_indicators_payload(root, source, {key: str(value) for key, value in indicators.items() if value is not None}, dry_run=dry_run)
    except SystemExit as exc:
        raise _mcp_mutation_error(exc) from exc
    return _workflow_write_result(root, payload, paths=[rel_path])

def _tool_append_report_entry(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    source = str(args.get("source") or "")
    dry_run = bool(args.get("dry_run", False))
    rel_path = _workflow_doc_path_for_source(root, source)
    if not dry_run:
        _ensure_no_dirty_conflict(root, [rel_path])
    note_kind = {"append_report_entry": "report", "append_validation_note": "validation", "append_decision_note": "decision"}[name]
    try:
        payload = append_workflow_note_payload(root, source, note_kind=note_kind, text=str(args.get("text") or ""), dry_run=dry_run)
    except SystemExit as exc:
        raise _mcp_mutation_error(exc) from exc
    return _workflow_write_result(root, payload, paths=[rel_path])

def _tool_split_request(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    rel_path = _relative_path(root, str(args.get("request_path") or ""), ("logics/request",))
    titles = _nonempty_titles(args.get("titles"))
    dry_run = bool(args.get("dry_run", False))
    if not dry_run:
        _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
    command = ["flow", "split", "request", rel_path.as_posix(), "--format", "json"]
    for title in titles:
        command.extend(["--title", title])
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    created_paths = [f"logics/backlog/{ref}.md" for ref in payload.get("created_refs", [])]
    return _workflow_write_result(root, {"created_paths": created_paths, **payload}, paths=[rel_path.as_posix(), *created_paths])

def _tool_split_backlog(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    rel_path = _relative_path(root, str(args.get("backlog_path") or ""), ("logics/backlog",))
    titles = _nonempty_titles(args.get("titles"))
    dry_run = bool(args.get("dry_run", False))
    if not dry_run:
        _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
    command = ["flow", "split", "backlog", rel_path.as_posix(), "--format", "json"]
    for title in titles:
        command.extend(["--title", title])
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    created_paths = [f"logics/tasks/{ref}.md" for ref in payload.get("created_refs", [])]
    return _workflow_write_result(root, {"created_paths": created_paths, **payload}, paths=[rel_path.as_posix(), *created_paths])

def _tool_autofix_ac_traceability(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    raw_paths = args.get("paths") if isinstance(args.get("paths"), list) else []
    paths = [_relative_path(root, str(path), ("logics",)).as_posix() for path in raw_paths]
    refs = [str(ref).strip() for ref in args.get("refs", []) if str(ref).strip()] if isinstance(args.get("refs"), list) else []
    dry_run = bool(args.get("dry_run", False))
    if not dry_run:
        _ensure_no_dirty_conflict(root, paths or ["logics"])
    flag = "--autofix-ac-traceability" if name == "autofix_ac_traceability" else "--autofix-structure"
    if dry_run:
        # `audit` has no --dry-run: run it without the autofix flag, so it
        # reports the findings the repair would address without writing.
        preview_command = ["audit", "--format", "json"]
        if paths:
            preview_command.append("--paths")
            preview_command.extend(paths)
        if refs:
            preview_command.append("--refs")
            preview_command.extend(refs)
        preview = _run_json_command(root, preview_command)
        findings = [
            finding for finding in preview.get("findings", [])
            if str(finding.get("repair_kind") or "") == (
                "ac-traceability" if name == "autofix_ac_traceability" else "structure"
            )
        ]
        result = _dry_run_result(
            root,
            summary=f"Would apply {name} to {len(findings)} finding(s)",
            paths=[str(finding.get("path")) for finding in findings],
        )
        result["findings"] = findings
        return result
    command = ["audit", flag, "--format", "json"]
    if paths:
        command.append("--paths")
        command.extend(paths)
    if refs:
        command.append("--refs")
        command.extend(refs)
    payload = _run_json_command(root, command)
    modified = [str(path) for path in payload.get("autofix", {}).get("modified_files", [])]
    return _workflow_write_result(root, {"audit_payload": payload, "modified_paths": modified}, paths=modified or paths or None)

def _tool_show_git_diff(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    raw_paths = args.get("paths")
    paths = [str(path) for path in raw_paths] if isinstance(raw_paths, list) else None
    return _show_git_diff(root, paths)

def _tool_delete_logics_file(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    rel_path, target = _resolved_markdown_file_path(root, str(args.get("path") or ""))
    dry_run = bool(args.get("dry_run", False))
    if not target.exists():
        raise McpToolError("not_found", "Logics file not found.", details={"path": rel_path.as_posix()})
    if not target.is_file() or target.is_symlink():
        raise McpToolError("invalid_path", "Only regular Markdown files can be deleted.", details={"path": rel_path.as_posix()})
    if not dry_run:
        _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
        target.unlink()
    return _workflow_write_result(
        root,
        {
            "path": rel_path.as_posix(),
            "dry_run": dry_run,
            "deleted": not dry_run,
            "would_delete": dry_run,
            "summary": f"{'Would delete' if dry_run else 'Deleted'} {rel_path.as_posix()}",
        },
        paths=[rel_path.as_posix()],
    )

def _tool_rename_logics_file(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    source_rel, source = _resolved_markdown_file_path(root, str(args.get("source_path") or ""))
    destination_rel, destination = _resolved_markdown_file_path(root, str(args.get("destination_path") or ""))
    dry_run = bool(args.get("dry_run", False))
    if source_rel == destination_rel:
        raise McpToolError("invalid_path", "Source and destination paths must differ.", details={"source_path": source_rel.as_posix(), "destination_path": destination_rel.as_posix()})
    if not source.exists():
        raise McpToolError("not_found", "Source Logics file not found.", details={"source_path": source_rel.as_posix()})
    if not source.is_file() or source.is_symlink():
        raise McpToolError("invalid_path", "Only regular Markdown files can be renamed.", details={"source_path": source_rel.as_posix()})
    if destination.exists():
        raise McpToolError("already_exists", "Destination already exists.", details={"destination_path": destination_rel.as_posix()})
    if not dry_run:
        _ensure_no_dirty_conflict(root, [source_rel.as_posix(), destination_rel.as_posix()])
        destination.parent.mkdir(parents=True, exist_ok=True)
        source.rename(destination)
    return _workflow_write_result(
        root,
        {
            "source_path": source_rel.as_posix(),
            "destination_path": destination_rel.as_posix(),
            "dry_run": dry_run,
            "renamed": not dry_run,
            "would_rename": dry_run,
            "summary": f"{'Would rename' if dry_run else 'Renamed'} {source_rel.as_posix()} to {destination_rel.as_posix()}",
        },
        paths=[source_rel.as_posix(), destination_rel.as_posix()],
    )

def _tool_scaffold_request_chain(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    scaffold_input = args.get("input")
    if not isinstance(scaffold_input, dict):
        raise McpToolError("missing_required_argument", "input (request-chain JSON object) is required.", details={"argument": "input"})
    scaffold_dir = root / "logics" / "scaffold"
    scaffold_dir.mkdir(parents=True, exist_ok=True)
    temp_input = scaffold_dir / f".mcp-scaffold-{secrets.token_hex(6)}.json"
    temp_input.write_text(json.dumps(scaffold_input, indent=2) + "\n", encoding="utf-8")
    try:
        command = ["flow", "scaffold", "request-chain", "--input", temp_input.relative_to(root).as_posix(), "--format", "json"]
        if args.get("context_pack_out"):
            command.extend(["--context-pack", str(args["context_pack_out"])])
        if args.get("dry_run"):
            command.append("--dry-run")
        payload = _json_from_stdout(_run_command(root, command).stdout)
    finally:
        temp_input.unlink(missing_ok=True)
    return {
        "ok": True,
        "request_ref": payload["request_ref"],
        "product_ref": payload["product_ref"],
        "backlog_refs": payload["backlog_refs"],
        "task_ref": payload["task_ref"],
        "created_paths": payload["created_paths"],
        "summary": f"Scaffolded request chain {payload['request_ref']}",
        "next_suggested_tool": "run_logics_audit",
        **(_validation_result(root) if not args.get("dry_run") else {}),
    }

def _tool_create_request(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    title = str(args.get("title") or "").strip()
    if not title:
        raise McpToolError("missing_required_argument", "title is required.", details={"argument": "title"})
    dry_run = bool(args.get("dry_run", False))
    command = ["flow", "new", "request", "--title", title, "--format", "json"]
    if args.get("theme"):
        command.extend(["--theme", str(args["theme"])])
    if args.get("complexity"):
        command.extend(["--complexity", str(args["complexity"])])
    if dry_run:
        command.append("--dry-run")
    payload = _created_doc_from_stdout(_run_command(root, command).stdout, command="new", kind="request")
    if dry_run:
        return _dry_run_result(
            root,
            summary=f"Would create request {payload['ref']}",
            paths=[str(payload["path"])],
            refs=[str(payload["ref"])],
        )
    try:
        update_created_request(root, str(payload["path"]), args)
    except ValueError as exc:
        raise McpToolError("invalid_argument_value", str(exc), details={"argument": "external_url"}) from exc
    return {
        "ok": True,
        "path": payload["path"],
        "ref": payload["ref"],
        "summary": f"Created request {payload['ref']}",
        "document_preview": _document_preview(root, str(payload["path"])),
        "next_suggested_tool": "promote_request_to_backlog",
        **_validation_result(root),
        **_show_git_diff(root, [str(payload["path"])]),
    }

def _tool_promote_request_to_backlog(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    rel_path = _relative_path(root, str(args.get("request_path") or ""), ("logics/request",))
    dry_run = bool(args.get("dry_run", False))
    if not dry_run:
        _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
    command = ["flow", "promote", "request-to-backlog", rel_path.as_posix(), "--format", "json"]
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    if dry_run:
        return _dry_run_result(
            root,
            summary=f"Would promote {rel_path.stem} to a backlog item",
            paths=[str(payload["source"]), str(payload["created_path"])],
            refs=[str(payload["created_ref"])],
        )
    return {
        "ok": True,
        "source_path": payload["source"],
        "created_path": payload["created_path"],
        "created_ref": payload["created_ref"],
        "document_preview": _document_preview(root, str(payload["created_path"])),
        "next_suggested_tool": "promote_backlog_to_task",
        **_validation_result(root),
        **_show_git_diff(root, [str(payload["source"]), str(payload["created_path"])]),
    }

def _tool_promote_backlog_to_task(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    rel_path = _relative_path(root, str(args.get("backlog_path") or ""), ("logics/backlog",))
    dry_run = bool(args.get("dry_run", False))
    if not dry_run:
        _ensure_no_dirty_conflict(root, [rel_path.as_posix()])
    command = ["flow", "promote", "backlog-to-task", rel_path.as_posix(), "--format", "json"]
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    if dry_run:
        return _dry_run_result(
            root,
            summary=f"Would promote {rel_path.stem} to a task",
            paths=[str(payload["source"]), str(payload["created_path"])],
            refs=[str(payload["created_ref"])],
        )
    return {
        "ok": True,
        "source_path": payload["source"],
        "created_path": payload["created_path"],
        "created_ref": payload["created_ref"],
        "document_preview": _document_preview(root, str(payload["created_path"])),
        "next_suggested_tool": "run_logics_lint",
        **_validation_result(root),
        **_show_git_diff(root, [str(payload["source"]), str(payload["created_path"])]),
    }

def _tool_create_product_brief(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    title = str(args.get("title") or "").strip()
    if not title:
        raise McpToolError("missing_required_argument", "title is required.", details={"argument": "title"})
    dry_run = bool(args.get("dry_run", False))
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
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    if dry_run:
        return _dry_run_result(
            root,
            summary=f"Would create {companion_kind} doc {payload['ref']}",
            paths=[str(payload["path"])],
            refs=[str(payload["ref"])],
        )
    return {
        "ok": True,
        "path": payload["path"],
        "ref": payload["ref"],
        "linked_refs": linked_refs,
        "document_preview": _document_preview(root, str(payload["path"])),
        "next_suggested_tool": "run_logics_lint",
        **_validation_result(root, include_audit=True),
        **_show_git_diff(root, [str(payload["path"])]),
    }


def _tool_create_roadmap(root: Path, args: dict[str, Any], name: str) -> dict[str, Any]:
    title = str(args.get("title") or "").strip()
    if not title:
        raise McpToolError("missing_required_argument", "title is required.", details={"argument": "title"})
    dry_run = bool(args.get("dry_run", False))
    command = ["flow", "roadmap", "propose", "--title", title, "--format", "json"]
    for milestone in args.get("milestones") or []:
        command.extend(["--milestone", str(milestone)])
    linked_refs: dict[str, Any] = {}
    if args.get("product_path"):
        rel_path = _relative_path(root, str(args["product_path"]), ("logics/product",))
        ref = _flow_path_ref(rel_path.as_posix())
        if ref:
            command.extend(["--product-ref", ref])
            linked_refs["product_path"] = rel_path.as_posix()
    for key, flag, directory in (
        ("request_paths", "--request-ref", "logics/request"),
        ("backlog_paths", "--backlog-ref", "logics/backlog"),
        ("task_paths", "--task-ref", "logics/tasks"),
    ):
        values = args.get(key) if isinstance(args.get(key), list) else []
        linked_refs[key] = []
        for value in values:
            rel_path = _relative_path(root, str(value), (directory,))
            ref = _flow_path_ref(rel_path.as_posix())
            if ref:
                command.extend([flag, ref])
                linked_refs[key].append(rel_path.as_posix())
    if dry_run:
        command.append("--dry-run")
    payload = _json_from_stdout(_run_command(root, command).stdout)
    if dry_run:
        return _dry_run_result(
            root,
            summary=f"Would create roadmap {payload['ref']}",
            paths=[str(payload["path"])],
            refs=[str(payload["ref"])],
        )
    return {
        "ok": True,
        "path": payload["path"],
        "ref": payload["ref"],
        "milestones": payload.get("milestones", []),
        "linked_refs": {key: value for key, value in linked_refs.items() if value},
        "document_preview": _document_preview(root, str(payload["path"])),
        "next_suggested_tool": "read_logics_doc",
        **_validation_result(root, include_audit=True),
        **_show_git_diff(root, [str(payload["path"])]),
    }


_TOOL_HANDLERS: dict[str, Any] = {
    "run_logics_lint": _tool_run_logics_lint,
    "run_logics_audit": _tool_run_logics_audit,
    "list_active_work": _tool_list_active_work,
    "list_companion_docs": _tool_list_companion_docs,
    "read_logics_doc": _tool_read_logics_doc,
    "build_context_pack": _tool_build_context_pack,
    "get_release_status": _tool_get_release_status,
    "get_release_plan": _tool_get_release_plan,
    "list_logics_docs": _tool_list_logics_docs,
    "search_logics_docs": _tool_search_logics_docs,
    "get_logics_status": _tool_get_logics_status,
    "get_logics_health": _tool_get_logics_health,
    "list_logics_followups": _tool_list_logics_followups,
    "check_product_consistency": _tool_check_product_consistency,
    "finish_task": _tool_finish_task,
    "close_workflow_doc": _tool_close_workflow_doc,
    "close_eligible_requests": _tool_close_eligible_requests,
    "refresh_mermaid_signatures": _tool_refresh_mermaid_signatures,
    "update_workflow_indicators": _tool_update_workflow_indicators,
    "append_report_entry": _tool_append_report_entry,
    "append_validation_note": _tool_append_report_entry,
    "append_decision_note": _tool_append_report_entry,
    "split_request": _tool_split_request,
    "split_backlog": _tool_split_backlog,
    "autofix_ac_traceability": _tool_autofix_ac_traceability,
    "autofix_structure": _tool_autofix_ac_traceability,
    "show_git_diff": _tool_show_git_diff,
    "delete_logics_file": _tool_delete_logics_file,
    "rename_logics_file": _tool_rename_logics_file,
    "scaffold_request_chain": _tool_scaffold_request_chain,
    "create_request": _tool_create_request,
    "promote_request_to_backlog": _tool_promote_request_to_backlog,
    "promote_backlog_to_task": _tool_promote_backlog_to_task,
    "create_product_brief": _tool_create_product_brief,
    "create_roadmap": _tool_create_roadmap,
    "create_architecture_decision": _tool_create_product_brief,
}


def call_tool(name: str, arguments: dict[str, Any] | None = None, *, repo_root: Path | None = None) -> dict[str, Any]:
    root = _repo_root(repo_root)
    args = arguments or {}
    if name not in TOOLS_BY_NAME:
        raise McpToolError("unsupported_action", f"Unsupported MCP tool: {name}")
    if _EXPOSED_TOOLS is not None and name not in _EXPOSED_TOOLS:
        raise McpToolError(
            "unsupported_action",
            f"MCP tool `{name}` is not exposed by this server "
            f"(capability: {TOOL_CAPABILITIES.get(name, MUTATING)}, profile: {_ACTIVE_PROFILE}).",
        )
    _validate_arguments(name, args)
    handler = _TOOL_HANDLERS.get(name)
    if handler is None:
        raise McpToolError("unsupported_action", f"Unsupported MCP tool: {name}")
    return handler(root, args, name)


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
            result = {"tools": exposed_tool_definitions()}
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
        if request_id is None:
            return None
        error_payload = exc.to_payload()
        if method == "tools/call" and request_id is not None:
            return {"jsonrpc": JSONRPC_VERSION, "id": request_id, "result": mcp_result(error_payload)}
        return {"jsonrpc": JSONRPC_VERSION, "id": request_id, "error": {"code": -32000, "message": exc.message, "data": error_payload}}


def _print_surface_banner() -> None:
    """Say which tools this process actually serves, on both transports."""
    names = exposed_tool_names()
    print(
        f"Logics MCP surface: profile={active_tool_profile()} tools={len(names)}/{len(TOOLS_BY_NAME)}",
        file=sys.stderr,
    )
    if len(names) != len(TOOLS_BY_NAME):
        print("Exposed tools: " + ", ".join(names), file=sys.stderr)


def serve_stdio(*, repo_root: Path | None = None) -> int:
    root = _repo_root(repo_root)
    _print_surface_banner()
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


def make_http_handler(repo_root: Path, *, bearer_token: str | None = None) -> type[BaseHTTPRequestHandler]:
    class LogicsMcpHttpHandler(BaseHTTPRequestHandler):
        server_version = "LogicsMCP/1.0"

        def _send_json(self, status: int, payload: dict[str, Any]) -> None:
            encoded = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def _authorized(self) -> bool:
            if not bearer_token:
                return True
            expected = f"Bearer {bearer_token}"
            actual = self.headers.get("Authorization", "")
            if secrets.compare_digest(actual, expected):
                return True
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.send_header("WWW-Authenticate", 'Bearer realm="logics-mcp"')
            encoded = json.dumps({"ok": False, "error": "unauthorized", "message": "Missing or invalid bearer token."}, separators=(",", ":")).encode("utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
            return False

        def _send_sse_stream(self) -> None:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            self.wfile.write(b": logics-manager-mcp ready\n\n")
            self.wfile.flush()
            while True:
                time.sleep(15)
                self.wfile.write(b": keepalive\n\n")
                self.wfile.flush()

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path == "/health":
                self._send_json(200, {"ok": True, "server": "logics-manager-mcp", "version": _server_version()})
                return
            if parsed.path == "/mcp":
                if not self._authorized():
                    return
                try:
                    self._send_sse_stream()
                except (BrokenPipeError, ConnectionResetError):
                    return
                return
            self._send_json(404, {"ok": False, "error": "not_found", "message": "Use POST /mcp for JSON-RPC."})

        def do_POST(self) -> None:
            parsed = urlparse(self.path)
            if parsed.path != "/mcp":
                self._send_json(404, {"ok": False, "error": "not_found", "message": "Use POST /mcp for JSON-RPC."})
                return
            if not self._authorized():
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self._send_json(400, {"ok": False, "error": "bad_request", "message": "Invalid Content-Length."})
                return
            if length <= 0:
                self._send_json(400, {"ok": False, "error": "bad_request", "message": "Content-Length must be positive."})
                return
            if length > MAX_HTTP_BODY_BYTES:
                self._send_json(413, {"ok": False, "error": "payload_too_large", "message": f"Content-Length exceeds {MAX_HTTP_BODY_BYTES} bytes."})
                return
            raw_body = self.rfile.read(length).decode("utf-8")
            try:
                message = json.loads(raw_body)
                if not isinstance(message, dict):
                    raise ValueError("JSON-RPC message must be an object.")
                response = handle_jsonrpc(message, repo_root=repo_root)
            except Exception as exc:
                self._send_json(400, {"jsonrpc": JSONRPC_VERSION, "id": None, "error": {"code": -32700, "message": str(exc)}})
                return
            if response is None:
                self.send_response(202)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            self._send_json(200, response)

        def log_message(self, format: str, *args: Any) -> None:
            print(f"logics-mcp-http: {format % args}", file=sys.stderr)

    return LogicsMcpHttpHandler


def serve_http(*, repo_root: Path | None = None, host: str = "127.0.0.1", port: int = 8765, bearer_token: str | None = None) -> int:
    root = _repo_root(repo_root)
    token = bearer_token or os.environ.get(AUTH_ENV_VAR)
    server = ThreadingHTTPServer((host, port), make_http_handler(root, bearer_token=token))
    _print_surface_banner()
    print(f"Logics MCP HTTP listening on http://{host}:{server.server_port}/mcp", file=sys.stderr)
    if token:
        print("Logics MCP HTTP requires Authorization: Bearer <token> for POST /mcp", file=sys.stderr)
    else:
        print(f"WARNING: Logics MCP HTTP is running without bearer-token auth. Set {AUTH_ENV_VAR} or pass --bearer-token before tunneling.", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 130
    finally:
        server.server_close()
    return 0


def _connector_urls(public_url: str | None) -> dict[str, str]:
    if not public_url:
        return {}
    base = public_url.rstrip("/")
    if base.endswith("/mcp"):
        mcp_url = base
        health_url = base[:-4].rstrip("/") + "/health"
    else:
        mcp_url = f"{base}/mcp"
        health_url = f"{base}/health"
    return {"public_url": base, "mcp_url": mcp_url, "health_url": health_url}


def connector_plan(*, repo_root: Path, host: str, port: int, bearer_token: str | None = None, public_url: str | None = None, no_bearer: bool = False, project_binary: str | None = None) -> dict[str, Any]:
    token = None if no_bearer else bearer_token or secrets.token_urlsafe(32)
    urls = _connector_urls(public_url)
    local_mcp_url = f"http://{host}:{port}/mcp"
    local_health_url = f"http://{host}:{port}/health"
    launcher = project_binary or "python3 -m logics_manager"
    auth_args = "" if no_bearer else f'{AUTH_ENV_VAR}="{token}" '
    server_command = f"{auth_args}{launcher} mcp serve-http --repo-root {repo_root.as_posix()} --host {host} --port {port}"
    auth_header = None if no_bearer else f"Authorization: Bearer {token}"
    cleanup = [
        "Stop the HTTPS tunnel process.",
        "Stop the local mcp serve-http process with Ctrl-C.",
    ]
    if token:
        cleanup.append("Treat the bearer token as expired once the local session is stopped.")
    else:
        cleanup.append("Treat the public tunnel URL as exposed until both processes are stopped.")
    return {
        "ok": True,
        "repo_root": repo_root.as_posix(),
        "bearer_token": token,
        "auth_mode": "none" if no_bearer else "bearer",
        "auth_header": auth_header,
        "local_mcp_url": local_mcp_url,
        "local_health_url": local_health_url,
        "server_command": server_command,
        "tunnel_target": f"{host}:{port}",
        "chatgpt": {
            "developer_mode": True,
            "mcp_url": urls.get("mcp_url", "<your HTTPS tunnel URL>/mcp"),
            "auth_type": "None" if no_bearer else "Bearer token",
            "auth_value": token,
        },
        "smoke_checks": {
            "health": urls.get("health_url", f"<your HTTPS tunnel URL>/health"),
            "mcp_tools_list": urls.get("mcp_url", "<your HTTPS tunnel URL>/mcp"),
        },
        "warnings": ["No-bearer mode is unauthenticated. Use only for short-lived local debugging."] if no_bearer else [],
        "cleanup": cleanup,
        **urls,
    }


def connector_smoke_check(public_url: str, bearer_token: str | None = None, *, timeout: float = 5.0) -> dict[str, Any]:
    urls = _connector_urls(public_url)
    health_ok = False
    mcp_ok = False
    errors: list[str] = []
    try:
        with urlopen(urls["health_url"], timeout=timeout) as response:
            health_ok = response.status == 200
    except (OSError, URLError) as exc:
        errors.append(f"health: {exc}")
    try:
        body = json.dumps({"jsonrpc": JSONRPC_VERSION, "id": 1, "method": "tools/list", "params": {}}).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if bearer_token:
            headers["Authorization"] = f"Bearer {bearer_token}"
        request = Request(urls["mcp_url"], data=body, headers=headers, method="POST")
        with urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
            mcp_ok = response.status == 200 and "result" in payload
    except (OSError, URLError, json.JSONDecodeError) as exc:
        errors.append(f"mcp: {exc}")
    return {"ok": health_ok and mcp_ok, "health_ok": health_ok, "mcp_ok": mcp_ok, "errors": errors, **urls}


def _print_connector_plan(plan: dict[str, Any]) -> None:
    print("Logics MCP Connector")
    for warning in plan.get("warnings", []):
        print(f"WARNING: {warning}")
    print(f"Server command:\n  {plan['server_command']}")
    print(f"Tunnel target: {plan['tunnel_target']}")
    print(f"ChatGPT developer-mode MCP URL: {plan['chatgpt']['mcp_url']}")
    print(f"Auth mode: {plan['auth_mode']}")
    print(f"Authorization header: {plan['auth_header'] or '(none)'}")
    print("Smoke checks:")
    print(f"  health: {plan['smoke_checks']['health']}")
    print(f"  mcp tools/list: {plan['smoke_checks']['mcp_tools_list']}")
    print("Cleanup:")
    for item in plan["cleanup"]:
        print(f"  - {item}")


def _project_binary_path(repo_root: Path) -> str:
    candidate = repo_root / "scripts" / "npm" / "logics-manager.mjs"
    if candidate.is_file():
        return f"node {candidate.as_posix()}"
    return "python3 -m logics_manager"


def _terminate_process(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()


def launch_tunnel(
    *,
    repo_root: Path,
    host: str,
    port: int,
    bearer_token: str | None = None,
    no_bearer: bool = False,
    tunnel_command: list[str] | None = None,
) -> int:
    token = None if no_bearer else bearer_token or secrets.token_urlsafe(32)
    server_command = [sys.executable, "-m", "logics_manager", "mcp", "serve-http", "--repo-root", repo_root.as_posix(), "--host", host, "--port", str(port)]
    env = os.environ.copy()
    if token:
        env[AUTH_ENV_VAR] = token
    tunnel_command = tunnel_command or ["npx", "localtunnel", "--port", str(port)]
    server = subprocess.Popen(server_command, cwd=repo_root, env=env, text=True)
    tunnel: subprocess.Popen[str] | None = None
    previous_sigint = signal.getsignal(signal.SIGINT)
    previous_sigterm = signal.getsignal(signal.SIGTERM)

    def stop(_signum: int | None = None, _frame: Any | None = None) -> None:
        if tunnel is not None:
            _terminate_process(tunnel)
        _terminate_process(server)

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    try:
        time.sleep(0.8)
        if server.poll() is not None:
            return server.returncode or 1
        tunnel = subprocess.Popen(tunnel_command, cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        public_url = None
        start = time.monotonic()
        while time.monotonic() - start < 30:
            if tunnel.poll() is not None:
                return tunnel.returncode or 1
            line = tunnel.stdout.readline() if tunnel.stdout else ""
            if not line:
                time.sleep(0.1)
                continue
            print(line.rstrip())
            match = re.search(r"https://\S+", line)
            if match:
                public_url = match.group(0).rstrip("/")
                break
        if not public_url:
            raise McpToolError("command_failed", "Tunnel command did not print a public HTTPS URL within 30 seconds.", details={"command": tunnel_command})
        plan = connector_plan(repo_root=repo_root, host=host, port=port, bearer_token=token, public_url=public_url, no_bearer=no_bearer, project_binary=_project_binary_path(repo_root))
        _print_connector_plan(plan)
        print("Processes are running. Press Ctrl-C to stop server and tunnel.")
        while True:
            if server.poll() is not None:
                return server.returncode or 1
            if tunnel.poll() is not None:
                return tunnel.returncode or 1
            time.sleep(1)
    except KeyboardInterrupt:
        return 130
    finally:
        stop()
        signal.signal(signal.SIGINT, previous_sigint)
        signal.signal(signal.SIGTERM, previous_sigterm)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="logics-manager mcp", description="Run or inspect the Logics MCP server.")
    sub = parser.add_subparsers(dest="command", required=True)
    serve = sub.add_parser("serve", help="Serve MCP JSON-RPC over stdio.")
    serve.add_argument("--repo-root", default=None)
    serve_http_parser = sub.add_parser("serve-http", help="Serve MCP JSON-RPC over local HTTP for tunnel testing.")
    serve_http_parser.add_argument("--repo-root", default=None)
    serve_http_parser.add_argument("--host", default="127.0.0.1")
    serve_http_parser.add_argument("--port", type=int, default=8765)
    serve_http_parser.add_argument("--bearer-token", default=None, help=f"Require this OAuth-style bearer token for POST /mcp. Defaults to ${AUTH_ENV_VAR} when set.")
    tools = sub.add_parser("tools", help="Print the exposed MCP tool definitions.")
    tools.add_argument("--format", choices=("json",), default="json")
    call = sub.add_parser("call", help="Call one MCP tool directly for local testing.")
    call.add_argument("name")
    call.add_argument("--arguments", default="{}")
    call.add_argument("--repo-root", default=None)
    connect = sub.add_parser("connect", help="Print local HTTP connector setup for ChatGPT developer mode.")
    connect.add_argument("--repo-root", default=None)
    connect.add_argument("--host", default="127.0.0.1")
    connect.add_argument("--port", type=int, default=8765)
    connect.add_argument("--bearer-token", default=None)
    connect.add_argument("--no-bearer", action="store_true", help="Print a no-auth connector plan for short-lived local debugging.")
    connect.add_argument("--public-url", default=None, help="Optional HTTPS tunnel URL used for copyable ChatGPT setup and smoke checks.")
    connect.add_argument("--check", action="store_true", help="Run /health and authenticated /mcp smoke checks against --public-url.")
    connect.add_argument("--format", choices=("text", "json"), default="text")
    tunnel = sub.add_parser("tunnel", help="Start the local MCP HTTP server plus an HTTPS localtunnel session.")
    tunnel.add_argument("--repo-root", default=None)
    tunnel.add_argument("--host", default="127.0.0.1")
    tunnel.add_argument("--port", type=int, default=8765)
    tunnel.add_argument("--bearer-token", default=None)
    tunnel.add_argument("--no-bearer", action="store_true", help="Run without bearer auth for short-lived local debugging.")
    for surface in (serve, serve_http_parser, tools, call):
        surface.add_argument(
            "--profile",
            choices=sorted(TOOL_PROFILES),
            default=DEFAULT_TOOL_PROFILE,
            help="Expose only tools at or below this capability level.",
        )
        surface.add_argument(
            "--allow-tools",
            default=None,
            help="Comma-separated tool name patterns to add to the profile (e.g. 'read_*,list_*').",
        )
        surface.add_argument(
            "--deny-tools",
            default=None,
            help="Comma-separated tool name patterns to remove. Takes precedence over --profile and --allow-tools.",
        )

    parsed = parser.parse_args(argv)

    if getattr(parsed, "profile", None) is not None:
        def _split(value: str | None) -> list[str] | None:
            if not value:
                return None
            return [part.strip() for part in value.split(",") if part.strip()]

        try:
            selected = select_tools(
                profile=parsed.profile,
                allow=_split(parsed.allow_tools),
                deny=_split(parsed.deny_tools),
            )
        except ToolSelectionError as exc:
            raise SystemExit(str(exc)) from exc
        set_exposed_tools(selected, profile=parsed.profile)

    if parsed.command == "tools":
        print(json.dumps({"profile": active_tool_profile(), "tools": exposed_tool_definitions()}, indent=2, sort_keys=True))
        return 0
    if parsed.command == "serve":
        return serve_stdio(repo_root=Path(parsed.repo_root) if parsed.repo_root else None)
    if parsed.command == "serve-http":
        return serve_http(repo_root=Path(parsed.repo_root) if parsed.repo_root else None, host=parsed.host, port=parsed.port, bearer_token=parsed.bearer_token)
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
    if parsed.command == "connect":
        root = _repo_root(Path(parsed.repo_root) if parsed.repo_root else None)
        if parsed.no_bearer and parsed.bearer_token:
            raise SystemExit("--no-bearer cannot be combined with --bearer-token.")
        plan = connector_plan(repo_root=root, host=parsed.host, port=parsed.port, bearer_token=parsed.bearer_token, public_url=parsed.public_url, no_bearer=parsed.no_bearer, project_binary=_project_binary_path(root))
        if parsed.check:
            if not parsed.public_url:
                raise SystemExit("--check requires --public-url.")
            plan["check"] = connector_smoke_check(parsed.public_url, str(plan["bearer_token"]) if plan["bearer_token"] else None)
            plan["ok"] = bool(plan["check"]["ok"])
        if parsed.format == "json":
            print(json.dumps(plan, indent=2, sort_keys=True))
        else:
            _print_connector_plan(plan)
            if "check" in plan:
                print(f"Check: {'OK' if plan['check']['ok'] else 'FAILED'}")
                for error in plan["check"]["errors"]:
                    print(f"  - {error}")
        return 0 if plan["ok"] else 1
    if parsed.command == "tunnel":
        if parsed.no_bearer and parsed.bearer_token:
            raise SystemExit("--no-bearer cannot be combined with --bearer-token.")
        root = _repo_root(Path(parsed.repo_root) if parsed.repo_root else None)
        return launch_tunnel(repo_root=root, host=parsed.host, port=parsed.port, bearer_token=parsed.bearer_token, no_bearer=parsed.no_bearer)
    return 1
