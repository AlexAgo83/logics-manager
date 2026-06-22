def file_preview_payload(
    repo_root: Path,
    file_path: str,
    *,
    max_bytes: int = FILE_PREVIEW_MAX_BYTES,
    max_chars: int = FILE_PREVIEW_MAX_CHARS,
) -> dict[str, Any]:
    try:
        absolute = _resolve_openable_file_path(repo_root, file_path)
    except ValueError:
        absolute = _resolve_cdx_artifact_path(repo_root, file_path)
    raw = absolute.read_bytes()
    truncated = len(raw) > max_bytes
    if truncated:
        raw = raw[-max_bytes:]
    content = raw.decode("utf-8", errors="replace")
    if len(content) > max_chars:
        content = content[-max_chars:]
        truncated = True
    return {
        "path": str(absolute),
        "name": absolute.name,
        "content": content,
        "truncated": truncated,
    }


def _resolve_cdx_artifact_path(repo_root: Path, file_path: str) -> Path:
    raw_value = unquote(file_path).strip()
    if not raw_value:
        raise ValueError("Missing CDX artifact path.")
    expanded = Path(raw_value).expanduser()
    if not expanded.is_absolute():
        return _resolve_openable_file_path(repo_root, raw_value)

    candidate = Path(os.path.realpath(expanded))
    allowed_roots = [Path(os.path.realpath(repo_root)), Path(os.path.realpath(Path.home() / ".cdx"))]
    try:
        common_matches = [os.path.commonpath([str(root), str(candidate)]) == str(root) for root in allowed_roots]
    except ValueError as exc:
        raise ValueError("CDX artifact path is outside allowed locations.") from exc
    if not any(common_matches):
        raise ValueError("CDX artifact path is outside the repository and ~/.cdx.")
    if not candidate.is_file():
        raise FileNotFoundError(str(expanded))
    return candidate


def cdx_artifact_preview_payload(
    repo_root: Path,
    file_path: str,
    *,
    max_bytes: int = FILE_PREVIEW_MAX_BYTES,
    max_chars: int = FILE_PREVIEW_MAX_CHARS,
) -> dict[str, Any]:
    absolute = _resolve_cdx_artifact_path(repo_root, file_path)
    raw = absolute.read_bytes()
    truncated = len(raw) > max_bytes
    if truncated:
        raw = raw[-max_bytes:]
    content = raw.decode("utf-8", errors="replace")
    if len(content) > max_chars:
        content = content[-max_chars:]
        truncated = True
    return {
        "path": str(absolute),
        "name": absolute.name,
        "content": content,
        "truncated": truncated,
    }


def open_repo_folder_payload(repo_root: Path, *, launcher: Any | None = None) -> dict[str, str]:
    root = repo_root.resolve()
    command = _system_editor_command(root)
    _dispatch_system_open(command, root, launcher=launcher)
    return {
        "path": str(root),
        "command": command[0],
    }


def _is_wsl() -> bool:
    if os.name == "nt" or sys.platform == "darwin":
        return False
    if os.environ.get("WSL_DISTRO_NAME") or os.environ.get("WSL_INTEROP"):
        return True
    try:
        with open("/proc/version", encoding="utf-8", errors="ignore") as fh:
            return "microsoft" in fh.read().lower()
    except OSError:
        return False


def _wsl_translate_path(path: Path) -> str | None:
    try:
        result = subprocess.run(
            ["wslpath", "-w", str(path)],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    translated = result.stdout.strip()
    return translated or None


def _system_editor_command(path: Path) -> list[str]:
    if sys.platform == "darwin":
        return ["open", str(path)]
    if os.name == "nt":
        return ["explorer.exe", str(path)]
    if _is_wsl():
        translated = _wsl_translate_path(path)
        if translated:
            return ["explorer.exe", translated]
    return ["xdg-open", str(path)]


def _dispatch_system_open(
    command: list[str],
    path: Path,
    *,
    launcher: Any | None = None,
    spawner: Any | None = None,
) -> None:
    if launcher is not None:
        launcher(command)
        return
    spawn = spawner or subprocess.Popen
    try:
        spawn(
            command,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            close_fds=True,
        )
        return
    except (OSError, subprocess.SubprocessError):
        webbrowser.open(path.as_uri())


STATIC_CONTENT_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
}


def _path_on_windows_drive_mount(path: Path) -> bool:
    try:
        parts = path.resolve().parts
    except OSError:
        parts = path.parts
    return len(parts) >= 3 and parts[0] == "/" and parts[1] == "mnt" and len(parts[2]) == 1 and parts[2].isalpha()


@functools.lru_cache(maxsize=8)
def _subprocess_timeout_scale(repo_root_key: str) -> float:
    """Return a timeout multiplier for slow filesystems (WSL on /mnt/<drive>)."""
    if not _is_wsl():
        return 1.0
    try:
        if _path_on_windows_drive_mount(Path(repo_root_key)):
            return 6.0
    except (OSError, ValueError):
        pass
    return 2.0


def _scaled_timeout(repo_root: Path, base: float) -> float:
    return base * _subprocess_timeout_scale(str(repo_root))


def viewer_environment_warning(repo_root: Path) -> dict[str, str] | None:
    """Surface an environment warning when the repo lives on a slow filesystem."""
    if _is_wsl() and _path_on_windows_drive_mount(repo_root):
        return {
            "id": "wsl-windows-drive",
            "severity": "warning",
            "title": "Slow filesystem detected",
            "message": (
                "This repository lives on the Windows filesystem accessed from WSL "
                "(/mnt/<drive>). Subprocess timeouts have been scaled up, but git, "
                "cdx and insights operations will still be noticeably slower. "
                "Move the repo to the WSL filesystem (e.g. ~/) for ~10x faster access."
            ),
        }
    return None


def viewer_bootstrap_warning(repo_root: Path) -> dict[str, object] | None:
    """Surface a non-blocking warning when generated bootstrap files are stale."""
    try:
        payload = bootstrap_payload(repo_root, check=True)
    except Exception:
        return None
    if payload.get("ok") is True:
        return None
    paths = [str(path) for path in payload.get("missing_paths", []) if isinstance(path, str)]
    local_instruction_paths = {
        "LOGICS.md",
        "AGENTS.md",
        ".gitignore",
        "logics/instructions.md",
    }
    stale_paths = [path for path in paths if path in local_instruction_paths]
    if not stale_paths:
        return None
    path_summary = ", ".join(stale_paths[:4])
    return {
        "severity": "warning",
        "title": "Logics bootstrap refresh recommended",
        "message": f"Refresh generated Logics assistant instructions with Bootstrap Logics or `logics-manager bootstrap` ({path_summary}).",
        "paths": stale_paths,
    }


def _run_read_only_git(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["git", *args]
    git_runner = runner or subprocess.run
    return git_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 5))


def _run_read_only_cdx(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["cdx", *args]
    cdx_runner = runner or subprocess.run
    return cdx_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 5))


def _run_cdx_mission(repo_root: Path, args: list[str], *, timeout: int, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["cdx", *args]
    cdx_runner = runner or subprocess.run
    return cdx_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, timeout))


def _run_logics_flow(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["logics-manager", "flow", *args]
    flow_runner = runner or subprocess.run
    return flow_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 30))


def _run_logics_command(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["logics-manager", *args]
    logics_runner = runner or subprocess.run
    return logics_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 30))


def _run_read_only_gh(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["gh", *args]
    gh_runner = runner or subprocess.run
    return gh_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 8))


def _run_read_only_glab(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["glab", *args]
    glab_runner = runner or subprocess.run
    return glab_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 8))


def _logics_doc_type(rel_path: str) -> str:
    normalized = rel_path.replace("\\", "/").lstrip("/")
    for family in DOC_FAMILIES:
        if normalized.startswith(f"{family.directory}/"):
            return family.stage
    return ""


def _sanitize_git_ref(value: str) -> str:
    ref = value.strip()
    ref = re.sub(r"://[^/@\s]+@", "://", ref)
    ref = re.sub(r"^[^/@\s]+@", "", ref)
    return ref[:200]


def _github_web_url_from_remote(value: str) -> str:
    remote = value.strip()
    if not remote:
        return ""
    remote = re.sub(r"^git\+", "", remote)
    match = re.match(r"^(?:https://|http://)(?:[^/@\s]+@)?github\.com[:/]+([^/\s]+)/([^/\s]+?)(?:\.git)?/?$", remote)
    if not match:
        match = re.match(r"^(?:ssh://)?git@github\.com[:/]+([^/\s]+)/([^/\s]+?)(?:\.git)?/?$", remote)
    if not match:
        return ""
    owner, repo = match.groups()
    if not owner or not repo:
        return ""
    return f"https://github.com/{owner}/{repo}"


def _gitlab_web_url_from_remote(value: str) -> str:
    remote = value.strip()
    if not remote:
        return ""
    remote = re.sub(r"^git\+", "", remote)
    host = ""
    path = ""
    match = re.match(r"^(?:https://|http://)(?:[^/@\s]+@)?([^:/\s]+)[:/]+(.+?)(?:\.git)?/?$", remote)
    if match:
        host, path = match.groups()
    else:
        match = re.match(r"^(?:ssh://)?git@([^:/\s]+)[:/]+(.+?)(?:\.git)?/?$", remote)
        if match:
            host, path = match.groups()
    if not host or not path or "gitlab" not in host.lower():
        return ""
    path = path.strip("/")
    if not path or "/" not in path:
        return ""
    return f"https://{host}/{path}"


def _github_owner_repo_from_web_url(value: str) -> tuple[str, str] | None:
    match = re.match(r"^https://github\.com/([^/\s]+)/([^/\s]+?)/?$", value.strip())
    if not match:
        return None
    owner, repo = match.groups()
    return owner, repo


def _gitlab_project_path_from_web_url(value: str) -> str:
    match = re.match(r"^https://[^/\s]+/(.+?)/?$", value.strip())
    if not match:
        return ""
    return match.group(1).removesuffix(".git").strip("/")


def _remote_provider_candidates(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> list[tuple[int, dict[str, str]]]:
    git_which = which or shutil.which
    if not git_which("git"):
        return []
    try:
        remotes = _run_read_only_git(repo_root, ["remote", "-v"], runner=runner)
    except (OSError, subprocess.SubprocessError):
        return []
    if remotes.returncode != 0:
        return []

    candidates: list[tuple[int, dict[str, str]]] = []
    seen: set[tuple[str, str]] = set()
    for line in remotes.stdout.splitlines():
        parts = line.split()
        if len(parts) < 2:
            continue
        remote_name, remote_url = parts[0], parts[1]
        web_url = _github_web_url_from_remote(remote_url)
        provider = "github" if web_url else ""
        if not web_url:
            web_url = _gitlab_web_url_from_remote(remote_url)
            provider = "gitlab" if web_url else ""
        if not web_url or not provider:
            continue
        key = (provider, web_url)
        if key in seen:
            continue
        seen.add(key)
        candidates.append(
            (
                0 if remote_name == "origin" else 1,
                {
                    "provider": provider,
                    "webUrl": web_url,
                    "remoteName": remote_name,
                    "githubUrl": web_url if provider == "github" else "",
                    "gitlabUrl": web_url if provider == "gitlab" else "",
                },
            )
        )
    return sorted(candidates, key=lambda entry: entry[0])


def repository_provider_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, str]:
    candidates = _remote_provider_candidates(repo_root, runner=runner, which=which)
    if not candidates:
        return {"provider": "", "webUrl": "", "remoteName": "", "githubUrl": "", "gitlabUrl": ""}
    return candidates[0][1]


def github_repo_url(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> str:
    candidates = _remote_provider_candidates(repo_root, runner=runner, which=which)
    for _priority, candidate in candidates:
        if candidate.get("provider") == "github":
            return candidate.get("webUrl", "")
    return ""


def gitlab_repo_url(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> str:
    candidates = _remote_provider_candidates(repo_root, runner=runner, which=which)
    for _priority, candidate in candidates:
        if candidate.get("provider") == "gitlab":
            return candidate.get("webUrl", "")
    return ""


def _has_gitlab_ci_config(repo_root: Path) -> bool:
    return (repo_root / ".gitlab-ci.yml").is_file() or (repo_root / ".gitlab-ci.yaml").is_file()
