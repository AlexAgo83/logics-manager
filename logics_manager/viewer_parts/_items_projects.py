def collect_viewer_items(repo_root: Path) -> list[dict[str, Any]]:
    repo_root = repo_root.resolve()
    items: list[dict[str, Any]] = []
    promoted_sources: set[str] = set()
    usage_map: dict[str, list[dict[str, str]]] = {}
    manual_used_by: dict[str, list[str]] = {}

    for family in DOC_FAMILIES:
        directory = repo_root / family.directory
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            if not path.name.startswith(family.prefixes):
                continue
            content = _read_text(path)
            lines = content.splitlines()
            rel_path = path.relative_to(repo_root).as_posix()
            title = _parse_title(lines, path.stem)
            references = _extract_references(content, lines)
            manual_used_by[rel_path] = _section_links(content, "Used by")
            for ref in references:
                if ref["kind"] == "from":
                    promoted_sources.add(_normalize_ref(ref["path"]))
            stat = path.stat()
            items.append(
                {
                    "id": path.stem,
                    "title": title,
                    "stage": family.stage,
                    "path": str(path),
                    "relPath": rel_path,
                    "filename": path.name,
                    "updatedAt": stat.st_mtime_ns,
                    "indicators": _parse_indicators(lines),
                    "summaryPoints": _build_summary_points(content, title),
                    "acceptanceCriteria": _summary_entries(content, "Acceptance criteria", 6),
                    "lineCount": len(lines),
                    "charCount": len(content),
                    "isPromoted": False,
                    "references": references,
                    "usedBy": [],
                }
            )

    items_by_rel_path = {str(item["relPath"]): item for item in items}
    for item in items:
        rel_path = str(item["relPath"])
        item["isPromoted"] = rel_path in promoted_sources
        for ref in item["references"]:
            target = _normalize_ref(str(ref["path"]))
            if target in items_by_rel_path:
                usage_map.setdefault(target, []).append(
                    {
                        "id": str(item["id"]),
                        "title": str(item["title"]),
                        "stage": str(item["stage"]),
                        "relPath": rel_path,
                    }
                )

    for item in items:
        rel_path = str(item["relPath"])
        usages = usage_map.get(rel_path, [])
        for link in manual_used_by.get(rel_path, []):
            usage = _to_usage(link, items_by_rel_path)
            if not any(existing["relPath"] == usage["relPath"] for existing in usages):
                usages.append(usage)
        item["usedBy"] = sorted(usages, key=lambda usage: (STAGE_ORDER.get(usage["stage"], 99), usage["id"]))
        if str(item["stage"]) == "request" and any(usage["stage"] in {"backlog", "task"} for usage in usages):
            item["isPromoted"] = True
        if str(item["stage"]) == "backlog" and any(usage["stage"] == "task" for usage in usages):
            item["isPromoted"] = True

    items.sort(key=lambda item: (STAGE_ORDER.get(str(item["stage"]), 99), str(item["id"])))
    for item in items:
        item["updatedAt"] = datetime.fromtimestamp(Path(str(item["path"])).stat().st_mtime).isoformat()
    return items


def viewer_data_payload(
    repo_root: Path,
    selected_id: str | None = None,
    *,
    auto_refresh_interval_seconds: int = 15,
    auto_refresh_interval_forced: bool = False,
    projects: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    capabilities = viewer_project_capabilities(repo_root)
    active_root = repo_root.resolve()
    has_logics = capabilities["logics"]["available"] is True
    bootstrap_warning = viewer_bootstrap_warning(active_root) if has_logics else None
    return {
        "root": str(active_root),
        "repoName": active_root.name,
        "repository": {
            "root": str(active_root),
            "githubUrl": github_repo_url(repo_root),
            **repository_provider_payload(repo_root),
        },
        "capabilities": capabilities,
        "projects": projects if projects is not None else viewer_project_registry(repo_root),
        "autoRefreshIntervalSeconds": auto_refresh_interval_seconds,
        "autoRefreshIntervalForced": auto_refresh_interval_forced,
        "items": collect_viewer_items(repo_root),
        "updateInfo": get_update_info(_current_version()).to_payload(),
        "selectedId": selected_id,
        "changedPaths": [],
        "canResetProjectRoot": False,
        "canBootstrapLogics": True,
        "shouldPromptBootstrapLogics": not has_logics,
        "bootstrapLogicsTitle": "Bootstrap Logics in this project." if not has_logics else "Refresh Logics bootstrap files.",
        "canLaunchCodex": False,
        "canLaunchClaude": False,
        "canRepairLogicsKit": False,
        "canPublishRelease": False,
        "shouldRecommendCheckEnvironment": False,
        "bootstrapWarning": bootstrap_warning,
        "environmentWarning": viewer_environment_warning(active_root),
    }


def _viewer_project_id(repo_root: Path) -> str:
    normalized = str(repo_root.resolve())
    return hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:12]


def _looks_like_viewer_project(path: Path) -> bool:
    if not path.is_dir():
        return False
    return any((path / marker).exists() for marker in ("logics", ".git", "package.json", "pyproject.toml", "logics.yaml"))


def discover_viewer_project_roots(repo_root: Path, *, max_projects: int = 40) -> list[Path]:
    active = repo_root.resolve()
    candidates: list[Path] = [active]
    parent = active.parent
    try:
        siblings = sorted(parent.iterdir(), key=lambda path: path.name.lower())
    except OSError:
        siblings = []
    for sibling in siblings:
        try:
            resolved = sibling.resolve()
        except OSError:
            continue
        if resolved == active or not _looks_like_viewer_project(resolved):
            continue
        candidates.append(resolved)
        if len(candidates) >= max_projects:
            break

    unique: dict[str, Path] = {}
    for candidate in candidates:
        unique[str(candidate)] = candidate
    return list(unique.values())


def viewer_project_entry(repo_root: Path, *, active_root: Path | None = None) -> dict[str, Any]:
    root = repo_root.resolve()
    active = active_root.resolve() if active_root else root
    has_logics = (root / "logics").is_dir()
    available = root.is_dir()
    return {
        "id": _viewer_project_id(root),
        "name": root.name,
        "root": str(root),
        "active": root == active,
        "available": available,
        "hasLogics": has_logics,
        "message": "Logics corpus found." if has_logics else "No Logics corpus found.",
    }


def viewer_project_registry(repo_root: Path, *, project_roots: list[Path] | None = None) -> list[dict[str, Any]]:
    active = repo_root.resolve()
    roots = project_roots if project_roots is not None else discover_viewer_project_roots(active)
    return [viewer_project_entry(root, active_root=active) for root in roots]


def _viewer_capability(state: str, *, available: bool, message: str, detail: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "state": state,
        "available": available,
        "message": message,
    }
    if detail:
        payload["detail"] = detail
    return payload


def _git_is_repository(repo_root: Path, *, runner: Any | None = None) -> bool | None:
    try:
        result = _run_read_only_git(repo_root, ["rev-parse", "--is-inside-work-tree"], runner=runner)
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return False
    return result.stdout.strip().lower() == "true"


def viewer_project_capabilities(
    repo_root: Path,
    *,
    git_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    which_command = which or shutil.which
    logics_dir = repo_root / "logics"
    has_logics = logics_dir.is_dir()
    git_path = which_command("git")
    cdx_path = which_command("cdx")

    if has_logics:
        logics = _viewer_capability("ready", available=True, message="Logics corpus found.")
    else:
        logics = _viewer_capability("missing", available=False, message="No Logics corpus found.")

    repository_provider: dict[str, str] = {}
    if not git_path:
        git = _viewer_capability("unavailable", available=False, message="Git executable is not available.")
    else:
        is_repo = _git_is_repository(repo_root, runner=git_runner)
        if is_repo is True:
            git = _viewer_capability("ready", available=True, message="Git repository detected.")
            repository_provider = repository_provider_payload(repo_root, runner=git_runner, which=which_command)
        elif is_repo is False:
            git = _viewer_capability("missing", available=False, message="Project is not a Git repository.")
        else:
            git = _viewer_capability("error", available=False, message="Unable to inspect Git repository state.")

    provider = repository_provider.get("provider", "")
    web_url = repository_provider.get("webUrl", "")
    if provider == "github":
        if not _has_github_actions_workflows(repo_root):
            ci = _viewer_capability("hidden", available=False, message="No GitHub Actions workflows detected for this project.")
        elif not which_command("gh"):
            ci = _viewer_capability("unavailable", available=False, message="GitHub CLI is not available.")
        else:
            ci = _viewer_capability(
                "ready",
                available=True,
                message="GitHub Actions can be inspected.",
                detail={"provider": "github", "repositoryUrl": web_url, "githubUrl": web_url},
            )
    elif provider == "gitlab":
        if not _has_gitlab_ci_config(repo_root):
            ci = _viewer_capability("hidden", available=False, message="No GitLab CI config detected for this project.")
        elif not which_command("glab"):
            ci = _viewer_capability("unavailable", available=False, message="GitLab CLI is not available.")
        else:
            ci = _viewer_capability(
                "ready",
                available=True,
                message="GitLab CI can be inspected.",
                detail={"provider": "gitlab", "repositoryUrl": web_url, "gitlabUrl": web_url},
            )
    else:
        ci = _viewer_capability("hidden", available=False, message="No GitHub or GitLab remote detected for this project.")

    if cdx_path:
        cdx = _viewer_capability("ready", available=True, message="CDX executable detected.")
        cdx_runs = _viewer_capability(
            "unsupported",
            available=False,
            message="CDX assistant run registry is not available yet.",
        )
    else:
        cdx = _viewer_capability("missing", available=False, message="CDX executable is not available.")
        cdx_runs = _viewer_capability("missing", available=False, message="CDX is required before assistant runs can be tracked.")
    workspace = _viewer_capability(
        "ready" if repo_root.is_dir() else "missing",
        available=repo_root.is_dir(),
        message="Workspace root can be inspected." if repo_root.is_dir() else "Workspace root is unavailable.",
        detail={"root": str(repo_root.resolve())} if repo_root.is_dir() else {},
    )
    workshop_available = repo_root.is_dir()
    terminals_available = workshop_available and workshop_terminals_available()
    if terminals_available:
        workshop_message = "Workshop command runner and PTY terminals are available."
    elif workshop_available:
        workshop_message = "Workshop command runner is available; PTY terminals require a Unix host with stdlib pty support."
    else:
        workshop_message = "Workshop is not available without a workspace root."
    workshop = _viewer_capability(
        "ready" if workshop_available else "missing",
        available=workshop_available,
        message=workshop_message,
        detail={"terminalsAvailable": terminals_available, "commandsAvailable": workshop_available},
    )

    return {
        "logics": logics,
        "workspace": workspace,
        "workshop": workshop,
        "git": git,
        "ci": ci,
        "cdx": cdx,
        "cdxRuns": cdx_runs,
    }


def read_doc_payload(repo_root: Path, rel_path: str) -> dict[str, Any]:
    normalized, absolute = _resolve_repo_doc_path(repo_root, rel_path)
    return {
        "path": normalized,
        "content": _read_text(absolute),
    }


def _resolve_repo_doc_path(repo_root: Path, rel_path: str) -> tuple[str, Path]:
    normalized = unquote(rel_path).replace("\\", "/").lstrip("/")
    absolute = (repo_root / normalized).resolve()
    root = repo_root.resolve()
    if root != absolute and root not in absolute.parents:
        raise ValueError("Document path escapes repository root.")
    if not absolute.is_file():
        raise FileNotFoundError(normalized)
    return normalized, absolute


def edit_doc_payload(repo_root: Path, rel_path: str, *, launcher: Any | None = None) -> dict[str, str]:
    normalized, absolute = _resolve_repo_doc_path(repo_root, rel_path)
    command = _system_editor_command(absolute)
    _dispatch_system_open(command, absolute, launcher=launcher)
    return {
        "path": normalized,
        "command": command[0],
    }


def _resolve_openable_file_path(repo_root: Path, file_path: str) -> Path:
    raw_value = unquote(file_path).strip()
    if raw_value.startswith(("/", "\\")) or re.match(r"^[A-Za-z]:", raw_value):
        raise ValueError("File path escapes repository root.")
    normalized = raw_value.replace("\\", "/").lstrip("/")
    if not normalized:
        raise ValueError("Missing file path.")
    raw_parts = tuple(part for part in normalized.split("/") if part)
    if any(part == ".." for part in raw_parts):
        raise ValueError("File path escapes repository root.")
    candidate = repo_root.joinpath(*raw_parts)
    root = os.path.realpath(repo_root)
    absolute_name = os.path.realpath(candidate)
    try:
        common = os.path.commonpath([root, absolute_name])
    except ValueError as exc:
        raise ValueError("File path escapes repository root.") from exc
    if common != root:
        raise ValueError("File path escapes repository root.")
    absolute = Path(absolute_name)
    if not absolute.is_file():
        raise FileNotFoundError(str(candidate))
    return absolute


def open_file_payload(repo_root: Path, file_path: str, *, launcher: Any | None = None) -> dict[str, str]:
    absolute = _resolve_openable_file_path(repo_root, file_path)
    command = _system_editor_command(absolute)
    _dispatch_system_open(command, absolute, launcher=launcher)
    return {
        "path": str(absolute),
        "command": command[0],
    }
