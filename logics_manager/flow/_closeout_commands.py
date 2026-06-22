from __future__ import annotations

def closeout_payload(
    repo_root: Path,
    source: str,
    *,
    validations: list[str],
    run_index: bool,
    run_lint: bool,
    run_audit: bool,
    dry_run: bool,
    validation_command: str | None = None,
    validation_result: str = "passed",
    validation_note: str | None = None,
) -> dict[str, object]:
    task_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], source)
    task_ref = task_path.stem
    changed_files: set[str] = set()
    steps: list[dict[str, object]] = []
    initial_preflight = validate_closeout_payload(repo_root, task_ref)
    rollback_snapshot = {} if dry_run else _snapshot_existing_files(repo_root, list(initial_preflight.get("related_paths", [])))

    if validation_command and validation_command.strip():
        validations = [*validations, _structured_validation_line(validation_command, validation_result, validation_note)]

    for validation in validations:
        if validation and validation.strip():
            if _append_doc_section_bullets_changed(task_path, "Validation", [validation.strip()], dry_run=dry_run):
                changed_files.add(task_path.relative_to(repo_root).as_posix())
            steps.append({"kind": "validation", "text": validation.strip(), "dry_run": dry_run})

    gate_payload = repair_gates_payload(repo_root, task_ref, dry_run=dry_run)
    link_payload = repair_links_payload(repo_root, task_ref, dry_run=dry_run)
    changed_files.update(gate_payload["changed_files"])
    changed_files.update(link_payload["changed_files"])
    steps.extend([gate_payload, link_payload])

    request_refs = sorted(_extract_refs(_strip_mermaid_blocks(task_path.read_text(encoding="utf-8")), DOC_KINDS["request"].prefix))
    item_refs = sorted(_extract_refs(_strip_mermaid_blocks(task_path.read_text(encoding="utf-8")), DOC_KINDS["backlog"].prefix))
    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is not None:
            request_refs.extend(_extract_refs(_strip_mermaid_blocks(item_path.read_text(encoding="utf-8")), DOC_KINDS["request"].prefix))
    for request_ref in sorted(set(request_refs)):
        ac_payload = repair_ac_traceability_payload(repo_root, request_ref, dry_run=dry_run)
        changed_files.update(ac_payload["changed_files"])
        steps.append(ac_payload)

    mermaid_refs = _closeout_refs(repo_root, task_path)
    mermaid_payload = repair_mermaid_payload(repo_root, mermaid_refs, dry_run=dry_run)
    changed_files.update(mermaid_payload["changed_files"])
    steps.append(mermaid_payload)

    preflight = validate_closeout_payload(repo_root, task_ref)
    if preflight["issues"]:
        rolled_back = False
        attempted_changed_files = sorted(changed_files)
        if rollback_snapshot:
            _restore_file_snapshot(repo_root, rollback_snapshot)
            changed_files.clear()
            rolled_back = True
        return {
            "command": "closeout",
            "ok": False,
            "source": task_path.relative_to(repo_root).as_posix(),
            "changed_files": sorted(changed_files),
            "attempted_changed_files": attempted_changed_files,
            "preflight": preflight,
            "rolled_back": rolled_back,
            "steps": steps,
            "dry_run": dry_run,
        }

    finish_payload: dict[str, object] | None = None
    if not dry_run:
        _close_chain_for_kind(repo_root, task_path, DOC_KINDS["task"], dry_run=False, quiet=True)
        for ref in mermaid_refs:
            if ref.startswith(f"{DOC_KINDS['request'].prefix}_"):
                _maybe_close_request_chain(repo_root, ref, dry_run=False, quiet=True)
        finish_issues = _verify_finished_task_chain(repo_root, task_path)
        if finish_issues:
            raise SystemExit("Finish verification failed:\n" + "\n".join(f"- {issue}" for issue in finish_issues))
        changed_files.add(task_path.relative_to(repo_root).as_posix())
        for ref in mermaid_refs:
            path, _kind = _resolve_any_workflow_source(repo_root, ref)
            changed_files.add(path.relative_to(repo_root).as_posix())
        finish_payload = {"kind": "finish", "ok": True}
        post_finish_mermaid = repair_mermaid_payload(repo_root, mermaid_refs, dry_run=False)
        changed_files.update(post_finish_mermaid["changed_files"])
        steps.append(post_finish_mermaid)

    index_result: dict[str, object] | None = None
    if run_index:
        if dry_run:
            index_result = {"ok": True, "dry_run": True}
        else:
            index_result = index_payload(repo_root)
            changed_files.add(str(index_result["output_path"]))

    lint_result: dict[str, object] | None = None
    if run_lint:
        lint_result = lint_payload(repo_root, require_status=True)

    audit_result: dict[str, object] | None = None
    if run_audit:
        audit_result = audit_payload(repo_root, legacy_cutoff_version="1.1.0", group_by_doc=True)

    ok = True
    if lint_result is not None and not lint_result.get("ok", False):
        ok = False
    if audit_result is not None and audit_result.get("issue_count", 0):
        ok = False

    return {
        "command": "closeout",
        "ok": ok,
        "source": task_path.relative_to(repo_root).as_posix(),
        "changed_files": sorted(changed_files),
        "preflight": preflight,
        "finish": finish_payload,
        "index": index_result,
        "lint": lint_result,
        "audit": audit_result,
        "steps": steps,
        "rolled_back": False,
        "dry_run": dry_run,
    }


def cmd_closeout(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = closeout_payload(
        repo_root,
        args.source,
        validations=args.validation or [],
        validation_command=args.validation_command,
        validation_result=args.validation_result,
        validation_note=args.validation_note,
        run_index=args.index,
        run_lint=args.lint,
        run_audit=args.audit,
        dry_run=args.dry_run,
    )
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        status = "OK" if payload["ok"] else "FAILED"
        print(f"Closeout: {status} for {payload['source']}")
        print(f"- changed files: {len(payload['changed_files'])}")
        for rel_path in payload["changed_files"]:
            print(f"  - {rel_path}")
        preflight = payload.get("preflight")
        if isinstance(preflight, dict) and preflight.get("issues"):
            print("- preflight issues:")
            for issue in preflight["issues"]:
                print(f"  - {issue['code']}: {issue['message']} ({issue['path']})")
        if payload.get("lint") is not None:
            print(f"- lint ok: {payload['lint'].get('ok')}")
        if payload.get("audit") is not None:
            print(f"- audit issues: {payload['audit'].get('issue_count')}")
    return payload
