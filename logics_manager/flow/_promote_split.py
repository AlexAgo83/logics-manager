from __future__ import annotations

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
