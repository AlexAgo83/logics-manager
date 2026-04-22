from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path
from contextlib import redirect_stdout

FLOW_MANAGER_SCRIPTS = Path(__file__).resolve().parents[1] / "logics" / "skills" / "logics-flow-manager" / "scripts" / "workflow"
if str(FLOW_MANAGER_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(FLOW_MANAGER_SCRIPTS))

from logics_flow_decision_support import _apply_decision_assessment, _assess_decision_framing, _print_decision_summary  # noqa: E402
from logics_flow_runtime_support import _resolved_from_version, _seed_new_doc_values  # noqa: E402
from logics_flow_support_workflow_core import (  # noqa: E402
    DOC_KINDS,
    STATUS_BY_KIND_DEFAULT,
    _copy_indicator_defaults,
    _find_repo_root,
    _generate_workflow_mermaid,
    _plan_doc,
    _render_template,
    _strip_mermaid_blocks,
    _template_path,
    refresh_workflow_mermaid_signature_text,
)
from logics_flow_support_workflow_extra import (  # noqa: E402
    _auto_create_companion_docs,
    _build_template_values,
    _collect_reference_items,
    _parse_title_from_source,
    _render_references_section,
    refresh_ai_context_text,
    validate_generated_workflow_doc_text,
)


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

    return parser


def cmd_new(args: argparse.Namespace) -> dict[str, object]:
    doc_kind = DOC_KINDS[args.kind]
    repo_root = _find_repo_root(Path.cwd())
    fixture_mode = bool(getattr(args, "fixture", False))
    planned = _plan_doc(repo_root, doc_kind.directory, doc_kind.prefix, args.slug or args.title, dry_run=args.dry_run)

    template_text = (
        repo_root / "logics" / "skills" / "logics-flow-manager" / "assets" / "templates" / doc_kind.template_name
    ).read_text(encoding="utf-8")
    args.from_version = _resolved_from_version(repo_root, getattr(args, "from_version", None))
    values = _build_template_values(
        args,
        planned.ref,
        args.title,
        doc_kind.include_progress,
        doc_kind.kind,
        fixture_mode=fixture_mode,
    )
    _seed_new_doc_values(doc_kind.kind, args.title, values, fixture_mode=fixture_mode)

    reference_items = _collect_reference_items(args.title)
    if fixture_mode and doc_kind.kind == "request":
        reference_items.extend(
            [
                "logics/skills/logics-flow-manager/scripts/logics_flow.py",
                "logics/skills/logics-flow-manager/scripts/workflow_audit.py",
                "logics/skills/tests/run_cli_smoke_checks.py",
            ]
        )
    values["REFERENCES_SECTION"] = _render_references_section(reference_items)

    assessment = _assess_decision_framing(args.title, "")
    product_refs: list[str] = []
    architecture_refs: list[str] = []
    if doc_kind.kind in {"backlog", "task"}:
        product_refs, architecture_refs = _auto_create_companion_docs(
            repo_root,
            args.title,
            request_ref=None,
            backlog_ref=planned.ref if doc_kind.kind == "backlog" else None,
            task_ref=planned.ref if doc_kind.kind == "task" else None,
            assessment=assessment,
            product_refs=product_refs,
            architecture_refs=architecture_refs,
            args=args,
        )
        _apply_decision_assessment(values, assessment)
        if product_refs:
            values["PRODUCT_LINK_PLACEHOLDER"] = ", ".join(f"`{ref}`" for ref in product_refs)
        if architecture_refs:
            values["ARCHITECTURE_LINK_PLACEHOLDER"] = ", ".join(f"`{ref}`" for ref in architecture_refs)

    payload: dict[str, object] = {
        "command": "new",
        "kind": doc_kind.kind,
        "ref": planned.ref,
        "path": planned.path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        with redirect_stdout(io.StringIO()):
            values["MERMAID_BLOCK"] = _generate_workflow_mermaid(repo_root, doc_kind.kind, args.title, values, dry_run=args.dry_run)
            content = _render_template(template_text, values).rstrip() + "\n"
            content, _changed = refresh_ai_context_text(content, doc_kind.kind)
            content, _changed = refresh_workflow_mermaid_signature_text(content, doc_kind.kind, repo_root=repo_root, dry_run=args.dry_run)
            validate_generated_workflow_doc_text(content, doc_kind.kind)
            if not args.dry_run:
                planned.path.parent.mkdir(parents=True, exist_ok=True)
                planned.path.write_text(content, encoding="utf-8")
            if doc_kind.kind in {"backlog", "task"}:
                _print_decision_summary(planned.ref, assessment, product_refs, architecture_refs)
        print(json.dumps(payload, indent=2, sort_keys=True))
        return payload

    values["MERMAID_BLOCK"] = _generate_workflow_mermaid(repo_root, doc_kind.kind, args.title, values, dry_run=args.dry_run)
    content = _render_template(template_text, values).rstrip() + "\n"
    content, _changed = refresh_ai_context_text(content, doc_kind.kind)
    content, _changed = refresh_workflow_mermaid_signature_text(content, doc_kind.kind, repo_root=repo_root, dry_run=args.dry_run)
    validate_generated_workflow_doc_text(content, doc_kind.kind)

    if not args.dry_run:
        planned.path.parent.mkdir(parents=True, exist_ok=True)
        planned.path.write_text(content, encoding="utf-8")
        print(f"Wrote {planned.path}")
    else:
        preview = content if len(content) <= 2000 else content[:2000] + "\n...\n"
        print(f"[dry-run] would write: {planned.path}")
        print(preview)

    if doc_kind.kind in {"backlog", "task"}:
        _print_decision_summary(planned.ref, assessment, product_refs, architecture_refs)
    print(f"Created {doc_kind.kind}: {payload['path']}")
    return payload


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command != "new":
        raise SystemExit("Unsupported flow subcommand for the native CLI slice.")
    payload = cmd_new(args)
    return 0 if isinstance(payload, dict) else 1
