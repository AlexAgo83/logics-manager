from __future__ import annotations

import argparse
from pathlib import Path

from .config import ConfigError, find_repo_root, load_repo_config
from .doctor import doctor_payload
from .lint import lint_payload
from .termstyle import colorize_help

from .assist_handoff import build_handoff as _build_handoff
from .assist_surface import build_changed_surface_summary as _build_changed_surface_summary

# Shared helpers, constants, and builders are defined in assist_support. They
# are re-exported here so that existing call sites and tests that reference
# `logics_manager.assist.<name>` (including monkeypatch targets) keep working.
from .assist_support import (
    ASSIST_FLOW_DEFAULTS,
    CLAUDE_BRIDGE_VARIANTS,
    DEFAULT_ESTIMATED_REMOTE_TOKENS_PER_LOCAL_RUN,
    DEFAULT_HYBRID_AUDIT_LOG,
    DEFAULT_HYBRID_MEASUREMENT_LOG,
    DEFAULT_HYBRID_ROI_RECENT_LIMIT,
    DEFAULT_HYBRID_ROI_WINDOW_DAYS,
    HELP_FLAGS,
    _append_section_bullets,
    _audit_review_recommended,
    _build_backlog_groom,
    _build_claude_bridge_manifest,
    _build_claude_instructions,
    _build_closure_summary,
    _build_commit_plan,
    _build_context_pack,
    _build_doc_consistency,
    _build_hybrid_roi_report,
    _build_next_step,
    _build_request_draft,
    _build_review_checklist,
    _build_spec_first_pass,
    _build_test_impact_summary,
    _build_validated_excerpt,
    _build_validation_checklist,
    _build_validation_summary,
    _bullet_values,
    _claude_bridge_status,
    _classify_diff_risk,
    _doc_status,
    _execution_path_label,
    _extract_doc_links,
    _extract_title_from_doc,
    _fallback_triggered,
    _get_global_claude_home,
    _get_nested,
    _git_changed_paths,
    _hybrid_audit_log,
    _hybrid_measurement_log,
    _is_low_risk_generated_path,
    _is_schema_or_migration_path,
    _load_jsonl_records,
    _measurement_review_recommended,
    _next_backlog_ref,
    _next_request_ref,
    _next_spec_ref,
    _normalize_reason_label,
    _parse_package_version,
    _parse_recorded_at,
    _render_claude_bridge_lines,
    _render_diff_risk_text,
    _repo_path,
    _resolve_workflow_doc,
    _round_rate,
    _section_lines,
    _select_backend,
    _slugify,
    _split_backlog_problem,
    _split_request_acceptance,
    _stringify_scalar,
    _summarize_commit_scope,
    _summarize_validated_payload,
    _title_from_request_intent,
    _workflow_docs,
)

# Subcommands live in themed modules. Re-export them so the parser and any
# external references continue to resolve `logics_manager.assist.cmd_*`.
from .assist_review import (
    cmd_changed_surface_summary,
    cmd_commit_plan,
    cmd_diff_risk,
    cmd_review_checklist,
    cmd_test_impact_summary,
    cmd_validation_checklist,
    cmd_validation_summary,
)
from .assist_workflow import (
    cmd_backlog_groom,
    cmd_closure_summary,
    cmd_handoff,
    cmd_next_step,
    cmd_request_draft,
    cmd_spec_first_pass,
)
from .assist_context import (
    cmd_claude_bridges,
    cmd_claude_instructions,
    cmd_context,
    cmd_doc_consistency,
    cmd_roi_report,
    cmd_runtime_status,
)
from .cdx_memory import cdx_memory_payload
from .cli_output import render_payload


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager assist",
        description="Inspect the local assist/runtime surface.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    runtime = sub.add_parser("runtime-status", help="Report local assist runtime readiness.")
    runtime.add_argument("--backend")
    runtime.add_argument("--model-profile")
    runtime.add_argument("--model")
    runtime.add_argument("--ollama-host")
    runtime.add_argument("--timeout", type=float)
    runtime.add_argument("--format", choices=("text", "json"), default="text")
    runtime.add_argument("--out", help="Write the JSON status payload to this relative path.")
    runtime.add_argument("--dry-run", action="store_true")
    runtime.set_defaults(func=cmd_runtime_status)

    diff_risk = sub.add_parser("diff-risk", help="Classify the current git diff using deterministic heuristics.")
    diff_risk.add_argument("--format", choices=("text", "json"), default="text")
    diff_risk.add_argument("--dry-run", action="store_true")
    diff_risk.set_defaults(func=cmd_diff_risk)

    commit_plan = sub.add_parser("commit-plan", help="Draft a minimal commit plan from the current git diff.")
    commit_plan.add_argument("--format", choices=("text", "json"), default="text")
    commit_plan.add_argument("--dry-run", action="store_true")
    commit_plan.set_defaults(func=cmd_commit_plan)

    changed_surface = sub.add_parser("changed-surface-summary", help="Summarize the current changed repository surface.")
    changed_surface.add_argument("--format", choices=("text", "json"), default="text")
    changed_surface.add_argument("--dry-run", action="store_true")
    changed_surface.set_defaults(func=cmd_changed_surface_summary)

    doc_consistency = sub.add_parser("doc-consistency", help="Review workflow docs for consistency issues without mutating them.")
    doc_consistency.add_argument("--format", choices=("text", "json"), default="text")
    doc_consistency.add_argument("--dry-run", action="store_true")
    doc_consistency.set_defaults(func=cmd_doc_consistency)

    review_checklist = sub.add_parser("review-checklist", help="Generate a bounded review checklist for the current change surface.")
    review_checklist.add_argument("--format", choices=("text", "json"), default="text")
    review_checklist.add_argument("--dry-run", action="store_true")
    review_checklist.set_defaults(func=cmd_review_checklist)

    validation_checklist = sub.add_parser("validation-checklist", help="Generate a deterministic validation checklist from the current change surface.")
    validation_checklist.add_argument("--format", choices=("text", "json"), default="text")
    validation_checklist.add_argument("--dry-run", action="store_true")
    validation_checklist.set_defaults(func=cmd_validation_checklist)

    validation_summary = sub.add_parser("validation-summary", help="Summarize lint, doctor, and validation impact signals.")
    validation_summary.add_argument("--format", choices=("text", "json"), default="text")
    validation_summary.add_argument("--dry-run", action="store_true")
    validation_summary.set_defaults(func=cmd_validation_summary)

    test_impact = sub.add_parser("test-impact-summary", help="Summarize the likely test impact of the current change surface.")
    test_impact.add_argument("--format", choices=("text", "json"), default="text")
    test_impact.add_argument("--dry-run", action="store_true")
    test_impact.set_defaults(func=cmd_test_impact_summary)

    roi = sub.add_parser("roi-report", help="Summarize hybrid assist ROI from local audit and measurement logs.")
    roi.add_argument("--audit-log")
    roi.add_argument("--measurement-log")
    roi.add_argument("--recent-limit", type=int, default=DEFAULT_HYBRID_ROI_RECENT_LIMIT)
    roi.add_argument("--window-days", type=int, default=DEFAULT_HYBRID_ROI_WINDOW_DAYS)
    roi.add_argument("--format", choices=("text", "json"), default="text")
    roi.add_argument("--out", help="Write the JSON report payload to this relative path.")
    roi.add_argument("--dry-run", action="store_true")
    roi.set_defaults(func=cmd_roi_report)

    claude_bridges = sub.add_parser(
        "claude-bridges",
        help="Render the canonical Claude runtime publication manifest and prompts derived from the integrated runtime.",
    )
    claude_bridges.add_argument("--format", choices=("text", "json"), default="text")
    claude_bridges.add_argument("--dry-run", action="store_true")
    claude_bridges.set_defaults(func=cmd_claude_bridges)

    context = sub.add_parser("context", help="Build a shared assist context bundle for a flow.")
    context.add_argument("flow_name", choices=tuple(sorted(ASSIST_FLOW_DEFAULTS.keys())))
    context.add_argument("ref", nargs="?", help="Optional workflow ref for flows that target a doc.")
    context.add_argument("--context-mode", choices=("summary-only", "diff-first", "full"))
    context.add_argument("--profile", choices=("tiny", "normal", "deep"))
    context.add_argument("--include-graph", action="store_true", default=None)
    context.add_argument("--include-registry", action="store_true", default=None)
    context.add_argument("--include-doctor", action="store_true", default=None)
    context.add_argument("--format", choices=("text", "json"), default="text")
    context.add_argument("--out", help="Write the JSON context bundle to this relative path.")
    context.add_argument("--dry-run", action="store_true")
    context.set_defaults(func=cmd_context)

    claude_instructions = sub.add_parser(
        "claude-instructions",
        help="Render the canonical assistant instructions derived from the integrated runtime.",
    )
    claude_instructions.add_argument("--format", choices=("text", "json"), default="text")
    claude_instructions.add_argument("--dry-run", action="store_true")
    claude_instructions.set_defaults(func=cmd_claude_instructions)

    cdx_memory = sub.add_parser("cdx-memory", help="Read bounded cleaned context from `cdx memory`.")
    cdx_memory_sub = cdx_memory.add_subparsers(dest="cdx_memory_command", required=True)
    cdx_memory_show = cdx_memory_sub.add_parser("show", help="Show cleaned CDX memory context.")
    cdx_memory_show.add_argument("--scope", choices=("current", "global", "project"), default="current")
    cdx_memory_show.add_argument("--clean", action="store_true", help="Prefer cleaned excerpt in text output.")
    cdx_memory_show.add_argument("--max-chars", type=int, default=4000)
    cdx_memory_show.add_argument("--format", choices=("text", "json"), default="text")
    cdx_memory_show.set_defaults(func=cmd_cdx_memory_show)

    next_step = sub.add_parser("next-step", help="Suggest the next bounded Logics step for a target doc.")
    next_step.add_argument("ref", nargs="?", help="Optional workflow ref for a target doc.")
    next_step.add_argument("--format", choices=("text", "json"), default="text")
    next_step.add_argument("--dry-run", action="store_true")
    next_step.set_defaults(func=cmd_next_step)

    request_draft = sub.add_parser("request-draft", help="Draft a bounded request doc from an intent.")
    request_draft.add_argument("--intent", required=True, help="Short operator intent to draft the request from.")
    request_draft.add_argument("--format", choices=("text", "json"), default="text")
    request_draft.add_argument("--execution-mode", choices=("suggestion-only", "execute"), default="suggestion-only")
    request_draft.add_argument("--dry-run", action="store_true")
    request_draft.set_defaults(func=cmd_request_draft)

    spec_first_pass = sub.add_parser("spec-first-pass", help="Draft a first-pass spec outline from a backlog item.")
    spec_first_pass.add_argument("ref", help="Backlog ref for the spec source.")
    spec_first_pass.add_argument("--format", choices=("text", "json"), default="text")
    spec_first_pass.add_argument("--execution-mode", choices=("suggestion-only", "execute"), default="suggestion-only")
    spec_first_pass.add_argument("--dry-run", action="store_true")
    spec_first_pass.set_defaults(func=cmd_spec_first_pass)

    backlog_groom = sub.add_parser("backlog-groom", help="Draft a bounded backlog proposal from a request doc.")
    backlog_groom.add_argument("ref", help="Request ref for the backlog source.")
    backlog_groom.add_argument("--format", choices=("text", "json"), default="text")
    backlog_groom.add_argument("--execution-mode", choices=("suggestion-only", "execute"), default="suggestion-only")
    backlog_groom.add_argument("--dry-run", action="store_true")
    backlog_groom.set_defaults(func=cmd_backlog_groom)

    closure_summary = sub.add_parser("closure-summary", help="Summarize a delivered request, backlog item, or task.")
    closure_summary.add_argument("ref", nargs="?", help="Optional workflow ref for a delivered doc.")
    closure_summary.add_argument("--format", choices=("text", "json"), default="text")
    closure_summary.add_argument("--dry-run", action="store_true")
    closure_summary.set_defaults(func=cmd_closure_summary)

    handoff = sub.add_parser("handoff", help="Summarize commits, changed surfaces, Logics docs, validations, and next actions.")
    handoff.add_argument("--since", required=True)
    handoff.add_argument("--format", choices=("text", "json"), default="text")
    handoff.add_argument("--dry-run", action="store_true")
    handoff.set_defaults(func=cmd_handoff)

    return parser


def cmd_cdx_memory_show(args: argparse.Namespace) -> dict[str, object]:
    repo_root = find_repo_root(Path.cwd())
    payload = cdx_memory_payload(repo_root, scope=args.scope, max_chars=max(200, min(args.max_chars, 20000)))
    if args.format == "json":
        print(render_payload(payload, "json"))
    else:
        excerpt = payload.get("cleaned_excerpt") if args.clean else payload.get("raw_excerpt")
        print(f"CDX memory {payload.get('scope')}: {payload.get('state')}")
        for warning in payload.get("warnings", []):
            print(f"- warning: {warning}")
        if excerpt:
            print(str(excerpt))
    return payload


def _build_help() -> str:
    return "\n".join(
        [
            "Logics Assist CLI",
            "Inspect runtime signals and build context bundles.",
            "",
            "Usage:",
            "  logics-manager assist <command> [args...]",
            "",
            "Runtime and diagnostics:",
            "  runtime-status",
            "    Report local assist runtime readiness.",
            "    Flags: --backend, --model-profile, --model, --ollama-host, --timeout, --format {text,json}, --out, --dry-run",
            "  diff-risk",
            "    Classify the current git diff using deterministic heuristics.",
            "    Flags: --format {text,json}, --dry-run",
            "  commit-plan",
            "    Draft a minimal commit plan from the current git diff.",
            "    Flags: --format {text,json}, --dry-run",
            "  changed-surface-summary",
            "    Summarize the current changed repository surface.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "Review and governance:",
            "  doc-consistency",
            "    Review workflow docs for consistency issues without mutating them.",
            "    Flags: --format {text,json}, --dry-run",
            "  review-checklist",
            "    Generate a bounded review checklist for the current change surface.",
            "    Flags: --format {text,json}, --dry-run",
            "  validation-checklist",
            "    Generate a deterministic validation checklist from the current change surface.",
            "    Flags: --format {text,json}, --dry-run",
            "  validation-summary",
            "    Summarize lint, doctor, and validation impact signals.",
            "    Flags: --format {text,json}, --dry-run",
            "  test-impact-summary",
            "    Summarize the likely test impact of the current change surface.",
            "    Flags: --format {text,json}, --dry-run",
            "  roi-report",
            "    Summarize hybrid assist ROI from local audit and measurement logs.",
            "    Flags: --audit-log, --measurement-log, --recent-limit, --window-days, --format {text,json}, --out, --dry-run",
            "",
            "Context and prompts:",
            "  claude-bridges",
            "    Render the canonical Claude runtime publication manifest and prompts.",
            "    Flags: --format {text,json}, --dry-run",
            "  context <flow_name> [ref]",
            "    Build a shared assist context bundle for a flow.",
            "    Flags: --context-mode {summary-only,diff-first,full}, --profile {tiny,normal,deep}, --include-graph, --include-registry, --include-doctor, --format {text,json}, --out, --dry-run",
            "  claude-instructions",
            "    Render the canonical assistant instructions derived from the integrated runtime.",
            "    Flags: --format {text,json}, --dry-run",
            "  next-step [ref]",
            "    Suggest the next bounded Logics step for a target doc.",
            "    Flags: --format {text,json}, --dry-run",
            "  request-draft",
            "    Draft a bounded request doc from an intent.",
            "    Flags: --intent, --format {text,json}, --execution-mode {suggestion-only,execute}, --dry-run",
            "  spec-first-pass <ref>",
            "    Draft a first-pass spec outline from a backlog item.",
            "    Flags: --format {text,json}, --execution-mode {suggestion-only,execute}, --dry-run",
            "  backlog-groom <ref>",
            "    Draft a bounded backlog proposal from a request doc.",
            "    Flags: --format {text,json}, --execution-mode {suggestion-only,execute}, --dry-run",
            "  closure-summary [ref]",
            "    Summarize a delivered request, backlog item, or task.",
            "    Flags: --format {text,json}, --dry-run",
            "  handoff",
            "    Summarize commits, changed surfaces, Logics docs, validations, and next actions.",
            "    Flags: --since, --format {text,json}, --dry-run",
            "",
            "Examples:",
            "  logics-manager assist runtime-status --format json",
            "  logics-manager assist context request req_001_my_request --profile deep",
            "  logics-manager assist request-draft --intent \"Improve onboarding\"",
            "  logics-manager assist handoff --since HEAD~1",
        ]
    )


def _build_command_help(command: str) -> str:
    if command == "runtime-status":
        return "\n".join(
            [
                "Logics Assist Runtime Status",
                "Report local assist runtime readiness.",
                "",
                "Usage:",
                "  logics-manager assist runtime-status [args...]",
                "",
                "Flags:",
                "  --backend",
                "  --model-profile",
                "  --model",
                "  --ollama-host",
                "  --timeout",
                "  --format {text,json}",
                "  --out",
                "  --dry-run",
            ]
        )
    if command == "context":
        return "\n".join(
            [
                "Logics Assist Context",
                "Build a shared assist context bundle for a flow.",
                "",
                "Usage:",
                "  logics-manager assist context <flow_name> [ref] [args...]",
                "",
                "Flags:",
                "  --context-mode {summary-only,diff-first,full}",
                "  --profile {tiny,normal,deep}",
                "  --include-graph",
                "  --include-registry",
                "  --include-doctor",
                "  --format {text,json}",
                "  --out",
                "  --dry-run",
            ]
        )
    if command == "request-draft":
        return "\n".join(
            [
                "Logics Assist Request Draft",
                "Draft a bounded request doc from an intent.",
                "",
                "Usage:",
                "  logics-manager assist request-draft [args...]",
                "",
                "Flags:",
                "  --intent",
                "  --format {text,json}",
                "  --execution-mode {suggestion-only,execute}",
                "  --dry-run",
            ]
        )
    if command == "spec-first-pass":
        return "\n".join(
            [
                "Logics Assist Spec First Pass",
                "Draft a first-pass spec outline from a backlog item.",
                "",
                "Usage:",
                "  logics-manager assist spec-first-pass <ref> [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --execution-mode {suggestion-only,execute}",
                "  --dry-run",
            ]
        )
    if command == "backlog-groom":
        return "\n".join(
            [
                "Logics Assist Backlog Groom",
                "Draft a bounded backlog proposal from a request doc.",
                "",
                "Usage:",
                "  logics-manager assist backlog-groom <ref> [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --execution-mode {suggestion-only,execute}",
                "  --dry-run",
            ]
        )
    if command == "closure-summary":
        return "\n".join(
            [
                "Logics Assist Closure Summary",
                "Summarize a delivered request, backlog item, or task.",
                "",
                "Usage:",
                "  logics-manager assist closure-summary [ref] [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "handoff":
        return "\n".join(
            [
                "Logics Assist Handoff",
                "Summarize commits, changed surfaces, Logics docs, validations, and next actions.",
                "",
                "Usage:",
                "  logics-manager assist handoff --since <rev> [args...]",
                "",
                "Flags:",
                "  --since",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "roi-report":
        return "\n".join(
            [
                "Logics Assist ROI Report",
                "Summarize hybrid assist ROI from local audit and measurement logs.",
                "",
                "Usage:",
                "  logics-manager assist roi-report [args...]",
                "",
                "Flags:",
                "  --audit-log",
                "  --measurement-log",
                "  --recent-limit",
                "  --window-days",
                "  --format {text,json}",
                "  --out",
                "  --dry-run",
            ]
        )
    if command == "diff-risk":
        return "\n".join(
            [
                "Logics Assist Diff Risk",
                "Classify the current git diff using deterministic heuristics.",
                "",
                "Usage:",
                "  logics-manager assist diff-risk [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "commit-plan":
        return "\n".join(
            [
                "Logics Assist Commit Plan",
                "Draft a minimal commit plan from the current git diff.",
                "",
                "Usage:",
                "  logics-manager assist commit-plan [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "changed-surface-summary":
        return "\n".join(
            [
                "Logics Assist Changed Surface Summary",
                "Summarize the current changed repository surface.",
                "",
                "Usage:",
                "  logics-manager assist changed-surface-summary [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "doc-consistency":
        return "\n".join(
            [
                "Logics Assist Doc Consistency",
                "Review workflow docs for consistency issues without mutating them.",
                "",
                "Usage:",
                "  logics-manager assist doc-consistency [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "review-checklist":
        return "\n".join(
            [
                "Logics Assist Review Checklist",
                "Generate a bounded review checklist for the current change surface.",
                "",
                "Usage:",
                "  logics-manager assist review-checklist [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "validation-checklist":
        return "\n".join(
            [
                "Logics Assist Validation Checklist",
                "Generate a deterministic validation checklist from the current change surface.",
                "",
                "Usage:",
                "  logics-manager assist validation-checklist [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "validation-summary":
        return "\n".join(
            [
                "Logics Assist Validation Summary",
                "Summarize lint, doctor, and validation impact signals.",
                "",
                "Usage:",
                "  logics-manager assist validation-summary [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "test-impact-summary":
        return "\n".join(
            [
                "Logics Assist Test Impact Summary",
                "Summarize the likely test impact of the current change surface.",
                "",
                "Usage:",
                "  logics-manager assist test-impact-summary [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "claude-bridges":
        return "\n".join(
            [
                "Logics Assist Claude Bridges",
                "Render the canonical Claude runtime publication manifest and prompts.",
                "",
                "Usage:",
                "  logics-manager assist claude-bridges [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "claude-instructions":
        return "\n".join(
            [
                "Logics Assist Claude Instructions",
                "Render the canonical assistant instructions derived from the integrated runtime.",
                "",
                "Usage:",
                "  logics-manager assist claude-instructions [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    if command == "next-step":
        return "\n".join(
            [
                "Logics Assist Next Step",
                "Suggest the next bounded Logics step for a target doc.",
                "",
                "Usage:",
                "  logics-manager assist next-step [ref] [args...]",
                "",
                "Flags:",
                "  --format {text,json}",
                "  --dry-run",
            ]
        )
    return _build_help()


def _print_help(text: str) -> None:
    print(colorize_help(text))


def main(argv: list[str]) -> int:
    if not argv or argv[0] in HELP_FLAGS:
        _print_help(_build_help())
        return 0
    if argv[0] in {"runtime-status", "context", "request-draft", "spec-first-pass", "backlog-groom", "closure-summary", "handoff", "roi-report", "diff-risk", "commit-plan", "changed-surface-summary", "doc-consistency", "review-checklist", "validation-checklist", "validation-summary", "test-impact-summary", "claude-bridges", "claude-instructions", "next-step"} and len(argv) > 1 and argv[1] in HELP_FLAGS:
        _print_help(_build_command_help(argv[0]))
        return 0
    parser = build_parser()
    args = parser.parse_args(argv)
    payload = args.func(args)
    return 0 if isinstance(payload, dict) else 1
