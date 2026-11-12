"""Reasoned retirement and companion status changes."""
from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from ..cli_output import print_payload
from ..doc_io import read_lines, write_doc
from ..doc_parsing import declared_refs
from ..statuses import canonical_status, closed_statuses, transition_error
from ..sync import update_workflow_indicators_payload
from .docs import (
    DOC_KINDS, _append_section_bullets, _collect_docs_linking_ref,
    _indicator_value_from_lines, _is_doc_done, _replace_indicator_line, _resolve_any_workflow_source,
    _resolve_doc_path, _restore_file_snapshot, _snapshot_existing_files, _strip_mermaid_blocks,
)

COMPANION_KINDS = ("product", "architecture", "runbook", "roadmap")


def add_lifecycle_parsers(sub: argparse._SubParsersAction) -> None:
    parser = sub.add_parser("status", help="Change a companion status and record the reason.")
    parser.add_argument("kind", choices=COMPANION_KINDS)
    parser.add_argument("source")
    parser.add_argument("--status", required=True)
    parser.add_argument("--reason", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.set_defaults(func=cmd_status)

    withdraw = sub.add_parser("withdraw", help="Retire a workflow doc with a reason or replacement.")
    withdraw.add_argument("source")
    withdraw.add_argument("--superseded-by")
    withdraw.add_argument("--reason", help="Required when retiring without a replacement.")
    withdraw.add_argument("--format", choices=("text", "json"), default="text")
    withdraw.add_argument("--dry-run", action="store_true")
    withdraw.set_defaults(func=cmd_withdraw)


def _reason(value: str | None) -> str:
    if not value or not value.strip():
        raise SystemExit("A nonempty --reason is required for status changes or retirement without --superseded-by.")
    if "\n" in value or "\r" in value:
        raise SystemExit("--reason must be a single line.")
    return value.strip()


def cmd_status(args: argparse.Namespace) -> dict[str, object]:
    from . import _find_repo_root

    repo_root = _find_repo_root(Path.cwd())
    reason = _reason(args.reason)
    path, kind = _resolve_any_workflow_source(repo_root, args.source)
    if kind != args.kind:
        raise SystemExit(f"Expected a {args.kind} document; `{path.stem}` is {kind}.")
    status = canonical_status(kind, args.status)
    # A reason-only repeat still records a review, keeping the indicator lint gate valid.
    result = update_workflow_indicators_payload(
        repo_root, path.relative_to(repo_root).as_posix(), {"Status": status}, dry_run=args.dry_run, touch=True,
    )
    _append_section_bullets(path, "Notes", [f"Status changed to {status} on {date.today().isoformat()}: {reason}"], args.dry_run)
    payload = {**result, "command": "status", "reason": reason, "status": status}
    action = "Would change" if args.dry_run else "Changed"
    print_payload(payload, args.format, f"{action} {kind} {result['path']} to {status}: {reason}")
    return payload


def _retirement_plan(repo_root: Path, source: Path, kind: str) -> list[tuple[Path, str]]:
    planned = [(source, kind)]
    retired = {source}
    for path, stage in planned:
        parent_kind = {"task": "backlog", "backlog": "request"}.get(stage)
        if parent_kind is None:
            continue
        text = _strip_mermaid_blocks(path.read_text(encoding="utf-8"))
        for ref in declared_refs(stage, text, parent_kind):
            parent = _resolve_doc_path(repo_root, DOC_KINDS[parent_kind], ref)
            if parent is None or parent in retired:
                continue
            siblings = _collect_docs_linking_ref(repo_root, DOC_KINDS[stage], ref)
            if not siblings or not all(
                sibling in retired
                or _indicator_value_from_lines(read_lines(sibling), "Status") in closed_statuses()
                or _is_doc_done(sibling, DOC_KINDS[stage])
                for sibling in siblings
            ):
                continue
            # Existing closed parents keep their status and delivery history.
            if _indicator_value_from_lines(read_lines(parent), "Status") in closed_statuses():
                continue
            planned.append((parent, parent_kind))
            retired.add(parent)
    return planned


def cmd_withdraw(args: argparse.Namespace) -> dict[str, object]:
    from . import _find_repo_root

    repo_root = _find_repo_root(Path.cwd())
    source_path, kind = _resolve_any_workflow_source(repo_root, args.source)
    if kind not in DOC_KINDS:
        raise SystemExit(f"Use `flow status {kind} {source_path.stem} --status Archived --reason <text>` for companion documents.")
    reason = _reason(args.reason) if args.reason is not None or not args.superseded_by else None
    planned = [(source_path, kind)] if args.superseded_by else _retirement_plan(repo_root, source_path, kind)
    for path, stage in planned:
        error = transition_error(stage, _indicator_value_from_lines(read_lines(path), "Status"), "Obsolete")
        if error:
            raise SystemExit(error)
    snapshot = _snapshot_existing_files(
        repo_root, [path.relative_to(repo_root).as_posix() for path, _ in planned],
    ) if not args.dry_run else None
    try:
        for path, _stage in planned:
            if not args.dry_run:
                write_doc(path, "\n".join(_replace_indicator_line(read_lines(path), "Status", "Obsolete")).rstrip() + "\n")
            notes = [f"Withdrawn as Obsolete on {date.today().isoformat()}: {reason}"] if reason else []
            if notes:
                _append_section_bullets(path, "Notes", notes, args.dry_run)
        if args.superseded_by:
            _append_section_bullets(source_path, "Links", [f"Superseded by: `{args.superseded_by}`"], args.dry_run)
    except BaseException:
        if snapshot is not None:
            _restore_file_snapshot(repo_root, snapshot)
        raise
    payload = {
        "command": "withdraw", "kind": kind,
        "source": source_path.relative_to(repo_root).as_posix(),
        "superseded_by": args.superseded_by, "reason": reason,
        "changed_files": [path.relative_to(repo_root).as_posix() for path, _ in planned],
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        print(f"Withdrew {kind}: {payload['source']}" + (f" (superseded by {args.superseded_by})" if args.superseded_by else f" ({reason})"))
    return payload
