from __future__ import annotations

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
            "  deliver --from-product <source>",
            "    Create a linked request, backlog item, and task from a product brief.",
            "    Flags: --title, --finish, --format {text,json}, --dry-run",
            "",
            "  scaffold request-chain --input <file>",
            "    Create a request, product brief, backlog slices, orchestration task, index, and optional context pack from structured JSON.",
            "    Flags: --context-pack <path>, --format {text,json}, --dry-run",
            "    Recommended: create the full request chain and handoff pack in one pass with --context-pack.",
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
