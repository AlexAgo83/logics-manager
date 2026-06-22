def _resolve_target_docs(repo_root: Path, sources: list[str], *, kinds: dict[str, dict[str, object]] | None = None) -> list[tuple[str, Path]]:
    search_kinds = kinds or DOC_KINDS
    candidates: dict[str, tuple[str, Path]] = {}
    if not sources:
        targets: list[tuple[str, Path]] = []
        for kind_name, kind in search_kinds.items():
            directory = repo_root / str(kind["directory"])
            if not directory.is_dir():
                continue
            for prefix in _prefixes(kind):
                for path in sorted(directory.glob(f"{prefix}_*.md")):
                    targets.append((kind_name, path))
        return targets

    for kind_name, kind in search_kinds.items():
        directory = repo_root / str(kind["directory"])
        if not directory.is_dir():
            continue
        for prefix in _prefixes(kind):
            for path in sorted(directory.glob(f"{prefix}_*.md")):
                candidates[path.relative_to(repo_root).as_posix()] = (kind_name, path)
                candidates[path.stem] = (kind_name, path)

    resolved: list[tuple[str, Path]] = []
    for source in sources:
        raw_source = Path(source)
        if not _is_relative_path(raw_source):
            raise SystemExit(f"Unsupported workflow doc target `{source}`.")
        normalized = raw_source.as_posix()
        target = candidates.get(normalized) or candidates.get(Path(source).stem if "/" not in normalized else "")
        if target is not None:
            resolved.append(target)
            continue
        raise SystemExit(f"Could not resolve workflow doc target `{source}`.")
    return resolved


def _schema_status(repo_root: Path, targets: list[str]) -> dict[str, object]:
    docs = [parse_workflow_doc(path, repo_root=repo_root) for _kind, path in _resolve_target_docs(repo_root, targets)]
    counts: dict[str, int] = {}
    outdated: list[str] = []
    missing: list[str] = []
    for doc in docs:
        schema_version = doc.indicators.get("Schema version", "")
        if not schema_version:
            missing.append(doc.path)
            schema_version = "(missing)"
        counts[schema_version] = counts.get(schema_version, 0) + 1
        if schema_version not in {"(missing)", "1.0"}:
            outdated.append(doc.path)
    return {
        "current_schema_version": "1.0",
        "counts": dict(sorted(counts.items())),
        "missing": missing,
        "outdated": outdated,
        "doc_count": len(docs),
    }


def build_context_pack_payload(repo_root: Path, ref: str, *, mode: str = "summary-only", profile: str = "normal", config: dict[str, object] | None = None, handoff: bool = False) -> dict[str, object]:
    return _build_context_pack(repo_root, ref, mode=mode, profile=profile, config=config, handoff=handoff)


def _default_section_names(kind: str) -> list[str]:
    return {
        "request": ["Needs", "Context", "Acceptance criteria", "Backlog", "Tasks", "AI Context"],
        "backlog": ["Problem", "Scope", "Acceptance criteria", "AC Traceability", "Tasks", "AI Context"],
        "task": ["Definition of Done (DoD)", "Backlog", "Acceptance criteria", "Validation", "Report", "AI Context"],
    }.get(kind, ["AI Context"])


def read_logics_doc_payload(repo_root: Path, source: str, *, max_chars: int = 4000, sections: list[str] | None = None) -> dict[str, object]:
    targets = _resolve_target_docs(repo_root, [source], kinds=INDICATOR_TARGET_KINDS)
    if len(targets) != 1:
        raise SystemExit(f"Expected one workflow doc target for `{source}`.")
    kind, path = targets[0]
    doc = parse_workflow_doc(path, repo_root=repo_root)
    requested_sections = sections or _default_section_names(kind)
    selected_sections = {
        heading: [line for line in doc.sections.get(heading, []) if line.strip()]
        for heading in requested_sections
        if heading in doc.sections
    }
    text = _read_text(repo_root, path)
    return {
        "ref": doc.ref,
        "kind": doc.kind,
        "path": doc.path,
        "title": doc.title,
        "status": doc.indicators.get("Status", ""),
        "indicators": doc.indicators,
        "linked_refs": {prefix: refs for prefix, refs in doc.refs.items() if refs},
        "sections": selected_sections,
        "content": text[:max_chars],
        "truncated": len(text) > max_chars,
        "max_chars": max_chars,
    }


def list_logics_docs_payload(
    repo_root: Path,
    *,
    kind: str = "all",
    status: str | None = None,
    ref_prefix: str | None = None,
    limit: int = 50,
    recent: bool = False,
    open_only: bool = False,
    changed: bool = False,
) -> dict[str, object]:
    docs = sorted(_load_workflow_docs(repo_root).values(), key=lambda doc: doc.path)
    changed_paths = set(_git_changed_paths(repo_root)) if changed else set()
    if kind != "all":
        docs = [doc for doc in docs if doc.kind == kind]
    if status:
        expected_status = " ".join(status.split()).lower()
        docs = [doc for doc in docs if " ".join(doc.indicators.get("Status", "").split()).lower() == expected_status]
    if open_only:
        docs = [
            doc
            for doc in docs
            if " ".join(doc.indicators.get("Status", "").split()).lower() not in OPEN_STATUS_EXCLUSIONS
        ]
    if changed:
        docs = [doc for doc in docs if doc.path in changed_paths]
    if ref_prefix:
        docs = [doc for doc in docs if doc.ref.startswith(ref_prefix)]
    if recent:
        docs = sorted(docs, key=lambda doc: (-(repo_root / doc.path).stat().st_mtime, doc.path))
    limited = docs[:limit]
    return {
        "view": "changed" if changed else "open" if open_only else "recent" if recent else "all",
        "filters": {
            "kind": kind,
            "status": status,
            "ref_prefix": ref_prefix,
            "recent": recent,
            "open": open_only,
            "changed": changed,
        },
        "changed_paths": sorted(changed_paths),
        "items": [
            {
                "ref": doc.ref,
                "kind": doc.kind,
                "path": doc.path,
                "title": doc.title,
                "status": doc.indicators.get("Status", ""),
                "linked_refs": {prefix: refs for prefix, refs in doc.refs.items() if refs},
            }
            for doc in limited
        ],
        "total_count": len(docs),
        "returned_count": len(limited),
        "truncated": len(docs) > len(limited),
        "limit": limit,
    }


def _snippet_for_line(lines: list[str], index: int, *, max_chars: int) -> str:
    start = max(0, index - 1)
    end = min(len(lines), index + 2)
    snippet = "\n".join(line for line in lines[start:end] if line.strip())
    return snippet[:max_chars]


def search_logics_docs_payload(
    repo_root: Path,
    query: str,
    *,
    kind: str = "all",
    status: str | None = None,
    limit: int = 20,
    max_snippet_chars: int = 240,
) -> dict[str, object]:
    normalized_query = query.strip().lower()
    if not normalized_query:
        raise SystemExit("Search query is required.")
    docs_payload = list_logics_docs_payload(repo_root, kind=kind, status=status, limit=10000)
    docs_by_ref = _load_workflow_docs(repo_root)
    matches: list[dict[str, object]] = []
    truncated = False
    for item in docs_payload["items"]:
        ref = str(item["ref"])
        doc = docs_by_ref.get(ref)
        if doc is None:
            continue
        text = _strip_mermaid_blocks(_read_text(repo_root, repo_root / doc.path))
        lines = text.splitlines()
        for idx, line in enumerate(lines):
            if normalized_query in line.lower():
                matches.append(
                    {
                        "ref": doc.ref,
                        "kind": doc.kind,
                        "path": doc.path,
                        "title": doc.title,
                        "status": doc.indicators.get("Status", ""),
                        "line": idx + 1,
                        "snippet": _snippet_for_line(lines, idx, max_chars=max_snippet_chars),
                    }
                )
                if len(matches) > limit:
                    truncated = True
                    matches = matches[:limit]
                break
        if truncated:
            break
    return {
        "query": query,
        "matches": matches,
        "returned_count": len(matches),
        "truncated": truncated,
        "limit": limit,
    }


def _clean_mutation_text(text: str, *, field: str) -> str:
    cleaned = " ".join(text.split())
    if not cleaned:
        raise SystemExit(f"{field} is required.")
    if len(cleaned) > MAX_MUTATION_TEXT_CHARS:
        raise SystemExit(f"{field} exceeds {MAX_MUTATION_TEXT_CHARS} characters.")
    if cleaned.startswith("#") or "```" in cleaned:
        raise SystemExit(f"{field} contains unsupported Markdown structure.")
    return cleaned


def _replace_indicator(lines: list[str], key: str, value: str) -> tuple[list[str], bool]:
    rendered = f"> {key}: {value}"
    for idx, line in enumerate(lines):
        if line.startswith(f"> {key}:"):
            if line == rendered:
                return lines, False
            updated = list(lines)
            updated[idx] = rendered
            return updated, True
    insert_at = 1
    while insert_at < len(lines) and lines[insert_at].startswith("> "):
        insert_at += 1
    updated = list(lines)
    updated.insert(insert_at, rendered)
    return updated, True


def update_workflow_indicators_payload(repo_root: Path, source: str, indicators: dict[str, str], *, dry_run: bool = False) -> dict[str, object]:
    unknown = sorted(set(indicators) - set(APPROVED_WORKFLOW_INDICATORS))
    if unknown:
        raise SystemExit(f"Unsupported workflow indicator(s): {', '.join(unknown)}.")
    cleaned = {key: _clean_mutation_text(value, field=key) for key, value in indicators.items() if value is not None}
    if not cleaned:
        raise SystemExit("At least one workflow indicator is required.")

    targets = _resolve_target_docs(repo_root, [source], kinds=INDICATOR_TARGET_KINDS)
    if len(targets) != 1:
        raise SystemExit(f"Expected one workflow doc target for `{source}`.")
    kind, path = targets[0]
    lines = _read_lines(repo_root, path)
    changed = False
    for key in APPROVED_WORKFLOW_INDICATORS:
        if key not in cleaned:
            continue
        if key == "Progress" and kind not in {"backlog", "task"}:
            raise SystemExit("Progress is only supported for backlog and task documents.")
        lines, key_changed = _replace_indicator(lines, key, cleaned[key])
        changed = changed or key_changed
    if changed and not dry_run:
        path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
        if kind in DOC_KINDS:
            refresh_workflow_mermaid_signature_file(path, kind, dry_run=False, repo_root=repo_root)
    return {
        "path": path.relative_to(repo_root).as_posix(),
        "ref": path.stem,
        "kind": kind,
        "updated_indicators": cleaned,
        "changed": changed,
        "dry_run": dry_run,
    }


def _section_for_note(kind: str, note_kind: str) -> str:
    if note_kind == "report":
        if kind != "task":
            raise SystemExit("Report entries are only supported for task documents.")
        return "Report"
    if note_kind == "validation":
        return "Validation"
    if note_kind == "decision":
        return "Decision framing" if kind == "backlog" else "Notes"
    raise SystemExit(f"Unsupported note kind `{note_kind}`.")


def append_workflow_note_payload(repo_root: Path, source: str, *, note_kind: str, text: str, dry_run: bool = False) -> dict[str, object]:
    targets = _resolve_target_docs(repo_root, [source])
    if len(targets) != 1:
        raise SystemExit(f"Expected one workflow doc target for `{source}`.")
    kind, path = targets[0]
    section = _section_for_note(kind, note_kind)
    cleaned = _clean_mutation_text(text, field="text")
    bullet = f"- {cleaned}"
    lines = _read_lines(repo_root, path)
    insert_at = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == section.lower():
            insert_at = idx + 1
            while insert_at < len(lines) and lines[insert_at].strip().startswith("- "):
                insert_at += 1
            break
    changed = True
    if insert_at is None:
        lines.extend(["", f"# {section}", bullet])
    else:
        existing = {line.strip() for line in lines if line.strip().startswith("- ")}
        if bullet in existing:
            changed = False
        else:
            lines.insert(insert_at, bullet)
    mermaid_signature_refreshed = False
    if changed and not dry_run:
        path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
        mermaid_signature_refreshed = refresh_workflow_mermaid_signature_file(path, kind, dry_run=False, repo_root=repo_root)
    return {
        "path": path.relative_to(repo_root).as_posix(),
        "ref": path.stem,
        "kind": kind,
        "section": section,
        "text": cleaned,
        "changed": changed,
        "mermaid_signature_refreshed": mermaid_signature_refreshed,
        "dry_run": dry_run,
    }


def _graph_payload(repo_root: Path, *, config: dict[str, object] | None = None) -> dict[str, object]:
    docs = _load_workflow_docs(repo_root)
    nodes = []
    edges = []
    for doc in docs.values():
        nodes.append(
            {
                "ref": doc.ref,
                "kind": doc.kind,
                "title": doc.title,
                "path": doc.path,
                "status": doc.indicators.get("Status", ""),
            }
        )
        for refs in doc.refs.values():
            for ref in refs:
                if ref in docs:
                    edges.append({"from": doc.ref, "to": ref})
    return {"nodes": nodes, "edges": edges}


def _collect_docs_linking_ref(repo_root: Path, kind: str, ref: str) -> list[Path]:
    directory = repo_root / DOC_KINDS[kind]["directory"]
    linked: list[Path] = []
    for path in sorted(directory.glob("*.md")):
        if ref in _read_text(repo_root, path):
            linked.append(path)
    return linked


def _is_doc_done(repo_root: Path, path: Path, kind: str) -> bool:
    lines = _read_lines(repo_root, path)
    status_value = _indicator_value(lines, "Status")
    if status_value is not None and " ".join(status_value.split()).lower() in {"done", "archived"}:
        return True
    if kind in {"backlog", "task"}:
        progress_value = _indicator_value(lines, "Progress")
        if progress_value is not None and progress_value.strip() == "100%":
            return True
    return False


def _close_doc(repo_root: Path, path: Path, kind: str, dry_run: bool) -> None:
    if dry_run:
        return
    lines = _read_lines(repo_root, path)
    updated = []
    saw_status = False
    saw_progress = False
    for line in lines:
        if line.startswith("> Status:"):
            updated.append("> Status: Done")
            saw_status = True
        elif kind in {"backlog", "task"} and line.startswith("> Progress:"):
            updated.append("> Progress: 100%")
            saw_progress = True
        else:
            updated.append(line)
    if not saw_status:
        updated.insert(1, "> Status: Done")
    if kind in {"backlog", "task"} and not saw_progress:
        insert_at = 2 if saw_status else 3
        updated.insert(insert_at, "> Progress: 100%")
    path.write_text("\n".join(updated).rstrip() + "\n", encoding="utf-8")


def _refresh_workflow_mermaid_signature_text(text: str, kind: str, *, repo_root: Path | None = None, dry_run: bool = False) -> tuple[str, bool]:
    match = MERMAID_BLOCK_PATTERN.search(text)
    if match is None:
        return text, False
    lines = text.splitlines()
    title = _extract_title(lines)
    if not title:
        return text, False
    expected_signature = expected_workflow_mermaid_signature(kind, lines)
    if not expected_signature:
        return text, False
    block = match.group(1)
    signature_match = MERMAID_SIGNATURE_PATTERN.search(block)
    if signature_match is None:
        return text, False
    current = signature_match.group(1).strip()
    if current == expected_signature:
        return text, False
    refreshed_block = MERMAID_SIGNATURE_PATTERN.sub(f"%% logics-signature: {expected_signature}", block, count=1)
    refreshed_text = text[: match.start()] + "```mermaid\n" + refreshed_block + "\n```" + text[match.end() :]
    return refreshed_text, True


def refresh_workflow_mermaid_signature_file(path: Path, kind: str, dry_run: bool, *, repo_root: Path | None = None) -> bool:
    original = _read_text(repo_root or path.parent.parent.parent, path)
    refreshed, changed = _refresh_workflow_mermaid_signature_text(original, kind, repo_root=repo_root, dry_run=dry_run)
    if not changed:
        return False
    if not dry_run:
        path.write_text(refreshed.rstrip() + "\n", encoding="utf-8")
    return True


def _close_eligible_requests(repo_root: Path, dry_run: bool, *, quiet: bool = False) -> tuple[int, int]:
    request_dir = repo_root / DOC_KINDS["request"]["directory"]
    closed = 0
    scanned = 0
    for request_path in sorted(request_dir.glob("req_*.md")):
        scanned += 1
        if _is_doc_done(repo_root, request_path, "request"):
            continue
        request_ref = request_path.stem
        linked_items = _collect_docs_linking_ref(repo_root, "backlog", request_ref)
        if not linked_items:
            continue
        if all(_is_doc_done(repo_root, item_path, "backlog") for item_path in linked_items):
            _close_doc(repo_root, request_path, "request", dry_run)
            if not quiet:
                print(f"Auto-closed request {request_ref} (all linked backlog items are done).")
            closed += 1
    return scanned, closed


