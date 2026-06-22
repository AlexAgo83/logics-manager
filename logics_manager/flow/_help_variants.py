from __future__ import annotations

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


def _print_help(text: str) -> None:
    print(colorize_help(text))
