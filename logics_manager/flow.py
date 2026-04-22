from __future__ import annotations

import argparse
import io
import json
import sys
from datetime import date
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
    _append_section_bullets,
    _copy_indicator_defaults,
    _find_repo_root,
    _generate_workflow_mermaid,
    _extract_refs,
    _plan_doc,
    _render_template,
    _mark_section_checkboxes_done,
    _resolve_doc_path,
    _strip_mermaid_blocks,
    _template_path,
    refresh_workflow_mermaid_signature_text,
)
from logics_flow_support_workflow_extra import (  # noqa: E402
    _auto_create_companion_docs,
    _build_template_values,
    _collect_reference_items,
    _collect_docs_linking_ref,
    _create_backlog_from_request,
    _create_task_from_backlog,
    _close_doc,
    _is_doc_done,
    _parse_title_from_source,
    _render_references_section,
    refresh_ai_context_text,
    validate_generated_workflow_doc_text,
)


def _split_titles(raw_titles: list[str]) -> list[str]:
    titles = [title.strip() for title in raw_titles if title and title.strip()]
    if not titles:
        raise SystemExit("Provide at least one non-empty --title value.")
    return titles


def _slugify(text: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "_" for ch in text)
    cleaned = "_".join(part for part in cleaned.split("_") if part)
    return cleaned or "request"


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
        "`python_tests/test_logics_manager_cli.py`",
    ]
    return "\n".join(
        [
            f"## {planned_ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            "> Status: Draft",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Complexity: Medium",
            "> Theme: Operator workflow",
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


def _extract_doc_title(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            if " - " in payload:
                return payload.split(" - ", 1)[1].strip()
            return payload
    return path.stem


def _section_lines(lines: list[str], heading: str) -> list[str]:
    target = heading.strip().lower()
    start_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == target:
            start_idx = idx + 1
            break
    if start_idx is None:
        return []
    out: list[str] = []
    for idx in range(start_idx, len(lines)):
        line = lines[idx]
        if line.startswith("# "):
            break
        out.append(line)
    return out


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


def _build_native_backlog_from_request(repo_root: Path, request_path: Path, title: str | None = None) -> tuple[str, str]:
    request_lines = request_path.read_text(encoding="utf-8").splitlines()
    request_title = title or _extract_doc_title(request_path)
    ref = _next_backlog_ref(repo_root, request_title)
    from_version = next((line.split(":", 1)[1].strip() for line in request_lines if line.strip().startswith("> From version:")), _resolved_from_version(repo_root, None))
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
            "- Product brief(s): `logics/product/prod_009_logics_cli_as_the_primary_operator_surface_and_unified_runtime_api.md`",
            "- Architecture decision(s): (none yet)",
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
            "- Impact:",
            "- Urgency:",
            "",
            "# Notes",
            f"- Hybrid rationale: Derived from request `{request_path.stem}` and kept bounded to one coherent delivery slice.",
            f"- Source file: `{request_path.relative_to(repo_root).as_posix()}`.",
            "- Generated locally by logics-manager.",
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
    split_request.add_argument("--title", action="append", nargs="+", required=True)
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

    finish_parser = sub.add_parser("finish", help="Finish a task and verify the closure chain.")
    finish_sub = finish_parser.add_subparsers(dest="kind", required=True)
    finish_task = finish_sub.add_parser("task", help="Finish a task.")
    finish_task.add_argument("source")
    finish_task.add_argument("--format", choices=("text", "json"), default="text")
    finish_task.add_argument("--dry-run", action="store_true")
    finish_task.set_defaults(func=cmd_finish_task)

    return parser


def cmd_new(args: argparse.Namespace) -> dict[str, object]:
    doc_kind = DOC_KINDS[args.kind]
    repo_root = _find_repo_root(Path.cwd())
    fixture_mode = bool(getattr(args, "fixture", False))
    planned = _plan_doc(repo_root, doc_kind.directory, doc_kind.prefix, args.slug or args.title, dry_run=args.dry_run)

    payload: dict[str, object] = {
        "command": "new",
        "kind": doc_kind.kind,
        "ref": planned.ref,
        "path": planned.path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if doc_kind.kind == "request":
        content = _build_native_request_doc(repo_root, planned.ref, args.title, args)
        if not args.dry_run:
            planned.path.parent.mkdir(parents=True, exist_ok=True)
            planned.path.write_text(content, encoding="utf-8")
            print(f"Wrote {planned.path}")
        else:
            preview = content if len(content) <= 2000 else content[:2000] + "\n...\n"
            print(f"[dry-run] would write: {planned.path}")
            print(preview)
        print(f"Created {doc_kind.kind}: {payload['path']}")
        return payload

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
                "logics_manager/flow.py",
                "logics_manager/assist.py",
                "python_tests/test_logics_manager_cli.py",
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


def cmd_promote_request_to_backlog(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    title = _extract_doc_title(source_path)
    ref, content = _build_native_backlog_from_request(repo_root, source_path, title)
    planned_path = repo_root / "logics" / "backlog" / f"{ref}.md"
    if not args.dry_run:
        planned_path.parent.mkdir(parents=True, exist_ok=True)
        planned_path.write_text(content, encoding="utf-8")
        _append_doc_section_bullets(source_path, "Backlog", [f"`{ref}`"], dry_run=False)
    payload = {
        "command": "promote",
        "promotion": "request-to-backlog",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_ref": ref,
        "created_path": planned_path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Created backlog slice from request: {payload['created_path']}")
    return payload


def cmd_promote_backlog_to_task(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    title = _parse_title_from_source(source_path) or "Implementation task"
    planned = _create_task_from_backlog(repo_root, source_path, title, args)
    payload = {
        "command": "promote",
        "promotion": "backlog-to-task",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_ref": planned.ref,
        "created_path": planned.path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Created task from backlog: {payload['created_path']}")
    return payload


def cmd_split_request(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    titles = _split_titles([title for group in args.title for title in group])
    created_refs: list[str] = []
    for title in titles:
        ref, content = _build_native_backlog_from_request(repo_root, source_path, title)
        planned_path = repo_root / "logics" / "backlog" / f"{ref}.md"
        if not args.dry_run:
            planned_path.parent.mkdir(parents=True, exist_ok=True)
            planned_path.write_text(content, encoding="utf-8")
            _append_doc_section_bullets(source_path, "Backlog", [f"`{ref}`"], dry_run=False)
        created_refs.append(ref)
    payload = {
        "command": "split",
        "kind": "request",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_refs": created_refs,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Split request into {len(created_refs)} backlog item(s): {', '.join(created_refs)}")
    return payload


def cmd_split_backlog(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    titles = _split_titles([title for group in args.title for title in group])
    created_refs: list[str] = []
    for title in titles:
        planned = _create_task_from_backlog(repo_root, source_path, title, args)
        created_refs.append(planned.ref)
    payload = {
        "command": "split",
        "kind": "backlog",
        "source": source_path.relative_to(repo_root).as_posix(),
        "created_refs": created_refs,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Split backlog item into {len(created_refs)} task(s): {', '.join(created_refs)}")
    return payload


def cmd_close(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    kind = DOC_KINDS[args.kind]
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    if not source_path.stem.startswith(f"{kind.prefix}_"):
        raise SystemExit(f"Expected a `{kind.prefix}_...` file for kind `{kind.kind}`. Got: {source_path.name}")

    _close_doc(source_path, kind, args.dry_run)
    print(f"Closed {kind.kind}: {source_path.relative_to(repo_root)}")

    text = _strip_mermaid_blocks(source_path.read_text(encoding="utf-8"))
    processed_request_refs: set[str] = set()

    if kind.kind == "task":
        linked_item_refs = sorted(_extract_refs(text, "item"))
        for item_ref in linked_item_refs:
            item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
            if item_path is None:
                continue
            linked_tasks = _collect_docs_linking_ref(repo_root, DOC_KINDS["task"], item_ref)
            if linked_tasks and all(_is_doc_done(task_path, DOC_KINDS["task"]) for task_path in linked_tasks):
                if not _is_doc_done(item_path, DOC_KINDS["backlog"]):
                    _close_doc(item_path, DOC_KINDS["backlog"], args.dry_run)
                    print(f"Auto-closed backlog item {item_ref} (all linked tasks are done).")

            item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
            for request_ref in sorted(_extract_refs(item_text, "req")):
                if request_ref in processed_request_refs:
                    continue
                processed_request_refs.add(request_ref)
                _maybe_close_request_chain(repo_root, request_ref, args.dry_run)

    if kind.kind == "backlog":
        for request_ref in sorted(_extract_refs(text, "req")):
            if request_ref in processed_request_refs:
                continue
            processed_request_refs.add(request_ref)
            _maybe_close_request_chain(repo_root, request_ref, args.dry_run)

    if kind.kind == "request":
        _maybe_close_request_chain(repo_root, source_path.stem, args.dry_run)

    payload = {
        "command": "close",
        "kind": kind.kind,
        "source": source_path.relative_to(repo_root).as_posix(),
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
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
            [f"- Task `{task_ref}` was finished via `logics-manager flow finish task` on {date.today().isoformat()}."],
            dry_run,
        )

    validation_bullets = [
        f"- Finish workflow executed on {date.today().isoformat()}.",
        "- Linked backlog/request close verification passed.",
    ]
    report_bullets = [
        f"- Finished on {date.today().isoformat()}.",
        f"- Linked backlog item(s): {', '.join(f'`{ref}`' for ref in item_refs) if item_refs else '(none)'}",
        f"- Related request(s): {', '.join(f'`{ref}`' for ref in sorted(request_refs)) if request_refs else '(none)'}",
    ]
    _append_section_bullets(task_path, "Validation", validation_bullets, dry_run)
    _append_section_bullets(task_path, "Report", report_bullets, dry_run)


def _maybe_close_request_chain(repo_root: Path, request_ref: str, dry_run: bool) -> None:
    request_path = _resolve_doc_path(repo_root, DOC_KINDS["request"], request_ref)
    if request_path is None:
        return

    linked_items = _collect_docs_linking_ref(repo_root, DOC_KINDS["backlog"], request_ref)
    if not linked_items:
        return

    if all(_is_doc_done(item_path, DOC_KINDS["backlog"]) for item_path in linked_items):
        if not _is_doc_done(request_path, DOC_KINDS["request"]):
            _close_doc(request_path, DOC_KINDS["request"], dry_run)
            print(f"Auto-closed request {request_ref} (all linked backlog items are done).")


def cmd_finish_task(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    source_path = Path(args.source).resolve()
    if not source_path.is_file():
        raise SystemExit(f"Source not found: {source_path}")
    if not source_path.stem.startswith(f"{DOC_KINDS['task'].prefix}_"):
        raise SystemExit(f"Expected a `{DOC_KINDS['task'].prefix}_...` task file. Got: {source_path.name}")

    _close_doc(source_path, DOC_KINDS["task"], args.dry_run)
    _mark_section_checkboxes_done(source_path, "Definition of Done (DoD)", args.dry_run)
    _record_finished_task_follow_up(repo_root, source_path, args.dry_run)

    task_text = _strip_mermaid_blocks(source_path.read_text(encoding="utf-8"))
    for item_ref in sorted(_extract_refs(task_text, "item")):
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            continue
        linked_tasks = _collect_docs_linking_ref(repo_root, DOC_KINDS["task"], item_ref)
        if linked_tasks and all(_is_doc_done(task_path, DOC_KINDS["task"]) for task_path in linked_tasks):
            if not _is_doc_done(item_path, DOC_KINDS["backlog"]):
                _close_doc(item_path, DOC_KINDS["backlog"], args.dry_run)
                print(f"Auto-closed backlog item {item_ref} (all linked tasks are done).")

        item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
        for request_ref in sorted(_extract_refs(item_text, "req")):
            _maybe_close_request_chain(repo_root, request_ref, args.dry_run)

    if args.dry_run:
        payload = {"command": "finish", "kind": "task", "source": source_path.relative_to(repo_root).as_posix(), "dry_run": True}
        print("Dry run: skipped post-close verification.")
        return payload

    issues = _verify_finished_task_chain(repo_root, source_path)
    if issues:
        details = "\n".join(f"- {issue}" for issue in issues)
        raise SystemExit(f"Finish verification failed:\n{details}")

    payload = {"command": "finish", "kind": "task", "source": source_path.relative_to(repo_root).as_posix(), "dry_run": False}
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Finish verification: OK for {source_path.relative_to(repo_root)}")
    return payload


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command not in {"new", "promote", "split", "close", "finish"}:
        raise SystemExit("Unsupported flow subcommand for the native CLI slice.")
    payload = args.func(args)
    return 0 if isinstance(payload, dict) else 1
