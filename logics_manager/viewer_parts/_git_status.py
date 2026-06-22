def _has_github_actions_workflows(repo_root: Path) -> bool:
    workflows_dir = repo_root / ".github" / "workflows"
    if not workflows_dir.is_dir():
        return False
    return any(path.is_file() and path.suffix.lower() in {".yml", ".yaml"} for path in workflows_dir.iterdir())


def _classify_porcelain_entry(line: str) -> tuple[str, dict[str, str]] | None:
    if not line or line.startswith("## "):
        return None
    if line.startswith("?? "):
        path = line[3:].strip()
        return "untracked", {"path": path, "logicsType": _logics_doc_type(path)}
    if len(line) < 4:
        return None
    staged = line[0]
    worktree = line[1]
    raw_path = line[3:].strip()
    if " -> " in raw_path:
        before, after = raw_path.split(" -> ", 1)
        path = after.strip()
        return "renamed", {"path": path, "from": before.strip(), "logicsType": _logics_doc_type(path)}
    if staged == "R":
        return "renamed", {"path": raw_path, "logicsType": _logics_doc_type(raw_path)}
    if staged not in {" ", "?", "!"}:
        return "staged", {"path": raw_path, "code": staged, "logicsType": _logics_doc_type(raw_path)}
    if worktree == "D":
        return "deleted", {"path": raw_path, "code": worktree, "logicsType": _logics_doc_type(raw_path)}
    if worktree not in {" ", "?", "!"}:
        return "modified", {"path": raw_path, "code": worktree, "logicsType": _logics_doc_type(raw_path)}
    return None


def _parse_git_branch_line(line: str) -> dict[str, Any]:
    branch = line[3:].strip() if line.startswith("## ") else ""
    tracking = ""
    ahead = 0
    behind = 0
    if "..." in branch:
        branch, tracking_part = branch.split("...", 1)
        if " [" in tracking_part:
            tracking, details = tracking_part.split(" [", 1)
            for detail in details.rstrip("]").split(", "):
                if detail.startswith("ahead "):
                    ahead = int(detail.removeprefix("ahead ") or "0")
                if detail.startswith("behind "):
                    behind = int(detail.removeprefix("behind ") or "0")
        else:
            tracking = tracking_part
    return {
        "branch": _sanitize_git_ref(branch or "HEAD"),
        "tracking": _sanitize_git_ref(tracking),
        "ahead": ahead,
        "behind": behind,
    }


GIT_HISTORY_DISPLAY_LIMIT = 50
GIT_HISTORY_FETCH_LIMIT = GIT_HISTORY_DISPLAY_LIMIT + 1


def _parse_recent_git_commits(output: str, *, limit: int | None = None) -> list[dict[str, str]]:
    commits: list[dict[str, str]] = []
    for line in output.splitlines():
        parts = line.split("\x1f")
        if len(parts) < 5:
            continue
        commit_hash, subject, author, date, refs = parts[:5]
        commits.append(
            {
                "hash": _sanitize_git_ref(commit_hash),
                "subject": subject.strip()[:240],
                "author": author.strip()[:120],
                "date": date.strip()[:40],
                "refs": _sanitize_git_ref(refs),
            }
        )
        if limit is not None and len(commits) >= limit:
            break
    return commits


def _parse_git_numstat(output: str) -> dict[str, dict[str, int]]:
    stats: dict[str, dict[str, int]] = {}
    for line in output.splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        raw_additions, raw_deletions, raw_path = parts[:3]
        try:
            additions = int(raw_additions)
            deletions = int(raw_deletions)
        except ValueError:
            continue
        path = raw_path.strip()
        if " => " in path:
            path = path.split(" => ", 1)[1].strip("{}")
        if path:
            stats[path] = {"additions": additions, "deletions": deletions}
    return stats


def _attach_git_change_stats(groups: dict[str, list[dict[str, Any]]], staged_stats: dict[str, dict[str, int]], worktree_stats: dict[str, dict[str, int]]) -> None:
    for key, entries in groups.items():
        stats_source = staged_stats if key == "staged" else worktree_stats
        for entry in entries:
            path = str(entry.get("path", ""))
            stats = stats_source.get(path) or staged_stats.get(path) or worktree_stats.get(path)
            if stats:
                entry["additions"] = stats["additions"]
                entry["deletions"] = stats["deletions"]


def _count_unique_git_status_paths(groups: dict[str, list[dict[str, Any]]]) -> int:
    paths: set[str] = set()
    for entries in groups.values():
        for entry in entries:
            path = entry.get("path", "").strip()
            if path:
                paths.add(path)
    return len(paths)


def _git_unpushed_commit_count(repo_root: Path, *, runner: Any | None = None) -> dict[str, Any]:
    try:
        upstream = _run_read_only_git(repo_root, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"available": False, "count": 0, "message": f"Unable to inspect upstream: {exc}"}
    if upstream.returncode != 0:
        return {"available": False, "count": 0, "message": "No upstream branch detected."}

    tracking = _sanitize_git_ref(upstream.stdout.strip())
    try:
        unpushed = _run_read_only_git(repo_root, ["rev-list", "--count", "@{u}..HEAD"], runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"available": False, "count": 0, "tracking": tracking, "message": f"Unable to count unpushed commits: {exc}"}
    if unpushed.returncode != 0:
        message = (unpushed.stderr or unpushed.stdout or "Unable to count unpushed commits.").strip().splitlines()[0]
        return {"available": False, "count": 0, "tracking": tracking, "message": message}

    try:
        count = max(0, int(unpushed.stdout.strip() or "0"))
    except ValueError:
        count = 0
    return {"available": True, "count": count, "tracking": tracking, "message": ""}


def git_status_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    git_which = which or shutil.which
    if not git_which("git"):
        return {"state": "unavailable", "message": "Git is not available on PATH."}
    try:
        inside = _run_read_only_git(repo_root, ["rev-parse", "--is-inside-work-tree"], runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run Git status: {exc}"}
    if inside.returncode != 0 or inside.stdout.strip().lower() != "true":
        return {"state": "not-repository", "message": "This folder is not inside a Git worktree."}

    try:
        status = _run_read_only_git(repo_root, ["status", "--porcelain=v1", "-b"], runner=runner)
        staged_numstat = _run_read_only_git(repo_root, ["diff", "--no-ext-diff", "--numstat", "--cached"], runner=runner)
        worktree_numstat = _run_read_only_git(repo_root, ["diff", "--no-ext-diff", "--numstat"], runner=runner)
        commit = _run_read_only_git(repo_root, ["log", "-1", "--pretty=format:%h %s"], runner=runner)
        recent_commits = _run_read_only_git(
            repo_root,
            ["log", f"-{GIT_HISTORY_FETCH_LIMIT}", "--date=iso-strict", "--pretty=format:%h%x1f%s%x1f%an%x1f%ad%x1f%D"],
            runner=runner,
        )
        unpushed = _git_unpushed_commit_count(repo_root, runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to collect Git status: {exc}"}
    if status.returncode != 0:
        message = (status.stderr or status.stdout or "Git status failed.").strip().splitlines()[0]
        return {"state": "error", "message": message}

    lines = status.stdout.splitlines()
    branch_info = _parse_git_branch_line(lines[0]) if lines else {"branch": "HEAD", "tracking": "", "ahead": 0, "behind": 0}
    groups: dict[str, list[dict[str, Any]]] = {key: [] for key in ("staged", "modified", "deleted", "renamed", "untracked")}
    for line in lines[1:]:
        classified = _classify_porcelain_entry(line)
        if classified:
            group, entry = classified
            groups[group].append(entry)
    if staged_numstat.returncode == 0 or worktree_numstat.returncode == 0:
        _attach_git_change_stats(
            groups,
            _parse_git_numstat(staged_numstat.stdout if staged_numstat.returncode == 0 else ""),
            _parse_git_numstat(worktree_numstat.stdout if worktree_numstat.returncode == 0 else ""),
        )
    counts = {key: len(value) for key, value in groups.items()}
    uncommitted_files = _count_unique_git_status_paths(groups)
    dirty = any(counts.values())
    parsed_recent_commits = _parse_recent_git_commits(recent_commits.stdout, limit=GIT_HISTORY_FETCH_LIMIT) if recent_commits.returncode == 0 else []
    return {
        "state": "ok",
        **branch_info,
        "clean": not dirty,
        "dirty": dirty,
        "counts": counts,
        "badgeCounts": {
            "unpushedCommits": int(unpushed.get("count", 0)),
            "uncommittedFiles": uncommitted_files,
        },
        "badgeAvailability": {
            "unpushedCommits": bool(unpushed.get("available")),
            "uncommittedFiles": True,
        },
        "badgeMessages": {
            "unpushedCommits": str(unpushed.get("message", "")),
            "uncommittedFiles": "",
        },
        "groups": groups,
        "latestCommit": (commit.stdout.strip() if commit.returncode == 0 else "")[:300],
        "recentCommits": parsed_recent_commits[:GIT_HISTORY_DISPLAY_LIMIT],
        "recentCommitsHasMore": len(parsed_recent_commits) > GIT_HISTORY_DISPLAY_LIMIT,
    }


def _run_git_mutation(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["git", *args]
    git_runner = runner or subprocess.run
    return git_runner(command, cwd=repo_root, text=True, capture_output=True, timeout=_scaled_timeout(repo_root, 30))


def _first_git_error_line(result: subprocess.CompletedProcess[str], fallback: str) -> str:
    return (result.stderr or result.stdout or fallback).strip().splitlines()[0]


def git_commit_payload(
    repo_root: Path,
    files: list[str],
    message: str,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    git_which = which or shutil.which
    if not git_which("git"):
        return {"state": "unavailable", "message": "Git is not available on PATH."}
    commit_message = str(message or "").strip()
    if not commit_message:
        return {"state": "error", "message": "Commit message is required."}
    if len(commit_message) > 500:
        return {"state": "error", "message": "Commit message is too long."}

    normalized_files: list[str] = []
    seen: set[str] = set()
    for rel_path in files:
        normalized = _normalize_git_file_path(str(rel_path or ""))
        if not normalized:
            return {"state": "error", "message": "Unsafe Git path."}
        if normalized not in seen:
            seen.add(normalized)
            normalized_files.append(normalized)
    if not normalized_files:
        return {"state": "error", "message": "Select at least one file to commit."}
    if len(normalized_files) > 200:
        return {"state": "error", "message": "Too many files selected."}

    status = git_status_payload(repo_root, runner=runner, which=which)
    if status.get("state") != "ok":
        return {"state": status.get("state", "error"), "message": status.get("message", "Unable to inspect Git status.")}

    changed_by_path: dict[str, dict[str, Any]] = {}
    for entries in (status.get("groups") or {}).values():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if isinstance(entry, dict):
                path = str(entry.get("path") or "")
                if path:
                    changed_by_path[path] = entry

    expanded_files: list[str] = []
    expanded_seen: set[str] = set()
    for rel_path in normalized_files:
        entry = changed_by_path.get(rel_path)
        if entry is None:
            return {"state": "error", "message": f"No pending Git change found for {rel_path}."}
        for candidate in (str(entry.get("from") or ""), rel_path):
            normalized = _normalize_git_file_path(candidate)
            if normalized and normalized not in expanded_seen:
                expanded_seen.add(normalized)
                expanded_files.append(normalized)

    try:
        add_result = _run_git_mutation(repo_root, ["add", "--", *expanded_files], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "Git add timed out."}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to stage selected files: {exc}"}
    if add_result.returncode != 0:
        return {"state": "error", "message": _first_git_error_line(add_result, "Git add failed.")}

    try:
        commit_result = _run_git_mutation(repo_root, ["commit", "-m", commit_message, "--", *expanded_files], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "Git commit timed out."}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to create Git commit: {exc}"}
    if commit_result.returncode != 0:
        return {"state": "error", "message": _first_git_error_line(commit_result, "Git commit failed.")}

    try:
        head = _run_read_only_git(repo_root, ["rev-parse", "HEAD"], runner=runner)
    except (OSError, subprocess.SubprocessError):
        head = subprocess.CompletedProcess(["git", "rev-parse", "HEAD"], 1, "", "")
    commit_hash = head.stdout.strip() if head.returncode == 0 else ""
    return {
        "state": "ok",
        "message": "Commit created.",
        "hash": commit_hash,
        "shortHash": commit_hash[:7],
        "files": normalized_files,
    }


def _normalize_git_file_path(rel_path: str) -> str | None:
    normalized = unquote(rel_path).replace("\\", "/").lstrip("/")
    if not normalized or normalized.startswith("~") or normalized.startswith("/") or ".." in normalized.split("/"):
        return None
    return normalized


def git_diff_payload(
    repo_root: Path,
    rel_path: str,
    *,
    cached: bool = False,
    max_chars: int = 20000,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    git_which = which or shutil.which
    if not git_which("git"):
        return {"state": "unavailable", "message": "Git is not available on PATH."}
    normalized = _normalize_git_file_path(rel_path)
    if not normalized:
        return {"state": "error", "message": "Unsafe Git path."}
    try:
        inside = _run_read_only_git(repo_root, ["rev-parse", "--is-inside-work-tree"], runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run Git diff: {exc}"}
    if inside.returncode != 0 or inside.stdout.strip().lower() != "true":
        return {"state": "not-repository", "message": "This folder is not inside a Git worktree."}

    args = ["diff", "--no-ext-diff", "--unified=80"]
    if cached:
        args.append("--cached")
    args.extend(["--", normalized])
    try:
        diff = _run_read_only_git(repo_root, args, runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to collect Git diff: {exc}"}
    if diff.returncode != 0:
        message = (diff.stderr or diff.stdout or "Git diff failed.").strip().splitlines()[0]
        return {"state": "error", "message": message}
    content = diff.stdout
    truncated = len(content) > max_chars
    if truncated:
        content = content[:max_chars]
    return {
        "state": "ok",
        "path": normalized,
        "mode": "staged" if cached else "worktree",
        "diff": content,
        "truncated": truncated,
        "logicsType": _logics_doc_type(normalized),
        "message": "" if content else "No diff is available for this file in the selected mode.",
    }


def git_file_preview_payload(
    repo_root: Path,
    rel_path: str,
    *,
    max_bytes: int = GIT_FILE_PREVIEW_MAX_BYTES,
    max_chars: int = GIT_FILE_PREVIEW_MAX_CHARS,
    full: bool = False,
) -> dict[str, Any]:
    hard_cap_hit = False
    if full:
        max_bytes = PREVIEW_FORCE_MAX_BYTES
        max_chars = PREVIEW_FORCE_MAX_CHARS
    normalized = _normalize_git_file_path(rel_path)
    if not normalized:
        return {"state": "error", "message": "Unsafe Git path."}
    target = (repo_root / normalized).resolve()
    try:
        target.relative_to(repo_root.resolve())
    except ValueError:
        return {"state": "error", "message": "Unsafe Git path."}
    if not target.exists() or not target.is_file():
        return {
            "state": "missing",
            "path": normalized,
            "message": "The current file is missing or deleted, so no file preview is available.",
        }
    try:
        size = target.stat().st_size
    except OSError as exc:
        return {"state": "error", "path": normalized, "message": f"Unable to inspect file: {exc}"}
    if size > max_bytes:
        return {
            "state": "oversized",
            "path": normalized,
            "size": size,
            "limit": max_bytes,
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
    if b"\x00" in data:
        return {
            "state": "unsupported",
            "path": normalized,
            "message": "Binary or unsupported file content cannot be previewed.",
        }
    try:
        content = data.decode("utf-8")
    except UnicodeDecodeError:
        return {
            "state": "unsupported",
            "path": normalized,
            "message": "Binary or unsupported file encoding cannot be previewed.",
        }
    content = content.replace("\r\n", "\n").replace("\r", "\n")
    full_line_count = len(content.splitlines()) if content else 0
    truncated = len(content) > max_chars
    if truncated:
        content = content[:max_chars]
        hard_cap_hit = full
    return {
        "state": "ok",
        "path": normalized,
        "mode": "file-preview",
        "content": content,
        "truncated": truncated,
        "canForce": (not full) and truncated,
        "hardCapHit": hard_cap_hit,
        "lineCount": full_line_count,
        "logicsType": _logics_doc_type(normalized),
        "message": "",
    }
