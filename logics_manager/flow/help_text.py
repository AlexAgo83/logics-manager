"""Help text for the `flow` CLI's subcommands.

req_323/item_669: lifted out of flow/__init__.py, following the same
"vocabulary vs. verbs" split already used for docs.py - these functions only
build --help strings and touch nothing about how a command actually runs.

`build_parser` is imported lazily, inside each function rather than at
module load time: `flow/__init__.py` needs these help builders, and these
builders need the parser `flow/__init__.py` defines, so a top-level import
either way would be circular.
"""

from __future__ import annotations

from ..help_flags import flag_lines, subparser_for


def _format_flag_list(flags: list[str]) -> str:
    return ", ".join(flags)


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


def _flow_flag_lines(path: list[str]) -> list[str]:
    from . import build_parser

    return flag_lines(subparser_for(build_parser(), path))


def _flow_flag_names(path: list[str]) -> list[str]:
    return [line.strip() for line in _flow_flag_lines(path)]


def _build_new_kind_help(kind: str) -> str:
    if kind == "request":
        kind_title = "Request"
        examples = ['  logics-manager flow new request --title "Capture migration risks"']
    elif kind == "backlog":
        kind_title = "Backlog"
        examples = ['  logics-manager flow new backlog --title "Break work into slices"']
    else:
        kind_title = "Task"
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
            f"  {_format_flag_list(_flow_flag_names(['new', kind]))}",
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
            *_flow_flag_lines(["list"]),
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
            *_flow_flag_lines(["show"]),
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
            "  logics-manager flow companion <product|architecture|runbook> [args...]",
            "",
            "Kinds:",
            "  product",
            "    Create a product companion doc.",
            "    Flags: --title, --source-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "  architecture",
            "    Create an architecture companion doc.",
            "    Flags: --title, --source-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "  runbook",
            "    Create an operational runbook companion doc (Draft until verified).",
            "    Flags: --title, --source-ref, --request-ref, --backlog-ref, --task-ref, --format {text,json}, --dry-run",
            "",
            "Examples:",
            '  logics-manager flow companion product --title "Product note"',
            '  logics-manager flow companion architecture --title "Architecture note"',
            '  logics-manager flow companion runbook --title "Restart the ingest worker"',
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
            *_flow_flag_lines(["companion", kind]),
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
            *_flow_flag_lines(["deliver"]),
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
            *_flow_flag_lines(["validate-closeout"]),
            "",
            "Scope, against the two other commands that answer the same question:",
            "  flow validate            lint and audit findings. An AC proof gap is a deferred",
            "                           warning while no linked task is Done, so a clean result",
            "                           here does not mean closeout will pass.",
            "  flow validate-closeout   this command: the closeout preflight alone, where an AC",
            "                           proof gap is blocking whatever the lifecycle says.",
            "  flow closeout --dry-run  the same preflight, reported after the deterministic",
            "                           repairs a real closeout would attempt.",
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
            *_flow_flag_lines(["start"]),
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
            *_flow_flag_lines(["repair", kind]),
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
            *_flow_flag_lines(["closeout"]),
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
            *_flow_flag_lines(["promote", promotion]),
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
            *_flow_flag_lines(["split", split_kind]),
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
            *_flow_flag_lines(["close", kind]),
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
            *_flow_flag_lines(["finish", kind]),
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
            *_flow_flag_lines(["progress", kind]),
            "",
            "Example:",
            "  logics-manager flow progress task task_003_fix_docs --progress 40%",
        ]
    )
