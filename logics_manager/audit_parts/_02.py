def _autofix_structure(path: Path, doc_kind: str) -> bool:
    original = path.read_text(encoding="utf-8")
    lines = original.splitlines()
    modified = False

    status_value = _indicator_value(lines, "Status")
    canonical_status = _canonical_status(status_value)
    if canonical_status and canonical_status != status_value:
        _upsert_indicator(lines, "Status", canonical_status)
        modified = True

    schema_value = _indicator_value(lines, "Schema version")
    if schema_value != CURRENT_WORKFLOW_SCHEMA_VERSION:
        _upsert_indicator(lines, "Schema version", CURRENT_WORKFLOW_SCHEMA_VERSION)
        modified = True

    text = "\n".join(lines).rstrip() + "\n"

    if doc_kind == "request":
        if not _extract_checkboxes(_extract_section_lines(text, "Definition of Ready (DoR)")):
            _insert_section(
                lines,
                "Definition of Ready (DoR)",
                [
                    "- [ ] Problem statement is explicit and user impact is clear.",
                    "- [ ] Scope boundaries (in/out) are explicit.",
                    "- [ ] Acceptance criteria are testable.",
                    "- [ ] Dependencies and known risks are listed.",
                ],
            )
            modified = True

    if doc_kind == "task":
        if not _extract_checkboxes(_extract_section_lines(text, "Definition of Done (DoD)")):
            _insert_section(
                lines,
                "Definition of Done (DoD)",
                [
                    "- [ ] Scope implemented and acceptance criteria covered.",
                    "- [ ] Validation commands executed and results captured.",
                    "- [ ] Linked request/backlog/task docs updated during completed waves and at closure.",
                    "- [ ] Each completed wave left a commit-ready checkpoint or an explicit exception is documented.",
                    "- [ ] Status is `Done` and progress is `100%`.",
                ],
            )
            modified = True

    if not modified:
        return False
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return True


def _autofix_ac_traceability(path: Path, ac_ids: set[str]) -> bool:
    if not ac_ids:
        return False

    lines = path.read_text(encoding="utf-8").splitlines()
    section_bounds = _extract_section_bounds(lines, "AC Traceability")
    if section_bounds is None:
        if lines and lines[-1].strip():
            lines.append("")
        lines.append("# AC Traceability")
        section_bounds = _extract_section_bounds(lines, "AC Traceability")
        if section_bounds is None:
            return False

    modified = False
    for ac_id in sorted(ac_ids):
        section_bounds = _extract_section_bounds(lines, "AC Traceability")
        if section_bounds is None:
            break
        start_idx, end_idx = section_bounds
        body_start = start_idx + 1
        handled = False
        for idx in range(body_start, end_idx):
            line = lines[idx]
            if ac_id not in line.upper():
                continue
            if "proof:" in line.lower():
                handled = True
                break
            lines[idx] = line.rstrip() + " Proof: TODO."
            modified = True
            handled = True
            break
        if handled:
            continue
        insert_at = end_idx
        while insert_at > body_start and not lines[insert_at - 1].strip():
            insert_at -= 1
        lines.insert(insert_at, f"- {ac_id} -> TODO: map this acceptance criterion to scope. Proof: TODO.")
        modified = True

    if not modified:
        return False
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return True


def _rel(repo_root: Path, path: Path | None) -> str:
    if path is None:
        return "(global)"
    return path.relative_to(repo_root).as_posix()


def _sorted_issues(issues: Iterable[AuditIssue], repo_root: Path) -> list[AuditIssue]:
    unique: dict[tuple[str, str, str, str], AuditIssue] = {}
    for issue in issues:
        key = (issue.severity, _rel(repo_root, issue.path), issue.code, issue.message)
        unique.setdefault(key, issue)
    return sorted(unique.values(), key=lambda issue: (_rel(repo_root, issue.path), issue.severity, issue.code, issue.message))


def _scan_hybrid_cache_for_credentials(repo_root: Path) -> list[AuditIssue]:
    issues: list[AuditIssue] = []
    for rel_path in HYBRID_CACHE_JSONL_FILES:
        cache_path = repo_root / rel_path
        if not cache_path.exists():
            continue
        try:
            content = cache_path.read_text(encoding="utf-8")
        except OSError as error:
            issues.append(
                AuditIssue(
                    code="hybrid_cache_unreadable",
                    path=cache_path,
                    message=f"could not read cache file: {error}",
                )
            )
            continue
        if "credential_value" in content:
            issues.append(
                AuditIssue(
                    code="hybrid_cache_contains_credential_value",
                    path=cache_path,
                    message="cache file contains credential_value and must not store secrets",
                )
            )
    return issues


