from __future__ import annotations

def _split_titles(raw_titles: list[str]) -> list[str]:
    titles = [title.strip() for title in raw_titles if title and title.strip()]
    if not titles:
        raise SystemExit("Provide at least one non-empty --title value.")
    return titles


def _slugify(text: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "_" for ch in text)
    cleaned = "_".join(part for part in cleaned.split("_") if part)
    return cleaned or "request"


def _resolved_from_version(repo_root: Path, from_version: str | None) -> str:
    if from_version:
        return from_version
    package_json = repo_root / "package.json"
    if not package_json.is_file():
        return "1.0.0"
    try:
        payload = json.loads(package_json.read_text(encoding="utf-8"))
    except Exception:
        return "1.0.0"
    version = payload.get("version") if isinstance(payload, dict) else None
    return str(version).strip() if version else "1.0.0"


def _find_repo_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if (candidate / "logics").is_dir():
            return candidate
    raise SystemExit("Could not locate repo root (missing 'logics/' directory). Run from inside the repo.")


def _plan_doc(repo_root: Path, directory: str, prefix: str, title: str, dry_run: bool = False) -> PlannedDoc:
    target_dir = repo_root / directory
    if not dry_run:
        target_dir.mkdir(parents=True, exist_ok=True)
    slug = _slugify(title)
    highest = -1
    pattern = re.compile(rf"^{re.escape(prefix)}_(\d+)_.*\.md$")
    for path in target_dir.glob(f"{prefix}_*.md"):
        match = pattern.match(path.name)
        if match:
            highest = max(highest, int(match.group(1)))
    ref = f"{prefix}_{highest + 1:03d}_{slug}"
    path = target_dir / f"{ref}.md"
    return PlannedDoc(ref=ref, path=path)


def _ensure_new_doc_paths_available(paths: list[Path]) -> None:
    collisions = [path for path in paths if path.exists()]
    if collisions:
        rendered = ", ".join(path.as_posix() for path in collisions)
        raise SystemExit(f"Ref collision while creating Logics doc(s): {rendered}. Re-run the command to allocate a fresh id.")


def _write_new_doc(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with path.open("x", encoding="utf-8") as handle:
            handle.write(content)
    except FileExistsError as exc:
        raise SystemExit(f"Ref collision while creating Logics doc: {path.as_posix()}. Re-run the command to allocate a fresh id.") from exc


def _read_json_object(path: Path, *, label: str) -> dict[str, object]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"Missing {label}: {path.as_posix()}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {label}: {exc}") from exc
    if not isinstance(payload, dict):
        raise SystemExit(f"{label} must be a JSON object.")
    return payload


def _string_list(payload: object, key: str, *, default: list[str] | None = None) -> list[str]:
    if not isinstance(payload, dict) or key not in payload:
        return list(default or [])
    value = payload.get(key)
    if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
        raise SystemExit(f"`{key}` must be an array of non-empty strings.")
    return [item.strip() for item in value]


def _string_value(payload: object, key: str, *, default: str = "") -> str:
    if not isinstance(payload, dict):
        return default
    value = payload.get(key, default)
    if value is None:
        return default
    if not isinstance(value, str):
        raise SystemExit(f"`{key}` must be a string.")
    return value.strip() or default


def _bullets_or_default(values: list[str], fallback: str) -> list[str]:
    return [f"- {value}" for value in values] if values else [f"- {fallback}"]


def _normalize_ac_id(value: str) -> str:
    match = re.search(r"\bAC(\d+)\b", value, flags=re.IGNORECASE)
    return f"AC{match.group(1)}" if match else value.strip()


def _request_acceptance_map(lines: list[str]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for item in _bullet_values(_section_lines(lines, "Acceptance criteria")):
        match = re.match(r"AC(\d+)\s*:\s*(.+)", item.strip(), flags=re.IGNORECASE)
        if match:
            mapping[f"AC{match.group(1)}"] = f"AC{match.group(1)}: {match.group(2).strip()}"
    return mapping


def _parse_request_slice(raw: str, known_acs: dict[str, str]) -> dict[str, object]:
    if ":" not in raw:
        raise SystemExit("`--slice` must use `Title:AC1,AC2` syntax.")
    title, raw_acs = raw.split(":", 1)
    title = title.strip()
    if not title:
        raise SystemExit("`--slice` title is required.")
    ac_ids = [_normalize_ac_id(part) for part in re.split(r"[, ]+", raw_acs.strip()) if part.strip()]
    if not ac_ids:
        raise SystemExit("`--slice` requires at least one AC id.")
    unknown = [ac_id for ac_id in ac_ids if ac_id not in known_acs]
    if unknown:
        raise SystemExit(f"Unknown request AC id(s) for `--slice`: {', '.join(unknown)}")
    return {"title": title, "ac_ids": ac_ids}


def _extract_refs(text: str, prefix: str) -> list[str]:
    pattern = re.compile(rf"\b{re.escape(prefix)}_\d+_[a-z0-9_]+\b")
    return sorted({match.group(0) for match in pattern.finditer(text)})


def _strip_mermaid_blocks(text: str) -> str:
    return re.sub(r"```mermaid\s*\n.*?\n```", "", text, flags=re.DOTALL)


def _workflow_mermaid_block(kind: str, signature: str) -> list[str]:
    if kind == "request":
        body = [
            "flowchart TD",
            "    Need[Request need] --> Backlog[Backlog slice]",
            "    Backlog --> Task[Delivery task]",
        ]
    elif kind == "backlog":
        body = [
            "flowchart TD",
            "    Request[Request source] --> Scope[Backlog scope]",
            "    Scope --> Task[Delivery task]",
        ]
    else:
        body = [
            "flowchart TD",
            "    Backlog[Backlog item] --> Build[Implementation]",
            "    Build --> Validate[Validation]",
            "    Validate --> Close[Finish workflow]",
        ]
    return [
        "```mermaid",
        f"%% logics-kind: {kind}",
        f"%% logics-signature: {signature}",
        *body,
        "```",
    ]


def _with_workflow_mermaid_overview(kind: str, content: str) -> str:
    return content


def _resolve_doc_path(repo_root: Path, kind: DocKind, ref: str) -> Path | None:
    path = repo_root / kind.directory / f"{ref}.md"
    return path if path.is_file() else None


def _resolve_workflow_source(repo_root: Path, kind: DocKind, source: str) -> Path:
    raw = Path(source)
    if raw.is_absolute():
        candidate = raw.resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    elif any(part == ".." for part in raw.parts):
        raise SystemExit(f"Unsupported source `{source}`. Use a {kind.prefix}_... ref or repo-relative Logics path.")
    elif len(raw.parts) == 1 and raw.suffix != ".md":
        path = _resolve_doc_path(repo_root, kind, source)
        if path is None:
            raise SystemExit(f"Source not found: {source}")
        return path
    else:
        candidate = (repo_root / raw).resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    expected_dir = Path(kind.directory)
    if candidate.parent != (repo_root / kind.directory).resolve():
        raise SystemExit(f"Expected source under `{kind.directory}`. Got: `{rel_path.as_posix()}`.")
    if not candidate.is_file():
        raise SystemExit(f"Source not found: {rel_path.as_posix()}")
    if not candidate.stem.startswith(f"{kind.prefix}_"):
        raise SystemExit(f"Expected a `{kind.prefix}_...` file for kind `{kind.kind}`. Got: {candidate.name}")
    if rel_path.parent != expected_dir:
        raise SystemExit(f"Expected source under `{kind.directory}`. Got: `{rel_path.as_posix()}`.")
    return candidate


def _resolve_product_source(repo_root: Path, source: str) -> Path:
    raw = Path(source)
    if raw.is_absolute():
        candidate = raw.resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    elif any(part == ".." for part in raw.parts):
        raise SystemExit("Unsupported product source. Use a prod_... ref or repo-relative product path.")
    elif len(raw.parts) == 1 and raw.suffix != ".md":
        candidate = repo_root / "logics" / "product" / f"{source}.md"
        rel_path = candidate.relative_to(repo_root)
    else:
        candidate = (repo_root / raw).resolve()
        rel_path = ensure_relative_to(candidate, repo_root, label="source")
    if candidate.parent != (repo_root / "logics" / "product").resolve():
        raise SystemExit(f"Expected product source under `logics/product`. Got: `{rel_path.as_posix()}`.")
    if not candidate.is_file():
        raise SystemExit(f"Product source not found: {rel_path.as_posix()}")
    if not candidate.stem.startswith("prod_"):
        raise SystemExit(f"Expected a `prod_...` product brief. Got: {candidate.name}")
    return candidate


def _append_section_bullets(path: Path, heading: str, bullets: list[str], dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    start_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            start_idx = idx + 1
            break
    if start_idx is None:
        lines.extend(["", f"# {heading}", *[f"- {bullet}" for bullet in bullets]])
    else:
        insert_at = start_idx
        while insert_at < len(lines) and lines[insert_at].strip().startswith("- "):
            insert_at += 1
        existing = {line.strip() for line in lines[start_idx:insert_at] if line.strip().startswith("- ")}
        for bullet in bullets:
            rendered = f"- {bullet}"
            if rendered not in existing:
                lines.insert(insert_at, rendered)
                insert_at += 1
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _mark_section_checkboxes_done(path: Path, heading: str, dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    start_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            start_idx = idx + 1
            break
    if start_idx is None:
        return
    changed = False
    for idx in range(start_idx, len(lines)):
        line = lines[idx]
        if line.startswith("# "):
            break
        if "- [ ]" in line:
            lines[idx] = line.replace("- [ ]", "- [x]", 1)
            changed = True
    if changed:
        path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _collect_docs_linking_ref(repo_root: Path, kind: DocKind, ref: str) -> list[Path]:
    directory = repo_root / kind.directory
    linked: list[Path] = []
    if not directory.is_dir():
        return linked
    for path in sorted(directory.glob("*.md")):
        if ref in path.read_text(encoding="utf-8"):
            linked.append(path)
    return linked


def _close_doc(path: Path, kind: DocKind, dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    updated: list[str] = []
    saw_status = False
    saw_progress = False
    for line in lines:
        if line.startswith("> Status:"):
            updated.append("> Status: Done")
            saw_status = True
        elif kind.include_progress and line.startswith("> Progress:"):
            updated.append("> Progress: 100%")
            saw_progress = True
        else:
            updated.append(line)
    if not saw_status:
        updated.insert(1, "> Status: Done")
    if kind.include_progress and not saw_progress:
        insert_at = 2 if saw_status else 3
        updated.insert(insert_at, "> Progress: 100%")
    path.write_text("\n".join(updated).rstrip() + "\n", encoding="utf-8")


def _is_doc_done(path: Path, kind: DocKind) -> bool:
    lines = path.read_text(encoding="utf-8").splitlines()
    status_value = next((line.split(":", 1)[1].strip() for line in lines if line.startswith("> Status:")), None)
    if status_value is not None and " ".join(status_value.split()).lower() in {"done", "archived"}:
        return True
    if kind.include_progress:
        progress_value = next((line.split(":", 1)[1].strip() for line in lines if line.startswith("> Progress:")), None)
        if progress_value == "100%":
            return True
    return False


def _section_text(text: str, heading: str) -> str:
    return "\n".join(_section_lines(text.splitlines(), heading)).strip()


def _section_has_unchecked_checkbox(text: str, heading: str) -> bool:
    return any("- [ ]" in line for line in _section_lines(text.splitlines(), heading))


def _section_has_checked_checkbox(text: str, heading: str) -> bool:
    return any("- [x]" in line.lower() for line in _section_lines(text.splitlines(), heading))


def _request_ac_ids(text: str) -> list[str]:
    ids: list[str] = []
    for line in _section_lines(text.splitlines(), "Acceptance criteria"):
        match = re.search(r"\bAC(\d+)\s*:", line, flags=re.IGNORECASE)
        if match:
            ids.append(f"AC{int(match.group(1))}")
    return ids


def _first_product_path(repo_root: Path, product_ref: str) -> Path | None:
    path = repo_root / "logics" / "product" / f"{product_ref}.md"
    return path if path.is_file() else None


def _mermaid_closeout_issue(path: Path, kind: str) -> str | None:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"```mermaid\s*\n(.*?)\n```", text, flags=re.DOTALL)
    if match is None:
        return None
    signature_match = re.search(r"^\s*%%\s*logics-signature:\s*(.+?)\s*$", match.group(1), flags=re.MULTILINE)
    expected = expected_workflow_mermaid_signature(kind, text.splitlines())
    if signature_match is None:
        return "missing Mermaid context signature comment"
    if expected and signature_match.group(1).strip() != expected:
        return f"stale Mermaid signature, expected `{expected}`"
    return None


def _closeout_issue(path: Path, code: str, message: str, repair_command: str | None = None) -> dict[str, str]:
    issue = {
        "path": path.as_posix(),
        "code": code,
        "message": message,
    }
    if repair_command:
        issue["repair_command"] = repair_command
    return issue
