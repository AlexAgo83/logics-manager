def _normalize_workspace_path(rel_path: str) -> str:
    normalized = unquote(rel_path or "").replace("\\", "/").strip()
    normalized = normalized.lstrip("/")
    if normalized in {"", "."}:
        return ""
    if normalized.startswith("~") or re.match(r"^[A-Za-z]:", normalized):
        raise ValueError("Unsafe workspace path.")
    parts = [part for part in normalized.split("/") if part not in {"", "."}]
    if any(part == ".." for part in parts):
        raise ValueError("Workspace path escapes root.")
    return "/".join(parts)


def _resolve_workspace_path(repo_root: Path, rel_path: str) -> tuple[str, Path]:
    normalized = _normalize_workspace_path(rel_path)
    root = repo_root.resolve()
    target = (root / normalized).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ValueError("Workspace path escapes root.") from exc
    return normalized, target


def _workspace_entry_payload(root: Path, path: Path) -> dict[str, Any]:
    try:
        stat = path.stat()
    except OSError:
        stat = None
    rel_path = path.relative_to(root).as_posix()
    is_dir = path.is_dir()
    ignored = is_dir and path.name in WORKSPACE_IGNORED_DIRS
    return {
        "name": path.name or root.name,
        "path": rel_path,
        "kind": "directory" if is_dir else "file",
        "size": stat.st_size if stat else 0,
        "ignored": ignored,
        "childrenAvailable": is_dir and not ignored,
    }


def workspace_tree_payload(
    repo_root: Path,
    rel_path: str = "",
    *,
    max_entries: int = WORKSPACE_TREE_MAX_ENTRIES,
) -> dict[str, Any]:
    normalized, target = _resolve_workspace_path(repo_root, rel_path)
    root = repo_root.resolve()
    if not target.exists():
        return {"state": "missing", "path": normalized, "message": "Workspace path does not exist."}
    if not target.is_dir():
        return {"state": "not-directory", "path": normalized, "message": "Workspace path is not a directory."}
    entries = []
    truncated = False
    try:
        children = sorted(target.iterdir(), key=lambda path: (not path.is_dir(), path.name.lower()))
    except OSError as exc:
        return {"state": "error", "path": normalized, "message": f"Unable to list workspace path: {exc}"}
    for child in children:
        if len(entries) >= max_entries:
            truncated = True
            break
        entries.append(_workspace_entry_payload(root, child))
    return {
        "state": "ok",
        "root": str(root),
        "path": normalized,
        "entries": entries,
        "truncated": truncated,
        "ignoredDirectories": sorted(WORKSPACE_IGNORED_DIRS),
    }


def project_picker_tree_payload(base_root: Path, rel_path: str = "", *, max_entries: int = WORKSPACE_TREE_MAX_ENTRIES) -> dict[str, Any]:
    base = base_root.expanduser().resolve()
    normalized = _normalize_workspace_path(rel_path)
    target = (base / normalized).resolve()
    try:
        target.relative_to(base)
    except ValueError as exc:
        raise ValueError("Project picker path escapes root.") from exc
    if not target.exists():
        return {"state": "missing", "path": normalized, "root": str(base), "message": "Folder does not exist."}
    if not target.is_dir():
        return {"state": "not-directory", "path": normalized, "root": str(base), "message": "Path is not a folder."}
    entries: list[dict[str, Any]] = []
    truncated = False
    try:
        children = sorted((child for child in target.iterdir() if child.is_dir()), key=lambda path: path.name.lower())
    except OSError as exc:
        return {"state": "error", "path": normalized, "root": str(base), "message": f"Unable to list folders: {exc}"}
    for child in children:
        if len(entries) >= max_entries:
            truncated = True
            break
        rel = child.relative_to(base).as_posix()
        entries.append({
            "name": child.name,
            "path": rel,
            "hasLogics": (child / "logics").is_dir(),
        })
    return {
        "state": "ok",
        "root": str(base),
        "path": normalized,
        "selectedPath": str(target),
        "parentPath": "/".join(normalized.split("/")[:-1]) if normalized else "",
        "entries": entries,
        "truncated": truncated,
    }


def workspace_preview_payload(
    repo_root: Path,
    rel_path: str,
    *,
    max_bytes: int = WORKSPACE_PREVIEW_MAX_BYTES,
    max_chars: int = WORKSPACE_PREVIEW_MAX_CHARS,
    full: bool = False,
) -> dict[str, Any]:
    # When the operator forces a full load, raise the caps to the hard ceiling so
    # large-but-reasonable files load while pathological files still stay bounded.
    hard_cap_hit = False
    if full:
        max_bytes = PREVIEW_FORCE_MAX_BYTES
        max_chars = PREVIEW_FORCE_MAX_CHARS
    normalized, target = _resolve_workspace_path(repo_root, rel_path)
    if not target.exists():
        return {"state": "missing", "path": normalized, "message": "Workspace path does not exist."}
    if target.is_dir():
        try:
            count = sum(1 for _ in target.iterdir())
        except OSError:
            count = 0
        return {
            "state": "directory",
            "path": normalized,
            "name": target.name or repo_root.resolve().name,
            "kind": "directory",
            "message": f"{count} item(s)",
            "childrenAvailable": target.name not in WORKSPACE_IGNORED_DIRS,
        }
    if not target.is_file():
        return {"state": "unsupported", "path": normalized, "message": "Workspace object cannot be previewed."}
    try:
        size = target.stat().st_size
    except OSError as exc:
        return {"state": "error", "path": normalized, "message": f"Unable to inspect file: {exc}"}
    if size > max_bytes:
        return {
            "state": "oversized",
            "path": normalized,
            "name": target.name,
            "size": size,
            "limit": max_bytes,
            # Only offer "load anyway" when a forced full load could actually fit.
            "canForce": (not full) and size <= PREVIEW_FORCE_MAX_BYTES,
            "message": (
                f"File is {size} bytes; even a forced load is capped at {PREVIEW_FORCE_MAX_BYTES} bytes."
                if full or size > PREVIEW_FORCE_MAX_BYTES
                else f"File preview is limited to {max_bytes} bytes; this file is {size} bytes."
            ),
        }
    try:
        data = target.read_bytes()
    except OSError as exc:
        return {"state": "error", "path": normalized, "message": f"Unable to read file preview: {exc}"}
    content_type = mimetypes.guess_type(target.name)[0] or ""
    if content_type.startswith("image/"):
        return {
            "state": "image",
            "path": normalized,
            "name": target.name,
            "size": size,
            "contentType": content_type,
            "message": "Image preview is available from the workspace file endpoint.",
        }
    if b"\x00" in data:
        return {
            "state": "unsupported",
            "path": normalized,
            "name": target.name,
            "size": size,
            "message": "Binary or unsupported file content cannot be previewed.",
        }
    try:
        content = data.decode("utf-8")
    except UnicodeDecodeError:
        return {
            "state": "unsupported",
            "path": normalized,
            "name": target.name,
            "size": size,
            "message": "Binary or unsupported file encoding cannot be previewed.",
        }
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    truncated = len(content) > max_chars
    if truncated:
        content = content[:max_chars]
        hard_cap_hit = full
    # Editor convention: a trailing newline does not add a blank final line.
    line_count = content.count("\n") + (0 if (not content or content.endswith("\n")) else 1)
    return {
        "state": "ok",
        "path": normalized,
        "name": target.name,
        "kind": "file",
        "size": size,
        "contentType": content_type or "text/plain",
        "content": content,
        "truncated": truncated,
        # "canForce" tells the client a "load anyway" can raise the cap; once a
        # forced load still truncates, "hardCapHit" signals the ceiling was hit.
        "canForce": truncated and not full,
        "hardCapHit": hard_cap_hit,
        "lineCount": line_count,
        "logicsType": _logics_doc_type(normalized),
        "message": "",
    }


def _current_git_ci_context(repo_root: Path, *, runner: Any | None = None) -> dict[str, str]:
    context = {"branch": "", "headSha": "", "subject": "", "author": ""}
    commands = {
        "branch": ["rev-parse", "--abbrev-ref", "HEAD"],
        "headSha": ["rev-parse", "HEAD"],
        "subject": ["log", "-1", "--pretty=format:%s"],
        "author": ["log", "-1", "--pretty=format:%an"],
    }
    for key, args in commands.items():
        try:
            result = _run_read_only_git(repo_root, args, runner=runner)
        except (OSError, subprocess.SubprocessError):
            continue
        if result.returncode == 0:
            context[key] = result.stdout.strip()[:240]
    if context["branch"] == "HEAD":
        context["branch"] = ""
    return context
