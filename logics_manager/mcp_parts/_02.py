def _run_json_command(repo_root: Path, args: list[str]) -> dict[str, Any]:
    command = [sys.executable, "-m", "logics_manager", *args]
    result = subprocess.run(command, cwd=repo_root, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=_subprocess_env())
    payload = _json_from_stdout_or_none(result.stdout)
    if payload is None:
        raise McpToolError(
            "command_failed",
            "Underlying logics-manager command failed.",
            details=_command_error_details(repo_root, ["python3", "-m", "logics_manager", *args], result),
        )
    return payload


def _subprocess_env() -> dict[str, str]:
    env = os.environ.copy()
    source_root = str(Path(__file__).resolve().parents[1])
    existing = env.get("PYTHONPATH")
    env["PYTHONPATH"] = source_root if not existing else os.pathsep.join([source_root, existing])
    return env


def _json_from_stdout(stdout: str) -> dict[str, Any]:
    start = stdout.find("{")
    end = stdout.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise McpToolError("command_failed", "Expected JSON output from logics-manager.", details={"stdout": stdout})
    try:
        payload = json.loads(stdout[start : end + 1])
    except json.JSONDecodeError as exc:
        raise McpToolError("command_failed", "Could not parse JSON output from logics-manager.", details={"stdout": stdout}) from exc
    if not isinstance(payload, dict):
        raise McpToolError("command_failed", "Expected a JSON object from logics-manager.", details={"stdout": stdout})
    return payload


def _created_doc_from_stdout(stdout: str, *, command: str, kind: str) -> dict[str, Any]:
    payload = _json_from_stdout_or_none(stdout)
    if payload is not None:
        return payload
    match = re.search(rf"Created\s+{re.escape(kind)}:\s+(\S+)", stdout)
    if match is None:
        raise McpToolError("command_failed", "Could not find created document path in logics-manager output.", details={"stdout": stdout})
    path = match.group(1)
    return {"command": command, "kind": kind, "path": path, "ref": Path(path).stem, "dry_run": False}


def _json_from_stdout_or_none(stdout: str) -> dict[str, Any] | None:
    start = stdout.find("{")
    end = stdout.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        payload = json.loads(stdout[start : end + 1])
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _run_git(repo_root: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(["git", *args], cwd=repo_root, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise McpToolError("command_failed", "Git command failed.", details=_command_error_details(repo_root, ["git", *args], result))
    return result


def _git_status_entries(repo_root: Path, paths: list[str]) -> dict[str, str]:
    result = _run_git(repo_root, ["status", "--short", "--", *paths])
    entries: dict[str, str] = {}
    for line in result.stdout.splitlines():
        if len(line) < 4:
            continue
        status = line[:2]
        path = line[3:].strip()
        if " -> " in path:
            path = path.split(" -> ", 1)[1].strip()
        if path:
            entries[path] = status
    return entries


def _ensure_no_dirty_conflict(repo_root: Path, paths: list[str]) -> None:
    statuses = _git_status_entries(repo_root, paths)
    conflicts = {
        path: status
        for path, status in statuses.items()
        if status != "??"
    }
    if conflicts:
        raise McpToolError(
            "dirty_conflict",
            "Refusing to modify existing uncommitted Logics changes.",
            details={"paths": conflicts},
        )


def _diff_summary(raw_diff: str, *, untracked_count: int = 0) -> str:
    files = 0
    added = 0
    removed = 0
    for line in raw_diff.splitlines():
        if line.startswith("diff --git "):
            files += 1
        elif line.startswith("+") and not line.startswith("+++"):
            added += 1
        elif line.startswith("-") and not line.startswith("---"):
            removed += 1
    suffix = f", {untracked_count} untracked file(s)" if untracked_count else ""
    return f"{files} tracked diff file(s), {added} insertion(s), {removed} deletion(s){suffix}"


def _show_git_diff(repo_root: Path, paths: list[str] | None = None) -> dict[str, Any]:
    path_args: list[str] = []
    if paths:
        for raw_path in paths:
            path_args.append(_relative_path(repo_root, raw_path, ("logics",)).as_posix())
    else:
        path_args = ["logics"]
    diff_result = _run_git(repo_root, ["diff", "--", *path_args])
    status_result = _run_git(repo_root, ["status", "--short", "-uall", "--", *path_args])
    raw_diff = diff_result.stdout
    truncated = len(raw_diff) > MAX_RAW_DIFF_CHARS
    changed_paths = [line[3:].strip() for line in status_result.stdout.splitlines() if line[3:].strip()]
    untracked_count = sum(1 for line in status_result.stdout.splitlines() if line.startswith("?? "))
    if truncated and paths:
        raise McpToolError(
            "output_too_large",
            "Diff output exceeded the MCP response limit.",
            details={"limit": MAX_RAW_DIFF_CHARS, "diff_summary": _diff_summary(raw_diff, untracked_count=untracked_count)},
        )
    return {
        "ok": True,
        "changed_paths": changed_paths,
        "diff_summary": _diff_summary(raw_diff, untracked_count=untracked_count),
        "raw_diff": raw_diff[:MAX_RAW_DIFF_CHARS],
        "truncated": truncated,
    }


def _lint_status(repo_root: Path) -> dict[str, Any]:
    payload = lint_payload(repo_root, require_status=True)
    return {
        "ok": bool(payload.get("ok")),
        "issue_count": payload.get("issue_count", 0),
        "warning_count": payload.get("warning_count", 0),
        "issues": payload.get("issues", []),
        "warnings": payload.get("warnings", []),
    }


def _audit_status(repo_root: Path) -> dict[str, Any]:
    payload = audit_payload(repo_root, legacy_cutoff_version="1.1.0", group_by_doc=True)
    return {
        "ok": bool(payload.get("ok")),
        "can_continue": bool(payload.get("can_continue", payload.get("ok"))),
        "release_ready": bool(payload.get("release_ready", payload.get("ok"))),
        "issue_count": payload.get("issue_count", 0),
        "warning_count": payload.get("warning_count", 0),
        "strict_count": payload.get("strict_count", 0),
        "finding_count": payload.get("finding_count", payload.get("issue_count", 0)),
        "issues": payload.get("issues", []),
        "warnings": payload.get("warnings", []),
        "strict": payload.get("strict", []),
        "findings": payload.get("findings", payload.get("issues", [])),
        "issues_by_doc": payload.get("issues_by_doc", {}),
    }


def _bullets(values: Any) -> list[str]:
    if not isinstance(values, list):
        raise McpToolError("invalid_argument_type", "Expected a list of strings.")
    out = [str(value).strip() for value in values if str(value).strip()]
    if not out:
        raise McpToolError("invalid_argument_value", "Expected at least one non-empty string.")
    return out


def _replace_section(lines: list[str], heading: str, replacement: list[str]) -> list[str]:
    start = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.lower():
            start = idx + 1
            break
    if start is None:
        return lines
    end = len(lines)
    for idx in range(start, len(lines)):
        if lines[idx].startswith("# "):
            end = idx
            break
    return [*lines[:start], *replacement, "", *lines[end:]]


def _refresh_mermaid_signature(path: Path, kind: str) -> None:
    lines = path.read_text(encoding="utf-8").splitlines()
    expected = expected_workflow_mermaid_signature(kind, lines)
    if not expected:
        return
    updated = re.sub(
        r"^(\s*%%\s*logics-signature:\s*).+$",
        rf"\g<1>{expected}",
        "\n".join(lines),
        count=1,
        flags=re.MULTILINE,
    )
    path.write_text(updated.rstrip() + "\n", encoding="utf-8")


def _update_created_request(repo_root: Path, rel_path: str, arguments: dict[str, Any]) -> None:
    path = repo_root / rel_path
    lines = path.read_text(encoding="utf-8").splitlines()
    needs = [f"- {item}" for item in _bullets(arguments.get("needs"))]
    context = [f"- {item}" for item in _bullets(arguments.get("context"))]
    acceptance = []
    for index, item in enumerate(_bullets(arguments.get("acceptance_criteria")), start=1):
        text = re.sub(r"^AC\d+\s*:\s*", "", item).strip()
        acceptance.append(f"- AC{index}: {text}")
    lines = _replace_section(lines, "Needs", needs)
    lines = _replace_section(lines, "Context", context)
    lines = _replace_section(lines, "Acceptance criteria", acceptance)
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    _refresh_mermaid_signature(path, "request")


def _flow_path_ref(path_value: str | None) -> str | None:
    if not path_value:
        return None
    return Path(path_value).stem


def _validation_result(repo_root: Path, *, include_audit: bool = False) -> dict[str, Any]:
    lint = _lint_status(repo_root)
    payload: dict[str, Any] = {"lint_status": lint}
    if include_audit:
        payload["audit_status"] = _audit_status(repo_root)
    return payload


def _document_preview(repo_root: Path, rel_path: str, *, max_chars: int = 1600) -> dict[str, Any]:
    path = repo_root / rel_path
    text = path.read_text(encoding="utf-8")
    return {
        "path": rel_path,
        "content": text[:max_chars],
        "truncated": len(text) > max_chars,
    }


def _indicator_from_lines(lines: list[str], key: str) -> str | None:
    prefix = f"> {key}:"
    for line in lines:
        if line.startswith(prefix):
            return line.split(":", 1)[1].strip()
    return None


def _title_from_heading(lines: list[str], fallback: str) -> str:
    for line in lines:
        if not line.startswith("## "):
            continue
        heading = line[3:].strip()
        if " - " in heading:
            return heading.split(" - ", 1)[1].strip()
        return heading
    return fallback


def _parse_companion_refs(value: str | None) -> list[str]:
    if not value or value == "(none yet)":
        return []
    refs = re.findall(r"`([^`]+)`", value)
    if refs:
        return [ref for ref in refs if ref not in {"(none)", "(none yet)"}]
    return [part.strip() for part in value.split(",") if part.strip() and part.strip() not in {"(none)", "(none yet)"}]


def _companion_doc_entry(repo_root: Path, rel_path: Path, kind: str) -> dict[str, Any]:
    path = repo_root / rel_path
    lines = path.read_text(encoding="utf-8").splitlines()
    related = {
        "request": _parse_companion_refs(_indicator_from_lines(lines, "Related request")),
        "backlog": _parse_companion_refs(_indicator_from_lines(lines, "Related backlog")),
        "task": _parse_companion_refs(_indicator_from_lines(lines, "Related task")),
        "architecture": _parse_companion_refs(_indicator_from_lines(lines, "Related architecture")),
    }
    return {
        "kind": kind,
        "ref": rel_path.stem,
        "path": rel_path.as_posix(),
        "title": _title_from_heading(lines, rel_path.stem),
        "status": _indicator_from_lines(lines, "Status") or "Unknown",
        "related": {key: refs for key, refs in related.items() if refs},
    }


def _list_companion_docs(repo_root: Path, *, kind: str = "all", limit: int = 50) -> dict[str, Any]:
    if kind not in {"all", "product", "architecture"}:
        raise McpToolError("invalid_argument_value", "Unsupported companion document kind.", details={"kind": kind, "allowed": ["all", "product", "architecture"]})
    targets = []
    if kind in {"all", "product"}:
        targets.append(("product", Path("logics/product"), "prod_*.md"))
    if kind in {"all", "architecture"}:
        targets.append(("architecture", Path("logics/architecture"), "adr_*.md"))
    items: list[dict[str, Any]] = []
    for doc_kind, directory, pattern in targets:
        root = repo_root / directory
        if not root.is_dir():
            continue
        for path in sorted(root.glob(pattern)):
            if path.is_file() and not path.is_symlink():
                items.append(_companion_doc_entry(repo_root, path.relative_to(repo_root), doc_kind))
    items.sort(key=lambda item: str(item["path"]))
    bounded_items = items[:limit]
    return {"kind": kind, "limit": limit, "count": len(bounded_items), "total_count": len(items), "items": bounded_items}


def _bounded_int(value: Any, *, default: int, maximum: int) -> int:
    if not isinstance(value, int) or isinstance(value, bool):
        return default
    if value <= 0:
        return default
    return min(value, maximum)


def _mcp_read_error(exc: BaseException) -> McpToolError:
    if isinstance(exc, McpToolError):
        return exc
    return McpToolError("invalid_reference", str(exc))


def _mcp_mutation_error(exc: BaseException) -> McpToolError:
    if isinstance(exc, McpToolError):
        return exc
    return McpToolError("invalid_argument_value", str(exc))


def _workflow_doc_path_for_source(repo_root: Path, source: str) -> str:
    try:
        payload = read_logics_doc_payload(repo_root, source, max_chars=1, sections=[])
    except SystemExit as exc:
        raise _mcp_read_error(exc) from exc
    return str(payload["path"])


def _nonempty_titles(values: Any) -> list[str]:
    titles = [str(value).strip() for value in values if str(value).strip()] if isinstance(values, list) else []
    if not titles:
        raise McpToolError("invalid_argument_value", "At least one non-empty title is required.", details={"argument": "titles"})
    return titles


def _workflow_write_result(repo_root: Path, payload: dict[str, Any], *, paths: list[str] | None = None) -> dict[str, Any]:
    return {
        "ok": True,
        **payload,
        **_validation_result(repo_root, include_audit=True),
        **_show_git_diff(repo_root, paths),
    }


