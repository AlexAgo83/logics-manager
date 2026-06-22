from __future__ import annotations

def validate_closeout_payload(repo_root: Path, source: str) -> dict[str, object]:
    task_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], source)
    task_ref = task_path.stem
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    raw_task_text = task_path.read_text(encoding="utf-8")
    issues: list[dict[str, str]] = []
    related_paths = [task_path.relative_to(repo_root).as_posix()]

    for heading in ("Plan", "Definition of Done (DoD)"):
        if _section_has_unchecked_checkbox(task_text, heading):
            issues.append(
                _closeout_issue(
                    task_path.relative_to(repo_root),
                    "task_gate_unchecked",
                    f"`# {heading}` contains unchecked items",
                    f"python3 -m logics_manager flow repair gates {task_ref}",
                )
            )
    if not _section_has_checked_checkbox(task_text, "Definition of Done (DoD)"):
        issues.append(
            _closeout_issue(
                task_path.relative_to(repo_root),
                "task_missing_done_gate",
                "`# Definition of Done (DoD)` has no checked completion evidence",
                f"python3 -m logics_manager flow repair gates {task_ref}",
            )
        )
    if not _has_validation_evidence(task_text):
        issues.append(
            _closeout_issue(
                task_path.relative_to(repo_root),
                "validation_evidence_missing",
                "`# Validation` has no concrete passing validation evidence",
                f"python3 -m logics_manager flow closeout {task_ref} --validation \"... passed\"",
            )
        )

    mermaid_issue = _mermaid_closeout_issue(task_path, "task")
    if mermaid_issue:
        issues.append(
            _closeout_issue(
                task_path.relative_to(repo_root),
                "mermaid_signature_stale",
                mermaid_issue,
                f"python3 -m logics_manager flow repair mermaid --refs {task_ref}",
            )
        )

    item_refs = sorted(_extract_refs(task_text, DOC_KINDS["backlog"].prefix))
    if not item_refs:
        issues.append(_closeout_issue(task_path.relative_to(repo_root), "task_missing_backlog", "task has no linked backlog item reference"))

    request_refs: set[str] = set(_extract_refs(task_text, DOC_KINDS["request"].prefix))
    item_paths: list[Path] = []
    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            issues.append(_closeout_issue(task_path.relative_to(repo_root), "task_missing_backlog_target", f"task references missing backlog item `{item_ref}`"))
            continue
        item_paths.append(item_path)
        related_paths.append(item_path.relative_to(repo_root).as_posix())
        item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8"))
        request_refs.update(_extract_refs(item_text, DOC_KINDS["request"].prefix))
        if task_ref not in item_text:
            issues.append(
                _closeout_issue(
                    item_path.relative_to(repo_root),
                    "backlog_missing_task_link",
                    f"backlog item does not link task `{task_ref}`",
                    f"python3 -m logics_manager flow repair links {task_ref}",
                )
            )
        mermaid_issue = _mermaid_closeout_issue(item_path, "backlog")
        if mermaid_issue:
            issues.append(
                _closeout_issue(
                    item_path.relative_to(repo_root),
                    "mermaid_signature_stale",
                    mermaid_issue,
                    f"python3 -m logics_manager flow repair mermaid --refs {item_ref}",
                )
            )

    for request_ref in sorted(request_refs):
        request_path = _resolve_doc_path(repo_root, DOC_KINDS["request"], request_ref)
        if request_path is None:
            issues.append(_closeout_issue(task_path.relative_to(repo_root), "missing_request_target", f"linked request `{request_ref}` is missing"))
            continue
        related_paths.append(request_path.relative_to(repo_root).as_posix())
        request_text = _strip_mermaid_blocks(request_path.read_text(encoding="utf-8"))
        if _section_has_unchecked_checkbox(request_text, "Definition of Ready (DoR)"):
            issues.append(
                _closeout_issue(
                    request_path.relative_to(repo_root),
                    "request_dor_unchecked",
                    "`# Definition of Ready (DoR)` contains unchecked items",
                    f"python3 -m logics_manager flow repair gates {task_ref}",
                )
            )
        mermaid_issue = _mermaid_closeout_issue(request_path, "request")
        if mermaid_issue:
            issues.append(
                _closeout_issue(
                    request_path.relative_to(repo_root),
                    "mermaid_signature_stale",
                    mermaid_issue,
                    f"python3 -m logics_manager flow repair mermaid --refs {request_ref}",
                )
            )
        for ac_id in _request_ac_ids(request_text):
            if item_paths and not any(_has_ac_proof(path.read_text(encoding="utf-8"), ac_id) for path in item_paths):
                issues.append(
                    _closeout_issue(
                        request_path.relative_to(repo_root),
                        "ac_missing_item_traceability",
                        f"`{ac_id}` missing backlog-level proof",
                        f"python3 -m logics_manager flow repair ac-traceability {request_ref}",
                    )
                )
            if not _has_ac_proof(raw_task_text, ac_id):
                issues.append(
                    _closeout_issue(
                        request_path.relative_to(repo_root),
                        "ac_missing_task_traceability",
                        f"`{ac_id}` missing task-level proof",
                        f"python3 -m logics_manager flow repair ac-traceability {request_ref}",
                    )
                )

    product_refs = sorted(_extract_refs(raw_task_text, "prod"))
    for product_ref in product_refs:
        product_path = _first_product_path(repo_root, product_ref)
        if product_path is None:
            issues.append(_closeout_issue(task_path.relative_to(repo_root), "missing_product_target", f"linked product brief `{product_ref}` is missing"))
            continue
        related_paths.append(product_path.relative_to(repo_root).as_posix())
        product_text = product_path.read_text(encoding="utf-8")
        if task_ref not in product_text:
            issues.append(
                _closeout_issue(
                    product_path.relative_to(repo_root),
                    "companion_link_missing",
                    f"product brief does not link task `{task_ref}`",
                    f"python3 -m logics_manager flow repair links {task_ref}",
                )
            )

    unique_issues = []
    seen_issue_keys: set[tuple[str, str, str]] = set()
    for issue in issues:
        key = (issue["path"], issue["code"], issue["message"])
        if key in seen_issue_keys:
            continue
        seen_issue_keys.add(key)
        unique_issues.append(issue)

    return {
        "command": "validate-closeout",
        "ok": not unique_issues,
        "source": task_path.relative_to(repo_root).as_posix(),
        "task_ref": task_ref,
        "issue_count": len(unique_issues),
        "issues": unique_issues,
        "related_paths": sorted(set(related_paths)),
    }


def _changed_rel(repo_root: Path, changed_paths: set[Path], path: Path, before: str | None) -> None:
    if before is not None and path.read_text(encoding="utf-8") != before:
        changed_paths.add(path.relative_to(repo_root))


def repair_gates_payload(repo_root: Path, source: str, *, dry_run: bool) -> dict[str, object]:
    task_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], source)
    changed_paths: set[Path] = set()
    planned_paths: set[Path] = set()
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    item_refs = sorted(_extract_refs(task_text, DOC_KINDS["backlog"].prefix))
    request_refs: set[str] = set(_extract_refs(task_text, DOC_KINDS["request"].prefix))

    before = task_path.read_text(encoding="utf-8")
    if _section_has_unchecked_checkbox(before, "Plan") or _section_has_unchecked_checkbox(before, "Definition of Done (DoD)"):
        planned_paths.add(task_path.relative_to(repo_root))
    _mark_section_checkboxes_done(task_path, "Plan", dry_run)
    _mark_section_checkboxes_done(task_path, "Definition of Done (DoD)", dry_run)
    if not dry_run:
        _changed_rel(repo_root, changed_paths, task_path, before)

    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            continue
        request_refs.update(_extract_refs(_strip_mermaid_blocks(item_path.read_text(encoding="utf-8")), DOC_KINDS["request"].prefix))

    for request_ref in sorted(request_refs):
        request_path = _resolve_doc_path(repo_root, DOC_KINDS["request"], request_ref)
        if request_path is None:
            continue
        before = request_path.read_text(encoding="utf-8")
        if _section_has_unchecked_checkbox(before, "Definition of Ready (DoR)"):
            planned_paths.add(request_path.relative_to(repo_root))
        _mark_section_checkboxes_done(request_path, "Definition of Ready (DoR)", dry_run)
        if not dry_run:
            _changed_rel(repo_root, changed_paths, request_path, before)

    return {
        "command": "repair",
        "kind": "gates",
        "source": task_path.relative_to(repo_root).as_posix(),
        "changed_files": sorted(path.as_posix() for path in (planned_paths if dry_run else changed_paths)),
        "dry_run": dry_run,
    }


def _request_ac_entries(request_path: Path) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    for line in _section_lines(request_path.read_text(encoding="utf-8").splitlines(), "Acceptance criteria"):
        match = re.search(r"\bAC(\d+)\s*:\s*(.+)", line, flags=re.IGNORECASE)
        if match:
            entries.append((f"AC{int(match.group(1))}", match.group(2).strip()))
    return entries


def _ac_traceability_entry(ac_id: str, target: str, text: str, proof: str | None, proof_source: str | None) -> str:
    if proof and proof.strip():
        rendered = f"request-{ac_id} -> {target}. Proof: {proof.strip()}"
        if proof_source and proof_source.strip():
            rendered += f" Source: `{proof_source.strip()}`"
        return rendered
    return f"request-{ac_id} -> {target}. Evidence needed: {text}"


def repair_ac_traceability_payload(repo_root: Path, source: str, *, dry_run: bool, proof: str | None = None, proof_source: str | None = None) -> dict[str, object]:
    request_path = _resolve_workflow_source(repo_root, DOC_KINDS["request"], source)
    request_ref = request_path.stem
    ac_entries = _request_ac_entries(request_path)
    changed_paths: set[Path] = set()
    linked_items = _collect_docs_linking_ref(repo_root, DOC_KINDS["backlog"], request_ref)
    linked_task_paths = {
        path
        for path in _collect_docs_linking_ref(repo_root, DOC_KINDS["task"], request_ref)
    }

    for item_path in linked_items:
        item_before = item_path.read_text(encoding="utf-8")
        item_missing = [
            _ac_traceability_entry(ac_id, "This backlog slice", text, proof, proof_source)
            for ac_id, text in ac_entries
            if not _has_ac_proof(item_before, ac_id)
        ]
        if _append_doc_section_bullets_changed(item_path, "AC Traceability", item_missing, dry_run=dry_run):
            changed_paths.add(item_path.relative_to(repo_root))

        item_text = _strip_mermaid_blocks(item_path.read_text(encoding="utf-8") if not dry_run else item_before)
        for task_ref in sorted(_extract_refs(item_text, DOC_KINDS["task"].prefix)):
            task_path = _resolve_doc_path(repo_root, DOC_KINDS["task"], task_ref)
            if task_path is None:
                continue
            linked_task_paths.add(task_path)

    for task_path in sorted(linked_task_paths):
        task_before = task_path.read_text(encoding="utf-8")
        task_missing = [
            _ac_traceability_entry(ac_id, "This task", text, proof, proof_source)
            for ac_id, text in ac_entries
            if not _has_ac_proof(task_before, ac_id)
        ]
        if _append_doc_section_bullets_changed(task_path, "AC Traceability", task_missing, dry_run=dry_run):
            changed_paths.add(task_path.relative_to(repo_root))

    return {
        "command": "repair",
        "kind": "ac-traceability",
        "source": request_path.relative_to(repo_root).as_posix(),
        "proof_recorded": bool(proof and proof.strip()),
        "proof_source": proof_source.strip() if proof_source and proof_source.strip() else None,
        "changed_files": sorted(path.as_posix() for path in changed_paths),
        "dry_run": dry_run,
    }


def repair_links_payload(repo_root: Path, source: str, *, dry_run: bool) -> dict[str, object]:
    task_path = _resolve_workflow_source(repo_root, DOC_KINDS["task"], source)
    task_ref = task_path.stem
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    item_refs = sorted(_extract_refs(task_text, DOC_KINDS["backlog"].prefix))
    request_refs = sorted(_extract_refs(task_text, DOC_KINDS["request"].prefix))
    product_refs = sorted(_extract_refs(task_path.read_text(encoding="utf-8"), "prod"))
    changed_paths: set[Path] = set()

    for item_ref in item_refs:
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is None:
            continue
        if _append_doc_section_bullets_changed(item_path, "Tasks", [f"`{task_ref}`"], dry_run=dry_run):
            changed_paths.add(item_path.relative_to(repo_root))
        before = item_path.read_text(encoding="utf-8")
        lines = before.splitlines()
        lines = _replace_or_append_prefixed_section_bullet(lines, "Links", "Primary task(s)", f"`{task_ref}`")
        if request_refs:
            lines = _replace_or_append_prefixed_section_bullet(lines, "Links", "Request", f"`{request_refs[0]}`")
        after = "\n".join(lines).rstrip() + "\n"
        if after != before:
            changed_paths.add(item_path.relative_to(repo_root))
            if not dry_run:
                item_path.write_text(after, encoding="utf-8")

    for product_ref in product_refs:
        product_path = _first_product_path(repo_root, product_ref)
        if product_path is None:
            continue
        before = product_path.read_text(encoding="utf-8")
        backlog_ref = item_refs[0] if item_refs else None
        request_ref = request_refs[0] if request_refs else None
        lines = before.splitlines()
        if request_ref:
            lines = _replace_indicator_line(lines, "Related request", f"`{request_ref}`")
        if backlog_ref:
            lines = _replace_indicator_line(lines, "Related backlog", f"`{backlog_ref}`")
            lines = _replace_or_append_prefixed_section_bullet(lines, "References", "Product back-reference", f"`{backlog_ref}`")
        lines = _replace_indicator_line(lines, "Related task", f"`{task_ref}`")
        lines = _replace_or_append_prefixed_section_bullet(lines, "References", "Task back-reference", f"`{task_ref}`")
        after = "\n".join(lines).rstrip() + "\n"
        if after != before:
            changed_paths.add(product_path.relative_to(repo_root))
            if not dry_run:
                product_path.write_text(after, encoding="utf-8")

    return {
        "command": "repair",
        "kind": "links",
        "source": task_path.relative_to(repo_root).as_posix(),
        "changed_files": sorted(path.as_posix() for path in changed_paths),
        "dry_run": dry_run,
    }


def _resolve_any_workflow_source(repo_root: Path, source: str) -> tuple[Path, str]:
    for kind in ("request", "backlog", "task"):
        try:
            return _resolve_workflow_source(repo_root, DOC_KINDS[kind], source), kind
        except SystemExit:
            continue
    raise SystemExit(f"Workflow source not found: {source}")


def repair_mermaid_payload(repo_root: Path, refs: list[str], *, dry_run: bool) -> dict[str, object]:
    changed_paths: set[Path] = set()
    for ref in refs:
        path, kind = _resolve_any_workflow_source(repo_root, ref)
        before = path.read_text(encoding="utf-8")
        if "```mermaid" not in before:
            continue
        else:
            signature = expected_workflow_mermaid_signature(kind, before.splitlines())
            repaired = re.sub(r"^\s*%%\s*logics-signature:\s*(.+?)\s*$", f"%% logics-signature: {signature}", before, count=1, flags=re.MULTILINE)
            if repaired != before:
                changed_paths.add(path.relative_to(repo_root))
                if not dry_run:
                    path.write_text(repaired, encoding="utf-8")
    return {
        "command": "repair",
        "kind": "mermaid",
        "refs": refs,
        "changed_files": sorted(path.as_posix() for path in changed_paths),
        "dry_run": dry_run,
    }
