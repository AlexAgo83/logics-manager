from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from ..audit import audit_payload
from ..cli_output import print_payload
from ..config import ConfigError, find_repo_root
from ..doc_parsing import extract_refs, progress_value, section_lines
from ..flow_evidence import has_ac_proof as _has_ac_proof
from ..flow_evidence import has_validation_evidence as _has_validation_evidence
from ..flow_evidence import structured_validation_line as _structured_validation_line
from ..index import index_payload
from ..lint import expected_workflow_mermaid_signature, lint_payload
from ..path_utils import ensure_relative_to, resolve_repo_output_path
from ..statuses import transition_error
from ..sync import build_context_pack_payload, read_logics_doc_payload
from ..termstyle import colorize_help
from .scaffold_docs import (  # noqa: F401  (re-exported for the rest of the package)
    _next_product_ref,
    _resolved_from_version,
    _slugify,
    _string_list,
    _string_value,
    _bullets_or_default,
    _normalize_ac_id,
    _build_scaffold_request_doc,
    _build_scaffold_product_doc,
    _build_scaffold_backlog_doc,
    _scaffold_input_request_ac_ids,
    _scaffold_ac_ownership,
    _scaffold_task_ac_trace,
    _build_scaffold_task_doc,
    _build_split_orchestration_task_doc,
)


@dataclass(frozen=True)
class DocKind:
    kind: str
    directory: str
    prefix: str
    include_progress: bool


@dataclass(frozen=True)
class PlannedDoc:
    ref: str
    path: Path


DOC_KINDS = {
    "request": DocKind("request", "logics/request", "req", False),
    "backlog": DocKind("backlog", "logics/backlog", "item", True),
    "task": DocKind("task", "logics/tasks", "task", True),
}

STATUS_BY_KIND_DEFAULT = {
    "request": "Draft",
    "backlog": "Ready",
    "task": "Ready",
}
HELP_FLAGS = ("-h", "--help")
LIST_KIND_CHOICES = ("all", "request", "backlog", "task")
ACTIVE_FLOW_STATUSES = {"draft", "ready", "in progress", "blocked"}
FLOW_KIND_ORDER = {"request": 0, "backlog": 1, "task": 2}


def _help_requested(argv: list[str], index: int) -> bool:
    return len(argv) <= index or argv[index] in HELP_FLAGS


def _format_flag_list(flags: list[str]) -> str:
    return ", ".join(flags)


def _normalize_status(value: str | None) -> str:
    return " ".join(value.split()).lower() if value else ""


def _is_active_flow_doc(status: str | None) -> bool:
    return _normalize_status(status) in ACTIVE_FLOW_STATUSES


@dataclass(frozen=True)
class FlowListEntry:
    kind: str
    path: Path
    ref: str
    title: str
    status: str | None
    owner: str | None
    progress: str | None


def _parse_flow_doc(path: Path, kind: str) -> FlowListEntry:
    lines = path.read_text(encoding="utf-8").splitlines()
    ref = path.stem
    title = _extract_doc_title(path)
    status: str | None = None
    owner: str | None = None
    progress: str | None = None

    for line in lines:
        if line.startswith("> Status:"):
            status = line.split(":", 1)[1].strip()
            continue
        if line.startswith("> Owner:"):
            owner = line.split(":", 1)[1].strip()
            continue
        if line.startswith("> Progress:"):
            progress = line.split(":", 1)[1].strip()

    return FlowListEntry(
        kind=kind,
        path=path,
        ref=ref,
        title=title,
        status=status,
        owner=owner,
        progress=progress,
    )


def _collect_flow_list_entries(repo_root: Path, kind_filter: str = "all") -> list[FlowListEntry]:
    entries: list[FlowListEntry] = []
    for kind, doc_kind in DOC_KINDS.items():
        if kind_filter != "all" and kind_filter != kind:
            continue
        directory = repo_root / doc_kind.directory
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            entry = _parse_flow_doc(path, kind)
            if _is_active_flow_doc(entry.status):
                entries.append(entry)
    entries.sort(key=lambda entry: (FLOW_KIND_ORDER.get(entry.kind, 99), _normalize_status(entry.status), entry.ref))
    return entries


def _render_flow_list_section(title: str, entries: list[FlowListEntry], out_dir: Path) -> str:
    lines: list[str] = [f"## {title}", ""]
    if not entries:
        lines.append("_None_")
        lines.append("")
        return "\n".join(lines)

    lines.extend(["| Doc | Title | Status | Owner | Progress | Path |", "|---|---|---|---|---|---|"])
    for entry in entries:
        rel = entry.path.relative_to(out_dir).as_posix()
        doc_link = f"[{entry.ref}]({rel})"
        lines.append(
            f"| {doc_link} | {entry.title} | {entry.status or ''} | {entry.owner or ''} | {entry.progress or ''} | {rel} |"
        )
    lines.append("")
    return "\n".join(lines)


def flow_list_payload(repo_root: Path, *, kind: str = "all") -> dict[str, object]:
    repo_root = repo_root.resolve()
    entries = _collect_flow_list_entries(repo_root, kind_filter=kind)
    by_kind: dict[str, list[FlowListEntry]] = {key: [] for key in ("request", "backlog", "task")}
    for entry in entries:
        by_kind[entry.kind].append(entry)
    counts = {key: len(values) for key, values in by_kind.items()}
    return {
        "ok": True,
        "kind": kind,
        "count": len(entries),
        "counts_by_kind": counts,
        "entries": [
            {
                "kind": entry.kind,
                "ref": entry.ref,
                "title": entry.title,
                "status": entry.status,
                "owner": entry.owner,
                "progress": entry.progress,
                "path": entry.path.relative_to(repo_root).as_posix(),
            }
            for entry in entries
        ],
    }


def render_flow_list(repo_root: Path, *, kind: str = "all", output_format: str = "text") -> str:
    payload = flow_list_payload(repo_root, kind=kind)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    entries = [
        FlowListEntry(
            kind=str(item["kind"]),
            path=repo_root / str(item["path"]),
            ref=str(item["ref"]),
            title=str(item["title"]),
            status=item["status"],
            owner=item["owner"],
            progress=item["progress"],
        )
        for item in payload["entries"]
    ]
    if not entries:
        return "Flow docs in progress: 0\n\n_None_"

    sections: list[str] = [f"Flow docs in progress: {payload['count']}", ""]
    kind_titles = {"request": "Requests", "backlog": "Backlog", "task": "Tasks"}
    for key in ("request", "backlog", "task"):
        if kind != "all" and kind != key:
            continue
        section_entries = [entry for entry in entries if entry.kind == key]
        sections.append(_render_flow_list_section(f"{kind_titles[key]} ({len(section_entries)})", section_entries, repo_root))
    return "\n".join(sections).rstrip()

def _build_help() -> str:
    return "\n".join(
        [
            "Logics Flow CLI",
            "Create workflow docs with stable IDs, templates, and transitions.",
            "",
            "Usage:",
            "  logics-manager flow <command> [args...]",
            "",
            "Commands:",
            "  new <request|backlog|task>",
            "    Create a new doc from a template.",
            "    Common flags: --title, --slug, --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --format {text,json}, --dry-run",
            "    Request-only flags: --fixture, --smoke-test",
            "    Backlog/task-only flags: --auto-create-product-brief, --auto-create-adr",
            "",
            "  list",
            "    List workflow docs that are still active.",
            "    Flags: --kind {all,request,backlog,task}, --format {text,json}",
            "",
            "  show <ref>",
            "    Show a bounded workflow document view.",
            "    Flags: --max-chars, --section, --format {text,json}",
            "",
            "  companion <product|architecture>",
            "    Create a companion doc from the integrated runtime.",
            "    Flags: --title, --source-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "",
            "  roadmap <propose|show|validate>",
            "    Create, inspect, or validate a versioned roadmap doc.",
            "    Flags: propose --title, --milestone, --product-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "",
            "  deliver --from-product <source>",
            "    Create a linked request, backlog item, and task from a product brief.",
            "    Flags: --title, --finish, --format {text,json}, --dry-run",
            "",
            "  scaffold request-chain --input <file>",
            "    Create a request, product brief, backlog slices, orchestration task, index, and optional context pack from structured JSON.",
            "    Flags: --context-pack <path>, --print-schema, --example, --format {text,json}, --dry-run",
            "    Recommended: create the full request chain and handoff pack in one pass with --context-pack.",
            "    Discover the input shape with --print-schema (or --example for a ready-to-edit skeleton) before authoring the JSON.",
            "",
            "  validate [refs...]",
            "    Combine lint and audit findings, classify fixable diagnostics, and optionally apply scoped deterministic fixes.",
            "    Flags: --fixable, --explain, --apply-fixes, --proof, --proof-source, --format {text,json}, --dry-run",
            "",
            "  validate-closeout <task>",
            "    Preflight whether a task can be safely closed.",
            "    Flags: --format {text,json}",
            "",
            "  start <ref>",
            "    Mark a workflow doc as In progress and record an owner.",
            "    Flags: --owner, --format {text,json}, --dry-run",
            "",
            "  progress task <source> --progress <n%>",
            "    Update task progress and recalculate linked backlog item progress.",
            "    Flags: --progress, --format {text,json}, --dry-run",
            "",
            "  repair <gates|ac-traceability|links|mermaid>",
            "    Apply deterministic closeout repairs.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "  closeout <task>",
            "    Append validation, repair deterministic gaps, finish, and optionally validate/index.",
            "    Flags: --validation, --index, --lint, --audit, --format {text,json}, --dry-run",
            "",
            "  promote request-to-backlog <source>",
            "    Create a backlog slice from a request.",
            "",
            "  promote backlog-to-task <source>",
            "    Create a task from a backlog item.",
            "",
            "  split request <source>",
            "    Split a request into multiple backlog items.",
            "    Flags: --title (repeatable) or --slice 'Title:AC1,AC2', --orchestration-task, plus the common backlog flags above.",
            "",
            "  split backlog <source>",
            "    Split a backlog item into multiple tasks.",
            "    Flags: --title (repeatable), plus the common task flags above.",
            "",
            "  close <request|backlog|task> <source>",
            "    Close a doc and propagate transitions.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "  withdraw <source> --superseded-by <ref>",
            "    Mark a doc Obsolete and record its replacement.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "  finish task <source>",
            "    Finish a task and verify the closure chain.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "Examples:",
            '  logics-manager flow new request --title "My request"',
            "  logics-manager flow scaffold request-chain --input logics/scaffold/request-chain.json --context-pack logics/context-pack.json",
            "  logics-manager sync context-pack req_001_my_request item_002_slice task_003_orchestrate --handoff --format json",
            "  logics-manager flow validate req_001_my_request --fixable --explain",
            "  logics-manager flow deliver --from-product prod_017_delivery_loop",
            '  logics-manager flow roadmap propose --title "New project" --milestone "0.1: MVP"',
            "  logics-manager flow show req_001_my_request",
            "  logics-manager flow validate-closeout task_003_fix_docs",
            "  logics-manager flow repair gates task_003_fix_docs",
            "  logics-manager flow closeout task_003_fix_docs --validation \"pytest passed\" --index --lint --audit",
            "  logics-manager flow promote request-to-backlog req_001_my_request",
            "  logics-manager flow close task task_003_fix_docs --dry-run",
        ]
    )


def _build_new_help() -> str:
    return "\n".join(
        [
            "Logics Flow New",
            "Create a new workflow doc from a template.",
            "",
            "Usage:",
            "  logics-manager flow new <request|backlog|task> [args...]",
            "",
            "Kinds:",
            "  request",
            "    Generates a request doc.",
            "    Flags: --title, --slug, --fixture, --smoke-test, --from-version, --understanding, --confidence, --status, --complexity, --theme, --format {text,json}, --dry-run",
            "  backlog",
            "    Generates a backlog doc.",
            "    Flags: --title, --slug, --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --auto-create-product-brief, --auto-create-adr, --format {text,json}, --dry-run",
            "  task",
            "    Generates a task doc.",
            "    Flags: --title, --slug, --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --auto-create-product-brief, --auto-create-adr, --format {text,json}, --dry-run",
            "",
            "Examples:",
            '  logics-manager flow new request --title "Capture migration risks"',
            '  logics-manager flow new backlog --title "Break work into slices"',
            '  logics-manager flow new task --title "Implement the parser"',
        ]
    )


def _build_new_kind_help(kind: str) -> str:
    if kind == "request":
        kind_title = "Request"
        flags = ["--title", "--slug", "--fixture", "--smoke-test", "--from-version", "--understanding", "--confidence", "--status", "--complexity", "--theme", "--format {text,json}", "--dry-run"]
        examples = ['  logics-manager flow new request --title "Capture migration risks"']
    elif kind == "backlog":
        kind_title = "Backlog"
        flags = ["--title", "--slug", "--from-version", "--understanding", "--confidence", "--status", "--complexity", "--theme", "--progress", "--auto-create-product-brief", "--auto-create-adr", "--format {text,json}", "--dry-run"]
        examples = ['  logics-manager flow new backlog --title "Break work into slices"']
    else:
        kind_title = "Task"
        flags = ["--title", "--slug", "--from-version", "--understanding", "--confidence", "--status", "--complexity", "--theme", "--progress", "--auto-create-product-brief", "--auto-create-adr", "--format {text,json}", "--dry-run"]
        examples = ['  logics-manager flow new task --title "Implement the parser"']
    return "\n".join(
        [
            f"Logics Flow New {kind_title}",
            f"Create a new {kind.lower()} doc.",
            "",
            "Usage:",
            f"  logics-manager flow new {kind} [args...]",
            "",
            "Flags:",
            f"  {_format_flag_list(flags)}",
            "",
            "Examples:",
            *examples,
        ]
    )


def _build_list_help() -> str:
    return "\n".join(
        [
            "Logics Flow List",
            "List workflow docs that are still active.",
            "",
            "Usage:",
            "  logics-manager flow list [args...]",
            "",
            "Flags:",
            "  --kind {all,request,backlog,task}",
            "  --format {text,json}",
            "",
            "Examples:",
            "  logics-manager flow list",
            "  logics-manager flow list --kind backlog",
        ]
    )


def _build_show_help() -> str:
    return "\n".join(
        [
            "Logics Flow Show",
            "Show a bounded workflow document view.",
            "",
            "Usage:",
            "  logics-manager flow show <ref-or-path> [args...]",
            "",
            "Flags:",
            "  --max-chars",
            "  --section",
            "  --format {text,json}",
            "",
            "Examples:",
            "  logics-manager flow show req_001_my_request",
            "  logics-manager flow show task_003_fix_docs --section Validation",
        ]
    )


def _build_companion_help() -> str:
    return "\n".join(
        [
            "Logics Flow Companion",
            "Create a companion doc from the integrated runtime.",
            "",
            "Usage:",
            "  logics-manager flow companion <product|architecture> [args...]",
            "",
            "Kinds:",
            "  product",
            "    Create a product companion doc.",
            "    Flags: --title, --source-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "  architecture",
            "    Create an architecture companion doc.",
            "    Flags: --title, --source-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "",
            "Examples:",
            '  logics-manager flow companion product --title "Product note"',
            '  logics-manager flow companion architecture --title "Architecture note"',
        ]
    )


def _build_companion_kind_help(kind: str) -> str:
    return "\n".join(
        [
            f"Logics Flow Companion {kind.title()}",
            f"Create an {kind} companion doc from the integrated runtime.",
            "",
            "Usage:",
            f"  logics-manager flow companion {kind} [args...]",
            "",
            "Flags:",
            "  --title, --source-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "",
            "Examples:",
            f'  logics-manager flow companion {kind} --title "{kind.title()} note"',
        ]
    )


def _build_deliver_help() -> str:
    return "\n".join(
        [
            "Logics Flow Deliver",
            "Create a delivery chain from a product brief.",
            "",
            "Usage:",
            "  logics-manager flow deliver --from-product <source> [args...]",
            "",
            "Flags:",
            "  --from-product <source>",
            "  --title",
            "  --finish",
            "  --format {text,json}",
            "  --dry-run",
            "",
            "Examples:",
            "  logics-manager flow deliver --from-product prod_017_logics_delivery_loop_ergonomics",
            '  logics-manager flow deliver --from-product logics/product/prod_017_logics_delivery_loop_ergonomics.md --title "Implement flow deliver"',
        ]
    )


def _build_validate_closeout_help() -> str:
    return "\n".join(
        [
            "Logics Flow Validate Closeout",
            "Preflight whether a task can be safely closed.",
            "",
            "Usage:",
            "  logics-manager flow validate-closeout <task> [args...]",
            "",
            "Flags:",
            "  --format {text,json}",
            "",
            "Examples:",
            "  logics-manager flow validate-closeout task_164_implement_flow_deliver_from_product",
        ]
    )


def _build_start_help() -> str:
    return "\n".join(
        [
            "Logics Flow Start",
            "Mark a workflow doc as In progress and record an owner.",
            "",
            "Usage:",
            "  logics-manager flow start <ref-or-path> [args...]",
            "",
            "Flags:",
            "  --owner <agent>",
            "  --format {text,json}",
            "  --dry-run",
        ]
    )

def _build_repair_help() -> str:
    return "\n".join(
        [
            "Logics Flow Repair",
            "Apply deterministic closeout repairs.",
            "",
            "Usage:",
            "  logics-manager flow repair <gates|ac-traceability|links|mermaid> [args...]",
            "",
            "Commands:",
            "  gates <task>",
            "    Check task Plan/DoD and linked request DoR boxes.",
            "  ac-traceability <request>",
            "    Add missing request AC traceability entries to linked backlog/task docs.",
            "  links <task>",
            "    Ensure linked backlog/product docs reference the task chain.",
            "  mermaid --refs <refs...>",
            "    Insert or refresh workflow Mermaid signatures for selected docs.",
            "",
            "Flags:",
            "  --format {text,json}",
            "  --dry-run",
        ]
    )


def _build_repair_kind_help(kind: str) -> str:
    examples = {
        "gates": "  logics-manager flow repair gates task_164_implement_flow_deliver_from_product",
        "ac-traceability": "  logics-manager flow repair ac-traceability req_199_implement_flow_deliver_from_product",
        "links": "  logics-manager flow repair links task_164_implement_flow_deliver_from_product",
        "mermaid": "  logics-manager flow repair mermaid --refs req_199 item_363 task_164",
    }
    usage = "  logics-manager flow repair mermaid --refs <refs...> [args...]" if kind == "mermaid" else f"  logics-manager flow repair {kind} <source> [args...]"
    return "\n".join(
        [
            f"Logics Flow Repair {kind.title()}",
            "Apply a deterministic closeout repair.",
            "",
            "Usage:",
            usage,
            "",
            "Flags:",
            "  --format {text,json}",
            "  --dry-run",
            "",
            "Example:",
            examples[kind],
        ]
    )


def _build_closeout_help() -> str:
    return "\n".join(
        [
            "Logics Flow Closeout",
            "Append validation, repair deterministic gaps, finish, and optionally validate/index.",
            "",
            "Usage:",
            "  logics-manager flow closeout <task> [args...]",
            "",
            "Flags:",
            "  --validation",
            "  --index",
            "  --lint",
            "  --audit",
            "  --format {text,json}",
            "  --dry-run",
            "",
            "Example:",
            '  logics-manager flow closeout task_164 --validation "pytest passed" --index --lint --audit',
        ]
    )


def _build_promote_help() -> str:
    return "\n".join(
        [
            "Logics Flow Promote",
            "Promote between workflow stages.",
            "",
            "Usage:",
            "  logics-manager flow promote <request-to-backlog|backlog-to-task> <source> [args...]",
            "",
            "Commands:",
            "  request-to-backlog <source>",
            "    Create a backlog slice from a request.",
            "    Flags: --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --auto-create-product-brief, --auto-create-adr, --format {text,json}, --dry-run",
            "  backlog-to-task <source>",
            "    Create a task from a backlog item.",
            "    Flags: --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --auto-create-product-brief, --auto-create-adr, --format {text,json}, --dry-run",
            "",
            "Examples:",
            "  logics-manager flow promote request-to-backlog req_001_capture_migration_risks",
            "  logics-manager flow promote backlog-to-task item_002_break_work_into_slices",
        ]
    )


def _build_promote_variant_help(promotion: str) -> str:
    if promotion == "request-to-backlog":
        title = "Request to Backlog"
        summary = "Create a backlog slice from a request."
        usage = "  logics-manager flow promote request-to-backlog <source> [args...]"
        example = "  logics-manager flow promote request-to-backlog req_001_capture_migration_risks"
    else:
        title = "Backlog to Task"
        summary = "Create a task from a backlog item."
        usage = "  logics-manager flow promote backlog-to-task <source> [args...]"
        example = "  logics-manager flow promote backlog-to-task item_002_break_work_into_slices"
    return "\n".join(
        [
            f"Logics Flow Promote {title}",
            summary,
            "",
            "Usage:",
            usage,
            "",
            "Flags:",
            "  --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --auto-create-product-brief, --auto-create-adr, --format {text,json}, --dry-run",
            "",
            "Example:",
            example,
        ]
    )


def _build_split_help() -> str:
    return "\n".join(
        [
            "Logics Flow Split",
            "Split a request or backlog into bounded children.",
            "",
            "Usage:",
            "  logics-manager flow split <request|backlog> <source> [args...]",
            "",
            "Commands:",
            "  request <source>",
            "    Split a request into multiple backlog items.",
            "    Flags: --title (repeatable), --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --auto-create-product-brief, --auto-create-adr, --format {text,json}, --dry-run",
            "  backlog <source>",
            "    Split a backlog item into multiple tasks.",
            "    Flags: --title (repeatable), --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --auto-create-product-brief, --auto-create-adr, --format {text,json}, --dry-run",
            "",
            "Examples:",
            "  logics-manager flow split request req_001_capture_migration_risks --title \"Slice 1\" --title \"Slice 2\"",
            "  logics-manager flow split backlog item_002_break_work_into_slices --title \"Task 1\" --title \"Task 2\"",
        ]
    )


def _build_split_variant_help(split_kind: str) -> str:
    if split_kind == "request":
        title = "Request"
        summary = "Split a request into multiple backlog items."
        usage = "  logics-manager flow split request <source> [args...]"
        example = '  logics-manager flow split request req_001_capture_migration_risks --title "Slice 1" --title "Slice 2"'
    else:
        title = "Backlog"
        summary = "Split a backlog item into multiple tasks."
        usage = "  logics-manager flow split backlog <source> [args...]"
        example = '  logics-manager flow split backlog item_002_break_work_into_slices --title "Task 1" --title "Task 2"'
    return "\n".join(
        [
            f"Logics Flow Split {title}",
            summary,
            "",
            "Usage:",
            usage,
            "",
            "Flags:",
            "  --title (repeatable), --from-version, --understanding, --confidence, --status, --complexity, --theme, --progress, --auto-create-product-brief, --auto-create-adr, --format {text,json}, --dry-run",
            "",
            "Example:",
            example,
        ]
    )


def _build_close_help() -> str:
    return "\n".join(
        [
            "Logics Flow Close",
            "Close a request, backlog item, or task and propagate transitions.",
            "",
            "Usage:",
            "  logics-manager flow close <request|backlog|task> <source> [args...]",
            "",
            "Kinds:",
            "  request",
            "    Close a request doc.",
            "    Flags: --format {text,json}, --dry-run",
            "  backlog",
            "    Close a backlog doc.",
            "    Flags: --format {text,json}, --dry-run",
            "  task",
            "    Close a task doc.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "Examples:",
            "  logics-manager flow close request req_001_capture_migration_risks",
            "  logics-manager flow close task task_003_fix_docs --dry-run",
        ]
    )


def _build_close_kind_help(kind: str) -> str:
    example = {
        "request": "  logics-manager flow close request req_001_capture_migration_risks",
        "backlog": "  logics-manager flow close backlog item_002_break_work_into_slices",
        "task": "  logics-manager flow close task task_003_fix_docs",
    }[kind]
    return "\n".join(
        [
            f"Logics Flow Close {kind.title()}",
            f"Close a {kind} doc and propagate transitions.",
            "",
            "Usage:",
            f"  logics-manager flow close {kind} <source> [args...]",
            "",
            "Flags:",
            "  --format {text,json}",
            "  --dry-run",
            "",
            "Example:",
            example,
        ]
    )


def _build_finish_help() -> str:
    return "\n".join(
        [
            "Logics Flow Finish",
            "Finish a task and verify the closure chain.",
            "",
            "Usage:",
            "  logics-manager flow finish task <source> [args...]",
            "",
            "Commands:",
            "  task <source>",
            "    Finish a task.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "Examples:",
            "  logics-manager flow finish task task_003_fix_docs",
        ]
    )


def _build_finish_kind_help(kind: str) -> str:
    return "\n".join(
        [
            f"Logics Flow Finish {kind.title()}",
            f"Finish a {kind} and verify the closure chain.",
            "",
            "Usage:",
            f"  logics-manager flow finish {kind} <source> [args...]",
            "",
            "Flags:",
            "  --format {text,json}",
            "  --dry-run",
            "",
            "Example:",
            "  logics-manager flow finish task task_003_fix_docs",
        ]
    )


def _build_progress_help() -> str:
    return "\n".join(
        [
            "Logics Flow Progress",
            "Update managed progress indicators and propagate parent state.",
            "",
            "Usage:",
            "  logics-manager flow progress task <source> --progress <n%> [args...]",
            "",
            "Commands:",
            "  task <source>",
            "    Update task progress and linked backlog item progress.",
            "    Flags: --progress, --format {text,json}, --dry-run",
            "",
            "Example:",
            "  logics-manager flow progress task task_003_fix_docs --progress 40%",
        ]
    )


def _build_progress_kind_help(kind: str) -> str:
    return "\n".join(
        [
            f"Logics Flow Progress {kind.title()}",
            f"Update {kind} progress and propagate linked state.",
            "",
            "Usage:",
            f"  logics-manager flow progress {kind} <source> --progress <n%> [args...]",
            "",
            "Flags:",
            "  --progress",
            "  --format {text,json}",
            "  --dry-run",
            "",
            "Example:",
            "  logics-manager flow progress task task_003_fix_docs --progress 40%",
        ]
    )


def _print_help(text: str) -> None:
    print(colorize_help(text))

def _split_titles(raw_titles: list[str]) -> list[str]:
    titles = [title.strip() for title in raw_titles if title and title.strip()]
    if not titles:
        raise SystemExit("Provide at least one non-empty --title value.")
    return titles


def _find_repo_root(start: Path) -> Path:
    """Delegate to the canonical resolver so `--repo-root` reaches flow too.

    This used to re-implement the walk, which meant the override set before
    dispatch was invisible here and `flow` alone still required the caller's
    working directory to be inside the target repository.
    """
    try:
        return find_repo_root(start)
    except ConfigError as exc:
        raise SystemExit(str(exc)) from exc


def _plan_doc(repo_root: Path, directory: str, prefix: str, title: str, dry_run: bool = False) -> PlannedDoc:
    target_dir = repo_root / directory
    if not dry_run:
        target_dir.mkdir(parents=True, exist_ok=True)
    slug = _slugify(title)
    highest = -1
    pattern = re.compile(rf"^{re.escape(prefix)}_(\d+)_.*\.md$")
    for path in target_dir.glob(f"{prefix}_*.md"):
        match = pattern.match(path.name)
        if match:
            highest = max(highest, int(match.group(1)))
    ref = f"{prefix}_{highest + 1:03d}_{slug}"
    path = target_dir / f"{ref}.md"
    return PlannedDoc(ref=ref, path=path)


def _ensure_new_doc_paths_available(paths: list[Path]) -> None:
    collisions = [path for path in paths if path.exists()]
    if collisions:
        rendered = ", ".join(path.as_posix() for path in collisions)
        raise SystemExit(f"Ref collision while creating Logics doc(s): {rendered}. Re-run the command to allocate a fresh id.")


def _write_new_doc(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("x", encoding="utf-8") as handle:
            handle.write(content)
    except FileExistsError as exc:
        raise SystemExit(f"Ref collision while creating Logics doc: {path.as_posix()}. Re-run the command to allocate a fresh id.") from exc


def _read_json_object(path: Path, *, label: str) -> dict[str, object]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"Missing {label}: {path.as_posix()}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {label}: {exc}") from exc
    if not isinstance(payload, dict):
        raise SystemExit(f"{label} must be a JSON object.")
    return payload


def _request_acceptance_map(lines: list[str]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for item in _bullet_values(_section_lines(lines, "Acceptance criteria")):
        match = re.match(r"AC(\d+)\s*:\s*(.+)", item.strip(), flags=re.IGNORECASE)
        if match:
            mapping[f"AC{match.group(1)}"] = f"AC{match.group(1)}: {match.group(2).strip()}"
    return mapping


def _parse_request_slice(raw: str, known_acs: dict[str, str]) -> dict[str, object]:
    if ":" not in raw:
        raise SystemExit("`--slice` must use `Title:AC1,AC2` syntax.")
    title, raw_acs = raw.split(":", 1)
    title = title.strip()
    if not title:
        raise SystemExit("`--slice` title is required.")
    ac_ids = [_normalize_ac_id(part) for part in re.split(r"[, ]+", raw_acs.strip()) if part.strip()]
    if not ac_ids:
        raise SystemExit("`--slice` requires at least one AC id.")
    unknown = [ac_id for ac_id in ac_ids if ac_id not in known_acs]
    if unknown:
        raise SystemExit(f"Unknown request AC id(s) for `--slice`: {', '.join(unknown)}")
    return {"title": title, "ac_ids": ac_ids}


_extract_refs = extract_refs


def _strip_mermaid_blocks(text: str) -> str:
    return re.sub(r"```mermaid\s*\n.*?\n```", "", text, flags=re.DOTALL)


def _workflow_mermaid_block(kind: str, signature: str) -> list[str]:
    if kind == "request":
        body = [
            "flowchart TD",
            "    Need[Request need] --> Backlog[Backlog slice]",
            "    Backlog --> Task[Delivery task]",
        ]
    elif kind == "backlog":
        body = [
            "flowchart TD",
            "    Request[Request source] --> Scope[Backlog scope]",
            "    Scope --> Task[Delivery task]",
        ]
    else:
        body = [
            "flowchart TD",
            "    Backlog[Backlog item] --> Build[Implementation]",
            "    Build --> Validate[Validation]",
            "    Validate --> Close[Finish workflow]",
        ]
    return [
        "```mermaid",
        f"%% logics-kind: {kind}",
        f"%% logics-signature: {signature}",
        *body,
        "```",
    ]


def _with_workflow_mermaid_overview(kind: str, content: str) -> str:
    return content


_SHORT_REF_RE = re.compile(r"^([a-z]+)_(\d+)$")


def _short_ref_matches(repo_root: Path, kind: DocKind, ref: str) -> list[Path]:
    """req_286/item_524: full-slug docs a short ref (e.g. req_285) could mean.

    Matches by integer value so req_285 and req_5 / req_005 resolve regardless of
    zero-padding, like the rest of the CLI."""
    match = _SHORT_REF_RE.match(ref)
    if not match or match.group(1) != kind.prefix:
        return []
    want = int(match.group(2))
    directory = repo_root / kind.directory
    if not directory.is_dir():
        return []
    out = []
    for path in directory.glob(f"{kind.prefix}_*.md"):
        parts = path.stem.split("_", 2)
        if len(parts) >= 2 and parts[1].isdigit() and int(parts[1]) == want:
            out.append(path)
    return sorted(out)


def _resolve_doc_path(repo_root: Path, kind: DocKind, ref: str) -> Path | None:
    path = repo_root / kind.directory / f"{ref}.md"
    if path.is_file():
        return path
    # req_286/item_524: fall back to short-ref resolution (req_285 -> req_285_<slug>).
    matches = _short_ref_matches(repo_root, kind, ref)
    return matches[0] if len(matches) == 1 else None


ALL_DOC_DIRECTORIES = {
    "request": "logics/request",
    "backlog": "logics/backlog",
    "task": "logics/tasks",
    "product": "logics/product",
    "roadmap": "logics/roadmap",
    "architecture": "logics/architecture",
    "spec": "logics/specs",
}


def _locate_doc_anywhere(repo_root: Path, ref: str) -> tuple[Path, str] | None:
    """Find a document by bare ref across every kind, for honest error messages."""
    for kind_name, directory in ALL_DOC_DIRECTORIES.items():
        path = repo_root / directory / f"{ref}.md"
        if path.is_file():
            return path, kind_name
    return None


def _wrong_kind_error(repo_root: Path, source: str, kind: DocKind) -> str:
    """Say the document is of another kind rather than claiming it does not exist."""
    located = _locate_doc_anywhere(repo_root, source)
    if located is None:
        return f"Source not found: {source}"
    _path, actual_kind = located
    return (
        f"`{source}` is a {actual_kind} document; this command accepts a {kind.kind} "
        f"(a `{kind.prefix}_...` ref under `{kind.directory}`)."
    )


def _resolve_workflow_source(repo_root: Path, kind: DocKind, source: str) -> Path:
    raw = Path(source)
    if raw.is_absolute():
        candidate = raw.resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    elif any(part == ".." for part in raw.parts):
        raise SystemExit(f"Unsupported source `{source}`. Use a {kind.prefix}_... ref or repo-relative Logics path.")
    elif len(raw.parts) == 1 and raw.suffix != ".md":
        path = _resolve_doc_path(repo_root, kind, source)
        if path is None:
            raise SystemExit(_wrong_kind_error(repo_root, source, kind))
        return path
    else:
        candidate = (repo_root / raw).resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    expected_dir = Path(kind.directory)
    if candidate.parent != (repo_root / kind.directory).resolve():
        raise SystemExit(f"Expected source under `{kind.directory}`. Got: `{rel_path.as_posix()}`.")
    if not candidate.is_file():
        raise SystemExit(f"Source not found: {rel_path.as_posix()}")
    if not candidate.stem.startswith(f"{kind.prefix}_"):
        raise SystemExit(f"Expected a `{kind.prefix}_...` file for kind `{kind.kind}`. Got: {candidate.name}")
    if rel_path.parent != expected_dir:
        raise SystemExit(f"Expected source under `{kind.directory}`. Got: `{rel_path.as_posix()}`.")
    return candidate


def _resolve_product_source(repo_root: Path, source: str) -> Path:
    raw = Path(source)
    if raw.is_absolute():
        candidate = raw.resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    elif any(part == ".." for part in raw.parts):
        raise SystemExit("Unsupported product source. Use a prod_... ref or repo-relative product path.")
    elif len(raw.parts) == 1 and raw.suffix != ".md":
        candidate = repo_root / "logics" / "product" / f"{source}.md"
        rel_path = candidate.relative_to(repo_root)
    else:
        candidate = (repo_root / raw).resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    if candidate.parent != (repo_root / "logics" / "product").resolve():
        raise SystemExit(f"Expected product source under `logics/product`. Got: `{rel_path.as_posix()}`.")
    if not candidate.is_file():
        raise SystemExit(f"Product source not found: {rel_path.as_posix()}")
    if not candidate.stem.startswith("prod_"):
        raise SystemExit(f"Expected a `prod_...` product brief. Got: {candidate.name}")
    return candidate


def _append_section_bullets(path: Path, heading: str, bullets: list[str], dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    start_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            start_idx = idx + 1
            break
    if start_idx is None:
        lines.extend(["", f"# {heading}", *[f"- {bullet}" for bullet in bullets]])
    else:
        insert_at = start_idx
        while insert_at < len(lines) and lines[insert_at].strip().startswith("- "):
            insert_at += 1
        existing = {line.strip() for line in lines[start_idx:insert_at] if line.strip().startswith("- ")}
        for bullet in bullets:
            rendered = f"- {bullet}"
            if rendered not in existing:
                lines.insert(insert_at, rendered)
                insert_at += 1
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _mark_section_checkboxes_done(path: Path, heading: str, dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    start_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            start_idx = idx + 1
            break
    if start_idx is None:
        return
    changed = False
    for idx in range(start_idx, len(lines)):
        line = lines[idx]
        if line.startswith("# "):
            break
        if "- [ ]" in line:
            lines[idx] = line.replace("- [ ]", "- [x]", 1)
            changed = True
    if changed:
        path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _collect_docs_linking_ref(repo_root: Path, kind: DocKind, ref: str) -> list[Path]:
    directory = repo_root / kind.directory
    linked: list[Path] = []
    if not directory.is_dir():
        return linked
    for path in sorted(directory.glob("*.md")):
        if ref in path.read_text(encoding="utf-8"):
            linked.append(path)
    return linked


def _close_doc(path: Path, kind: DocKind, dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    updated: list[str] = []
    saw_status = False
    saw_progress = False
    for line in lines:
        if line.startswith("> Status:"):
            updated.append("> Status: Done")
            saw_status = True
        elif kind.include_progress and line.startswith("> Progress:"):
            updated.append("> Progress: 100%")
            saw_progress = True
        else:
            updated.append(line)
    if not saw_status:
        updated.insert(1, "> Status: Done")
    if kind.include_progress and not saw_progress:
        insert_at = next((idx + 1 for idx in range(len(updated) - 1, -1, -1) if updated[idx].startswith("> ")), 1)
        updated.insert(insert_at, "> Progress: 100%")
    path.write_text("\n".join(updated).rstrip() + "\n", encoding="utf-8")


def _is_doc_done(path: Path, kind: DocKind) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    status_value = next((line.split(":", 1)[1].strip() for line in lines if line.startswith("> Status:")), None)
    if status_value is not None and " ".join(status_value.split()).lower() in {"done", "archived"}:
        return True
    if kind.include_progress:
        progress_value = next((line.split(":", 1)[1].strip() for line in lines if line.startswith("> Progress:")), None)
        if progress_value == "100%":
            return True
    return False


def _has_done_status(path: Path) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    return _normalize_status(_indicator_value_from_lines(lines, "Status")) in {"done", "archived"}


def _section_text(text: str, heading: str) -> str:
    return "\n".join(_section_lines(text.splitlines(), heading)).strip()


def _section_has_unchecked_checkbox(text: str, heading: str) -> bool:
    return any("- [ ]" in line for line in _section_lines(text.splitlines(), heading))


def _section_has_checked_checkbox(text: str, heading: str) -> bool:
    return any("- [x]" in line.lower() for line in _section_lines(text.splitlines(), heading))


def _request_ac_ids(text: str) -> list[str]:
    ids: list[str] = []
    for line in _section_lines(text.splitlines(), "Acceptance criteria"):
        match = re.search(r"\bAC(\d+)\s*:", line, flags=re.IGNORECASE)
        if match:
            ids.append(f"AC{int(match.group(1))}")
    return ids


def _first_product_path(repo_root: Path, product_ref: str) -> Path | None:
    path = repo_root / "logics" / "product" / f"{product_ref}.md"
    return path if path.is_file() else None


def _mermaid_closeout_issue(path: Path, kind: str) -> str | None:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"```mermaid\s*\n(.*?)\n```", text, flags=re.DOTALL)
    if match is None:
        return None
    signature_match = re.search(r"^\s*%%\s*logics-signature:\s*(.+?)\s*$", match.group(1), flags=re.MULTILINE)
    expected = expected_workflow_mermaid_signature(kind, text.splitlines())
    if signature_match is None:
        return "missing Mermaid context signature comment"
    if expected and signature_match.group(1).strip() != expected:
        return f"stale Mermaid signature, expected `{expected}`"
    return None


def _closeout_issue(path: Path, code: str, message: str, repair_command: str | None = None) -> dict[str, str]:
    issue = {
        "path": path.as_posix(),
        "code": code,
        "message": message,
    }
    if repair_command:
        issue["repair_command"] = repair_command
    return issue

def validate_closeout_payload(repo_root: Path, source: str) -> dict[str, object]:
    task_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], source)
    task_ref = task_path.stem
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    raw_task_text = task_path.read_text(encoding="utf-8")
    issues: list[dict[str, str]] = []
    related_paths = [task_path.relative_to(repo_root).as_posix()]

    for heading in ("Plan", "Definition of Done (DoD)"):
        if _section_has_unchecked_checkbox(task_text, heading):
            issues.append(
                _closeout_issue(
                    task_path.relative_to(repo_root),
                    "task_gate_unchecked",
                    f"`# {heading}` contains unchecked items",
                    f"python3 -m logics_manager flow repair gates {task_ref}",
                )
            )
    if not _section_has_checked_checkbox(task_text, "Definition of Done (DoD)"):
        issues.append(
            _closeout_issue(
                task_path.relative_to(repo_root),
                "task_missing_done_gate",
                "`# Definition of Done (DoD)` has no checked completion evidence",
                f"python3 -m logics_manager flow repair gates {task_ref}",
            )
        )
    if not _has_validation_evidence(task_text):
        issues.append(
            _closeout_issue(
                task_path.relative_to(repo_root),
                "validation_evidence_missing",
                "`# Validation` has no concrete passing validation evidence",
                f"python3 -m logics_manager flow closeout {task_ref} --validation \"<command> passed on <date>: <result>\"",
            )
        )

    mermaid_issue = _mermaid_closeout_issue(task_path, "task")
    if mermaid_issue:
        issues.append(
            _closeout_issue(
                task_path.relative_to(repo_root),
                "mermaid_signature_stale",
                mermaid_issue,
                f"python3 -m logics_manager flow repair mermaid --refs {task_ref}",
            )
        )

    item_refs = sorted(_extract_refs(task_text, DOC_KINDS["backlog"].prefix))
    if not item_refs:
        issues.append(_closeout_issue(task_path.relative_to(repo_root), "task_missing_backlog", "task has no linked backlog item reference"))

    request_refs: set[str] = set(_extract_refs(task_text, DOC_KINDS["request"].prefix))
    item_paths: list[Path] = []
    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            issues.append(_closeout_issue(task_path.relative_to(repo_root), "task_missing_backlog_target", f"task references missing backlog item `{item_ref}`"))
            continue
        item_paths.append(item_path)
        related_paths.append(item_path.relative_to(repo_root).as_posix())
        item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
        request_refs.update(_extract_refs(item_text, DOC_KINDS["request"].prefix))
        if task_ref not in item_text:
            issues.append(
                _closeout_issue(
                    item_path.relative_to(repo_root),
                    "backlog_missing_task_link",
                    f"backlog item does not link task `{task_ref}`",
                    f"python3 -m logics_manager flow repair links {task_ref}",
                )
            )
        mermaid_issue = _mermaid_closeout_issue(item_path, "backlog")
        if mermaid_issue:
            issues.append(
                _closeout_issue(
                    item_path.relative_to(repo_root),
                    "mermaid_signature_stale",
                    mermaid_issue,
                    f"python3 -m logics_manager flow repair mermaid --refs {item_ref}",
                )
            )

    for request_ref in sorted(request_refs):
        request_path = _resolve_doc_path(repo_root, DOC_KINDS["request"], request_ref)
        if request_path is None:
            issues.append(_closeout_issue(task_path.relative_to(repo_root), "missing_request_target", f"linked request `{request_ref}` is missing"))
            continue
        related_paths.append(request_path.relative_to(repo_root).as_posix())
        request_text = _strip_mermaid_blocks(request_path.read_text(encoding="utf-8"))
        if _section_has_unchecked_checkbox(request_text, "Definition of Ready (DoR)"):
            issues.append(
                _closeout_issue(
                    request_path.relative_to(repo_root),
                    "request_dor_unchecked",
                    "`# Definition of Ready (DoR)` contains unchecked items",
                    f"python3 -m logics_manager flow repair gates {task_ref}",
                )
            )
        mermaid_issue = _mermaid_closeout_issue(request_path, "request")
        if mermaid_issue:
            issues.append(
                _closeout_issue(
                    request_path.relative_to(repo_root),
                    "mermaid_signature_stale",
                    mermaid_issue,
                    f"python3 -m logics_manager flow repair mermaid --refs {request_ref}",
                )
            )
        for ac_id in _request_ac_ids(request_text):
            if item_paths and not any(_has_ac_proof(path.read_text(encoding="utf-8"), ac_id) for path in item_paths):
                issues.append(
                    _closeout_issue(
                        request_path.relative_to(repo_root),
                        "ac_missing_item_traceability",
                        f"`{ac_id}` missing backlog-level proof",
                        f"python3 -m logics_manager flow repair ac-traceability {request_ref}",
                    )
                )
            if not _has_ac_proof(raw_task_text, ac_id):
                issues.append(
                    _closeout_issue(
                        request_path.relative_to(repo_root),
                        "ac_missing_task_traceability",
                        f"`{ac_id}` missing task-level proof",
                        f"python3 -m logics_manager flow repair ac-traceability {request_ref}",
                    )
                )

    product_refs = sorted(_extract_refs(raw_task_text, "prod"))
    for product_ref in product_refs:
        product_path = _first_product_path(repo_root, product_ref)
        if product_path is None:
            issues.append(_closeout_issue(task_path.relative_to(repo_root), "missing_product_target", f"linked product brief `{product_ref}` is missing"))
            continue
        related_paths.append(product_path.relative_to(repo_root).as_posix())
        product_text = product_path.read_text(encoding="utf-8")
        if task_ref not in product_text:
            issues.append(
                _closeout_issue(
                    product_path.relative_to(repo_root),
                    "companion_link_missing",
                    f"product brief does not link task `{task_ref}`",
                    f"python3 -m logics_manager flow repair links {task_ref}",
                )
            )

    unique_issues = []
    seen_issue_keys: set[tuple[str, str, str]] = set()
    for issue in issues:
        key = (issue["path"], issue["code"], issue["message"])
        if key in seen_issue_keys:
            continue
        seen_issue_keys.add(key)
        unique_issues.append(issue)

    return {
        "command": "validate-closeout",
        "ok": not unique_issues,
        "source": task_path.relative_to(repo_root).as_posix(),
        "task_ref": task_ref,
        "issue_count": len(unique_issues),
        "issues": unique_issues,
        "related_paths": sorted(set(related_paths)),
    }


def _changed_rel(repo_root: Path, changed_paths: set[Path], path: Path, before: str | None) -> None:
    if before is not None and path.read_text(encoding="utf-8") != before:
        changed_paths.add(path.relative_to(repo_root))


def repair_gates_payload(repo_root: Path, source: str, *, dry_run: bool) -> dict[str, object]:
    task_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], source)
    changed_paths: set[Path] = set()
    planned_paths: set[Path] = set()
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    item_refs = sorted(_extract_refs(task_text, DOC_KINDS["backlog"].prefix))
    request_refs: set[str] = set(_extract_refs(task_text, DOC_KINDS["request"].prefix))

    before = task_path.read_text(encoding="utf-8")
    if _section_has_unchecked_checkbox(before, "Plan") or _section_has_unchecked_checkbox(before, "Definition of Done (DoD)"):
        planned_paths.add(task_path.relative_to(repo_root))
    _mark_section_checkboxes_done(task_path, "Plan", dry_run)
    _mark_section_checkboxes_done(task_path, "Definition of Done (DoD)", dry_run)
    if not dry_run:
        _changed_rel(repo_root, changed_paths, task_path, before)

    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            continue
        request_refs.update(_extract_refs(_strip_mermaid_blocks(item_path.read_text(encoding="utf-8")), DOC_KINDS["request"].prefix))

    for request_ref in sorted(request_refs):
        request_path = _resolve_doc_path(repo_root, DOC_KINDS["request"], request_ref)
        if request_path is None:
            continue
        before = request_path.read_text(encoding="utf-8")
        if _section_has_unchecked_checkbox(before, "Definition of Ready (DoR)"):
            planned_paths.add(request_path.relative_to(repo_root))
        _mark_section_checkboxes_done(request_path, "Definition of Ready (DoR)", dry_run)
        if not dry_run:
            _changed_rel(repo_root, changed_paths, request_path, before)

    return {
        "command": "repair",
        "kind": "gates",
        "source": task_path.relative_to(repo_root).as_posix(),
        "changed_files": sorted(path.as_posix() for path in (planned_paths if dry_run else changed_paths)),
        "dry_run": dry_run,
    }


def _request_ac_entries(request_path: Path) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    for line in _section_lines(request_path.read_text(encoding="utf-8").splitlines(), "Acceptance criteria"):
        match = re.search(r"\bAC(\d+)\s*:\s*(.+)", line, flags=re.IGNORECASE)
        if match:
            entries.append((f"AC{int(match.group(1))}", match.group(2).strip()))
    return entries


def _ac_traceability_entry(ac_id: str, target: str, text: str, proof: str | None, proof_source: str | None) -> str:
    if proof and proof.strip():
        rendered = f"request-{ac_id} -> {target}. Proof: {proof.strip()}"
        if proof_source and proof_source.strip():
            rendered += f" Source: `{proof_source.strip()}`"
        return rendered
    return f"request-{ac_id} -> {target}. Evidence needed: {text}"


def repair_ac_traceability_payload(repo_root: Path, source: str, *, dry_run: bool, proof: str | None = None, proof_source: str | None = None) -> dict[str, object]:
    request_path = _resolve_workflow_source(repo_root, DOC_KINDS["request"], source)
    request_ref = request_path.stem
    ac_entries = _request_ac_entries(request_path)
    changed_paths: set[Path] = set()
    linked_items = _collect_docs_linking_ref(repo_root, DOC_KINDS["backlog"], request_ref)
    linked_task_paths = {
        path
        for path in _collect_docs_linking_ref(repo_root, DOC_KINDS["task"], request_ref)
    }

    for item_path in linked_items:
        item_before = item_path.read_text(encoding="utf-8")
        item_missing = [
            _ac_traceability_entry(ac_id, "This backlog slice", text, proof, proof_source)
            for ac_id, text in ac_entries
            if not _has_ac_proof(item_before, ac_id)
        ]
        if _append_doc_section_bullets_changed(item_path, "AC Traceability", item_missing, dry_run=dry_run):
            changed_paths.add(item_path.relative_to(repo_root))

        item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8") if not dry_run else item_before)
        for task_ref in sorted(_extract_refs(item_text, DOC_KINDS["task"].prefix)):
            task_path = _resolve_doc_path(repo_root, DOC_KINDS["task"], task_ref)
            if task_path is None:
                continue
            linked_task_paths.add(task_path)

    for task_path in sorted(linked_task_paths):
        task_before = task_path.read_text(encoding="utf-8")
        task_missing = [
            _ac_traceability_entry(ac_id, "This task", text, proof, proof_source)
            for ac_id, text in ac_entries
            if not _has_ac_proof(task_before, ac_id)
        ]
        if _append_doc_section_bullets_changed(task_path, "AC Traceability", task_missing, dry_run=dry_run):
            changed_paths.add(task_path.relative_to(repo_root))

    return {
        "command": "repair",
        "kind": "ac-traceability",
        "source": request_path.relative_to(repo_root).as_posix(),
        "proof_recorded": bool(proof and proof.strip()),
        "proof_source": proof_source.strip() if proof_source and proof_source.strip() else None,
        "changed_files": sorted(path.as_posix() for path in changed_paths),
        "dry_run": dry_run,
    }


def repair_links_payload(repo_root: Path, source: str, *, dry_run: bool) -> dict[str, object]:
    task_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], source)
    task_ref = task_path.stem
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    item_refs = sorted(_extract_refs(task_text, DOC_KINDS["backlog"].prefix))
    request_refs = sorted(_extract_refs(task_text, DOC_KINDS["request"].prefix))
    product_refs = sorted(_extract_refs(task_path.read_text(encoding="utf-8"), "prod"))
    changed_paths: set[Path] = set()

    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            continue
        if _append_doc_section_bullets_changed(item_path, "Tasks", [f"`{task_ref}`"], dry_run=dry_run):
            changed_paths.add(item_path.relative_to(repo_root))
        before = item_path.read_text(encoding="utf-8")
        lines = before.splitlines()
        lines = _replace_or_append_prefixed_section_bullet(lines, "Links", "Primary task(s)", f"`{task_ref}`")
        if request_refs:
            lines = _replace_or_append_prefixed_section_bullet(lines, "Links", "Request", f"`{request_refs[0]}`")
        after = "\n".join(lines).rstrip() + "\n"
        if after != before:
            changed_paths.add(item_path.relative_to(repo_root))
            if not dry_run:
                item_path.write_text(after, encoding="utf-8")

    for product_ref in product_refs:
        product_path = _first_product_path(repo_root, product_ref)
        if product_path is None:
            continue
        before = product_path.read_text(encoding="utf-8")
        backlog_ref = item_refs[0] if item_refs else None
        request_ref = request_refs[0] if request_refs else None
        lines = before.splitlines()
        product_status = _normalize_status(_indicator_value_from_lines(lines, "Status"))
        if product_status not in {"settled", "archived", "rejected", "superseded"}:
            lines = _replace_indicator_line(lines, "Status", "Settled")
        if request_ref:
            lines = _replace_indicator_line(lines, "Related request", f"`{request_ref}`")
        if backlog_ref:
            lines = _replace_indicator_line(lines, "Related backlog", f"`{backlog_ref}`")
            lines = _replace_or_append_prefixed_section_bullet(lines, "References", "Product back-reference", f"`{backlog_ref}`")
        lines = _replace_indicator_line(lines, "Related task", f"`{task_ref}`")
        lines = _replace_or_append_prefixed_section_bullet(lines, "References", "Task back-reference", f"`{task_ref}`")
        after = "\n".join(lines).rstrip() + "\n"
        if after != before:
            changed_paths.add(product_path.relative_to(repo_root))
            if not dry_run:
                product_path.write_text(after, encoding="utf-8")

    return {
        "command": "repair",
        "kind": "links",
        "source": task_path.relative_to(repo_root).as_posix(),
        "changed_files": sorted(path.as_posix() for path in changed_paths),
        "dry_run": dry_run,
    }


def _did_you_mean_hint(repo_root: Path, source: str) -> str:
    """req_286/item_524: candidate slugs for an ambiguous or missing short ref."""
    match = _SHORT_REF_RE.match(source)
    if not match:
        return ""
    prefix = match.group(1)
    kind = next((DOC_KINDS[k] for k in ("request", "backlog", "task") if DOC_KINDS[k].prefix == prefix), None)
    if kind is None:
        return ""
    matches = _short_ref_matches(repo_root, kind, source)
    if matches:  # ambiguous: more than one doc shares the number
        slugs = [path.stem for path in matches]
    else:  # missing: point at the refs that do exist for this kind
        directory = repo_root / kind.directory
        slugs = sorted(path.stem for path in directory.glob(f"{kind.prefix}_*.md")) if directory.is_dir() else []
    if not slugs:
        return ""
    shown = slugs[:5]
    suffix = "" if len(slugs) <= 5 else f", … (+{len(slugs) - 5} more)"
    return f" — did you mean: {', '.join(shown)}{suffix}"


def _resolve_any_workflow_source(repo_root: Path, source: str) -> tuple[Path, str]:
    for kind in ("request", "backlog", "task"):
        try:
            return _resolve_workflow_source(repo_root, DOC_KINDS[kind], source), kind
        except SystemExit:
            continue
    # A companion carries findings too, so resolving it here is what lets a repair
    # be addressed at the same granularity as the finding that named it.
    located = _locate_doc_anywhere(repo_root, Path(source).stem if source.endswith(".md") else source)
    if located is not None:
        return located
    raise SystemExit(f"Workflow source not found: {source}{_did_you_mean_hint(repo_root, source)}")


MERMAID_SIGNATURE_KINDS = ("request", "backlog", "task")


def repair_mermaid_payload(repo_root: Path, refs: list[str], *, dry_run: bool) -> dict[str, object]:
    changed_paths: set[Path] = set()
    skipped: list[dict[str, str]] = []
    for ref in refs:
        path, kind = _resolve_any_workflow_source(repo_root, ref)
        if kind not in MERMAID_SIGNATURE_KINDS:
            # Only workflow kinds have a derivable signature. Saying so beats a
            # traceback, and beats reporting zero changes as if there were nothing
            # to do.
            skipped.append(
                {
                    "ref": ref,
                    "kind": kind,
                    "reason": (
                        f"mermaid signatures are derived for {', '.join(MERMAID_SIGNATURE_KINDS)} documents only; "
                        f"`{ref}` is a {kind} document, whose diagram is authored by hand"
                    ),
                }
            )
            continue
        before = path.read_text(encoding="utf-8")
        if "```mermaid" not in before:
            skipped.append({"ref": ref, "kind": kind, "reason": "document has no Mermaid block to refresh"})
            continue
        else:
            signature = expected_workflow_mermaid_signature(kind, before.splitlines())
            repaired = re.sub(r"^\s*%%\s*logics-signature:\s*(.+?)\s*$", f"%% logics-signature: {signature}", before, count=1, flags=re.MULTILINE)
            if repaired != before:
                changed_paths.add(path.relative_to(repo_root))
                if not dry_run:
                    path.write_text(repaired, encoding="utf-8")
    return {
        "command": "repair",
        "kind": "mermaid",
        "refs": refs,
        "changed_files": sorted(path.as_posix() for path in changed_paths),
        "skipped": skipped,
        "dry_run": dry_run,
    }

def _add_common_doc_args(parser: argparse.ArgumentParser, kind: str) -> None:
    parser.add_argument("--from-version")
    parser.add_argument("--understanding", default="90%")
    parser.add_argument("--confidence", default="85%")
    parser.add_argument("--status", default=STATUS_BY_KIND_DEFAULT[kind])
    parser.add_argument("--complexity", default="Medium")
    parser.add_argument("--theme", default="General")
    if DOC_KINDS[kind].include_progress:
        parser.add_argument("--progress", default="0%")
    else:
        parser.add_argument("--progress", default="")
    if kind in {"backlog", "task"}:
        parser.add_argument("--auto-create-product-brief", action="store_true")
        parser.add_argument("--auto-create-adr", action="store_true")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--dry-run", action="store_true")


def _build_native_request_doc(repo_root: Path, planned_ref: str, title: str, args: argparse.Namespace) -> str:
    from_version = _resolved_from_version(repo_root, getattr(args, "from_version", None))
    fixture_mode = bool(getattr(args, "fixture", False))
    context = [
        "Generated locally by logics-manager.",
        "No manual skills bootstrap or bridge editing is required.",
    ]
    if fixture_mode:
        context.append("Synthetic fixture for request generation smoke tests.")
    references = [
        "`logics_manager/flow.py`",
        "`logics_manager/assist.py`",
        "`tests/python/test_logics_manager_cli.py`",
    ]
    content = "\n".join(
        [
            f"## {planned_ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            f"> Status: {getattr(args, 'status', 'Draft')}",
            f"> Understanding: {getattr(args, 'understanding', '90%')}",
            f"> Confidence: {getattr(args, 'confidence', '85%')}",
            f"> Complexity: {getattr(args, 'complexity', 'Medium')}",
            f"> Theme: {getattr(args, 'theme', 'General')}",
            "> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.",
            "",
            "# Needs",
            f"- Deliver a bounded request for {title.lower()}.",
            "",
            "# Context",
            *[f"- {item}" for item in context],
            "",
            "# Acceptance criteria",
            f"- AC1: The request states the bounded need for {title.lower()}.",
            "- AC2: Scope boundaries and operator impact are explicit.",
            "- AC3: The request is ready to be promoted into a backlog slice.",
            "",
            "# Definition of Ready (DoR)",
            "- [ ] Problem statement is explicit and user impact is clear.",
            "- [ ] Scope boundaries (in/out) are explicit.",
            "- [ ] Acceptance criteria are testable.",
            "- [ ] Dependencies and known risks are listed.",
            "",
            "# Companion docs",
            "- Product brief(s): (none yet)",
            "- Architecture decision(s): (none yet)",
            "",
            "# References",
            *[f"- {item}" for item in references],
            "",
            "# AI Context",
            f"- Summary: Draft a bounded request for {title.lower()}.",
            "- Keywords: request-draft, logics-manager, python runtime, bundled CLI",
            "- Use when: You need a new bounded request doc for the Logics workflow.",
            "- Skip when: The work already has an existing request or should go straight to a backlog slice.",
            "",
            "# Backlog",
            "- none",
            "",
        ]
    ).rstrip() + "\n"
    return _with_workflow_mermaid_overview("request", content)


def _build_native_backlog_doc(
    repo_root: Path,
    planned_ref: str,
    title: str,
    args: argparse.Namespace,
    *,
    request_ref: str | None = None,
    product_refs: list[str] | None = None,
    architecture_refs: list[str] | None = None,
) -> str:
    from_version = _resolved_from_version(repo_root, getattr(args, "from_version", None))
    product_refs = product_refs or []
    architecture_refs = architecture_refs or []
    product_line = ", ".join(f"`{ref}`" for ref in product_refs) if product_refs else "(none yet)"
    architecture_line = ", ".join(f"`{ref}`" for ref in architecture_refs) if architecture_refs else "(none yet)"
    request_line = f"`{request_ref}`" if request_ref else "(to be linked)"
    acceptance = [
        f"AC1: The backlog slice stays bounded for {title.lower()}.",
        "AC2: The backlog slice is reviewable and promotable into a task.",
    ]
    content = "\n".join(
        [
            f"## {planned_ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            f"> Status: {getattr(args, 'status', 'Ready')}",
            f"> Understanding: {getattr(args, 'understanding', '90%')}",
            f"> Confidence: {getattr(args, 'confidence', '85%')}",
            f"> Progress: {getattr(args, 'progress', '0%')}",
            f"> Complexity: {getattr(args, 'complexity', 'Medium')}",
            f"> Theme: {getattr(args, 'theme', 'General')}",
            "> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.",
            "",
            "# Problem",
            f"- Deliver a bounded backlog slice for {title.lower()}.",
            "",
            "# Scope",
            "- In:",
            "  - one coherent delivery slice from the operator request.",
            "- Out:",
            "  - unrelated sibling slices.",
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# AC Traceability",
            "- request-AC1 -> This backlog slice. Proof: bounded delivery slice.",
            "- request-AC2 -> This backlog slice. Proof: promotable backlog item.",
            "- request-AC3 -> This backlog slice. Proof: delivery chain includes a task-ready backlog item.",
            "",
            "# Decision framing",
            "- Product framing: Not needed",
            "- Architecture framing: Not needed",
            "",
            "# Links",
            f"- Product brief(s): {product_line}",
            f"- Architecture decision(s): {architecture_line}",
            f"- Request: {request_line}",
            "- Primary task(s): (none yet)",
            "",
            "# AI Context",
            f"- Summary: {title}",
            f"- Keywords: backlog, promote, slice, {title.lower()}",
            f"- Use when: You need a bounded backlog item for {title}.",
            "- Skip when: The change should go straight to implementation detail.",
            "",
            "# Priority",
            "- Priority: Medium",
            "- Rationale: Default until groomed.",
            "",
            "# Notes",
            "- Generated locally by logics-manager.",
            "",
        ]
    ).rstrip() + "\n"
    return _with_workflow_mermaid_overview("backlog", content)


def _build_native_task_doc(
    repo_root: Path,
    planned_ref: str,
    title: str,
    args: argparse.Namespace,
    *,
    backlog_ref: str | None = None,
    request_refs: list[str] | None = None,
    product_refs: list[str] | None = None,
    architecture_refs: list[str] | None = None,
) -> str:
    from_version = _resolved_from_version(repo_root, getattr(args, "from_version", None))
    request_refs = request_refs or []
    product_refs = product_refs or []
    architecture_refs = architecture_refs or []
    backlog_line = f"`{backlog_ref}`" if backlog_ref else "(to be linked)"
    request_line = ", ".join(f"`{ref}`" for ref in request_refs) if request_refs else "(none yet)"
    product_line = ", ".join(f"`{ref}`" for ref in product_refs) if product_refs else "(none yet)"
    architecture_line = ", ".join(f"`{ref}`" for ref in architecture_refs) if architecture_refs else "(none yet)"
    content = "\n".join(
        [
            f"## {planned_ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            f"> Status: {getattr(args, 'status', 'Ready')}",
            f"> Understanding: {getattr(args, 'understanding', '90%')}",
            f"> Confidence: {getattr(args, 'confidence', '85%')}",
            f"> Progress: {getattr(args, 'progress', '0%')}",
            f"> Complexity: {getattr(args, 'complexity', 'Medium')}",
            f"> Theme: {getattr(args, 'theme', 'General')}",
            "> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.",
            "",
            "# Context",
            f"- Execute the bounded delivery slice for {title}.",
            "",
            "# Plan",
            "- [ ] 1. Confirm scope, dependencies, and linked acceptance criteria.",
            "- [ ] 2. Implement the next coherent delivery wave.",
            "- [ ] 3. Update affected Logics docs in the same wave and leave the repository commit-ready.",
            "- [ ] 4. Keep commit creation under operator control; do not force one commit per micro-step.",
            "- [ ] GATE: do not close a wave or step until the relevant automated tests and quality checks have been run successfully.",
            "",
            "# Backlog",
            f"- {backlog_line}",
            "",
            "# Definition of Done (DoD)",
            "- [ ] Code is implemented and reviewed.",
            "- [ ] Validation passes.",
            "- [ ] Linked docs are synchronized.",
            "- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.",
            "",
            "# AC Traceability",
            "- request-AC1 -> This task. Proof: implementation delivers the bounded request need.",
            "- request-AC2 -> This task. Proof: implementation scope is limited to the linked delivery slice.",
            "- request-AC3 -> This task. Proof: implementation is executable from the promoted backlog item.",
            "- backlog-AC1 -> This task. Proof: task remains bounded to the linked backlog scope.",
            "- backlog-AC2 -> This task. Proof: task provides the executable implementation surface.",
            "",
            "# Validation",
            "- (no validation recorded yet)",
            "",
            "# Report",
            "- Not started.",
            "",
            "# AI Context",
            f"- Summary: Implement {title.lower()}.",
            "- Keywords: task, implementation, backlog, runtime, python",
            "- Use when: You need a bounded implementation task for a backlog item.",
            "- Skip when: The work is still at the request or backlog shaping stage.",
            "",
            "# Links",
            f"- Request: {request_line}",
            f"- Product brief(s): {product_line}",
            f"- Architecture decision(s): {architecture_line}",
            "",
        ]
    ).rstrip() + "\n"
    return content


def _extract_doc_title(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            if " - " in payload:
                return payload.split(" - ", 1)[1].strip()
            return payload
    return path.stem


_section_lines = section_lines


def _bullet_values(lines: list[str]) -> list[str]:
    values: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("- "):
            value = stripped[2:].strip()
            if value:
                values.append(value)
    return values


def _next_backlog_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "backlog"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("item_*.md"):
            stem = path.stem
            if stem.startswith("item_"):
                parts = stem.split("_", 2)
                if len(parts) >= 2 and parts[1].isdigit():
                    highest = max(highest, int(parts[1]))
    return f"item_{highest + 1:03d}_{_slugify(title)}"


def _next_task_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "tasks"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("task_*.md"):
            stem = path.stem
            if stem.startswith("task_"):
                parts = stem.split("_", 2)
                if len(parts) >= 2 and parts[1].isdigit():
                    highest = max(highest, int(parts[1]))
    return f"task_{highest + 1:03d}_{_slugify(title)}"


def _next_adr_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "architecture"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("adr_*.md"):
            stem = path.stem
            if stem.startswith("adr_"):
                parts = stem.split("_", 2)
                if len(parts) >= 2 and parts[1].isdigit():
                    highest = max(highest, int(parts[1]))
    return f"adr_{highest + 1:03d}_{_slugify(title)}"


def _next_roadmap_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "roadmap"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("road_*.md"):
            parts = path.stem.split("_", 2)
            if len(parts) >= 2 and parts[1].isdigit():
                highest = max(highest, int(parts[1]))
    return f"road_{highest + 1:03d}_{_slugify(title)}"


def _roadmap_ref_line(refs: list[str]) -> str:
    return ", ".join(f"`{ref}`" for ref in refs) if refs else "(none yet)"


def _split_milestones(values: list[str]) -> list[tuple[str, str]]:
    raw = values or ["0.1: Establish the first usable slice.", "0.2: Expand the workflow.", "1.0: Stabilize the release target."]
    milestones: list[tuple[str, str]] = []
    for value in raw:
        version, _, title = value.partition(":")
        version = version.strip()
        title = title.strip() or version
        if not re.match(r"^\d+(?:\.\d+){1,2}$", version):
            version = f"0.{len(milestones) + 1}"
            title = value.strip()
        milestones.append((version, title))
    return milestones


def _build_native_roadmap(
    repo_root: Path,
    title: str,
    *,
    milestones: list[str] | None = None,
    product_ref: str | None = None,
    request_refs: list[str] | None = None,
    backlog_refs: list[str] | None = None,
    task_refs: list[str] | None = None,
) -> tuple[str, str]:
    ref = _next_roadmap_ref(repo_root, title)
    parsed_milestones = _split_milestones(milestones or [])
    request_refs = request_refs or []
    backlog_refs = backlog_refs or []
    task_refs = task_refs or []
    content = [
        f"## {ref} - {title}",
        f"> Date: {date.today().isoformat()}",
        "> Status: Proposed",
        f"> Related product: {f'`{product_ref}`' if product_ref else '(none yet)'}",
        f"> Related request: {_roadmap_ref_line(request_refs)}",
        "> Reminder: Update status, milestone scope, linked refs, risks, and success signals when you edit this doc.",
        "",
        "# Summary",
        f"Plan the path from first usable increment to stable release for {title.lower()}.",
        "",
        "# Milestones",
    ]
    for version, milestone_title in parsed_milestones:
        content.extend(
            [
                f"## {version} - {milestone_title}",
                "- Goal: Define the smallest useful outcome for this increment.",
                "- Scope: Link the request, backlog items, specs, or tasks that make this increment real.",
                "- Exit signal: The increment can be validated without transcript context.",
                "",
            ]
        )
    content.extend(
        [
            "# Sequencing",
            "- Deliver milestones in ascending version order unless dependencies force a documented exception.",
            "- Keep each increment independently reviewable and linked to concrete workflow docs.",
            "",
            "# Risks",
            "- Long-term scope can drift unless every milestone keeps a clear exit signal.",
            "- Version labels are planning targets, not release promises.",
            "",
            "# References",
            f"- Product brief(s): {f'`{product_ref}`' if product_ref else '(none yet)'}",
            f"- Request(s): {_roadmap_ref_line(request_refs)}",
            f"- Backlog item(s): {_roadmap_ref_line(backlog_refs)}",
            f"- Task(s): {_roadmap_ref_line(task_refs)}",
            "",
            "# AI Context",
            f"- Summary: Roadmap for {title}.",
            f"- Keywords: roadmap, milestones, versions, {title.lower()}",
            f"- Use when: Planning or sequencing versions for {title}.",
            "- Skip when: You need execution details for a single backlog item or task.",
            "",
        ]
    )
    return ref, "\n".join(content).rstrip() + "\n"


def _resolve_roadmap_source(repo_root: Path, source: str) -> Path:
    raw = Path(source)
    if raw.is_absolute() or any(part == ".." for part in raw.parts):
        raise SystemExit("Unsupported roadmap source. Use a road_... ref or repo-relative roadmap path.")
    if len(raw.parts) == 1 and raw.suffix != ".md":
        candidate = repo_root / "logics" / "roadmap" / f"{source}.md"
    else:
        candidate = (repo_root / raw).resolve()
        ensure_relative_to(candidate, repo_root, label="roadmap source")
    if candidate.parent != (repo_root / "logics" / "roadmap").resolve() or not candidate.name.startswith("road_"):
        raise SystemExit("Expected roadmap source under `logics/roadmap` with a `road_...` filename.")
    if not candidate.is_file():
        raise SystemExit(f"Roadmap source not found: {source}")
    return candidate


def roadmap_validate_payload(repo_root: Path, source: str) -> dict[str, object]:
    path = _resolve_roadmap_source(repo_root, source)
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    issues: list[str] = []
    if not lines or not lines[0].startswith(f"## {path.stem} - "):
        issues.append("bad or missing roadmap heading")
    for key in ("Date", "Status", "Related product", "Related request", "Reminder"):
        if _indicator_value_from_lines(lines, key) is None:
            issues.append(f"missing indicator: {key}")
    milestone_lines = [line for line in lines if re.match(r"^## \d+(?:\.\d+){1,2}\s+-\s+", line)]
    if not milestone_lines:
        issues.append("missing versioned milestones")
    # A `##` heading that is neither the document title nor a parsable milestone is
    # invisible to every downstream consumer. Name it instead of lowering the count.
    unparsed_headings = [
        line.strip()
        for index, line in enumerate(lines)
        if line.startswith("## ")
        and line not in milestone_lines
        and not (index == 0 or line.startswith(f"## {path.stem} - "))
    ]
    return {
        "command": "roadmap validate",
        "ok": not issues,
        "ref": path.stem,
        "path": path.relative_to(repo_root).as_posix(),
        "milestone_count": len(milestone_lines),
        "unparsed_headings": unparsed_headings,
        "issues": issues,
    }

def _append_doc_section_bullets(path: Path, heading: str, bullets: list[str], *, dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            insert_at = idx + 1
            while insert_at < len(lines) and lines[insert_at].strip().startswith("- "):
                insert_at += 1
            existing = {line.strip() for line in lines[idx + 1 : insert_at] if line.strip().startswith("- ")}
            for bullet in bullets:
                rendered = f"- {bullet}"
                if rendered not in existing:
                    lines.insert(insert_at, rendered)
                    insert_at += 1
            path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
            return
    lines.extend(["", f"# {heading}", *[f"- {bullet}" for bullet in bullets]])
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _append_doc_section_bullets_changed(path: Path, heading: str, bullets: list[str], *, dry_run: bool) -> bool:
    if not bullets:
        return False
    before = path.read_text(encoding="utf-8") if path.is_file() else ""
    _append_doc_section_bullets(path, heading, bullets, dry_run=dry_run)
    if dry_run:
        return any(f"- {bullet}" not in before for bullet in bullets)
    return path.read_text(encoding="utf-8") != before


def _remove_section_placeholder_bullets(path: Path, heading: str, placeholders: set[str], *, dry_run: bool) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    target = heading.strip().lower()
    in_section = False
    changed = False
    output: list[str] = []
    for line in lines:
        if line.startswith("# "):
            in_section = line[2:].strip().lower() == target
            output.append(line)
            continue
        if in_section and line.strip().lower() in placeholders:
            changed = True
            continue
        output.append(line)
    if changed and not dry_run:
        path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")
    return changed


def _replace_indicator_line(lines: list[str], label: str, value: str) -> list[str]:
    prefix = f"> {label}:"
    updated = False
    output: list[str] = []
    insert_at = 1
    for idx, line in enumerate(lines):
        if idx > 0 and line.startswith("> "):
            insert_at = idx + 1
        if line.startswith(prefix):
            output.append(f"{prefix} {value}")
            updated = True
        else:
            output.append(line)
    if not updated:
        output.insert(insert_at, f"{prefix} {value}")
    return output


def _replace_or_append_prefixed_section_bullet(
    lines: list[str],
    heading: str,
    bullet_prefix: str,
    rendered_value: str,
) -> list[str]:
    heading_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            heading_idx = idx
            break
    rendered = f"- {bullet_prefix}: {rendered_value}"
    if heading_idx is None:
        return [*lines, "", f"# {heading}", rendered]

    end_idx = heading_idx + 1
    while end_idx < len(lines) and not lines[end_idx].startswith("# "):
        end_idx += 1

    output = list(lines)
    for idx in range(heading_idx + 1, end_idx):
        if output[idx].strip().startswith(f"- {bullet_prefix}:"):
            output[idx] = rendered
            return output
    output.insert(end_idx, rendered)
    return output


def _update_product_delivery_links(
    product_path: Path,
    *,
    request_ref: str,
    backlog_ref: str,
    task_ref: str,
    dry_run: bool,
) -> None:
    if dry_run:
        return
    lines = product_path.read_text(encoding="utf-8").splitlines()
    lines = _replace_indicator_line(lines, "Related request", f"`{request_ref}`")
    lines = _replace_indicator_line(lines, "Related backlog", f"`{backlog_ref}`")
    lines = _replace_indicator_line(lines, "Related task", f"`{task_ref}`")
    lines = _replace_or_append_prefixed_section_bullet(lines, "References", "Product back-reference", f"`{backlog_ref}`")
    lines = _replace_or_append_prefixed_section_bullet(lines, "References", "Task back-reference", f"`{task_ref}`")
    product_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _update_request_product_link(request_path: Path, product_ref: str, *, dry_run: bool) -> None:
    if dry_run:
        return
    lines = request_path.read_text(encoding="utf-8").splitlines()
    lines = _replace_or_append_prefixed_section_bullet(lines, "Companion docs", "Product brief(s)", f"`{product_ref}`")
    request_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _build_native_product_brief(
    repo_root: Path,
    title: str,
    *,
    request_ref: str | None = None,
    backlog_ref: str | None = None,
    task_ref: str | None = None,
    architecture_refs: list[str] | None = None,
) -> tuple[str, str]:
    ref = _next_product_ref(repo_root, title)
    architecture_refs = architecture_refs or []
    related_request = f"`{request_ref}`" if request_ref else "(none yet)"
    related_backlog = f"`{backlog_ref}`" if backlog_ref else "(none yet)"
    related_task = f"`{task_ref}`" if task_ref else "(none yet)"
    related_architecture = ", ".join(f"`{item}`" for item in architecture_refs) if architecture_refs else "(none yet)"
    signature_slug = _slugify(title) or "product-brief"
    content = "\n".join(
        [
            f"## {ref} - {title}",
            f"> Date: {date.today().isoformat()}",
            "> Status: Proposed",
            f"> Related request: {related_request}",
            f"> Related backlog: {related_backlog}",
            f"> Related task: {related_task}",
            f"> Related architecture: {related_architecture}",
            "> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.",
            "",
            "# Overview",
            f"- (overview to write: what {title.lower()} is for, and for whom)",
            "",
            "```mermaid",
            "%% logics-kind: product",
            f"%% logics-signature: product|{signature_slug}|generated",
            "flowchart TD",
            "    Need[Product need] --> Scope[Scope and guardrails]",
            "    Scope --> Decisions[Key decisions]",
            "    Decisions --> Signals[Success signals]",
            "```",
            "",
            "# Goals",
            "- (goal to document)",
            "",
            "# Non-goals",
            "- (non-goal to document)",
            "",
            "# Scope and guardrails",
            "- In: (to document)",
            "- Out: (to document)",
            "",
            "# Key product decisions",
            "- (decision to document)",
            "",
            "# Success signals",
            "- (success signal to document)",
            "",
            "# References",
            f"- Product back-reference: {related_backlog}",
            f"- Task back-reference: {related_task}",
            "",
        ]
    ).rstrip() + "\n"
    return ref, content


def _build_native_adr(
    repo_root: Path,
    title: str,
    *,
    request_ref: str | None = None,
    backlog_ref: str | None = None,
    task_ref: str | None = None,
) -> tuple[str, str]:
    ref = _next_adr_ref(repo_root, title)
    related_request = f"`{request_ref}`" if request_ref else "(none yet)"
    related_backlog = f"`{backlog_ref}`" if backlog_ref else "(none yet)"
    related_task = f"`{task_ref}`" if task_ref else "(none yet)"
    content = "\n".join(
        [
            f"## {ref} - {title}",
            f"> Date: {date.today().isoformat()}",
            "> Status: Proposed",
            f"> Related request: {related_request}",
            f"> Related backlog: {related_backlog}",
            f"> Related task: {related_task}",
            "> Drivers: (drivers to document)",
            "> Reminder: Update status, linked refs, decision rationale, consequences, and follow-up work when you edit this doc.",
            "",
            "# Overview",
            f"- (overview to write: the decision {title.lower()} records, in one line)",
            "",
            "# Context",
            "- (context to document)",
            "",
            "# Decision",
            "- (decision to document)",
            "",
            "# Consequences",
            "- (consequence to document)",
            "",
            "# References",
            f"- Related request: {related_request}",
            f"- Related backlog: {related_backlog}",
            f"- Related task: {related_task}",
            "",
        ]
    ).rstrip() + "\n"
    return ref, content


def _create_native_companion_docs(
    repo_root: Path,
    title: str,
    *,
    request_ref: str | None = None,
    backlog_ref: str | None = None,
    task_ref: str | None = None,
    args: argparse.Namespace,
) -> tuple[list[str], list[str]]:
    created_product_refs: list[str] = []
    created_architecture_refs: list[str] = []

    if getattr(args, "auto_create_adr", False):
        adr_ref, adr_content = _build_native_adr(
            repo_root,
            title,
            request_ref=request_ref,
            backlog_ref=backlog_ref,
            task_ref=task_ref,
        )
        adr_path = repo_root / "logics" / "architecture" / f"{adr_ref}.md"
        if not args.dry_run:
            _write_new_doc(adr_path, adr_content)
        created_architecture_refs.append(adr_ref)

    if getattr(args, "auto_create_product_brief", False):
        product_ref, product_content = _build_native_product_brief(
            repo_root,
            title,
            request_ref=request_ref,
            backlog_ref=backlog_ref,
            task_ref=task_ref,
            architecture_refs=created_architecture_refs,
        )
        product_path = repo_root / "logics" / "product" / f"{product_ref}.md"
        if not args.dry_run:
            _write_new_doc(product_path, product_content)
        created_product_refs.append(product_ref)

    return created_product_refs, created_architecture_refs


def _resolve_workflow_refs_for_companion(
    source_ref: str | None,
    *,
    request_ref: str | None = None,
    backlog_ref: str | None = None,
    task_ref: str | None = None,
) -> tuple[str | None, str | None, str | None]:
    resolved_request = request_ref
    resolved_backlog = backlog_ref
    resolved_task = task_ref

    if source_ref:
        if source_ref.startswith(f"{DOC_KINDS['request'].prefix}_"):
            resolved_request = source_ref
        elif source_ref.startswith(f"{DOC_KINDS['backlog'].prefix}_"):
            resolved_backlog = source_ref
        elif source_ref.startswith(f"{DOC_KINDS['task'].prefix}_"):
            resolved_task = source_ref
        else:
            raise SystemExit(
                "Unsupported --source-ref value. Expected a request, backlog, or task ref such as "
                "`req_001_demo`, `item_001_demo`, or `task_001_demo`."
            )

    return resolved_request, resolved_backlog, resolved_task


def _build_native_backlog_from_request(
    repo_root: Path,
    request_path: Path,
    title: str | None = None,
    *,
    product_refs: list[str] | None = None,
    architecture_refs: list[str] | None = None,
) -> tuple[str, str]:
    request_lines = request_path.read_text(encoding="utf-8").splitlines()
    request_title = title or _extract_doc_title(request_path)
    ref = _next_backlog_ref(repo_root, request_title)
    from_version = next((line.split(":", 1)[1].strip() for line in request_lines if line.strip().startswith("> From version:")), _resolved_from_version(repo_root, None))
    product_refs = product_refs or []
    architecture_refs = architecture_refs or []
    product_line = ", ".join(f"`{item}`" for item in product_refs) if product_refs else "(none yet)"
    architecture_line = ", ".join(f"`{item}`" for item in architecture_refs) if architecture_refs else "(none yet)"
    needs = _bullet_values(_section_lines(request_lines, "Needs"))
    acceptance = _bullet_values(_section_lines(request_lines, "Acceptance criteria"))
    if not needs:
        needs = [f"Deliver a bounded slice for {request_title.lower()}."]
    if not acceptance:
        acceptance = [
            "AC1: The backlog slice stays bounded and reviewable.",
            "AC2: The backlog slice preserves the request's core acceptance criteria.",
        ]
    content = "\n".join(
        [
            f"## {ref} - {request_title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            "> Complexity: High",
            "> Theme: Operator workflow and runtime integration",
            "> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.",
            "",
            "# Problem",
            *needs,
            "",
            "# Scope",
            "- In:",
            "  - one coherent delivery slice from the source request",
            "- Out:",
            "  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc",
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# AC Traceability",
            *[f"- request-AC{idx + 1} -> This backlog slice. Proof: {item}" for idx, item in enumerate(acceptance)],
            "",
            "# Decision framing",
            "- Product framing: Not needed",
            "- Product signals: (none detected)",
            "- Product follow-up: No product brief follow-up is expected based on current signals.",
            "- Architecture framing: Not needed",
            "- Architecture signals: (none detected)",
            "- Architecture follow-up: No architecture decision follow-up is expected based on current signals.",
            "",
            "# Links",
            f"- Product brief(s): {product_line}",
            f"- Architecture decision(s): {architecture_line}",
            f"- Request: `{request_path.relative_to(repo_root).as_posix()}`",
            "- Primary task(s): (none yet)",
            "",
            "# AI Context",
            f"- Summary: {request_title}",
            f"- Keywords: backlog-groom, request, {request_title.lower()}, bounded slice",
            f"- Use when: Use when implementing or reviewing the delivery slice for {request_title}.",
            "- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.",
            "",
            "# Priority",
            "- Priority: Medium",
            "- Rationale: Default until groomed.",
            "",
            "# Notes",
            f"- Hybrid rationale: Derived from request `{request_path.stem}` and kept bounded to one coherent delivery slice.",
            f"- Source file: `{request_path.relative_to(repo_root).as_posix()}`.",
            "- Generated locally by logics-manager.",
            "",
        ]
    ).rstrip() + "\n"
    return ref, _with_workflow_mermaid_overview("backlog", content)


def _build_native_task_from_backlog(
    repo_root: Path,
    backlog_path: Path,
    title: str | None = None,
    *,
    request_refs: list[str] | None = None,
    product_refs: list[str] | None = None,
    architecture_refs: list[str] | None = None,
) -> tuple[str, str]:
    backlog_lines = backlog_path.read_text(encoding="utf-8").splitlines()
    backlog_title = title or _extract_doc_title(backlog_path)
    ref = _next_task_ref(repo_root, backlog_title)
    from_version = next((line.split(":", 1)[1].strip() for line in backlog_lines if line.strip().startswith("> From version:")), _resolved_from_version(repo_root, None))
    backlog_ref = backlog_path.stem
    request_refs = request_refs or []
    product_refs = product_refs or []
    architecture_refs = architecture_refs or []
    request_line = ", ".join(f"`{item}`" for item in request_refs) if request_refs else "(none yet)"
    product_line = ", ".join(f"`{item}`" for item in product_refs) if product_refs else "(none yet)"
    architecture_line = ", ".join(f"`{item}`" for item in architecture_refs) if architecture_refs else "(none yet)"
    acceptance = _bullet_values(_section_lines(backlog_lines, "Acceptance criteria"))
    if not acceptance:
        acceptance = [
            "AC1: The task remains bounded and executable.",
            "AC2: The task preserves the backlog item's delivery intent.",
        ]
    content = "\n".join(
        [
            f"## {ref} - {backlog_title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            "> Complexity: Medium",
            "> Theme: Implementation delivery",
            "> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.",
            "",
            "# Definition of Done (DoD)",
            "- [ ] The backlog scope is implemented.",
            "- [ ] Acceptance criteria are covered.",
            "- [ ] Validation passes.",
            "- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.",
            "",
            "# Backlog",
            f"- `{backlog_ref}`",
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# Plan",
            f"- [ ] Use `python3 -m logics_manager flow progress task {ref}.md --progress <n>%` during multi-wave work.",
            f"- [ ] Run `python3 -m logics_manager flow finish task {ref}.md` after implementation.",
            "",
            "# Validation",
            "- (no validation recorded yet)",
            "",
            "# Report",
            "- Not started.",
            "",
            "# AI Context",
            f"- Summary: Implement {backlog_title.lower()}.",
            "- Keywords: task, implementation, backlog, runtime, python",
            "- Use when: You need a bounded implementation task for a backlog item.",
            "- Skip when: The work is still at the request or backlog shaping stage.",
            "",
            "# Links",
            f"- Request: {request_line}",
            f"- Product brief(s): {product_line}",
            f"- Architecture decision(s): {architecture_line}",
            "",
        ]
    ).rstrip() + "\n"
    return ref, content

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager flow",
        description="Create Logics docs with consistent IDs, templates, and workflow transitions.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    new_parser = sub.add_parser("new", help="Create a new Logics doc from a template.")
    new_sub = new_parser.add_subparsers(dest="kind", required=True)
    for kind in DOC_KINDS:
        kind_parser = new_sub.add_parser(kind, help=f"Create a new {kind} doc.")
        kind_parser.add_argument("--title", required=True)
        kind_parser.add_argument("--slug", help="Override slug derived from the title.")
        if kind == "request":
            kind_parser.add_argument("--fixture", action="store_true", help="Generate a compact fixture-friendly request.")
            kind_parser.add_argument("--smoke-test", action="store_true", dest="fixture", help="Alias for --fixture.")
        _add_common_doc_args(kind_parser, kind)
        kind_parser.set_defaults(func=cmd_new)

    statuses_parser = sub.add_parser("statuses", help="Report the status vocabulary and settable indicators per document kind.")
    statuses_parser.add_argument("--format", choices=("text", "json"), default="text")
    statuses_parser.set_defaults(func=cmd_statuses)

    list_parser = sub.add_parser("list", help="List workflow docs that are still active.")
    list_parser.add_argument("--kind", choices=LIST_KIND_CHOICES, default="all")
    list_parser.add_argument("--format", choices=("text", "json"), default="text")
    list_parser.set_defaults(func=cmd_list)

    show_parser = sub.add_parser("show", help="Show a bounded workflow document view.")
    show_parser.add_argument("source")
    show_parser.add_argument("--max-chars", type=int, default=4000)
    show_parser.add_argument("--section", action="append", default=[])
    show_parser.add_argument("--format", choices=("text", "json"), default="text")
    show_parser.set_defaults(func=cmd_show)

    companion_parser = sub.add_parser("companion", help="Create a companion doc from the integrated runtime.")
    companion_sub = companion_parser.add_subparsers(dest="kind", required=True)
    for kind in ("product", "architecture"):
        kind_parser = companion_sub.add_parser(kind, help=f"Create a {kind} companion doc.")
        kind_parser.add_argument("--title", required=True)
        kind_parser.add_argument("--source-ref")
        kind_parser.add_argument("--request-ref")
        kind_parser.add_argument("--backlog-ref")
        kind_parser.add_argument("--task-ref")
        kind_parser.add_argument("--format", choices=("text", "json"), default="text")
        kind_parser.add_argument("--dry-run", action="store_true")
        kind_parser.set_defaults(func=cmd_companion)

    roadmap_parser = sub.add_parser("roadmap", help="Create, inspect, or validate versioned roadmap docs.")
    roadmap_sub = roadmap_parser.add_subparsers(dest="roadmap_command", required=True)
    roadmap_propose = roadmap_sub.add_parser("propose", help="Create a roadmap companion doc.")
    roadmap_propose.add_argument("--title", required=True)
    roadmap_propose.add_argument("--milestone", action="append", default=[], help="Versioned milestone such as `0.1: MVP`. Repeatable.")
    roadmap_propose.add_argument("--product-ref")
    roadmap_propose.add_argument("--request-ref", action="append", default=[])
    roadmap_propose.add_argument("--backlog-ref", action="append", default=[])
    roadmap_propose.add_argument("--task-ref", action="append", default=[])
    roadmap_propose.add_argument("--format", choices=("text", "json"), default="text")
    roadmap_propose.add_argument("--dry-run", action="store_true")
    roadmap_propose.set_defaults(func=cmd_roadmap_propose)

    roadmap_show = roadmap_sub.add_parser("show", help="Show a bounded roadmap document view.")
    roadmap_show.add_argument("source")
    roadmap_show.add_argument("--max-chars", type=int, default=4000)
    roadmap_show.add_argument("--format", choices=("text", "json"), default="text")
    roadmap_show.set_defaults(func=cmd_roadmap_show)

    roadmap_validate = roadmap_sub.add_parser("validate", help="Validate a roadmap document contract.")
    roadmap_validate.add_argument("source")
    roadmap_validate.add_argument("--format", choices=("text", "json"), default="text")
    roadmap_validate.set_defaults(func=cmd_roadmap_validate)

    deliver_parser = sub.add_parser("deliver", help="Create a delivery chain from a product brief.")
    deliver_parser.add_argument("--from-product", required=True)
    deliver_parser.add_argument("--title")
    deliver_parser.add_argument("--finish", action="store_true")
    deliver_parser.add_argument("--format", choices=("text", "json"), default="text")
    deliver_parser.add_argument("--dry-run", action="store_true")
    deliver_parser.set_defaults(func=cmd_deliver)

    scaffold_parser = sub.add_parser("scaffold", help="Create development-ready workflow corpora from structured input.")
    scaffold_sub = scaffold_parser.add_subparsers(dest="scaffold_kind", required=True)
    request_chain = scaffold_sub.add_parser(
        "request-chain",
        help="Create a request/product/backlog/task chain from JSON input.",
        description=SCAFFOLD_REQUEST_CHAIN_SCHEMA_HELP,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    request_chain.add_argument("--input", help="Repo-relative or absolute JSON input file.")
    request_chain.add_argument("--context-pack", help="Optional repo-relative JSON context-pack output path.")
    request_chain.add_argument("--print-schema", action="store_true", help="Print the input JSON schema and exit.")
    request_chain.add_argument("--example", action="store_true", help="Print a minimal input JSON skeleton and exit.")
    request_chain.add_argument("--validate", action="store_true", help="Validate the new request inline and print a ready-to-dev summary.")
    request_chain.add_argument("--format", choices=("text", "json"), default="text")
    request_chain.add_argument("--dry-run", action="store_true")
    request_chain.set_defaults(func=cmd_scaffold_request_chain)

    validate_parser = sub.add_parser("validate", help="Combine lint/audit findings and classify deterministic fixes.")
    validate_parser.add_argument("sources", nargs="*", help="Optional workflow refs or paths to scope diagnostics.")
    validate_parser.add_argument("--fixable", action="store_true", help="Only show diagnostics with a known deterministic repair.")
    validate_parser.add_argument("--explain", action="store_true", help="Include fixability explanations in JSON output.")
    validate_parser.add_argument("--apply-fixes", action="store_true", help="Apply safe deterministic fixes scoped to selected refs.")
    validate_parser.add_argument("--proof", help="Explicit proof text required for AC traceability fixes.")
    validate_parser.add_argument("--proof-source", help="Optional source reference for proof text.")
    validate_parser.add_argument("--format", choices=("text", "json"), default="text")
    validate_parser.add_argument("--dry-run", action="store_true")
    validate_parser.set_defaults(func=cmd_validate)

    validate_closeout_parser = sub.add_parser("validate-closeout", help="Preflight whether a task can be safely closed.")
    validate_closeout_parser.add_argument("source")
    validate_closeout_parser.add_argument("--format", choices=("text", "json"), default="text")
    validate_closeout_parser.set_defaults(func=cmd_validate_closeout)

    start_parser = sub.add_parser("start", help="Mark a workflow doc as in progress and record an owner.")
    start_parser.add_argument("source")
    start_parser.add_argument("--owner")
    start_parser.add_argument("--format", choices=("text", "json"), default="text")
    start_parser.add_argument("--dry-run", action="store_true")
    start_parser.set_defaults(func=cmd_start)

    repair_parser = sub.add_parser("repair", help="Apply deterministic closeout repairs.")
    repair_sub = repair_parser.add_subparsers(dest="repair_kind", required=True)

    repair_gates = repair_sub.add_parser("gates", help="Check task and linked request gate checkboxes.")
    repair_gates.add_argument("source")
    repair_gates.add_argument("--verify-closeout")
    repair_gates.add_argument("--format", choices=("text", "json"), default="text")
    repair_gates.add_argument("--dry-run", action="store_true")
    repair_gates.set_defaults(func=cmd_repair_gates)

    repair_ac = repair_sub.add_parser("ac-traceability", help="Add missing AC traceability entries.")
    repair_ac.add_argument("source")
    repair_ac.add_argument("--proof")
    repair_ac.add_argument("--proof-source")
    repair_ac.add_argument("--verify-closeout")
    repair_ac.add_argument("--format", choices=("text", "json"), default="text")
    repair_ac.add_argument("--dry-run", action="store_true")
    repair_ac.set_defaults(func=cmd_repair_ac_traceability)

    repair_links = repair_sub.add_parser("links", help="Repair linked backlog/product references for a task.")
    repair_links.add_argument("source")
    repair_links.add_argument("--verify-closeout")
    repair_links.add_argument("--format", choices=("text", "json"), default="text")
    repair_links.add_argument("--dry-run", action="store_true")
    repair_links.set_defaults(func=cmd_repair_links)

    repair_mermaid = repair_sub.add_parser("mermaid", help="Refresh legacy workflow Mermaid signatures when blocks are present.")
    repair_mermaid.add_argument("--refs", nargs="+", required=True)
    repair_mermaid.add_argument("--verify-closeout")
    repair_mermaid.add_argument("--format", choices=("text", "json"), default="text")
    repair_mermaid.add_argument("--dry-run", action="store_true")
    repair_mermaid.set_defaults(func=cmd_repair_mermaid)

    closeout_parser = sub.add_parser("closeout", help="Append validation, repair deterministic gaps, finish, and optionally validate/index.")
    closeout_parser.add_argument("source")
    closeout_parser.add_argument("--validation", action="append", default=[])
    closeout_parser.add_argument("--validation-command")
    closeout_parser.add_argument("--validation-result", default="passed")
    closeout_parser.add_argument("--validation-note")
    closeout_parser.add_argument("--index", action="store_true")
    closeout_parser.add_argument("--lint", action="store_true")
    closeout_parser.add_argument("--audit", action="store_true")
    closeout_parser.add_argument("--format", choices=("text", "json"), default="text")
    closeout_parser.add_argument("--dry-run", action="store_true")
    closeout_parser.set_defaults(func=cmd_closeout)

    promote_parser = sub.add_parser("promote", help="Promote between Logics stages.")
    promote_sub = promote_parser.add_subparsers(dest="promotion", required=True)

    r2b = promote_sub.add_parser("request-to-backlog", help="Create a backlog slice from a request.")
    r2b.add_argument("source")
    _add_common_doc_args(r2b, "backlog")
    r2b.set_defaults(func=cmd_promote_request_to_backlog)

    b2t = promote_sub.add_parser("backlog-to-task", help="Create a task from a backlog item.")
    b2t.add_argument("source")
    _add_common_doc_args(b2t, "task")
    b2t.set_defaults(func=cmd_promote_backlog_to_task)

    split_parser = sub.add_parser("split", help="Split a request or backlog into bounded children.")
    split_sub = split_parser.add_subparsers(dest="split_kind", required=True)

    split_request = split_sub.add_parser("request", help="Split a request into multiple backlog items.")
    split_request.add_argument("source")
    split_request.add_argument("--title", action="append", nargs="+")
    split_request.add_argument("--slice", action="append", help="AC-aware slice in `Title:AC1,AC2` syntax. Repeat for multiple slices.")
    split_request.add_argument("--orchestration-task", help="Create a linked orchestration task with this title.")
    split_request.add_argument("--orchestration-summary", help="Summary text for the generated orchestration task.")
    _add_common_doc_args(split_request, "backlog")
    split_request.set_defaults(func=cmd_split_request)

    split_backlog = split_sub.add_parser("backlog", help="Split a backlog item into multiple tasks.")
    split_backlog.add_argument("source")
    split_backlog.add_argument("--title", action="append", nargs="+", required=True)
    _add_common_doc_args(split_backlog, "task")
    split_backlog.set_defaults(func=cmd_split_backlog)

    close_parser = sub.add_parser("close", help="Close a request, backlog item, or task and propagate transitions.")
    close_sub = close_parser.add_subparsers(dest="kind", required=True)
    for kind in ("request", "backlog", "task"):
        kind_parser = close_sub.add_parser(kind, help=f"Close a {kind} doc.")
        kind_parser.add_argument("source")
        kind_parser.add_argument("--format", choices=("text", "json"), default="text")
        kind_parser.add_argument("--dry-run", action="store_true")
        kind_parser.set_defaults(func=cmd_close)

    withdraw_parser = sub.add_parser("withdraw", help="Mark a workflow doc obsolete and record its replacement.")
    withdraw_parser.add_argument("source")
    withdraw_parser.add_argument("--superseded-by", required=True)
    withdraw_parser.add_argument("--format", choices=("text", "json"), default="text")
    withdraw_parser.add_argument("--dry-run", action="store_true")
    withdraw_parser.set_defaults(func=cmd_withdraw)

    finish_parser = sub.add_parser("finish", help="Finish a task and verify the closure chain.")
    finish_sub = finish_parser.add_subparsers(dest="kind", required=True)
    finish_task = finish_sub.add_parser("task", help="Finish a task.")
    finish_task.add_argument("source")
    finish_task.add_argument("--format", choices=("text", "json"), default="text")
    finish_task.add_argument("--dry-run", action="store_true")
    finish_task.set_defaults(func=cmd_finish_task)

    progress_parser = sub.add_parser("progress", help="Update managed workflow progress and propagate parent state.")
    progress_sub = progress_parser.add_subparsers(dest="kind", required=True)
    progress_task = progress_sub.add_parser("task", help="Update task progress and linked backlog item progress.")
    progress_task.add_argument("source")
    progress_task.add_argument("--progress", required=True)
    progress_task.add_argument("--format", choices=("text", "json"), default="text")
    progress_task.add_argument("--dry-run", action="store_true")
    progress_task.set_defaults(func=cmd_progress_task)

    return parser


def cmd_new(args: argparse.Namespace) -> dict[str, object]:
    doc_kind = DOC_KINDS[args.kind]
    repo_root = _find_repo_root(Path.cwd())
    planned = _plan_doc(repo_root, doc_kind.directory, doc_kind.prefix, args.slug or args.title, dry_run=args.dry_run)
    payload: dict[str, object] = {
        "command": "new",
        "kind": doc_kind.kind,
        "ref": planned.ref,
        "path": planned.path.relative_to(repo_root).as_posix(),
        "created_refs": [planned.ref],
        "changed_files": [planned.path.relative_to(repo_root).as_posix()],
        "validation_suggestions": [
            f"logics-manager flow validate {planned.ref} --format json",
            "logics-manager lint --require-status",
        ],
        "next_actions": [
            f"Review `{planned.ref}`.",
            f"Run `logics-manager flow validate {planned.ref}` before closing related work.",
        ],
        "next_action": f"Review `{planned.ref}` and run flow validation before closing related work.",
        "dry_run": args.dry_run,
    }
    if doc_kind.kind == "request":
        content = _build_native_request_doc(repo_root, planned.ref, args.title, args)
        if not args.dry_run:
            _write_new_doc(planned.path, content)
            if args.format != "json":
                print(f"Wrote {planned.path}")
        else:
            if args.format != "json":
                preview = content if len(content) <= 2000 else content[:2000] + "\n...\n"
                print(f"[dry-run] would write: {planned.path}")
                print(preview)
        if args.format == "json":
            print_payload(payload, args.format)
        else:
            print(f"Created {doc_kind.kind}: {payload['path']}")
        return payload
    if doc_kind.kind == "backlog":
        if not args.dry_run:
            _ensure_new_doc_paths_available([planned.path])
        product_refs, architecture_refs = _create_native_companion_docs(
            repo_root,
            args.title,
            request_ref=None,
            backlog_ref=planned.ref,
            task_ref=None,
            args=args,
        )
        content = _build_native_backlog_doc(
            repo_root,
            planned.ref,
            args.title,
            args,
            request_ref=None,
            product_refs=product_refs,
            architecture_refs=architecture_refs,
        )
    elif doc_kind.kind == "task":
        if not args.dry_run:
            _ensure_new_doc_paths_available([planned.path])
        product_refs, architecture_refs = _create_native_companion_docs(
            repo_root,
            args.title,
            request_ref=None,
            backlog_ref=None,
            task_ref=planned.ref,
            args=args,
        )
        content = _build_native_task_doc(
            repo_root,
            planned.ref,
            args.title,
            args,
            backlog_ref=None,
            request_refs=[],
            product_refs=product_refs,
            architecture_refs=architecture_refs,
        )
    else:
        raise SystemExit(f"Unsupported doc kind `{doc_kind.kind}` for native creation.")

    if not args.dry_run:
        _write_new_doc(planned.path, content)
        if args.format != "json":
            print(f"Wrote {planned.path}")
    else:
        if args.format != "json":
            preview = content if len(content) <= 2000 else content[:2000] + "\n...\n"
            print(f"[dry-run] would write: {planned.path}")
            print(preview)

    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Created {doc_kind.kind}: {payload['path']}")
    return payload


def cmd_statuses(args: argparse.Namespace) -> dict[str, object]:
    """Report each kind's status vocabulary and mutable indicators up front.

    Both were previously reachable only by guessing wrong, which is where most of
    the field session's lost time went.
    """
    from ..lint import KINDS
    from ..sync import approved_indicators_for_kind

    kinds = {
        name: {
            "statuses": list(spec.allowed_statuses),
            "mutable_indicators": list(approved_indicators_for_kind(name)),
            "required_indicators": list(spec.required_indicators),
        }
        for name, spec in KINDS.items()
    }
    payload = {"command": "statuses", "kinds": kinds}
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        for name, spec in kinds.items():
            print(f"{name}:")
            print(f"- statuses: {', '.join(spec['statuses'])}")
            print(f"- settable indicators: {', '.join(spec['mutable_indicators']) or 'none'}")
            print(f"- required indicators: {', '.join(spec['required_indicators'])}")
    return payload


def cmd_list(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = flow_list_payload(repo_root, kind=args.kind)
    print(render_flow_list(repo_root, kind=args.kind, output_format=args.format))
    return payload


def cmd_show(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    max_chars = args.max_chars if args.max_chars > 0 else 4000
    payload = read_logics_doc_payload(repo_root, args.source, max_chars=min(max_chars, 12000), sections=args.section or None)
    if args.format == "json":
        print_payload({"command": "show", **payload}, args.format)
    else:
        print(f"{payload['ref']} ({payload['kind']}): {payload['title']}")
        print(f"- path: {payload['path']}")
        print(f"- status: {payload['status']}")
        print(f"- truncated: {payload['truncated']}")
        print("")
        print(str(payload["content"]).rstrip())
    return payload


def cmd_companion(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    request_ref, backlog_ref, task_ref = _resolve_workflow_refs_for_companion(
        getattr(args, "source_ref", None),
        request_ref=getattr(args, "request_ref", None),
        backlog_ref=getattr(args, "backlog_ref", None),
        task_ref=getattr(args, "task_ref", None),
    )

    if args.kind == "product":
        ref, content = _build_native_product_brief(
            repo_root,
            args.title,
            request_ref=request_ref,
            backlog_ref=backlog_ref,
            task_ref=task_ref,
        )
        planned_path = repo_root / "logics" / "product" / f"{ref}.md"
    elif args.kind == "architecture":
        ref, content = _build_native_adr(
            repo_root,
            args.title,
            request_ref=request_ref,
            backlog_ref=backlog_ref,
            task_ref=task_ref,
        )
        planned_path = repo_root / "logics" / "architecture" / f"{ref}.md"
    else:
        raise SystemExit(f"Unsupported companion kind `{args.kind}`.")

    if not args.dry_run:
        _write_new_doc(planned_path, content)
        if args.format != "json":
            print(f"Wrote {planned_path}")
    else:
        if args.format != "json":
            preview = content if len(content) <= 2000 else content[:2000] + "\n...\n"
            print(f"[dry-run] would write: {planned_path}")
            print(preview)

    payload = {
        "command": "companion",
        "kind": args.kind,
        "ref": ref,
        "path": planned_path.relative_to(repo_root).as_posix(),
        "request_ref": request_ref,
        "backlog_ref": backlog_ref,
        "task_ref": task_ref,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"{'Would create' if args.dry_run else 'Created'} companion doc: {payload['path']}")
    return payload


def cmd_roadmap_propose(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    ref, content = _build_native_roadmap(
        repo_root,
        args.title,
        milestones=args.milestone,
        product_ref=args.product_ref,
        request_refs=args.request_ref,
        backlog_refs=args.backlog_ref,
        task_refs=args.task_ref,
    )
    planned_path = repo_root / "logics" / "roadmap" / f"{ref}.md"
    if not args.dry_run:
        _write_new_doc(planned_path, content)
        if args.format != "json":
            print(f"Wrote {planned_path}")
    elif args.format != "json":
        preview = content if len(content) <= 2000 else content[:2000] + "\n...\n"
        print(f"[dry-run] would write: {planned_path}")
        print(preview)

    payload = {
        "command": "roadmap propose",
        "kind": "roadmap",
        "ref": ref,
        "path": planned_path.relative_to(repo_root).as_posix(),
        "milestones": [version for version, _title in _split_milestones(args.milestone)],
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"{'Would create' if args.dry_run else 'Created'} roadmap: {payload['path']}")
    return payload


def cmd_roadmap_show(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    path = _resolve_roadmap_source(repo_root, args.source)
    content = path.read_text(encoding="utf-8")
    lines = content.splitlines()
    title = _extract_doc_title(path)
    payload = {
        "command": "roadmap show",
        "kind": "roadmap",
        "ref": path.stem,
        "path": path.relative_to(repo_root).as_posix(),
        "title": title,
        "status": _indicator_value_from_lines(lines, "Status") or "",
        "content": content[: max(1, min(args.max_chars, 12000))],
        "truncated": len(content) > max(1, min(args.max_chars, 12000)),
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"{payload['ref']} (roadmap): {payload['title']}")
        print(f"- path: {payload['path']}")
        print(f"- status: {payload['status']}")
        print("")
        print(str(payload["content"]).rstrip())
    return payload


def cmd_roadmap_validate(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = roadmap_validate_payload(repo_root, args.source)
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Roadmap validation: {'OK' if payload['ok'] else 'FAILED'}")
        print(f"- path: {payload['path']}")
        print(f"- milestones: {payload['milestone_count']}")
        for heading in payload["unparsed_headings"]:
            print(f"- warning: heading not parsed as a milestone: {heading}")
        for issue in payload["issues"]:
            print(f"- {issue}")
    return payload


def _deliver_builder_args(args: argparse.Namespace) -> argparse.Namespace:
    return argparse.Namespace(
        from_version=None,
        understanding="90%",
        confidence="85%",
        status="Ready",
        complexity="Medium",
        theme="Operator workflow",
        progress="0%",
        auto_create_product_brief=False,
        auto_create_adr=False,
        dry_run=args.dry_run,
        fixture=False,
    )


def cmd_deliver(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    product_path = _resolve_product_source(repo_root, args.from_product)
    product_ref = product_path.stem
    title = args.title or _extract_doc_title(product_path)
    build_args = _deliver_builder_args(args)

    request_planned = _plan_doc(repo_root, DOC_KINDS["request"].directory, DOC_KINDS["request"].prefix, title, dry_run=args.dry_run)
    backlog_ref = _next_backlog_ref(repo_root, title)
    task_ref = _next_task_ref(repo_root, title)
    backlog_path = repo_root / DOC_KINDS["backlog"].directory / f"{backlog_ref}.md"
    task_path = repo_root / DOC_KINDS["task"].directory / f"{task_ref}.md"

    if not args.dry_run:
        _ensure_new_doc_paths_available([request_planned.path, backlog_path, task_path])

    request_content = _build_native_request_doc(repo_root, request_planned.ref, title, build_args)
    backlog_content = _build_native_backlog_doc(
        repo_root,
        backlog_ref,
        title,
        build_args,
        request_ref=request_planned.ref,
        product_refs=[product_ref],
        architecture_refs=[],
    )
    task_content = _build_native_task_doc(
        repo_root,
        task_ref,
        title,
        build_args,
        backlog_ref=backlog_ref,
        request_refs=[request_planned.ref],
        product_refs=[product_ref],
        architecture_refs=[],
    )

    if not args.dry_run:
        _write_new_doc(request_planned.path, request_content)
        _write_new_doc(backlog_path, backlog_content)
        _write_new_doc(task_path, task_content)
        _append_doc_section_bullets(request_planned.path, "Backlog", [f"`{backlog_ref}`"], dry_run=False)
        _append_doc_section_bullets(backlog_path, "Tasks", [f"`{task_ref}`"], dry_run=False)
        _remove_section_placeholder_bullets(request_planned.path, "Backlog", {"- none"}, dry_run=False)
        backlog_lines = backlog_path.read_text(encoding="utf-8").splitlines()
        backlog_lines = _replace_or_append_prefixed_section_bullet(backlog_lines, "Links", "Primary task(s)", f"`{task_ref}`")
        backlog_path.write_text("\n".join(backlog_lines).rstrip() + "\n", encoding="utf-8")
        _update_request_product_link(request_planned.path, product_ref, dry_run=False)
        _mark_section_checkboxes_done(request_planned.path, "Definition of Ready (DoR)", dry_run=False)
        _update_product_delivery_links(
            product_path,
            request_ref=request_planned.ref,
            backlog_ref=backlog_ref,
            task_ref=task_ref,
            dry_run=False,
        )
        repair_mermaid_payload(repo_root, [request_planned.ref, backlog_ref, task_ref], dry_run=False)
        if args.finish:
            _close_chain_for_kind(repo_root, task_path, DOC_KINDS["task"], dry_run=False, quiet=args.format == "json")

    payload = {
        "command": "deliver",
        "from_product": product_path.relative_to(repo_root).as_posix(),
        "product_ref": product_ref,
        "created_request_ref": request_planned.ref,
        "created_request_path": request_planned.path.relative_to(repo_root).as_posix(),
        "created_backlog_ref": backlog_ref,
        "created_backlog_path": backlog_path.relative_to(repo_root).as_posix(),
        "created_task_ref": task_ref,
        "created_task_path": task_path.relative_to(repo_root).as_posix(),
        "finished": bool(args.finish and not args.dry_run),
        "dry_run": args.dry_run,
    }

    if args.format == "json":
        print_payload(payload, args.format)
    elif args.dry_run:
        print(f"[dry-run] would create delivery chain from product: {product_path.relative_to(repo_root)}")
        print(f"- request: {payload['created_request_path']}")
        print(f"- backlog: {payload['created_backlog_path']}")
        print(f"- task: {payload['created_task_path']}")
    else:
        print(f"Created delivery chain from product: {product_path.relative_to(repo_root)}")
        print(f"- request: {payload['created_request_path']}")
        print(f"- backlog: {payload['created_backlog_path']}")
        print(f"- task: {payload['created_task_path']}")
    return payload


def cmd_validate_closeout(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = validate_closeout_payload(repo_root, args.source)
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        status = "OK" if payload["ok"] else "FAILED"
        print(f"Closeout preflight: {status} for {payload['source']}")
        if payload["issues"]:
            for issue in payload["issues"]:
                print(f"- {issue['code']}: {issue['message']} ({issue['path']})")
                if "repair_command" in issue:
                    print(f"  repair: {issue['repair_command']}")
        else:
            print("- no blocking closeout issues found")
    return payload


def _flow_validate_scope(repo_root: Path, sources: list[str]) -> tuple[set[str], list[str]]:
    if not sources:
        return set(), []
    scoped_paths: set[str] = set()
    scoped_refs: list[str] = []
    for source in sources:
        path, _kind = _resolve_any_workflow_source(repo_root, source)
        scoped_paths.add(path.relative_to(repo_root).as_posix())
        scoped_refs.append(path.stem)
    return scoped_paths, scoped_refs


def _scoped_findings(findings: list[dict[str, object]], scoped_paths: set[str]) -> list[dict[str, object]]:
    if not scoped_paths:
        return list(findings)
    return [finding for finding in findings if str(finding.get("path") or "") in scoped_paths]

def _validate_repair_kind(finding: dict[str, object]) -> str | None:
    command = str(finding.get("repair_command") or "")
    code = str(finding.get("code") or "")
    message = str(finding.get("message") or "")
    if "refresh-mermaid-signatures" in command or "Mermaid context signature" in message or code == "mermaid_signature_stale":
        return "mermaid"
    if "repair ac-traceability" in command or code in {"ac_missing_item_traceability", "ac_missing_task_traceability"}:
        return "ac-traceability"
    if "repair links" in command or code in {"backlog_missing_task_link", "companion_link_missing"}:
        return "links"
    if "repair gates" in command or code in {"task_gate_unchecked", "task_missing_done_gate", "request_dor_unchecked"}:
        return "gates"
    return None


def _validate_finding(source: str, finding: dict[str, object], *, explain: bool) -> dict[str, object]:
    severity = str(finding.get("severity") or "info")
    repair_kind = _validate_repair_kind(finding)
    fixable = repair_kind in {"mermaid", "links", "gates", "ac-traceability"}
    # req_276: closeout-deferred traceability proofs cannot exist before the work is done,
    # so they are informational ("deferred"), not actionable fixable findings. A freshly
    # scaffolded request then validates clean instead of looking like it has fixable problems.
    deferred = repair_kind == "ac-traceability" and "deferred" in str(finding.get("message") or "")
    if deferred:
        fixable = False
    unsafe_reason = None
    if repair_kind == "ac-traceability" and not deferred:
        unsafe_reason = "requires explicit proof to avoid inventing implementation evidence"
    payload: dict[str, object] = {
        "source": source,
        "path": str(finding.get("path") or ""),
        "severity": severity,
        "category": "deferred" if deferred else "blocking" if severity == "blocking" else severity if severity in {"warning", "strict"} else "informational",
        "message": str(finding.get("message") or ""),
        "fixable": fixable,
        "unsafe": bool(unsafe_reason),
    }
    if finding.get("code"):
        payload["code"] = finding["code"]
    if finding.get("repair_command"):
        payload["repair_command"] = finding["repair_command"]
    if repair_kind:
        payload["repair_kind"] = repair_kind
    if unsafe_reason:
        payload["unsafe_reason"] = unsafe_reason
    if explain:
        payload["explanation"] = "safe deterministic repair available" if fixable and not unsafe_reason else unsafe_reason or "reported by lint/audit"
    return payload


def flow_validate_payload(
    repo_root: Path,
    sources: list[str],
    *,
    fixable_only: bool,
    explain: bool,
    apply_fixes: bool,
    dry_run: bool,
    proof: str | None,
    proof_source: str | None,
) -> dict[str, object]:
    scoped_paths, scoped_refs = _flow_validate_scope(repo_root, sources)
    lint_result = lint_payload(repo_root, require_status=True)
    audit_result = audit_payload(repo_root, legacy_cutoff_version="1.1.0", group_by_doc=True)
    raw_findings = [
        *[("lint", item) for item in _scoped_findings(list(lint_result.get("findings", [])), scoped_paths)],
        *[("audit", item) for item in _scoped_findings(list(audit_result.get("findings", [])), scoped_paths)],
    ]
    findings = [_validate_finding(source, finding, explain=explain) for source, finding in raw_findings]
    if fixable_only:
        findings = [finding for finding in findings if finding.get("fixable")]

    repairs: list[dict[str, object]] = []
    refused: list[dict[str, object]] = []
    if apply_fixes:
        repair_kinds = {str(finding.get("repair_kind")) for finding in findings if finding.get("fixable")}
        if "mermaid" in repair_kinds:
            repair_refs = scoped_refs or sorted({Path(str(finding.get("path"))).stem for finding in findings if finding.get("repair_kind") == "mermaid"})
            repairs.append(repair_mermaid_payload(repo_root, repair_refs, dry_run=dry_run))
        if "links" in repair_kinds:
            for finding in findings:
                if finding.get("repair_kind") != "links":
                    continue
                try:
                    path, kind = _resolve_any_workflow_source(repo_root, str(finding.get("path")))
                except SystemExit:
                    continue
                if kind == "task":
                    repairs.append(repair_links_payload(repo_root, path.stem, dry_run=dry_run))
        if "gates" in repair_kinds:
            for finding in findings:
                if finding.get("repair_kind") != "gates":
                    continue
                try:
                    path, kind = _resolve_any_workflow_source(repo_root, str(finding.get("path")))
                except SystemExit:
                    continue
                if kind == "task":
                    repairs.append(repair_gates_payload(repo_root, path.stem, dry_run=dry_run))
        if "ac-traceability" in repair_kinds:
            if proof and proof.strip():
                repair_refs = scoped_refs or sorted({Path(str(finding.get("path"))).stem for finding in findings if finding.get("repair_kind") == "ac-traceability"})
                for ref in repair_refs:
                    try:
                        _path, kind = _resolve_any_workflow_source(repo_root, ref)
                    except SystemExit:
                        continue
                    if kind == "request":
                        repairs.append(repair_ac_traceability_payload(repo_root, ref, dry_run=dry_run, proof=proof, proof_source=proof_source))
            else:
                refused.append({"repair_kind": "ac-traceability", "reason": "explicit --proof is required before applying AC traceability repairs"})

    blocking_count = len([finding for finding in findings if finding.get("category") == "blocking"])
    warning_count = len([finding for finding in findings if finding.get("category") == "warning"])
    deferred_count = len([finding for finding in findings if finding.get("category") == "deferred"])
    next_actions = ["Apply safe fixes or inspect blocking findings."] if blocking_count or refused else ["Validation findings are clear for selected refs."]
    if len([finding for finding in findings if finding.get("fixable") and not finding.get("unsafe")]):
        next_actions.append("Run with `--apply-fixes` to apply deterministic safe repairs.")
    if refused:
        next_actions.append("Provide explicit `--proof` before applying AC traceability repairs.")
    return {
        "command": "validate",
        "ok": blocking_count == 0 and not refused,
        "refs": scoped_refs,
        "paths": sorted(scoped_paths),
        "finding_count": len(findings),
        "blocking_count": blocking_count,
        "warning_count": warning_count,
        "deferred_count": deferred_count,
        "fixable_count": len([finding for finding in findings if finding.get("fixable")]),
        "unsafe_count": len([finding for finding in findings if finding.get("unsafe")]) + len(refused),
        "findings": findings,
        "repairs": repairs,
        "refused_repairs": refused,
        "dry_run": dry_run,
        "applied_fixes": bool(apply_fixes and not dry_run),
        "next_actions": next_actions,
        "next_action": next_actions[0],
    }


def cmd_validate(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = flow_validate_payload(
        repo_root,
        args.sources,
        fixable_only=args.fixable,
        explain=args.explain,
        apply_fixes=args.apply_fixes,
        dry_run=args.dry_run,
        proof=args.proof,
        proof_source=args.proof_source,
    )
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        action = "would apply" if args.dry_run and args.apply_fixes else "applied" if args.apply_fixes else "found"
        print(f"Flow validate: {action} {payload['finding_count']} finding(s).")
        for finding in payload["findings"]:
            marker = "fixable" if finding.get("fixable") else str(finding.get("category") or "info")
            print(f"- {marker}: {finding['message']} ({finding['path']})")
        for refused in payload["refused_repairs"]:
            print(f"- refused {refused['repair_kind']}: {refused['reason']}")
        print(f"Next action: {payload['next_action']}")
    return payload


def _print_repair_payload(payload: dict[str, object], output_format: str) -> None:
    if output_format == "json":
        print_payload(payload, output_format)
        return
    action = "would change" if payload.get("dry_run") else "changed"
    changed_files = payload.get("changed_files", [])
    print(f"Repair {payload['kind']}: {action} {len(changed_files)} file(s).")
    for rel_path in changed_files:
        print(f"- {rel_path}")
    # "0 files" is ambiguous between nothing to do and wrong input; naming what was
    # skipped, and why, removes the ambiguity the field report flagged.
    for entry in payload.get("skipped", []):
        print(f"- skipped `{entry['ref']}`: {entry['reason']}")


REPAIR_VERIFY_CODES = {
    "gates": {"task_gate_unchecked", "task_missing_done_gate", "request_dor_unchecked"},
    "ac-traceability": {"ac_missing_item_traceability", "ac_missing_task_traceability"},
    "links": {"backlog_missing_task_link", "companion_link_missing"},
    "mermaid": {"mermaid_signature_stale"},
}


def _repair_verify_snapshot(repo_root: Path, source: str | None, dry_run: bool) -> dict[str, str]:
    if dry_run or not source:
        return {}
    preflight = validate_closeout_payload(repo_root, source)
    return _snapshot_existing_files(repo_root, list(preflight.get("related_paths", [])))


def _finalize_repair_verify(repo_root: Path, payload: dict[str, object], source: str | None, snapshot: dict[str, str]) -> dict[str, object]:
    if not source or payload.get("dry_run"):
        return payload
    preflight = validate_closeout_payload(repo_root, source)
    payload["preflight"] = preflight
    relevant_codes = REPAIR_VERIFY_CODES.get(str(payload.get("kind")), set())
    remaining_relevant = [issue for issue in preflight.get("issues", []) if issue.get("code") in relevant_codes]
    payload["rolled_back"] = False
    if remaining_relevant and snapshot:
        payload["attempted_changed_files"] = payload.get("changed_files", [])
        _restore_file_snapshot(repo_root, snapshot)
        payload["changed_files"] = []
        payload["rolled_back"] = True
        payload["rollback_reason"] = "repair verification left relevant closeout issues"
        payload["remaining_relevant_issues"] = remaining_relevant
    return payload


def cmd_repair_gates(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    verify_source = args.verify_closeout or args.source
    snapshot = _repair_verify_snapshot(repo_root, verify_source, args.dry_run)
    payload = repair_gates_payload(repo_root, args.source, dry_run=args.dry_run)
    payload = _finalize_repair_verify(repo_root, payload, verify_source, snapshot)
    _print_repair_payload(payload, args.format)
    return payload


def cmd_repair_ac_traceability(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    snapshot = _repair_verify_snapshot(repo_root, args.verify_closeout, args.dry_run)
    payload = repair_ac_traceability_payload(repo_root, args.source, dry_run=args.dry_run, proof=args.proof, proof_source=args.proof_source)
    payload = _finalize_repair_verify(repo_root, payload, args.verify_closeout, snapshot)
    _print_repair_payload(payload, args.format)
    return payload


def cmd_repair_links(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    verify_source = args.verify_closeout or args.source
    snapshot = _repair_verify_snapshot(repo_root, verify_source, args.dry_run)
    payload = repair_links_payload(repo_root, args.source, dry_run=args.dry_run)
    payload = _finalize_repair_verify(repo_root, payload, verify_source, snapshot)
    _print_repair_payload(payload, args.format)
    return payload


def cmd_repair_mermaid(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    snapshot = _repair_verify_snapshot(repo_root, args.verify_closeout, args.dry_run)
    payload = repair_mermaid_payload(repo_root, args.refs, dry_run=args.dry_run)
    payload = _finalize_repair_verify(repo_root, payload, args.verify_closeout, snapshot)
    _print_repair_payload(payload, args.format)
    return payload


def _closeout_refs(repo_root: Path, task_path: Path) -> list[str]:
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    refs = {task_path.stem}
    item_refs = set(_extract_refs(task_text, DOC_KINDS["backlog"].prefix))
    refs.update(item_refs)
    refs.update(_extract_refs(task_text, DOC_KINDS["request"].prefix))
    for item_ref in sorted(item_refs):
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is not None:
            refs.update(_extract_refs(_strip_mermaid_blocks(item_path.read_text(encoding="utf-8")), DOC_KINDS["request"].prefix))
    return sorted(refs)


def _snapshot_existing_files(repo_root: Path, rel_paths: list[str]) -> dict[str, str]:
    snapshot: dict[str, str] = {}
    for rel_path in rel_paths:
        path = repo_root / rel_path
        if path.is_file():
            snapshot[rel_path] = path.read_text(encoding="utf-8")
    return snapshot


def _restore_file_snapshot(repo_root: Path, snapshot: dict[str, str]) -> None:
    for rel_path, content in snapshot.items():
        path = repo_root / rel_path
        path.write_text(content, encoding="utf-8")

def closeout_payload(
    repo_root: Path,
    source: str,
    *,
    validations: list[str],
    run_index: bool,
    run_lint: bool,
    run_audit: bool,
    dry_run: bool,
    validation_command: str | None = None,
    validation_result: str = "passed",
    validation_note: str | None = None,
) -> dict[str, object]:
    task_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], source)
    task_ref = task_path.stem
    changed_files: set[str] = set()
    steps: list[dict[str, object]] = []
    initial_preflight = validate_closeout_payload(repo_root, task_ref)
    rollback_snapshot = {} if dry_run else _snapshot_existing_files(repo_root, list(initial_preflight.get("related_paths", [])))

    if validation_command and validation_command.strip():
        validations = [*validations, _structured_validation_line(validation_command, validation_result, validation_note)]

    for validation in validations:
        if validation and validation.strip():
            if _append_doc_section_bullets_changed(task_path, "Validation", [validation.strip()], dry_run=dry_run):
                changed_files.add(task_path.relative_to(repo_root).as_posix())
            steps.append({"kind": "validation", "text": validation.strip(), "dry_run": dry_run})

    gate_payload = repair_gates_payload(repo_root, task_ref, dry_run=dry_run)
    link_payload = repair_links_payload(repo_root, task_ref, dry_run=dry_run)
    changed_files.update(gate_payload["changed_files"])
    changed_files.update(link_payload["changed_files"])
    steps.extend([gate_payload, link_payload])

    request_refs = sorted(_extract_refs(_strip_mermaid_blocks(task_path.read_text(encoding="utf-8")), DOC_KINDS["request"].prefix))
    item_refs = sorted(_extract_refs(_strip_mermaid_blocks(task_path.read_text(encoding="utf-8")), DOC_KINDS["backlog"].prefix))
    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is not None:
            request_refs.extend(_extract_refs(_strip_mermaid_blocks(item_path.read_text(encoding="utf-8")), DOC_KINDS["request"].prefix))
    for request_ref in sorted(set(request_refs)):
        ac_payload = repair_ac_traceability_payload(repo_root, request_ref, dry_run=dry_run)
        changed_files.update(ac_payload["changed_files"])
        steps.append(ac_payload)

    mermaid_refs = _closeout_refs(repo_root, task_path)
    mermaid_payload = repair_mermaid_payload(repo_root, mermaid_refs, dry_run=dry_run)
    changed_files.update(mermaid_payload["changed_files"])
    steps.append(mermaid_payload)

    preflight = validate_closeout_payload(repo_root, task_ref)
    if preflight["issues"]:
        rolled_back = False
        attempted_changed_files = sorted(changed_files)
        if rollback_snapshot:
            _restore_file_snapshot(repo_root, rollback_snapshot)
            changed_files.clear()
            rolled_back = True
        return {
            "command": "closeout",
            "ok": False,
            "closed": False,
            "post_close_validation_failed": False,
            "source": task_path.relative_to(repo_root).as_posix(),
            "changed_files": sorted(changed_files),
            "attempted_changed_files": attempted_changed_files,
            "preflight": preflight,
            "rolled_back": rolled_back,
            "steps": steps,
            "dry_run": dry_run,
        }

    finish_payload: dict[str, object] | None = None
    if not dry_run:
        _close_chain_for_kind(repo_root, task_path, DOC_KINDS["task"], dry_run=False, quiet=True)
        for ref in mermaid_refs:
            if ref.startswith(f"{DOC_KINDS['request'].prefix}_"):
                _maybe_close_request_chain(repo_root, ref, dry_run=False, quiet=True)
        finish_issues = _verify_finished_task_chain(repo_root, task_path)
        if finish_issues:
            raise SystemExit("Finish verification failed:\n" + "\n".join(f"- {issue}" for issue in finish_issues))
        changed_files.add(task_path.relative_to(repo_root).as_posix())
        for ref in mermaid_refs:
            path, _kind = _resolve_any_workflow_source(repo_root, ref)
            changed_files.add(path.relative_to(repo_root).as_posix())
        finish_payload = {"kind": "finish", "ok": True}
        post_finish_mermaid = repair_mermaid_payload(repo_root, mermaid_refs, dry_run=False)
        changed_files.update(post_finish_mermaid["changed_files"])
        steps.append(post_finish_mermaid)

    index_result: dict[str, object] | None = None
    if run_index:
        if dry_run:
            index_result = {"ok": True, "dry_run": True}
        else:
            index_result = index_payload(repo_root)
            changed_files.add(str(index_result["output_path"]))

    lint_result: dict[str, object] | None = None
    if run_lint:
        lint_result = lint_payload(repo_root, require_status=True)

    audit_result: dict[str, object] | None = None
    if run_audit:
        audit_result = audit_payload(repo_root, legacy_cutoff_version="1.1.0", group_by_doc=True)

    ok = True
    if lint_result is not None and not lint_result.get("ok", False):
        ok = False
    if audit_result is not None and audit_result.get("issue_count", 0):
        ok = False

    # The requested checks run repository-wide and after the task is already closed, so
    # a blocker held by an unrelated corpus turns `ok` false on a closeout that fully
    # happened. `ok` stays false -- a caller gating a commit on it is right to -- but it
    # is no longer the only thing said: `closed` reports what became of the task, and a
    # caller can tell this from a preflight rollback, where nothing was closed at all.
    closed = not dry_run
    post_close_validation_failed = closed and not ok

    return {
        "command": "closeout",
        "ok": ok,
        "closed": closed,
        "post_close_validation_failed": post_close_validation_failed,
        "source": task_path.relative_to(repo_root).as_posix(),
        "changed_files": sorted(changed_files),
        "preflight": preflight,
        "finish": finish_payload,
        "index": index_result,
        "lint": lint_result,
        "audit": audit_result,
        "steps": steps,
        "rolled_back": False,
        "dry_run": dry_run,
    }


def cmd_closeout(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = closeout_payload(
        repo_root,
        args.source,
        validations=args.validation or [],
        validation_command=args.validation_command,
        validation_result=args.validation_result,
        validation_note=args.validation_note,
        run_index=args.index,
        run_lint=args.lint,
        run_audit=args.audit,
        dry_run=args.dry_run,
    )
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        if payload["ok"]:
            status = "OK"
        elif payload.get("post_close_validation_failed"):
            # The task did reach Done and its changes are on disk; printing FAILED here
            # sent an operator looking for a closeout that had in fact happened.
            status = "CLOSED (post-close validation failed)"
        else:
            status = "FAILED"
        print(f"Closeout: {status} for {payload['source']}")
        print(f"- changed files: {len(payload['changed_files'])}")
        for rel_path in payload["changed_files"]:
            print(f"  - {rel_path}")
        # Without this, a rolled-back write is indistinguishable from never having
        # written anything, which is what made `--validation` look inert.
        attempted = payload.get("attempted_changed_files") or []
        if payload.get("rolled_back") and attempted:
            print(f"- rolled back after failed preflight: {len(attempted)} file(s) written then restored")
            for rel_path in attempted:
                print(f"  - {rel_path}")
        preflight = payload.get("preflight")
        if isinstance(preflight, dict) and preflight.get("issues"):
            print("- preflight issues:")
            for issue in preflight["issues"]:
                print(f"  - {issue['code']}: {issue['message']} ({issue['path']})")
        if payload.get("lint") is not None:
            print(f"- lint ok: {payload['lint'].get('ok')}")
        if payload.get("audit") is not None:
            print(f"- audit issues: {payload['audit'].get('issue_count')}")
    return payload

import os


def _indicator_value_from_lines(lines: list[str], key: str) -> str | None:
    prefix = f"> {key}:"
    for line in lines:
        if line.startswith(prefix):
            return line.split(":", 1)[1].strip()
    return None


def _upsert_workflow_indicator(lines: list[str], key: str, value: str) -> list[str]:
    prefix = f"> {key}:"
    updated: list[str] = []
    replaced = False
    last_indicator_index = -1
    for line in lines:
        if line.startswith("> "):
            last_indicator_index = len(updated)
        if line.startswith(prefix):
            updated.append(f"> {key}: {value}")
            replaced = True
        else:
            updated.append(line)
    if not replaced:
        insert_at = last_indicator_index + 1 if last_indicator_index >= 0 else 1
        updated.insert(insert_at, f"> {key}: {value}")
    return updated


BACKLOG_ACTIVE_PROGRESS_FLOOR = 10
PROGRESS_CLOSED_STATUSES = {"done", "blocked", "obsolete", "archived"}


def _write_workflow_indicators(path: Path, updates: dict[str, str], *, dry_run: bool) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    updated = lines
    for key, value in updates.items():
        updated = _upsert_workflow_indicator(updated, key, value)
    changed = updated != lines
    if changed and not dry_run:
        path.write_text("\n".join(updated) + "\n", encoding="utf-8")
    return changed


def _task_progress_for_backlog(task_path: Path, *, active_task_path: Path | None = None) -> int:
    lines = task_path.read_text(encoding="utf-8").splitlines()
    status = _normalize_status(_indicator_value_from_lines(lines, "Status"))
    if active_task_path is not None and task_path == active_task_path:
        status = "in progress"
    if status in {"done", "archived"}:
        return 100
    explicit = progress_value(_indicator_value_from_lines(lines, "Progress"))
    if explicit is not None and explicit > 0:
        return explicit
    if status == "in progress":
        return BACKLOG_ACTIVE_PROGRESS_FLOOR
    return 0


def _sync_linked_backlog_progress(repo_root: Path, task_path: Path, *, dry_run: bool, active_task_path: Path | None = None) -> list[str]:
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    changed: list[str] = []
    for item_ref in sorted(_extract_refs(task_text, DOC_KINDS["backlog"].prefix)):
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            continue
        item_lines = item_path.read_text(encoding="utf-8").splitlines()
        item_status = _normalize_status(_indicator_value_from_lines(item_lines, "Status"))
        if item_status in PROGRESS_CLOSED_STATUSES:
            continue
        linked_tasks = _collect_docs_linking_ref(repo_root, DOC_KINDS["task"], item_ref)
        if not linked_tasks:
            continue
        total = sum(_task_progress_for_backlog(path, active_task_path=active_task_path) for path in linked_tasks)
        progress = round(total / len(linked_tasks))
        updates = {"Progress": f"{progress}%"}
        if progress > 0 and item_status in {"", "draft", "ready"}:
            updates["Status"] = "In progress"
        if _write_workflow_indicators(item_path, updates, dry_run=dry_run):
            changed.append(item_path.relative_to(repo_root).as_posix())
    return changed


def _parse_progress_arg(value: str) -> int:
    match = re.fullmatch(r"\s*(\d{1,3})%?\s*", value)
    if not match:
        raise SystemExit(f"Invalid progress `{value}`. Expected 0-100 or 0%-100%.")
    return max(0, min(100, int(match.group(1))))


def start_payload(repo_root: Path, source: str, *, owner: str | None, dry_run: bool) -> dict[str, object]:
    source_path, kind = _resolve_any_workflow_source(repo_root, source)
    lines = source_path.read_text(encoding="utf-8").splitlines()
    previous_status = _indicator_value_from_lines(lines, "Status") or ""
    previous_owner = _indicator_value_from_lines(lines, "Owner") or ""
    resolved_owner = (owner if owner is not None else os.environ.get("LOGICS_AGENT", "")).strip()
    warnings: list[str] = []
    if not resolved_owner:
        warnings.append("No owner provided; set LOGICS_AGENT or pass --owner.")
    if _normalize_status(previous_status) == "in progress" and previous_owner and resolved_owner and previous_owner != resolved_owner:
        warnings.append(f"already owner={previous_owner}; overriding with owner={resolved_owner}.")

    updated = _upsert_workflow_indicator(lines, "Status", "In progress")
    if resolved_owner:
        updated = _upsert_workflow_indicator(updated, "Owner", resolved_owner)
    changed = updated != lines
    if changed and not dry_run:
        source_path.write_text("\n".join(updated) + "\n", encoding="utf-8")
    changed_files = [source_path.relative_to(repo_root).as_posix()] if changed else []
    if kind == "task":
        changed_files.extend(_sync_linked_backlog_progress(repo_root, source_path, dry_run=dry_run, active_task_path=source_path))

    return {
        "command": "start",
        "kind": kind,
        "source": source_path.relative_to(repo_root).as_posix(),
        "previous_status": previous_status,
        "status": "In progress",
        "owner": resolved_owner or None,
        "previous_owner": previous_owner or None,
        "warnings": warnings,
        "changed": changed,
        "changed_files": sorted(set(changed_files)),
        "dry_run": dry_run,
    }


def cmd_start(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = start_payload(repo_root, args.source, owner=args.owner, dry_run=args.dry_run)
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        owner_text = f" owner={payload['owner']}" if payload.get("owner") else " owner=(none)"
        print(f"Started {payload['source']}: {payload['status']}{owner_text}")
        for rel_path in payload["changed_files"]:
            print(f"- changed: {rel_path}")
        for warning in payload["warnings"]:
            print(f"Warning: {warning}")
    return payload


def progress_task_payload(repo_root: Path, source: str, *, progress: str, dry_run: bool) -> dict[str, object]:
    source_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], source)
    parsed = _parse_progress_arg(progress)
    changed_files: list[str] = []
    if _write_workflow_indicators(source_path, {"Progress": f"{parsed}%"}, dry_run=dry_run):
        changed_files.append(source_path.relative_to(repo_root).as_posix())
    changed_files.extend(_sync_linked_backlog_progress(repo_root, source_path, dry_run=dry_run))
    return {
        "command": "progress",
        "kind": "task",
        "source": source_path.relative_to(repo_root).as_posix(),
        "progress": f"{parsed}%",
        "changed_files": sorted(set(changed_files)),
        "dry_run": dry_run,
    }


def cmd_progress_task(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = progress_task_payload(repo_root, args.source, progress=args.progress, dry_run=args.dry_run)
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Updated task progress {payload['source']}: {payload['progress']}")
        for rel_path in payload["changed_files"]:
            print(f"- changed: {rel_path}")
    return payload

SCAFFOLD_REQUEST_CHAIN_SCHEMA_HELP = """Create a request/product/backlog/task chain from one JSON input file.

Input JSON shape (--example prints a ready-to-edit skeleton):
  title                 str   (required)
  references            [str]
  request               { complexity, theme, needs[], context[], acceptance_criteria[] }
  product               { title, overview, goals[], non_goals[] }
  backlog_items         [ { title (required), priority, complexity, theme, request_acs[],
                            problem[], scope_in[], scope_out[], acceptance_criteria[] } ]  (required, non-empty)
  orchestration_task    { title, plan[] }
  context_pack          { out, mode, profile }

Accepted values (rejecting an input is not the only way to learn these):
  request.complexity            Low | Medium | High
  backlog_items[].complexity    Low | Medium | High
  backlog_items[].priority      free text; High/Medium/Low are the conventional tiers
  context_pack.profile          tiny | normal | deep
  context_pack.mode             summary-only | diff-first | full

Run `logics-manager flow statuses` for the status vocabulary of each document kind."""


def _scaffold_request_chain_example() -> dict[str, object]:
    return {
        "title": "<request title>",
        "references": ["<file or context reference>"],
        "request": {
            "complexity": "Medium",
            "theme": "<theme>",
            "needs": ["<user need>"],
            "context": ["<relevant context>"],
            "acceptance_criteria": ["AC1: <testable criterion>"],
        },
        "product": {"title": "<brief title>", "overview": "<one-line overview>", "goals": ["<goal>"], "non_goals": ["<non-goal>"]},
        "backlog_items": [
            {
                "title": "<slice title>",
                "priority": "Medium",
                "complexity": "Medium",
                "theme": "<theme>",
                "request_acs": ["AC1"],
                "problem": ["<problem>"],
                "scope_in": ["<in scope>"],
                "scope_out": ["<out of scope>"],
                "acceptance_criteria": ["AC1: <slice criterion>"],
            }
        ],
        "orchestration_task": {"title": "Orchestrate <title>", "plan": ["<step>"]},
        "context_pack": {"out": "logics/context-packs/<slug>.json", "mode": "summary-only", "profile": "normal"},
    }


def _validate_scaffold_input(payload: dict[str, object]) -> None:
    """Raise a precise SystemExit naming the offending key/type, before any doc is written."""
    if not isinstance(payload.get("title"), str) or not str(payload.get("title")).strip():
        raise SystemExit("request-chain input: `title` must be a non-empty string.")
    raw_items = payload.get("backlog_items")
    if not isinstance(raw_items, list) or not raw_items:
        raise SystemExit("request-chain input: `backlog_items` must be a non-empty array.")
    for idx, item in enumerate(raw_items, start=1):
        if not isinstance(item, dict):
            raise SystemExit(f"request-chain input: `backlog_items[{idx}]` must be an object.")
        if not isinstance(item.get("title"), str) or not str(item.get("title")).strip():
            raise SystemExit(f"request-chain input: `backlog_items[{idx}].title` must be a non-empty string.")
    for key in ("request", "product", "orchestration_task", "context_pack"):
        if key in payload and not isinstance(payload[key], dict):
            raise SystemExit(f"request-chain input: `{key}` must be an object when present.")
    if "references" in payload and not isinstance(payload["references"], list):
        raise SystemExit("request-chain input: `references` must be an array when present.")

    # req_286/item_522: reject out-of-domain enum values up front, before any
    # write, so a bad context_pack.profile (the original dogfood KeyError) fails
    # the same way under --dry-run and apply instead of throwing mid-apply.
    def _check_enum(container: object, key: str, allowed: tuple[str, ...], field_path: str) -> None:
        if not isinstance(container, dict) or key not in container:
            return
        value = container.get(key)
        if not isinstance(value, str) or value not in allowed:
            raise SystemExit(
                f"request-chain input: `{field_path}` must be one of {', '.join(allowed)} (got {value!r})."
            )

    context_pack = payload.get("context_pack")
    _check_enum(context_pack, "profile", ("tiny", "normal", "deep"), "context_pack.profile")
    _check_enum(context_pack, "mode", ("summary-only", "diff-first", "full"), "context_pack.mode")
    _check_enum(payload.get("request"), "complexity", ("Low", "Medium", "High"), "request.complexity")
    for idx, item in enumerate(raw_items, start=1):
        _check_enum(item, "complexity", ("Low", "Medium", "High"), f"backlog_items[{idx}].complexity")


def scaffold_request_chain_payload(
    repo_root: Path,
    input_path: Path | None = None,
    *,
    input_payload: dict[str, object] | None = None,
    context_pack_out: str | None,
    dry_run: bool,
) -> dict[str, object]:
    if input_payload is None:
        if input_path is None:
            raise SystemExit("request-chain input: provide an input file or payload.")
        input_payload = _read_json_object(input_path, label="request-chain input")
    _validate_scaffold_input(input_payload)
    title = _string_value(input_payload, "title")
    raw_items = input_payload.get("backlog_items")
    items = [item for item in raw_items if isinstance(item, dict)]
    product_payload = input_payload.get("product") if isinstance(input_payload.get("product"), dict) else {}
    task_payload = input_payload.get("orchestration_task") if isinstance(input_payload.get("orchestration_task"), dict) else {}

    request_ref = _plan_doc(repo_root, DOC_KINDS["request"].directory, DOC_KINDS["request"].prefix, title, dry_run=True).ref
    product_ref = _next_product_ref(repo_root, _string_value(product_payload, "title", default=title))
    task_ref = _next_task_ref(repo_root, _string_value(task_payload, "title", default=f"Orchestrate {title}"))
    existing_backlog_numbers = []
    backlog_dir = repo_root / "logics" / "backlog"
    if backlog_dir.is_dir():
        for path in backlog_dir.glob("item_*.md"):
            parts = path.stem.split("_", 2)
            if len(parts) >= 2 and parts[1].isdigit():
                existing_backlog_numbers.append(int(parts[1]))
    next_backlog_number = max(existing_backlog_numbers, default=0) + 1
    item_refs = [
        f"item_{next_backlog_number + idx - 1:03d}_{_slugify(_string_value(item, 'title', default=f'{title} slice {idx}'))}"
        for idx, item in enumerate(items, start=1)
    ]

    doc_paths = [
        repo_root / "logics" / "request" / f"{request_ref}.md",
        repo_root / "logics" / "product" / f"{product_ref}.md",
        repo_root / "logics" / "tasks" / f"{task_ref}.md",
        *[repo_root / "logics" / "backlog" / f"{item_ref}.md" for item_ref in item_refs],
    ]
    if not dry_run:
        _ensure_new_doc_paths_available(doc_paths)

    request_text = _build_scaffold_request_doc(repo_root, request_ref, title, input_payload)
    request_text = request_text.replace("- none\n", "".join(f"- `{item_ref}`\n" for item_ref in item_refs), 1)
    product_text = _build_scaffold_product_doc(repo_root, product_ref, request_ref, item_refs, task_ref, input_payload)
    task_text = _build_scaffold_task_doc(repo_root, task_ref, _string_value(task_payload, "title", default=f"Orchestrate {title}"), request_ref, product_ref, item_refs, input_payload)
    backlog_texts = [
        _build_scaffold_backlog_doc(repo_root, item_ref, request_ref, product_ref, task_ref, item)
        for item_ref, item in zip(item_refs, items)
    ]

    created_paths = [path.relative_to(repo_root).as_posix() for path in doc_paths]
    changed_files = [*created_paths, "logics/INDEX.md"]
    context_pack_payload: dict[str, object] | None = None
    context_pack_path: str | None = None
    raw_context_pack = input_payload.get("context_pack") if isinstance(input_payload.get("context_pack"), dict) else {}
    requested_out = context_pack_out or _string_value(raw_context_pack, "out", default="")
    if requested_out:
        _out_path, context_pack_path = resolve_repo_output_path(repo_root, requested_out, label="--context-pack")
        changed_files.append(context_pack_path)

    if not dry_run:
        # req_286/item_523: apply atomically. The context pack must read the docs
        # from disk, so we can't stage everything in memory; instead we track what
        # we create and, on any failure, delete the new docs/context-pack and
        # restore INDEX.md to its prior bytes. A failed run thus leaves the repo
        # unchanged and consumes no ids (refs are derived from on-disk files), so a
        # corrected re-run reuses the same ids.
        index_path = repo_root / "logics" / "INDEX.md"
        index_before = index_path.read_text(encoding="utf-8") if index_path.is_file() else None
        written_paths: list[Path] = []
        try:
            for path, content in zip(doc_paths, [request_text, product_text, task_text, *backlog_texts]):
                _write_new_doc(path, content)
                written_paths.append(path)
            index_payload(repo_root)
            if requested_out and context_pack_path is not None:
                out_path, _rel = resolve_repo_output_path(repo_root, requested_out, label="--context-pack")
                refs = ",".join([request_ref, *item_refs, task_ref])
                context_pack_payload = build_context_pack_payload(
                    repo_root,
                    refs,
                    mode=_string_value(raw_context_pack, "mode", default="summary-only"),
                    profile=_string_value(raw_context_pack, "profile", default="normal"),
                    handoff=True,
                )
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_text(json.dumps(context_pack_payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
                written_paths.append(out_path)
        except BaseException:
            for path in written_paths:
                path.unlink(missing_ok=True)
            if index_before is None:
                index_path.unlink(missing_ok=True)
            else:
                index_path.write_text(index_before, encoding="utf-8")
            raise
    return {
        "command": "scaffold",
        "kind": "request-chain",
        "input": (
            None
            if input_path is None
            else input_path.relative_to(repo_root).as_posix()
            if input_path.is_relative_to(repo_root)
            else input_path.as_posix()
        ),
        "request_ref": request_ref,
        "product_ref": product_ref,
        "backlog_refs": item_refs,
        "task_ref": task_ref,
        "created_refs": [request_ref, product_ref, *item_refs, task_ref],
        "created_paths": created_paths,
        "unclaimed_request_acs": _scaffold_ac_ownership(input_payload, item_refs)[1],
        "changed_files": sorted(dict.fromkeys(changed_files)),
        "context_pack_path": context_pack_path,
        "context_pack": context_pack_payload,
        "validation_suggestions": [
            "logics-manager lint --require-status",
            "logics-manager audit --legacy-cutoff-version 1.1.0 --group-by-doc",
            f"logics-manager flow validate {request_ref} {' '.join(item_refs)} {task_ref} --format json",
        ],
        "dry_run": dry_run,
        "next_actions": [
            f"Review `{task_ref}`.",
            f"Run `logics-manager sync context-pack {request_ref} {' '.join(item_refs)} {task_ref} --handoff --format json` if no context pack was written.",
            "Run lint/audit before implementation.",
        ],
        "next_action": f"Review `{task_ref}` and run lint/audit before implementation.",
    }


def cmd_scaffold_request_chain(args: argparse.Namespace) -> dict[str, object]:
    if getattr(args, "print_schema", False) or getattr(args, "example", False):
        payload = _scaffold_request_chain_example() if getattr(args, "example", False) else {"schema": SCAFFOLD_REQUEST_CHAIN_SCHEMA_HELP}
        if args.format == "json":
            print_payload(payload, args.format)
        elif getattr(args, "example", False):
            print(json.dumps(payload, indent=2))
        else:
            print(SCAFFOLD_REQUEST_CHAIN_SCHEMA_HELP)
        return payload
    if not args.input:
        raise SystemExit("scaffold request-chain requires --input (or use --print-schema / --example).")
    repo_root = _find_repo_root(Path.cwd())
    input_candidate = Path(args.input)
    input_path = input_candidate if input_candidate.is_absolute() else repo_root / input_candidate
    payload = scaffold_request_chain_payload(repo_root, input_path, context_pack_out=args.context_pack, dry_run=args.dry_run)
    if getattr(args, "validate", False) and not args.dry_run:
        refs = [payload["request_ref"], *payload["backlog_refs"], payload["task_ref"]]
        validation = flow_validate_payload(
            repo_root,
            refs,
            fixable_only=False,
            explain=False,
            apply_fixes=False,
            dry_run=False,
            proof=None,
            proof_source=None,
        )
        payload["validation"] = validation
        payload["ready_to_dev"] = validation.get("blocking_count", 0) == 0
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        action = "Would scaffold" if args.dry_run else "Scaffolded"
        print(f"{action} request chain: {payload['request_ref']}")
        for rel_path in payload["changed_files"]:
            print(f"- {rel_path}")
        for ac_id in payload["unclaimed_request_acs"]:
            print(f"Warning: request {ac_id} is claimed by no backlog item.")
        print(f"Next action: {payload['next_action']}")
        if "ready_to_dev" in payload:
            print(f"Inline validation: {'ready-to-dev (no blocking findings)' if payload['ready_to_dev'] else 'blocking findings present'}")
    return payload

def cmd_promote_request_to_backlog(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = _resolve_workflow_source(repo_root, DOC_KINDS["request"], args.source)
    title = _extract_doc_title(source_path)
    ref, _ = _build_native_backlog_from_request(repo_root, source_path, title)
    planned_path = repo_root / "logics" / "backlog" / f"{ref}.md"
    if not args.dry_run:
        _ensure_new_doc_paths_available([planned_path])
    product_refs, architecture_refs = _create_native_companion_docs(
        repo_root,
        title,
        request_ref=source_path.stem,
        backlog_ref=ref,
        task_ref=None,
        args=args,
    )
    _, content = _build_native_backlog_from_request(
        repo_root,
        source_path,
        title,
        product_refs=product_refs,
        architecture_refs=architecture_refs,
    )
    if not args.dry_run:
        _write_new_doc(planned_path, content)
        _append_doc_section_bullets(source_path, "Backlog", [f"`{ref}`"], dry_run=False)
    payload = {
        "command": "promote",
        "promotion": "request-to-backlog",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_ref": ref,
        "created_refs": [ref],
        "created_path": planned_path.relative_to(repo_root).as_posix(),
        "changed_files": [planned_path.relative_to(repo_root).as_posix(), source_path.relative_to(repo_root).as_posix()],
        "validation_suggestions": [
            f"logics-manager flow validate {source_path.stem} {ref} --format json",
            "logics-manager lint --require-status",
        ],
        "next_actions": [
            f"Review `{ref}`.",
            f"Promote `{ref}` to a task when the slice is implementation-ready.",
        ],
        "next_action": f"Review `{ref}` and promote it to a task when ready.",
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Created backlog slice from request: {payload['created_path']}")
    return payload


def cmd_promote_backlog_to_task(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = _resolve_workflow_source(repo_root, DOC_KINDS["backlog"], args.source)
    title = _extract_doc_title(source_path)
    source_text = source_path.read_text(encoding="utf-8")
    request_refs = sorted(_extract_refs(_strip_mermaid_blocks(source_text), DOC_KINDS["request"].prefix))
    ref, _ = _build_native_task_from_backlog(repo_root, source_path, title)
    planned_path = repo_root / "logics" / "tasks" / f"{ref}.md"
    if not args.dry_run:
        _ensure_new_doc_paths_available([planned_path])
    product_refs, architecture_refs = _create_native_companion_docs(
        repo_root,
        title,
        request_ref=request_refs[0] if request_refs else None,
        backlog_ref=source_path.stem,
        task_ref=ref,
        args=args,
    )
    _, content = _build_native_task_from_backlog(
        repo_root,
        source_path,
        title,
        request_refs=request_refs,
        product_refs=product_refs,
        architecture_refs=architecture_refs,
    )
    if not args.dry_run:
        _write_new_doc(planned_path, content)
        _append_doc_section_bullets(source_path, "Tasks", [f"`{ref}`"], dry_run=False)
    payload = {
        "command": "promote",
        "promotion": "backlog-to-task",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_ref": ref,
        "created_refs": [ref],
        "created_path": planned_path.relative_to(repo_root).as_posix(),
        "changed_files": [planned_path.relative_to(repo_root).as_posix(), source_path.relative_to(repo_root).as_posix()],
        "validation_suggestions": [
            f"logics-manager flow validate {source_path.stem} {ref} --format json",
            "logics-manager lint --require-status",
        ],
        "next_actions": [
            f"Implement `{ref}`.",
            f"Finish with `logics-manager flow finish task {ref}` after validation.",
        ],
        "next_action": f"Implement `{ref}` and finish it after validation.",
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Created task from backlog: {payload['created_path']}")
    return payload


def cmd_split_request(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = _resolve_workflow_source(repo_root, DOC_KINDS["request"], args.source)
    request_lines = source_path.read_text(encoding="utf-8").splitlines()
    request_acs = _request_acceptance_map(request_lines)
    if args.slice:
        if not request_acs:
            raise SystemExit("Cannot use `--slice` because the request has no numbered acceptance criteria.")
        slice_inputs = [_parse_request_slice(raw, request_acs) for raw in args.slice]
        seen_acs: set[str] = set()
        duplicate_acs: set[str] = set()
        for item in slice_inputs:
            for ac_id in item["ac_ids"]:
                ac_id = str(ac_id)
                if ac_id in seen_acs:
                    duplicate_acs.add(ac_id)
                seen_acs.add(ac_id)
        if duplicate_acs:
            raise SystemExit(f"Duplicate request AC mapping in `--slice`: {', '.join(sorted(duplicate_acs))}")
    else:
        if not args.title:
            raise SystemExit("split request requires `--title` or `--slice`.")
        slice_inputs = [{"title": title, "ac_ids": list(request_acs)} for title in _split_titles([title for group in args.title for title in group])]

    created_refs: list[str] = []
    planned_paths: list[Path] = []
    planned_contents: list[tuple[Path, str]] = []
    ac_mappings: list[dict[str, object]] = []
    existing_backlog_numbers = []
    backlog_dir = repo_root / "logics" / "backlog"
    if backlog_dir.is_dir():
        for path in backlog_dir.glob("item_*.md"):
            parts = path.stem.split("_", 2)
            if len(parts) >= 2 and parts[1].isdigit():
                existing_backlog_numbers.append(int(parts[1]))
    next_backlog_number = max(existing_backlog_numbers, default=0) + 1
    for idx, item in enumerate(slice_inputs, start=1):
        title = str(item["title"])
        ac_ids = [str(ac_id) for ac_id in item["ac_ids"]]
        generated_ref, _ = _build_native_backlog_from_request(
            repo_root,
            source_path,
            title,
        )
        ref = f"item_{next_backlog_number + idx - 1:03d}_{_slugify(title)}"
        planned_path = repo_root / "logics" / "backlog" / f"{ref}.md"
        planned_paths.append(planned_path)
        product_refs, architecture_refs = _create_native_companion_docs(
            repo_root,
            title,
            request_ref=source_path.stem,
            backlog_ref=ref,
            task_ref=None,
            args=args,
        )
        _, content = _build_native_backlog_from_request(
            repo_root,
            source_path,
            title,
            product_refs=product_refs,
            architecture_refs=architecture_refs,
        )
        if generated_ref != ref:
            content = content.replace(generated_ref, ref)
        if ac_ids:
            selected_acceptance = [request_acs[ac_id] for ac_id in ac_ids]
            content = re.sub(
                r"# Acceptance criteria\n.*?\n# AC Traceability",
                "# Acceptance criteria\n" + "\n".join(f"- {value}" for value in selected_acceptance) + "\n\n# AC Traceability",
                content,
                flags=re.DOTALL,
            )
            traceability = "\n".join(f"- request-{ac_id} -> This backlog slice. Proof: {request_acs[ac_id]}" for ac_id in ac_ids)
            content = re.sub(
                r"# AC Traceability\n.*?\n# Decision framing",
                "# AC Traceability\n" + traceability + "\n\n# Decision framing",
                content,
                flags=re.DOTALL,
            )
        planned_contents.append((planned_path, content))
        created_refs.append(ref)
        ac_mappings.append({"backlog_ref": ref, "title": title, "request_acs": ac_ids})

    task_ref: str | None = None
    task_path: Path | None = None
    if args.orchestration_task:
        task_ref = _next_task_ref(repo_root, args.orchestration_task)
        task_path = repo_root / "logics" / "tasks" / f"{task_ref}.md"
        planned_paths.append(task_path)
        planned_contents.append(
            (
                task_path,
                _build_split_orchestration_task_doc(
                    repo_root,
                    task_ref,
                    args.orchestration_task,
                    source_path.stem,
                    created_refs,
                    args.orchestration_summary or "",
                ),
            )
        )

    if not args.dry_run:
        _ensure_new_doc_paths_available(planned_paths)
        for path, content in planned_contents:
            _write_new_doc(path, content)
        for ref in created_refs:
            _append_doc_section_bullets(source_path, "Backlog", [f"`{ref}`"], dry_run=False)
        if task_ref:
            for ref in created_refs:
                backlog_path = repo_root / "logics" / "backlog" / f"{ref}.md"
                _append_doc_section_bullets(backlog_path, "Tasks", [f"`{task_ref}`"], dry_run=False)

    mapped_ac_ids = {ac_id for mapping in ac_mappings for ac_id in mapping["request_acs"]}
    payload = {
        "command": "split",
        "kind": "request",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_refs": created_refs,
        "changed_files": sorted(
            [
                source_path.relative_to(repo_root).as_posix(),
                *[path.relative_to(repo_root).as_posix() for path in planned_paths],
            ]
        ),
        "ac_mappings": ac_mappings,
        "omitted_ac_ids": sorted(set(request_acs) - mapped_ac_ids),
        "orchestration_task": {"ref": task_ref, "path": task_path.relative_to(repo_root).as_posix()} if task_ref and task_path else None,
        "validation_suggestions": [
            f"logics-manager flow validate {source_path.stem} {' '.join(created_refs)} --format json",
            "logics-manager lint --require-status",
        ],
        "next_actions": [
            "Review AC mappings and omitted ACs.",
            "Promote or implement the highest-priority generated backlog slice.",
        ],
        "next_action": "Review AC mappings and promote or implement the highest-priority generated slice.",
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Split request into {len(created_refs)} backlog item(s): {', '.join(created_refs)}")
        if task_ref:
            print(f"Created orchestration task: {task_ref}")
    return payload


def cmd_split_backlog(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = _resolve_workflow_source(repo_root, DOC_KINDS["backlog"], args.source)
    source_text = source_path.read_text(encoding="utf-8")
    request_refs = sorted(_extract_refs(_strip_mermaid_blocks(source_text), DOC_KINDS["request"].prefix))
    titles = _split_titles([title for group in args.title for title in group])
    created_refs: list[str] = []
    for title in titles:
        ref, _ = _build_native_task_from_backlog(repo_root, source_path, title)
        planned_path = repo_root / "logics" / "tasks" / f"{ref}.md"
        if not args.dry_run:
            _ensure_new_doc_paths_available([planned_path])
        product_refs, architecture_refs = _create_native_companion_docs(
            repo_root,
            title,
            request_ref=request_refs[0] if request_refs else None,
            backlog_ref=source_path.stem,
            task_ref=ref,
            args=args,
        )
        _, content = _build_native_task_from_backlog(
            repo_root,
            source_path,
            title,
            request_refs=request_refs,
            product_refs=product_refs,
            architecture_refs=architecture_refs,
        )
        if not args.dry_run:
            _write_new_doc(planned_path, content)
            _append_doc_section_bullets(source_path, "Tasks", [f"`{ref}`"], dry_run=False)
        created_refs.append(ref)
    payload = {
        "command": "split",
        "kind": "backlog",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_refs": created_refs,
        "changed_files": sorted(
            [
                source_path.relative_to(repo_root).as_posix(),
                *[f"logics/tasks/{ref}.md" for ref in created_refs],
            ]
        ),
        "validation_suggestions": [
            f"logics-manager flow validate {source_path.stem} {' '.join(created_refs)} --format json",
            "logics-manager lint --require-status",
        ],
        "next_actions": [
            "Review generated tasks.",
            "Implement one bounded task at a time and finish after validation.",
        ],
        "next_action": "Review generated tasks and implement one bounded task at a time.",
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Split backlog item into {len(created_refs)} task(s): {', '.join(created_refs)}")
    return payload

def cmd_close(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    kind = DOC_KINDS[args.kind]
    source_path = _resolve_workflow_source(repo_root, kind, args.source)

    _close_chain_for_kind(repo_root, source_path, kind, dry_run=args.dry_run, quiet=args.format == "json")

    payload = {
        "command": "close",
        "kind": kind.kind,
        "source": source_path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Closed {kind.kind}: {payload['source']}")
    return payload


def cmd_withdraw(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path, kind_name = _resolve_any_workflow_source(repo_root, args.source)
    kind = DOC_KINDS[kind_name]
    lines = source_path.read_text(encoding="utf-8").splitlines()
    previous_status = next((line.split(":", 1)[1].strip() for line in lines if line.startswith("> Status:")), None)
    error = transition_error(kind.kind, previous_status, "Obsolete")
    if error:
        raise SystemExit(error)
    if not args.dry_run:
        source_path.write_text("\n".join(_replace_indicator_line(lines, "Status", "Obsolete")).rstrip() + "\n", encoding="utf-8")
        _append_section_bullets(source_path, "Links", [f"Superseded by: `{args.superseded_by}`"], dry_run=False)

    payload = {
        "command": "withdraw",
        "kind": kind.kind,
        "source": source_path.relative_to(repo_root).as_posix(),
        "superseded_by": args.superseded_by,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Withdrew {kind.kind}: {payload['source']} (superseded by {args.superseded_by})")
    return payload


def _verify_finished_task_chain(repo_root: Path, task_path: Path) -> list[str]:
    issues: list[str] = []
    task_ref = task_path.stem
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    item_refs = sorted(_extract_refs(task_text, "item"))

    if not item_refs:
        return [f"task `{task_ref}` has no linked backlog item reference"]

    processed_request_refs: set[str] = set()
    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            issues.append(f"task `{task_ref}` references missing backlog item `{item_ref}`")
            continue
        if not _is_doc_done(item_path, DOC_KINDS["backlog"]):
            issues.append(f"linked backlog item `{item_ref}` is not closed after finishing task `{task_ref}`")

        item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
        request_refs = sorted(_extract_refs(item_text, "req"))
        if not request_refs:
            issues.append(f"linked backlog item `{item_ref}` has no request reference")
            continue

        for request_ref in request_refs:
            if request_ref in processed_request_refs:
                continue
            processed_request_refs.add(request_ref)
            request_path = _resolve_doc_path(repo_root, DOC_KINDS["request"], request_ref)
            if request_path is None:
                issues.append(f"backlog item `{item_ref}` references missing request `{request_ref}`")
                continue

            linked_items = _collect_docs_linking_ref(repo_root, DOC_KINDS["backlog"], request_ref)
            if linked_items and all(_is_doc_done(linked_item, DOC_KINDS["backlog"]) for linked_item in linked_items):
                if not _is_doc_done(request_path, DOC_KINDS["request"]):
                    issues.append(f"request `{request_ref}` should be closed because all linked backlog items are done")

    return issues


def _record_finished_task_follow_up(repo_root: Path, task_path: Path, dry_run: bool) -> None:
    task_ref = task_path.stem
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    item_refs = sorted(_extract_refs(task_text, "item"))
    request_refs: set[str] = set()

    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            continue
        item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
        request_refs.update(_extract_refs(item_text, "req"))
        _append_section_bullets(
            item_path,
            "Notes",
            [f"Task `{task_ref}` was finished via `logics-manager flow finish task` on {date.today().isoformat()}."],
            dry_run,
        )

    validation_bullets = [
        f"Finish workflow executed on {date.today().isoformat()}.",
        "Linked backlog/request close verification passed.",
    ]
    report_bullets = [
        f"Finished on {date.today().isoformat()}.",
        f"Linked backlog item(s): {', '.join(f'`{ref}`' for ref in item_refs) if item_refs else '(none)'}",
        f"Related request(s): {', '.join(f'`{ref}`' for ref in sorted(request_refs)) if request_refs else '(none)'}",
    ]
    _append_section_bullets(task_path, "Validation", validation_bullets, dry_run)
    _append_section_bullets(task_path, "Report", report_bullets, dry_run)


def _maybe_close_request_chain(repo_root: Path, request_ref: str, dry_run: bool, *, quiet: bool = False) -> None:
    request_path = _resolve_doc_path(repo_root, DOC_KINDS["request"], request_ref)
    if request_path is None:
        return

    linked_items = _collect_docs_linking_ref(repo_root, DOC_KINDS["backlog"], request_ref)
    if not linked_items:
        return

    if all(_is_doc_done(item_path, DOC_KINDS["backlog"]) for item_path in linked_items):
        if not _is_doc_done(request_path, DOC_KINDS["request"]):
            _close_doc(request_path, DOC_KINDS["request"], dry_run)
            if not quiet:
                print(f"Auto-closed request {request_ref} (all linked backlog items are done).")


def _close_chain_for_kind(repo_root: Path, source_path: Path, kind: DOC_KINDS, *, dry_run: bool, quiet: bool = False) -> None:
    _close_doc(source_path, kind, dry_run)

    text = _strip_mermaid_blocks(source_path.read_text(encoding="utf-8"))
    processed_request_refs: set[str] = set()

    if kind.kind == "task":
        _mark_section_checkboxes_done(source_path, "Definition of Done (DoD)", dry_run)
        _record_finished_task_follow_up(repo_root, source_path, dry_run)
        _sync_linked_backlog_progress(repo_root, source_path, dry_run=dry_run)

        linked_item_refs = sorted(_extract_refs(text, DOC_KINDS["backlog"].prefix))
        for item_ref in linked_item_refs:
            item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
            if item_path is None:
                continue
            linked_tasks = _collect_docs_linking_ref(repo_root, DOC_KINDS["task"], item_ref)
            if linked_tasks and all(_is_doc_done(task_path, DOC_KINDS["task"]) for task_path in linked_tasks):
                if not _has_done_status(item_path):
                    _close_doc(item_path, DOC_KINDS["backlog"], dry_run)
                    if not quiet:
                        print(f"Auto-closed backlog item {item_ref} (all linked tasks are done).")

            item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
            for request_ref in sorted(_extract_refs(item_text, DOC_KINDS["request"].prefix)):
                if request_ref in processed_request_refs:
                    continue
                processed_request_refs.add(request_ref)
                _maybe_close_request_chain(repo_root, request_ref, dry_run, quiet=quiet)

    if kind.kind == "backlog":
        for request_ref in sorted(_extract_refs(text, DOC_KINDS["request"].prefix)):
            if request_ref in processed_request_refs:
                continue
            processed_request_refs.add(request_ref)
            _maybe_close_request_chain(repo_root, request_ref, dry_run, quiet=quiet)

    if kind.kind == "request":
        _maybe_close_request_chain(repo_root, source_path.stem, dry_run, quiet=quiet)


def cmd_finish_task(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], args.source)

    _close_chain_for_kind(repo_root, source_path, DOC_KINDS["task"], dry_run=args.dry_run, quiet=args.format == "json")

    if args.dry_run:
        payload = {"command": "finish", "kind": "task", "source": source_path.relative_to(repo_root).as_posix(), "dry_run": True}
        if args.format == "json":
            print_payload(payload, args.format)
        else:
            print("Dry run: skipped post-close verification.")
        return payload

    issues = _verify_finished_task_chain(repo_root, source_path)
    if issues:
        details = "\n".join(f"- {issue}" for issue in issues)
        raise SystemExit(f"Finish verification failed:\n{details}")

    payload = {"command": "finish", "kind": "task", "source": source_path.relative_to(repo_root).as_posix(), "dry_run": False}
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Finish verification: OK for {source_path.relative_to(repo_root)}")
    return payload


def main(argv: list[str]) -> int:
    if not argv or argv[0] in HELP_FLAGS:
        _print_help(_build_help())
        return 0
    if argv[0] == "new" and _help_requested(argv, 1):
        _print_help(_build_new_help())
        return 0
    if argv[0] == "new" and len(argv) > 1 and argv[1] in DOC_KINDS and _help_requested(argv, 2):
        _print_help(_build_new_kind_help(argv[1]))
        return 0
    # `list` takes no positional argument, so a bare invocation is the documented
    # default form, not a request for help. Only an explicit help flag prints help.
    if argv[0] == "list" and len(argv) > 1 and argv[1] in HELP_FLAGS:
        _print_help(_build_list_help())
        return 0
    if argv[0] == "show" and _help_requested(argv, 1):
        _print_help(_build_show_help())
        return 0
    if argv[0] == "companion" and _help_requested(argv, 1):
        _print_help(_build_companion_help())
        return 0
    if argv[0] == "companion" and len(argv) > 1 and argv[1] in {"product", "architecture"} and _help_requested(argv, 2):
        _print_help(_build_companion_kind_help(argv[1]))
        return 0
    if argv[0] == "deliver" and _help_requested(argv, 1):
        _print_help(_build_deliver_help())
        return 0
    if argv[0] == "validate-closeout" and _help_requested(argv, 1):
        _print_help(_build_validate_closeout_help())
        return 0
    if argv[0] == "start" and _help_requested(argv, 1):
        _print_help(_build_start_help())
        return 0
    if argv[0] == "repair" and _help_requested(argv, 1):
        _print_help(_build_repair_help())
        return 0
    if argv[0] == "repair" and len(argv) > 1 and argv[1] in {"gates", "ac-traceability", "links", "mermaid"} and _help_requested(argv, 2):
        _print_help(_build_repair_kind_help(argv[1]))
        return 0
    if argv[0] == "closeout" and _help_requested(argv, 1):
        _print_help(_build_closeout_help())
        return 0
    if argv[0] == "promote" and _help_requested(argv, 1):
        _print_help(_build_promote_help())
        return 0
    if argv[0] == "promote" and len(argv) > 1 and argv[1] in {"request-to-backlog", "backlog-to-task"} and _help_requested(argv, 2):
        _print_help(_build_promote_variant_help(argv[1]))
        return 0
    if argv[0] == "split" and _help_requested(argv, 1):
        _print_help(_build_split_help())
        return 0
    if argv[0] == "split" and len(argv) > 1 and argv[1] in {"request", "backlog"} and _help_requested(argv, 2):
        _print_help(_build_split_variant_help(argv[1]))
        return 0
    if argv[0] == "close" and _help_requested(argv, 1):
        _print_help(_build_close_help())
        return 0
    if argv[0] == "close" and len(argv) > 1 and argv[1] in {"request", "backlog", "task"} and _help_requested(argv, 2):
        _print_help(_build_close_kind_help(argv[1]))
        return 0
    if argv[0] == "finish" and _help_requested(argv, 1):
        _print_help(_build_finish_help())
        return 0
    if argv[0] == "finish" and len(argv) > 1 and argv[1] == "task" and _help_requested(argv, 2):
        _print_help(_build_finish_kind_help(argv[1]))
        return 0
    if argv[0] == "progress" and _help_requested(argv, 1):
        _print_help(_build_progress_help())
        return 0
    if argv[0] == "progress" and len(argv) > 1 and argv[1] == "task" and _help_requested(argv, 2):
        _print_help(_build_progress_kind_help(argv[1]))
        return 0
    valid_commands = {"new", "list", "statuses", "show", "companion", "roadmap", "deliver", "scaffold", "validate", "validate-closeout", "start", "progress", "repair", "closeout", "promote", "split", "close", "withdraw", "finish"}
    if argv[0] not in valid_commands:
        hint = " Use `logics-manager flow show <ref>` to inspect a workflow doc." if argv[0] in {"read", "view", "cat"} else " Run `logics-manager flow --help` for valid commands."
        raise SystemExit(f"Unsupported flow subcommand: {argv[0]}.{hint}")
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command not in valid_commands:
        raise SystemExit("Unsupported flow subcommand for the native CLI slice.")
    payload = args.func(args)
    if args.command == "validate-closeout" and isinstance(payload, dict) and not payload.get("ok", False):
        return 1
    if args.command == "closeout" and isinstance(payload, dict) and not payload.get("ok", False):
        return 1
    return 0 if isinstance(payload, dict) else 1
