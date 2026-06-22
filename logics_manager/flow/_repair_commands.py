from __future__ import annotations

def _validate_repair_kind(finding: dict[str, object]) -> str | None:
    command = str(finding.get("repair_command") or "")
    code = str(finding.get("code") or "")
    message = str(finding.get("message") or "")
    if "refresh-mermaid-signatures" in command or "Mermaid context signature" in message or code == "mermaid_signature_stale":
        return "mermaid"
    if "repair ac-traceability" in command or code in {"ac_missing_item_traceability", "ac_missing_task_traceability"}:
        return "ac-traceability"
    if "repair links" in command or code in {"backlog_missing_task_link", "companion_link_missing"}:
        return "links"
    if "repair gates" in command or code in {"task_gate_unchecked", "task_missing_done_gate", "request_dor_unchecked"}:
        return "gates"
    return None


def _validate_finding(source: str, finding: dict[str, object], *, explain: bool) -> dict[str, object]:
    severity = str(finding.get("severity") or "info")
    repair_kind = _validate_repair_kind(finding)
    fixable = repair_kind in {"mermaid", "links", "gates", "ac-traceability"}
    unsafe_reason = None
    if repair_kind == "ac-traceability":
        unsafe_reason = "requires explicit proof to avoid inventing implementation evidence"
    payload: dict[str, object] = {
        "source": source,
        "path": str(finding.get("path") or ""),
        "severity": severity,
        "category": "blocking" if severity == "blocking" else severity if severity in {"warning", "strict"} else "informational",
        "message": str(finding.get("message") or ""),
        "fixable": fixable,
        "unsafe": bool(unsafe_reason),
    }
    if finding.get("code"):
        payload["code"] = finding["code"]
    if finding.get("repair_command"):
        payload["repair_command"] = finding["repair_command"]
    if repair_kind:
        payload["repair_kind"] = repair_kind
    if unsafe_reason:
        payload["unsafe_reason"] = unsafe_reason
    if explain:
        payload["explanation"] = "safe deterministic repair available" if fixable and not unsafe_reason else unsafe_reason or "reported by lint/audit"
    return payload


def flow_validate_payload(
    repo_root: Path,
    sources: list[str],
    *,
    fixable_only: bool,
    explain: bool,
    apply_fixes: bool,
    dry_run: bool,
    proof: str | None,
    proof_source: str | None,
) -> dict[str, object]:
    scoped_paths, scoped_refs = _flow_validate_scope(repo_root, sources)
    lint_result = lint_payload(repo_root, require_status=True)
    audit_result = audit_payload(repo_root, legacy_cutoff_version="1.1.0", group_by_doc=True)
    raw_findings = [
        *[("lint", item) for item in _scoped_findings(list(lint_result.get("findings", [])), scoped_paths)],
        *[("audit", item) for item in _scoped_findings(list(audit_result.get("findings", [])), scoped_paths)],
    ]
    findings = [_validate_finding(source, finding, explain=explain) for source, finding in raw_findings]
    if fixable_only:
        findings = [finding for finding in findings if finding.get("fixable")]

    repairs: list[dict[str, object]] = []
    refused: list[dict[str, object]] = []
    if apply_fixes:
        repair_kinds = {str(finding.get("repair_kind")) for finding in findings if finding.get("fixable")}
        if "mermaid" in repair_kinds:
            repair_refs = scoped_refs or sorted({Path(str(finding.get("path"))).stem for finding in findings if finding.get("repair_kind") == "mermaid"})
            repairs.append(repair_mermaid_payload(repo_root, repair_refs, dry_run=dry_run))
        if "links" in repair_kinds:
            for finding in findings:
                if finding.get("repair_kind") != "links":
                    continue
                try:
                    path, kind = _resolve_any_workflow_source(repo_root, str(finding.get("path")))
                except SystemExit:
                    continue
                if kind == "task":
                    repairs.append(repair_links_payload(repo_root, path.stem, dry_run=dry_run))
        if "gates" in repair_kinds:
            for finding in findings:
                if finding.get("repair_kind") != "gates":
                    continue
                try:
                    path, kind = _resolve_any_workflow_source(repo_root, str(finding.get("path")))
                except SystemExit:
                    continue
                if kind == "task":
                    repairs.append(repair_gates_payload(repo_root, path.stem, dry_run=dry_run))
        if "ac-traceability" in repair_kinds:
            if proof and proof.strip():
                repair_refs = scoped_refs or sorted({Path(str(finding.get("path"))).stem for finding in findings if finding.get("repair_kind") == "ac-traceability"})
                for ref in repair_refs:
                    try:
                        _path, kind = _resolve_any_workflow_source(repo_root, ref)
                    except SystemExit:
                        continue
                    if kind == "request":
                        repairs.append(repair_ac_traceability_payload(repo_root, ref, dry_run=dry_run, proof=proof, proof_source=proof_source))
            else:
                refused.append({"repair_kind": "ac-traceability", "reason": "explicit --proof is required before applying AC traceability repairs"})

    blocking_count = len([finding for finding in findings if finding.get("category") == "blocking"])
    warning_count = len([finding for finding in findings if finding.get("category") == "warning"])
    next_actions = ["Apply safe fixes or inspect blocking findings."] if blocking_count or refused else ["Validation findings are clear for selected refs."]
    if len([finding for finding in findings if finding.get("fixable") and not finding.get("unsafe")]):
        next_actions.append("Run with `--apply-fixes` to apply deterministic safe repairs.")
    if refused:
        next_actions.append("Provide explicit `--proof` before applying AC traceability repairs.")
    return {
        "command": "validate",
        "ok": blocking_count == 0 and not refused,
        "refs": scoped_refs,
        "paths": sorted(scoped_paths),
        "finding_count": len(findings),
        "blocking_count": blocking_count,
        "warning_count": warning_count,
        "fixable_count": len([finding for finding in findings if finding.get("fixable")]),
        "unsafe_count": len([finding for finding in findings if finding.get("unsafe")]) + len(refused),
        "findings": findings,
        "repairs": repairs,
        "refused_repairs": refused,
        "dry_run": dry_run,
        "applied_fixes": bool(apply_fixes and not dry_run),
        "next_actions": next_actions,
        "next_action": next_actions[0],
    }


def cmd_validate(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = flow_validate_payload(
        repo_root,
        args.sources,
        fixable_only=args.fixable,
        explain=args.explain,
        apply_fixes=args.apply_fixes,
        dry_run=args.dry_run,
        proof=args.proof,
        proof_source=args.proof_source,
    )
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        action = "would apply" if args.dry_run and args.apply_fixes else "applied" if args.apply_fixes else "found"
        print(f"Flow validate: {action} {payload['finding_count']} finding(s).")
        for finding in payload["findings"]:
            marker = "fixable" if finding.get("fixable") else str(finding.get("category") or "info")
            print(f"- {marker}: {finding['message']} ({finding['path']})")
        for refused in payload["refused_repairs"]:
            print(f"- refused {refused['repair_kind']}: {refused['reason']}")
        print(f"Next action: {payload['next_action']}")
    return payload


def _print_repair_payload(payload: dict[str, object], output_format: str) -> None:
    if output_format == "json":
        print_payload(payload, output_format)
        return
    action = "would change" if payload.get("dry_run") else "changed"
    changed_files = payload.get("changed_files", [])
    print(f"Repair {payload['kind']}: {action} {len(changed_files)} file(s).")
    for rel_path in changed_files:
        print(f"- {rel_path}")


REPAIR_VERIFY_CODES = {
    "gates": {"task_gate_unchecked", "task_missing_done_gate", "request_dor_unchecked"},
    "ac-traceability": {"ac_missing_item_traceability", "ac_missing_task_traceability"},
    "links": {"backlog_missing_task_link", "companion_link_missing"},
    "mermaid": {"mermaid_signature_stale"},
}


def _repair_verify_snapshot(repo_root: Path, source: str | None, dry_run: bool) -> dict[str, str]:
    if dry_run or not source:
        return {}
    preflight = validate_closeout_payload(repo_root, source)
    return _snapshot_existing_files(repo_root, list(preflight.get("related_paths", [])))


def _finalize_repair_verify(repo_root: Path, payload: dict[str, object], source: str | None, snapshot: dict[str, str]) -> dict[str, object]:
    if not source or payload.get("dry_run"):
        return payload
    preflight = validate_closeout_payload(repo_root, source)
    payload["preflight"] = preflight
    relevant_codes = REPAIR_VERIFY_CODES.get(str(payload.get("kind")), set())
    remaining_relevant = [issue for issue in preflight.get("issues", []) if issue.get("code") in relevant_codes]
    payload["rolled_back"] = False
    if remaining_relevant and snapshot:
        payload["attempted_changed_files"] = payload.get("changed_files", [])
        _restore_file_snapshot(repo_root, snapshot)
        payload["changed_files"] = []
        payload["rolled_back"] = True
        payload["rollback_reason"] = "repair verification left relevant closeout issues"
        payload["remaining_relevant_issues"] = remaining_relevant
    return payload


def cmd_repair_gates(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    verify_source = args.verify_closeout or args.source
    snapshot = _repair_verify_snapshot(repo_root, verify_source, args.dry_run)
    payload = repair_gates_payload(repo_root, args.source, dry_run=args.dry_run)
    payload = _finalize_repair_verify(repo_root, payload, verify_source, snapshot)
    _print_repair_payload(payload, args.format)
    return payload


def cmd_repair_ac_traceability(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    snapshot = _repair_verify_snapshot(repo_root, args.verify_closeout, args.dry_run)
    payload = repair_ac_traceability_payload(repo_root, args.source, dry_run=args.dry_run, proof=args.proof, proof_source=args.proof_source)
    payload = _finalize_repair_verify(repo_root, payload, args.verify_closeout, snapshot)
    _print_repair_payload(payload, args.format)
    return payload


def cmd_repair_links(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    verify_source = args.verify_closeout or args.source
    snapshot = _repair_verify_snapshot(repo_root, verify_source, args.dry_run)
    payload = repair_links_payload(repo_root, args.source, dry_run=args.dry_run)
    payload = _finalize_repair_verify(repo_root, payload, verify_source, snapshot)
    _print_repair_payload(payload, args.format)
    return payload


def cmd_repair_mermaid(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    snapshot = _repair_verify_snapshot(repo_root, args.verify_closeout, args.dry_run)
    payload = repair_mermaid_payload(repo_root, args.refs, dry_run=args.dry_run)
    payload = _finalize_repair_verify(repo_root, payload, args.verify_closeout, snapshot)
    _print_repair_payload(payload, args.format)
    return payload


def _closeout_refs(repo_root: Path, task_path: Path) -> list[str]:
    task_text = _strip_mermaid_blocks(task_path.read_text(encoding="utf-8"))
    refs = {task_path.stem}
    item_refs = set(_extract_refs(task_text, DOC_KINDS["backlog"].prefix))
    refs.update(item_refs)
    refs.update(_extract_refs(task_text, DOC_KINDS["request"].prefix))
    for item_ref in sorted(item_refs):
        item_path = _resolve_doc_path(repo_root, DOC_KINDS["backlog"], item_ref)
        if item_path is not None:
            refs.update(_extract_refs(_strip_mermaid_blocks(item_path.read_text(encoding="utf-8")), DOC_KINDS["request"].prefix))
    return sorted(refs)


def _snapshot_existing_files(repo_root: Path, rel_paths: list[str]) -> dict[str, str]:
    snapshot: dict[str, str] = {}
    for rel_path in rel_paths:
        path = repo_root / rel_path
        if path.is_file():
            snapshot[rel_path] = path.read_text(encoding="utf-8")
    return snapshot


def _restore_file_snapshot(repo_root: Path, snapshot: dict[str, str]) -> None:
    for rel_path, content in snapshot.items():
        path = repo_root / rel_path
        path.write_text(content, encoding="utf-8")
