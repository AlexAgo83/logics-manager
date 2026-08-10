"""MCP tool schema declarations.

req_323/item_669: lifted out of mcp.py. This is a pure JSON-schema data
literal - no coupling to the tool dispatcher (`select_tools`/`call_tool`),
which is the part an earlier extraction attempt (req_303) tried and backed
out of because splitting the dispatcher would have meant threading the same
lookup tables through both halves. This table needs nothing back from
mcp.py and carries no import-cycle risk.
"""

from __future__ import annotations

from typing import Any


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
        "description": "List Logics companion documents such as product briefs, roadmaps, architecture decisions, and runbooks.",
        "inputSchema": _tool_schema(
            {
                "kind": {"type": "string", "enum": ["all", "product", "roadmap", "architecture", "runbook"]},
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
                "kind": {"type": "string", "enum": ["all", "request", "backlog", "task", "product", "roadmap", "architecture", "spec", "runbook"]},
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
                "kind": {"type": "string", "enum": ["all", "request", "backlog", "task", "product", "roadmap", "architecture", "spec", "runbook"]},
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
                "source_kind": {"type": "string", "enum": ["all", "request", "backlog", "task", "product", "roadmap", "architecture", "runbook"]},
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
    {
        "name": "withdraw_workflow_doc",
        "description": "Mark a request, backlog item, or task Obsolete and record its replacement.",
        "inputSchema": _tool_schema(
            {"source_path": {"type": "string"}, "superseded_by": {"type": "string"}, "dry_run": {"type": "boolean"}},
            ["source_path", "superseded_by"],
        ),
    },
    {
        "name": "progress_task",
        "description": "Update a task's progress percentage and recalculate its linked backlog item's progress.",
        "inputSchema": _tool_schema(
            {"task_path": {"type": "string"}, "progress": {"type": "integer"}, "dry_run": {"type": "boolean"}},
            ["task_path", "progress"],
        ),
    },
    {
        "name": "roadmap_show",
        "description": "Show a bounded view of a roadmap document.",
        "inputSchema": _tool_schema({"source": {"type": "string"}, "max_chars": {"type": "integer"}}, ["source"]),
    },
    {
        "name": "roadmap_validate",
        "description": "Validate a roadmap document's contract: heading, required indicators, and at least one versioned milestone.",
        "inputSchema": _tool_schema({"source": {"type": "string"}}, ["source"]),
    },
    {
        "name": "deliver_from_product",
        "description": "Create a linked request, backlog item, and task directly from a settled product brief.",
        "inputSchema": _tool_schema(
            {
                "product_path": {"type": "string"},
                "title": {"type": "string"},
                "finish": {"type": "boolean"},
                "dry_run": {"type": "boolean"},
            },
            ["product_path"],
        ),
    },
    {
        "name": "validate_closeout",
        "description": "Preflight whether a task can be safely closed, naming the exact repair command for each finding.",
        "inputSchema": _tool_schema({"source": {"type": "string"}}, ["source"]),
    },
    {
        "name": "repair_gates",
        "description": "Check off deterministic task/DoD gate checkboxes that a closeout would otherwise block on.",
        "inputSchema": _tool_schema({"task_path": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["task_path"]),
    },
    {
        "name": "repair_links",
        "description": "Repair a linked backlog item's back-reference to a task, when validate-closeout reports it missing.",
        "inputSchema": _tool_schema({"task_path": {"type": "string"}, "dry_run": {"type": "boolean"}}, ["task_path"]),
    },
    {
        "name": "get_logics_doctor",
        "description": "Check required workflow directories and schema metadata.",
        "inputSchema": _tool_schema({}),
    },
]
