from __future__ import annotations

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

    deliver_parser = sub.add_parser("deliver", help="Create a delivery chain from a product brief.")
    deliver_parser.add_argument("--from-product", required=True)
    deliver_parser.add_argument("--title")
    deliver_parser.add_argument("--finish", action="store_true")
    deliver_parser.add_argument("--format", choices=("text", "json"), default="text")
    deliver_parser.add_argument("--dry-run", action="store_true")
    deliver_parser.set_defaults(func=cmd_deliver)

    scaffold_parser = sub.add_parser("scaffold", help="Create development-ready workflow corpora from structured input.")
    scaffold_sub = scaffold_parser.add_subparsers(dest="scaffold_kind", required=True)
    request_chain = scaffold_sub.add_parser("request-chain", help="Create a request/product/backlog/task chain from JSON input.")
    request_chain.add_argument("--input", required=True, help="Repo-relative or absolute JSON input file.")
    request_chain.add_argument("--context-pack", help="Optional repo-relative JSON context-pack output path.")
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
        print(f"Created companion doc: {payload['path']}")
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
