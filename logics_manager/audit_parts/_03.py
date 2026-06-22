def audit_payload(
    repo_root: Path,
    *,
    stale_days: int = 45,
    skip_ac_traceability: bool = False,
    skip_gates: bool = False,
    legacy_cutoff_version: str | None = None,
    group_by_doc: bool = False,
    autofix_ac_traceability: bool = False,
    paths: list[str] | None = None,
    refs: list[str] | None = None,
    since_version: str | None = None,
    token_hygiene: bool = False,
    autofix_structure: bool = False,
    governance_profile: str = "standard",
) -> dict[str, object]:
    profile = GOVERNANCE_PROFILES[governance_profile]
    if stale_days == 45:
        stale_days = int(profile["stale_days"])
    if not token_hygiene and profile["token_hygiene"]:
        token_hygiene = True
    if profile["require_gates"] is False:
        skip_gates = True
    if profile["require_ac_traceability"] is False:
        skip_ac_traceability = True

    cutoff = _parse_semver(legacy_cutoff_version)
    if legacy_cutoff_version and cutoff is None:
        raise SystemExit(f"Invalid --legacy-cutoff-version `{legacy_cutoff_version}`. Expected semantic version like 1.3.0.")

    scope_since = _parse_semver(since_version)
    if since_version and scope_since is None:
        raise SystemExit(f"Invalid --since-version `{since_version}`. Expected semantic version like 1.3.0.")

    all_docs = _collect_docs(repo_root)
    docs = _apply_scope(all_docs, repo_root, paths or [], refs or [], scope_since)

    issues: list[AuditIssue] = []
    strict_governance = governance_profile == "strict"
    autofix_targets: dict[Path, set[str]] = {}
    autofix_modified: list[Path] = []

    for doc in docs.values():
        if doc.kind.kind != "task" or not _is_done(doc):
            continue

        item_refs = _extract_refs(doc.text, DOC_KIND_OBJECTS["backlog"].prefix)
        if not item_refs:
            issues.append(AuditIssue(code="task_missing_backlog_ref", path=doc.path, message="done task has no linked backlog item reference"))
            continue

        for item_ref in sorted(item_refs):
            item_doc = all_docs.get(item_ref)
            if item_doc is None or item_doc.kind.kind != "backlog":
                issues.append(AuditIssue(code="task_refs_missing_backlog", path=doc.path, message=f"references missing backlog item `{item_ref}`"))
                continue
            if not _is_done(item_doc):
                issues.append(AuditIssue(code="task_links_open_backlog", path=doc.path, message=f"done task linked to backlog item not closed `{item_ref}`"))
            for request_doc in _linked_requests_for_item(item_doc, all_docs):
                request_items = _linked_items_for_request(request_doc, all_docs)
                if request_items and all(_is_done(item) for item in request_items) and not _is_done(request_doc):
                    issues.append(
                        AuditIssue(
                            code="request_not_closed_after_backlog_done",
                            path=request_doc.path,
                            message="all backlog items are done but request is not closed",
                        )
                    )

    for doc in docs.values():
        if doc.kind.kind != "backlog":
            continue
        if not _extract_refs(doc.text, DOC_KIND_OBJECTS["request"].prefix):
            issues.append(AuditIssue(code="backlog_orphan_no_request", path=doc.path, message="orphan backlog item (no linked request)"))

    for doc in docs.values():
        if doc.kind.kind not in {"backlog", "task"}:
            continue
        product_framing = _decision_framing_value(doc.text, "Product framing")
        architecture_framing = _decision_framing_value(doc.text, "Architecture framing")
        product_refs = _extract_refs(doc.text, "prod")
        architecture_refs = _extract_refs(doc.text, "adr")
        if product_framing == "Required" and not product_refs:
            issues.append(
                AuditIssue(
                    code="product_brief_required_missing_ref",
                    path=doc.path,
                    message="product framing is required but no linked product brief was found",
                )
            )
        if architecture_framing == "Required" and not architecture_refs:
            issues.append(
                AuditIssue(
                    code="architecture_decision_required_missing_ref",
                    path=doc.path,
                    message="architecture framing is required but no linked ADR was found",
                )
            )

    for doc in docs.values():
        if doc.kind.kind not in {"product", "architecture"}:
            continue

        linked_refs: set[str] = set()
        for prefix in ("req", "item", "task", "prod", "adr"):
            linked_refs.update(_extract_refs(doc.text, prefix))

        companion_is_mature = _companion_doc_is_mature(doc)

        if not any(ref.startswith(("req_", "item_", "task_")) for ref in linked_refs):
            primary_link_severity = "blocking" if strict_governance or companion_is_mature else "warning"
            issues.append(
                AuditIssue(
                    code="companion_doc_missing_primary_link",
                    path=doc.path,
                    message="companion doc has no linked request, backlog item, or task reference",
                    severity=primary_link_severity,
                )
            )
        if not _has_mermaid_block(doc.text):
            mermaid_severity = "blocking" if strict_governance or companion_is_mature else "warning"
            issues.append(
                AuditIssue(
                    code="companion_doc_missing_mermaid",
                    path=doc.path,
                    message="companion doc is missing its overview Mermaid diagram",
                    severity=mermaid_severity,
                )
            )
        placeholders = COMPANION_PLACEHOLDERS.get(doc.kind.kind, ())
        if any(snippet in doc.text for snippet in placeholders):
            issues.append(
                AuditIssue(
                    code="companion_doc_contains_placeholders",
                    path=doc.path,
                    message="companion doc still contains generator placeholder content",
                )
            )
        for ref in sorted(linked_refs):
            if ref == doc.ref:
                continue
            if ref not in all_docs:
                issues.append(
                    AuditIssue(
                        code="companion_doc_refs_missing_target",
                        path=doc.path,
                        message=f"companion doc references missing target `{ref}`",
                    )
                )

    for doc in docs.values():
        if doc.kind.kind != "request" or _is_done(doc) is False:
            continue
        request_items = _linked_items_for_request(doc, all_docs)
        if not request_items:
            issues.append(AuditIssue(code="request_done_without_backlog", path=doc.path, message="delivered request has no linked backlog items"))
            continue
        for item in request_items:
            if not _is_done(item):
                issues.append(
                    AuditIssue(
                        code="request_done_with_open_backlog",
                        path=doc.path,
                        message=f"delivered request linked to incomplete backlog item `{item.ref}`",
                    )
                )

    if stale_days > 0:
        for doc in docs.values():
            if doc.status not in STATUS_IN_PROGRESS:
                continue
            age_days = _last_modified_age_days(doc.path)
            if age_days >= stale_days:
                issues.append(
                    AuditIssue(
                        code="stale_pending_doc",
                        path=doc.path,
                        message=f"stale pending doc ({age_days:.1f} days, status={doc.status})",
                    )
                )

    if not skip_ac_traceability:
        for request in [doc for doc in docs.values() if doc.kind.kind == "request"]:
            if not _is_strict_scope(request, cutoff):
                continue
            ac_ids = _extract_request_ac_ids(request)
            if not ac_ids:
                continue

            linked_items = _linked_items_for_request(request, all_docs)
            if not linked_items:
                issues.append(AuditIssue(code="ac_no_linked_backlog", path=request.path, message="request has ACs but no linked backlog items"))
                continue

            linked_tasks: list[DocMeta] = []
            for item in linked_items:
                linked_tasks.extend(_linked_tasks_for_item(item, all_docs))

            if not linked_tasks:
                issues.append(AuditIssue(code="ac_no_linked_tasks", path=request.path, message="request has ACs but no linked tasks"))
                continue

            any_task_done = any(_is_done(task) for task in linked_tasks)
            for ac_id in ac_ids:
                item_has_mapping = any(_doc_has_ac_with_proof(item, ac_id) for item in linked_items)
                if not item_has_mapping:
                    if autofix_ac_traceability and linked_items:
                        autofix_targets.setdefault(linked_items[0].path, set()).add(ac_id)
                    else:
                        issues.append(_ac_traceability_issue("ac_missing_item_traceability", request, ac_id, "item", deferred=not any_task_done))

                task_has_mapping = any(_doc_has_ac_with_proof(task, ac_id) for task in linked_tasks)
                if not task_has_mapping:
                    if autofix_ac_traceability and linked_tasks:
                        autofix_targets.setdefault(linked_tasks[0].path, set()).add(ac_id)
                    else:
                        issues.append(_ac_traceability_issue("ac_missing_task_traceability", request, ac_id, "task", deferred=not any_task_done))

    if not skip_gates:
        for request in [doc for doc in docs.values() if doc.kind.kind == "request"]:
            if not _is_strict_scope(request, cutoff) or request.status not in {"ready", "in progress", "done"}:
                continue
            dor_checks = _extract_checkboxes(_extract_section_lines(request.text, "Definition of Ready (DoR)"))
            if not dor_checks:
                issues.append(AuditIssue(code="request_missing_dor", path=request.path, message="missing DoR checklist"))
            elif any(not checked for checked, _label in dor_checks):
                issues.append(AuditIssue(code="request_dor_unchecked", path=request.path, message="DoR checklist contains unchecked items"))

        for task in [doc for doc in docs.values() if doc.kind.kind == "task"]:
            if not _is_strict_scope(task, cutoff) or not _is_done(task):
                continue
            dod_checks = _extract_checkboxes(_extract_section_lines(task.text, "Definition of Done (DoD)"))
            if not dod_checks:
                issues.append(AuditIssue(code="task_missing_dod", path=task.path, message="missing DoD checklist"))
            elif any(not checked for checked, _label in dod_checks):
                issues.append(AuditIssue(code="task_dod_unchecked", path=task.path, message="DoD checklist contains unchecked items"))

    if token_hygiene:
        for doc in docs.values():
            if doc.kind.kind not in {"request", "backlog", "task"}:
                continue
            ai_fields = _extract_ai_context_fields(doc.text)
            if not ai_fields:
                issues.append(
                    AuditIssue(
                        code="token_hygiene_missing_ai_context",
                        path=doc.path,
                        message="missing `# AI Context` section for compact handoff metadata",
                    )
                )
            else:
                summary = ai_fields.get("summary", "")
                if not summary or any(snippet.lower() in summary.lower() for snippet in TOKEN_HYGIENE_PLACEHOLDERS):
                    issues.append(AuditIssue(code="token_hygiene_ai_summary_weak", path=doc.path, message="AI summary is missing or still contains placeholder text"))
                keywords = ai_fields.get("keywords", "")
                keyword_count = len([part for part in re.split(r"[,;]", keywords) if part.strip()])
                if keyword_count > 10:
                    issues.append(AuditIssue(code="token_hygiene_ai_keywords_too_many", path=doc.path, message=f"AI keywords should stay compact (found {keyword_count}, limit 10)"))
                use_when = ai_fields.get("use when", "")
                skip_when = ai_fields.get("skip when", "")
                if not use_when or not skip_when:
                    issues.append(AuditIssue(code="token_hygiene_ai_usage_incomplete", path=doc.path, message="AI Context must define both `Use when` and `Skip when` guidance"))

            section_limits = TOKEN_HYGIENE_SECTION_LIMITS.get(doc.kind.kind, {})
            for heading, max_lines in section_limits.items():
                line_count = _section_content_line_count(doc.text, heading)
                if line_count > max_lines:
                    issues.append(AuditIssue(code="token_hygiene_section_too_long", path=doc.path, message=f"`# {heading}` is too verbose for lean handoffs ({line_count} lines, limit {max_lines})"))

    if autofix_ac_traceability and autofix_targets:
        for path, ac_ids in sorted(autofix_targets.items(), key=lambda pair: pair[0].as_posix()):
            if _autofix_ac_traceability(path, ac_ids):
                autofix_modified.append(path)

        if autofix_modified:
            all_docs = _collect_docs(repo_root)
            docs = _apply_scope(all_docs, repo_root, paths or [], refs or [], scope_since)
            issues = [issue for issue in issues if issue.code not in {"ac_missing_item_traceability", "ac_missing_task_traceability"}]

            for request in [doc for doc in docs.values() if doc.kind.kind == "request"]:
                if skip_ac_traceability or not _is_strict_scope(request, cutoff):
                    continue
                ac_ids = _extract_request_ac_ids(request)
                if not ac_ids:
                    continue
                linked_items = _linked_items_for_request(request, all_docs)
                linked_tasks: list[DocMeta] = []
                for item in linked_items:
                    linked_tasks.extend(_linked_tasks_for_item(item, all_docs))
                any_task_done = any(_is_done(task) for task in linked_tasks)
                for ac_id in ac_ids:
                    if linked_items and not any(_doc_has_ac_with_proof(item, ac_id) for item in linked_items):
                        issues.append(_ac_traceability_issue("ac_missing_item_traceability", request, ac_id, "item", deferred=not any_task_done))
                    if linked_tasks and not any(_doc_has_ac_with_proof(task, ac_id) for task in linked_tasks):
                        issues.append(_ac_traceability_issue("ac_missing_task_traceability", request, ac_id, "task", deferred=not any_task_done))

    if autofix_structure:
        for doc in docs.values():
            if doc.kind.kind not in {"request", "backlog", "task"}:
                continue
            if _autofix_structure(doc.path, doc.kind.kind):
                autofix_modified.append(doc.path)

        if autofix_modified:
            all_docs = _collect_docs(repo_root)
            docs = _apply_scope(all_docs, repo_root, paths or [], refs or [], scope_since)
            structure_issue_codes = {
                "request_missing_dor",
                "task_missing_dod",
                "token_hygiene_missing_ai_context",
            }
            issues = [issue for issue in issues if issue.code not in structure_issue_codes]

    issues.extend(_scan_hybrid_cache_for_credentials(repo_root))
    sorted_issues = _sorted_issues(issues, repo_root)

    by_code: dict[str, int] = {}
    by_path: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    serialized_findings: list[dict[str, str]] = []
    for issue in sorted_issues:
        rel_path = _rel(repo_root, issue.path)
        by_code[issue.code] = by_code.get(issue.code, 0) + 1
        by_path[rel_path] = by_path.get(rel_path, 0) + 1
        by_severity[issue.severity] = by_severity.get(issue.severity, 0) + 1
        finding = {"code": issue.code, "path": rel_path, "message": issue.message, "severity": issue.severity}
        if issue.repair_command:
            finding["repair_command"] = issue.repair_command
        serialized_findings.append(finding)

    blocking_findings = [finding for finding in serialized_findings if finding["severity"] == "blocking"]
    warning_findings = [finding for finding in serialized_findings if finding["severity"] == "warning"]
    strict_findings = [finding for finding in serialized_findings if finding["severity"] == "strict"]
    findings_by_doc: dict[str, list[dict[str, str]]] = {}
    for finding in serialized_findings:
        findings_by_doc.setdefault(finding["path"], []).append(finding)
    issues_by_doc: dict[str, list[dict[str, str]]] = {}
    for finding in blocking_findings:
        issues_by_doc.setdefault(finding["path"], []).append(finding)

    return {
        "ok": not blocking_findings,
        "can_continue": not blocking_findings,
        "release_ready": not blocking_findings and not warning_findings and not strict_findings,
        "issue_count": len(blocking_findings),
        "warning_count": len(warning_findings),
        "strict_count": len(strict_findings),
        "finding_count": len(serialized_findings),
        "issues": blocking_findings,
        "warnings": warning_findings,
        "strict": strict_findings,
        "findings": serialized_findings,
        "issues_by_doc": dict(sorted(issues_by_doc.items())),
        "findings_by_doc": dict(sorted(findings_by_doc.items())),
        "counts": {
            "by_code": dict(sorted(by_code.items())),
            "by_path": dict(sorted(by_path.items())),
            "by_severity": dict(sorted(by_severity.items())),
        },
        "autofix": {
            "enabled": autofix_ac_traceability or autofix_structure,
            "modified_files": [_rel(repo_root, path) for path in sorted(set(autofix_modified))],
        },
        "workflow_doc_count": sum(1 for directory in ("logics/request", "logics/backlog", "logics/tasks") for _ in (repo_root / directory).glob("*.md") if (repo_root / directory).is_dir()),
        "group_by_doc": group_by_doc,
    }


def render_audit(
    repo_root: Path,
    *,
    stale_days: int = 45,
    skip_ac_traceability: bool = False,
    skip_gates: bool = False,
    legacy_cutoff_version: str | None = None,
    output_format: str = "text",
    group_by_doc: bool = False,
    autofix_ac_traceability: bool = False,
    paths: list[str] | None = None,
    refs: list[str] | None = None,
    since_version: str | None = None,
    token_hygiene: bool = False,
    autofix_structure: bool = False,
    governance_profile: str = "standard",
) -> str:
    payload = audit_payload(
        repo_root,
        stale_days=stale_days,
        skip_ac_traceability=skip_ac_traceability,
        skip_gates=skip_gates,
        legacy_cutoff_version=legacy_cutoff_version,
        group_by_doc=group_by_doc,
        autofix_ac_traceability=autofix_ac_traceability,
        paths=paths,
        refs=refs,
        since_version=since_version,
        token_hygiene=token_hygiene,
        autofix_structure=autofix_structure,
        governance_profile=governance_profile,
    )
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    if payload["ok"] and (payload["warning_count"] or payload["strict_count"]):
        status_line = "Workflow audit: OK (warnings)"
    else:
        status_line = "Workflow audit: OK" if payload["ok"] else "Workflow audit: FAILED"
    lines = [
        status_line,
        f"Workflow docs inspected: {payload['workflow_doc_count']}",
        f"Blocking issues: {payload['issue_count']}; warnings: {payload['warning_count']}; strict-only findings: {payload['strict_count']}",
    ]
    findings = payload["findings"]
    if not findings:
        return "\n".join(lines)
    if not group_by_doc:
        for issue in findings:
            prefix = "WARNING" if issue["severity"] == "warning" else "STRICT" if issue["severity"] == "strict" else "BLOCKING"
            if issue["path"] == "(global)":
                lines.append(f"- {prefix}: [{issue['code']}] {issue['message']}")
            else:
                lines.append(f"- {issue['path']}: {prefix}: [{issue['code']}] {issue['message']}")
        return "\n".join(lines)

    grouped: dict[str, list[dict[str, str]]] = {}
    for issue in findings:
        grouped.setdefault(issue["path"], []).append(issue)
    for rel_path in sorted(grouped):
        lines.append(f"- {rel_path}")
        for issue in sorted(grouped[rel_path], key=lambda item: (item["severity"], item["code"], item["message"])):
            prefix = "WARNING" if issue["severity"] == "warning" else "STRICT" if issue["severity"] == "strict" else "BLOCKING"
            lines.append(f"  - {prefix}: [{issue['code']}] {issue['message']}")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager audit",
        description="Audit request/backlog/task workflow consistency and traceability.",
    )
    parser.add_argument("--stale-days", type=int, default=45, help="Threshold for stale pending docs.")
    parser.add_argument("--skip-ac-traceability", action="store_true", help="Skip AC mapping/proof checks between request/backlog/task.")
    parser.add_argument("--skip-gates", action="store_true", help="Skip DoR/DoD gate checks.")
    parser.add_argument("--legacy-cutoff-version", help="Only enforce AC traceability and DoR/DoD gates for docs with `From version` >= this semantic version (example: 1.3.0).")
    parser.add_argument("--format", choices=("text", "json"), default="text", help="Output format for audit results.")
    parser.add_argument("--group-by-doc", action="store_true", help="Group text output by document path.")
    parser.add_argument("--autofix-ac-traceability", action="store_true", help="Auto-add missing AC traceability skeleton entries in linked backlog/tasks docs.")
    parser.add_argument("--paths", nargs="*", default=[], help="Limit the audit to docs under these relative paths.")
    parser.add_argument("--refs", nargs="*", default=[], help="Limit the audit to these refs and their directly linked workflow neighborhood.")
    parser.add_argument("--since-version", help="Limit the audit to docs with `From version` >= this semantic version.")
    parser.add_argument("--token-hygiene", action="store_true", help="Enable compact AI context and verbosity checks for workflow docs.")
    parser.add_argument("--autofix-structure", action="store_true", help="Deterministically repair missing schema metadata, AI Context, and missing gate sections.")
    parser.add_argument("--governance-profile", choices=tuple(GOVERNANCE_PROFILES), default="standard", help="Apply a named governance profile; `standard` reports early companion-doc polish as warnings, `strict` promotes governance warnings to blockers.")
    return parser


