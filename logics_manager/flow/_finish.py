from __future__ import annotations

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

        linked_item_refs = sorted(_extract_refs(text, DOC_KINDS["backlog"].prefix))
        for item_ref in linked_item_refs:
            item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
            if item_path is None:
                continue
            linked_tasks = _collect_docs_linking_ref(repo_root, DOC_KINDS["task"], item_ref)
            if linked_tasks and all(_is_doc_done(task_path, DOC_KINDS["task"]) for task_path in linked_tasks):
                if not _is_doc_done(item_path, DOC_KINDS["backlog"]):
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
    if argv[0] == "list" and _help_requested(argv, 1):
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
    valid_commands = {"new", "list", "show", "companion", "deliver", "scaffold", "validate", "validate-closeout", "repair", "closeout", "promote", "split", "close", "finish"}
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
