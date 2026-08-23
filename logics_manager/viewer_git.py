"""Git and CI runtime for the Logics viewer server.

Lifted out of ``viewer.py`` by req_311, on the seam the cdx and workshop modules already
established. All public names are re-exported from ``logics_manager.viewer`` for backward
compatibility.

Helpers that belong to the viewer itself are reached through ``_viewer`` rather than
imported by name, so the two modules stay importable in either order.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote

from . import path_utils as _path_utils

class _ViewerProxy:
    """Reaches the viewer at call time, not at import time.

    Binding the module directly made the pair importable only in one order: importing this
    module first pulled in the viewer, which re-exports these names, while this module had
    not finished defining them. Resolving on attribute access removes the cycle without
    touching a single call site.
    """

    def __getattr__(self, name: str) -> Any:
        from . import viewer

        return getattr(viewer, name)


_viewer = _ViewerProxy()


GIT_FILE_PREVIEW_MAX_BYTES = 30000


GIT_FILE_PREVIEW_MAX_CHARS = 20000


def _git_is_repository(repo_root: Path, *, runner: Any | None = None) -> bool | None:
    try:
        result = _run_read_only_git(repo_root, ["rev-parse", "--is-inside-work-tree"], runner=runner)
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return False
    return result.stdout.strip().lower() == "true"


def _run_read_only_git(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["git", *args]
    git_runner = runner or subprocess.run
    return git_runner(command, cwd=repo_root, text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=_viewer._scaled_timeout(repo_root, 5))


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


def github_repo_url(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> str:
    candidates = _viewer._remote_provider_candidates(repo_root, runner=runner, which=which)
    for _priority, candidate in candidates:
        if candidate.get("provider") == "github":
            return candidate.get("webUrl", "")
    return ""


def gitlab_repo_url(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> str:
    candidates = _viewer._remote_provider_candidates(repo_root, runner=runner, which=which)
    for _priority, candidate in candidates:
        if candidate.get("provider") == "gitlab":
            return candidate.get("webUrl", "")
    return ""


def _has_gitlab_ci_config(repo_root: Path) -> bool:
    return (repo_root / ".gitlab-ci.yml").is_file() or (repo_root / ".gitlab-ci.yaml").is_file()


def _has_github_actions_workflows(repo_root: Path) -> bool:
    workflows_dir = repo_root / ".github" / "workflows"
    if not workflows_dir.is_dir():
        return False
    return any(path.is_file() and path.suffix.lower() in {".yml", ".yaml"} for path in workflows_dir.iterdir())


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


def _review_file_entry(entry: dict[str, Any], group: str) -> dict[str, Any]:
    path = str(entry.get("path") or "")
    item: dict[str, Any] = {
        "path": path,
        "kind": str(entry.get("status") or group),
        "group": group,
        "additions": int(entry.get("additions", 0) or 0),
        "deletions": int(entry.get("deletions", 0) or 0),
    }
    if entry.get("from"):
        item["from"] = str(entry.get("from"))
    if group == "staged":
        item["cached"] = True
    return item


def _count_unique_git_status_paths(groups: dict[str, list[dict[str, Any]]]) -> int:
    paths: set[str] = set()
    for entries in groups.values():
        for entry in entries:
            path = entry.get("path", "").strip()
            if path:
                paths.add(path)
    return len(paths)


def _commit_review_files(repo_root: Path, ref: str, *, runner: Any | None = None) -> list[dict[str, Any]]:
    stats = _run_read_only_git(repo_root, ["show", "--no-ext-diff", "--format=", "--numstat", "--find-renames", ref], runner=runner)
    names = _run_read_only_git(repo_root, ["show", "--no-ext-diff", "--format=", "--name-status", "--find-renames", ref], runner=runner)
    if stats.returncode != 0 and names.returncode != 0:
        return []
    by_path = _parse_git_numstat(stats.stdout if stats.returncode == 0 else "")
    rows: list[dict[str, Any]] = []
    for line in (names.stdout if names.returncode == 0 else "").splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        code = parts[0].strip()
        path = parts[-1].strip()
        if not path:
            continue
        stat = by_path.get(path) or {}
        rows.append({
            "path": path,
            "kind": code[:1].upper() or "M",
            "additions": int(stat.get("additions", 0)),
            "deletions": int(stat.get("deletions", 0)),
        })
        if len(rows) >= 200:
            break
    return rows


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
        classified = _viewer._classify_porcelain_entry(line)
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
            "unpulledCommits": max(0, int(branch_info.get("behind", 0) or 0)),
            "uncommittedFiles": uncommitted_files,
        },
        "badgeAvailability": {
            "unpushedCommits": bool(unpushed.get("available")),
            # Behind shares the same upstream detection as ahead (porcelain branch line).
            "unpulledCommits": bool(unpushed.get("available")),
            "uncommittedFiles": True,
        },
        "badgeMessages": {
            "unpushedCommits": str(unpushed.get("message", "")),
            "unpulledCommits": str(unpushed.get("message", "")),
            "uncommittedFiles": "",
        },
        "groups": groups,
        "latestCommit": (commit.stdout.strip() if commit.returncode == 0 else "")[:300],
        "recentCommits": parsed_recent_commits[:GIT_HISTORY_DISPLAY_LIMIT],
        "recentCommitsHasMore": len(parsed_recent_commits) > GIT_HISTORY_DISPLAY_LIMIT,
    }


def review_bursts_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    status = git_status_payload(repo_root, runner=runner, which=which)
    if status.get("state") != "ok":
        return {"state": status.get("state", "error"), "message": status.get("message", "Unable to inspect Git status."), "bursts": []}

    bursts: list[dict[str, Any]] = []
    groups = status.get("groups") if isinstance(status.get("groups"), dict) else {}
    dirty_files: list[dict[str, Any]] = []
    seen: set[tuple[str, bool]] = set()
    for group, entries in groups.items():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            item = _review_file_entry(entry, str(group))
            key = (item.get("path", ""), bool(item.get("cached")))
            if item.get("path") and key not in seen:
                seen.add(key)
                dirty_files.append(item)
    if dirty_files:
        bursts.append({
            "id": "working-tree",
            "kind": "working-tree",
            "label": "Working tree",
            "title": "Uncommitted changes",
            "meta": f"{len(dirty_files)} files",
            "files": dirty_files,
        })

    commits = status.get("recentCommits") if isinstance(status.get("recentCommits"), list) else []
    for commit in commits:
        if not isinstance(commit, dict):
            continue
        ref = str(commit.get("hash") or "").strip()
        if not re.fullmatch(r"[0-9a-fA-F]{4,40}", ref):
            continue
        bursts.append({
            "id": f"commit:{ref}",
            "kind": "commit",
            "ref": ref,
            "label": ref[:7],
            "title": str(commit.get("subject") or "Untitled commit")[:240],
            "meta": " · ".join(str(commit.get(key) or "").strip() for key in ("author", "date") if str(commit.get(key) or "").strip()),
            "files": _commit_review_files(repo_root, ref, runner=runner),
        })
    return {"state": "ok", "message": "" if bursts else "No Git changes or recent commits are available.", "bursts": bursts}


def _run_git_mutation(repo_root: Path, args: list[str], *, runner: Any | None = None) -> subprocess.CompletedProcess[str]:
    command = ["git", *args]
    git_runner = runner or subprocess.run
    return git_runner(command, cwd=repo_root, text=True, capture_output=True, stdin=subprocess.DEVNULL, timeout=_viewer._scaled_timeout(repo_root, 30))


def _first_git_error_line(result: subprocess.CompletedProcess[str], fallback: str) -> str:
    return (result.stderr or result.stdout or fallback).strip().splitlines()[0]


def git_fetch_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    git_which = which or shutil.which
    if not git_which("git"):
        return {"state": "unavailable", "message": "Git is not available on PATH."}
    git_runner = runner or subprocess.run
    # GIT_TERMINAL_PROMPT=0 keeps a missing credential from hanging the request forever;
    # an auth-required remote fails fast instead of blocking the viewer.
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    try:
        result = git_runner(
            ["git", "fetch", "--prune"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_viewer._scaled_timeout(repo_root, 30),
            env=env,
        )
    except subprocess.TimeoutExpired:
        return {"state": "error", "message": "Git fetch timed out."}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run Git fetch: {exc}"}
    if result.returncode != 0:
        return {"state": "error", "message": _first_git_error_line(result, "Git fetch failed.")}
    return {"state": "ok", "message": (result.stderr or result.stdout or "").strip()[:300]}


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
        normalized = _normalize_git_file_path(repo_root, str(rel_path or ""))
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
            normalized = _normalize_git_file_path(repo_root, candidate)
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


def _normalize_git_file_path(repo_root: Path, rel_path: str) -> str | None:
    normalized = unquote(rel_path).replace("\\", "/").lstrip("/")
    if not normalized or normalized.startswith("~") or normalized.startswith("/") or ".." in normalized.split("/"):
        return None
    root = repo_root.resolve()
    if _path_utils.has_symlink_segment(root, Path(normalized)):
        return None
    try:
        _path_utils.relative_to_root(root / normalized, root)
    except _path_utils.PathEscapesRoot:
        return None
    return normalized


# item_732: the ceiling a forced diff load is still held to. Large enough that asking for
# the rest is worth doing, bounded so one enormous diff cannot be used to exhaust the
# viewer's memory.
GIT_DIFF_FORCE_MAX_CHARS = 400000


def git_diff_payload(
    repo_root: Path,
    rel_path: str,
    *,
    cached: bool = False,
    max_chars: int = 20000,
    full: bool = False,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    git_which = which or shutil.which
    if not git_which("git"):
        return {"state": "unavailable", "message": "Git is not available on PATH."}
    normalized = _normalize_git_file_path(repo_root, rel_path)
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
    # item_732: a truncated diff offered nothing but the word "truncated". The file preview
    # beside it has had a `full` escape hatch all along; this takes the same one rather than
    # inventing a second way to ask for the rest.
    if full:
        max_chars = GIT_DIFF_FORCE_MAX_CHARS
    truncated = len(content) > max_chars
    if truncated:
        content = content[:max_chars]
    return {
        "state": "ok",
        "path": normalized,
        "mode": "staged" if cached else "worktree",
        "diff": content,
        "truncated": truncated,
        # False once the forced cap has also been hit, so the control does not offer a
        # continuation that would return the same thing.
        "canForce": (not full) and truncated,
        "logicsType": _viewer._logics_doc_type(normalized),
        "message": "" if content else "No diff is available for this file in the selected mode.",
    }


def git_commit_diff_payload(
    repo_root: Path,
    ref: str,
    *,
    path: str = "",
    max_chars: int = 20000,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    git_which = which or shutil.which
    if not git_which("git"):
        return {"state": "unavailable", "message": "Git is not available on PATH."}
    normalized = str(ref or "").strip()
    if not re.fullmatch(r"[0-9a-fA-F]{4,40}", normalized):
        return {"state": "error", "message": "Unsafe Git commit ref."}
    normalized_path = ""
    if path:
        normalized_path = _normalize_git_file_path(repo_root, path) or ""
        if not normalized_path:
            return {"state": "error", "message": "Unsafe Git path."}
    try:
        inside = _run_read_only_git(repo_root, ["rev-parse", "--is-inside-work-tree"], runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run Git show: {exc}"}
    if inside.returncode != 0 or inside.stdout.strip().lower() != "true":
        return {"state": "not-repository", "message": "This folder is not inside a Git worktree."}

    args = ["show", "--no-ext-diff", "--format=medium", "--stat", "--patch", "--find-renames", "--unified=80", normalized]
    if normalized_path:
        args.extend(["--", normalized_path])
    try:
        diff = _run_read_only_git(repo_root, args, runner=runner)
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to collect Git commit diff: {exc}"}
    if diff.returncode != 0:
        message = (diff.stderr or diff.stdout or "Git show failed.").strip().splitlines()[0]
        return {"state": "error", "message": message}
    content = diff.stdout
    truncated = len(content) > max_chars
    if truncated:
        content = content[:max_chars]
    return {
        "state": "ok",
        "ref": normalized,
        "path": normalized_path,
        "mode": "commit",
        "diff": content,
        "truncated": truncated,
        "message": "" if content else "No diff is available for this commit.",
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
        max_bytes = _viewer.PREVIEW_FORCE_MAX_BYTES
        max_chars = _viewer.PREVIEW_FORCE_MAX_CHARS
    normalized = _normalize_git_file_path(repo_root, rel_path)
    if not normalized:
        return {"state": "error", "message": "Unsafe Git path."}
    target = (repo_root / normalized).resolve()
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
            "canForce": (not full) and size <= _viewer.PREVIEW_FORCE_MAX_BYTES,
            "message": (
                f"File is {size} bytes; even a forced load is capped at {_viewer.PREVIEW_FORCE_MAX_BYTES} bytes."
                if full or size > _viewer.PREVIEW_FORCE_MAX_BYTES
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
        "logicsType": _viewer._logics_doc_type(normalized),
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


def _gitlab_ci_badge_state(status: str) -> str:
    normalized = status.strip().lower()
    if normalized == "success":
        return "passing"
    if normalized == "failed":
        return "failing"
    if normalized in {"canceled", "cancelled"}:
        return "cancelled"
    if normalized in {"running"}:
        return "running"
    if normalized in {"created", "waiting_for_resource", "preparing", "pending", "scheduled", "manual"}:
        return "queued"
    return "unknown"


def _select_github_actions_run(runs: list[dict[str, Any]], head_sha: str) -> tuple[dict[str, Any], str]:
    ci_runs = [run for run in runs if str(run.get("name") or "").strip().lower() == "ci"]
    candidate_runs = ci_runs or runs
    head_runs = [run for run in candidate_runs if head_sha and str(run.get("head_sha") or "") == head_sha]
    active_head_run = next((run for run in head_runs if _viewer._is_active_ci_status(run)), None)
    if active_head_run is not None:
        return active_head_run, "head-active"
    if head_runs:
        head_state = _viewer._ci_badge_state(str(head_runs[0].get("status") or ""), str(head_runs[0].get("conclusion") or ""))
        if head_state in {"failing", "cancelled", "unknown"}:
            return head_runs[0], f"head-{head_state}"
        return head_runs[0], "head"
    active_branch_run = next((run for run in candidate_runs if _viewer._is_active_ci_status(run)), None)
    if active_branch_run is not None:
        return active_branch_run, "branch-active"
    return candidate_runs[0], "branch-latest"




def _parse_github_actions_run(run: dict[str, Any], *, match_source: str) -> dict[str, Any]:
    status = str(run.get("status") or "")
    conclusion = str(run.get("conclusion") or "")
    commit = run.get("head_commit") if isinstance(run.get("head_commit"), dict) else {}
    author = commit.get("author") if isinstance(commit.get("author"), dict) else {}
    commit_lines = str(commit.get("message") or run.get("display_title") or "").splitlines()
    return {
        "id": run.get("id"),
        "name": str(run.get("name") or run.get("display_title") or "GitHub Actions"),
        "workflowName": str(run.get("name") or "GitHub Actions"),
        "status": status,
        "conclusion": conclusion,
        "badgeState": _viewer._ci_badge_state(status, conclusion),
        "branch": str(run.get("head_branch") or ""),
        "headSha": str(run.get("head_sha") or ""),
        "event": str(run.get("event") or ""),
        "htmlUrl": str(run.get("html_url") or ""),
        "createdAt": str(run.get("created_at") or ""),
        "updatedAt": str(run.get("updated_at") or ""),
        "runStartedAt": str(run.get("run_started_at") or ""),
        "commitMessage": commit_lines[0][:240] if commit_lines else "",
        "author": str(author.get("name") or ""),
        "matchSource": match_source,
    }


def _parse_github_actions_jobs(output: str) -> list[dict[str, str]]:
    try:
        parsed = json.loads(output or "{}")
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, dict):
        return []
    jobs = parsed.get("jobs")
    if not isinstance(jobs, list):
        return []
    rows: list[dict[str, str]] = []
    for job in jobs[:30]:
        if not isinstance(job, dict):
            continue
        rows.append(
            {
                "name": str(job.get("name") or "Job"),
                "status": str(job.get("status") or ""),
                "conclusion": str(job.get("conclusion") or ""),
                "htmlUrl": str(job.get("html_url") or ""),
                "startedAt": str(job.get("started_at") or ""),
                "completedAt": str(job.get("completed_at") or ""),
            }
        )
    return rows


def _select_gitlab_pipeline(pipelines: list[dict[str, Any]], head_sha: str) -> tuple[dict[str, Any], str]:
    head_pipelines = [pipeline for pipeline in pipelines if head_sha and str(pipeline.get("sha") or "") == head_sha]
    active_head = next((pipeline for pipeline in head_pipelines if _gitlab_ci_badge_state(str(pipeline.get("status") or "")) in {"running", "queued"}), None)
    if active_head is not None:
        return active_head, "head-active"
    if head_pipelines:
        head_state = _gitlab_ci_badge_state(str(head_pipelines[0].get("status") or ""))
        if head_state in {"failing", "cancelled", "unknown"}:
            return head_pipelines[0], f"head-{head_state}"
        return head_pipelines[0], "head"
    active_branch = next((pipeline for pipeline in pipelines if _gitlab_ci_badge_state(str(pipeline.get("status") or "")) in {"running", "queued"}), None)
    if active_branch is not None:
        return active_branch, "branch-active"
    return pipelines[0], "branch-latest"


def _parse_gitlab_pipeline_run(pipeline: dict[str, Any], *, match_source: str, context: dict[str, str]) -> dict[str, Any]:
    status = str(pipeline.get("status") or "")
    user = pipeline.get("user") if isinstance(pipeline.get("user"), dict) else {}
    return {
        "id": pipeline.get("id"),
        "name": str(pipeline.get("name") or "GitLab pipeline"),
        "workflowName": str(pipeline.get("name") or "GitLab pipeline"),
        "status": status,
        "conclusion": "",
        "badgeState": _gitlab_ci_badge_state(status),
        "branch": str(pipeline.get("ref") or context.get("branch", "")),
        "headSha": str(pipeline.get("sha") or ""),
        "event": str(pipeline.get("source") or ""),
        "htmlUrl": str(pipeline.get("web_url") or ""),
        "createdAt": str(pipeline.get("created_at") or ""),
        "updatedAt": str(pipeline.get("updated_at") or ""),
        "runStartedAt": str(pipeline.get("created_at") or ""),
        "commitMessage": context.get("subject", ""),
        "author": str(user.get("name") or context.get("author", "")),
        "matchSource": match_source,
    }


def _parse_gitlab_jobs(output: str) -> list[dict[str, str]]:
    try:
        parsed = json.loads(output or "[]")
    except json.JSONDecodeError:
        return []
    jobs = parsed if isinstance(parsed, list) else []
    rows: list[dict[str, str]] = []
    for job in jobs[:30]:
        if not isinstance(job, dict):
            continue
        rows.append(
            {
                "name": str(job.get("name") or "Job"),
                "status": str(job.get("status") or ""),
                "conclusion": "",
                "htmlUrl": str(job.get("web_url") or ""),
                "startedAt": str(job.get("started_at") or ""),
                "completedAt": str(job.get("finished_at") or ""),
            }
        )
    return rows


def _github_ci_status_payload(repo_root: Path, github_url: str, *, git_runner: Any | None = None, gh_runner: Any | None = None) -> dict[str, Any]:
    owner_repo = _github_owner_repo_from_web_url(github_url)
    if not owner_repo:
        return {"state": "hidden", "visible": False, "message": "GitHub remote could not be parsed."}

    owner, repo = owner_repo
    context = _current_git_ci_context(repo_root, runner=git_runner)
    branch = context.get("branch", "")
    head_sha = context.get("headSha", "")
    endpoint = f"repos/{owner}/{repo}/actions/runs?per_page=30"
    if branch:
        endpoint = f"{endpoint}&branch={quote(branch, safe='')}"
    try:
        runs_result = _viewer._run_read_only_gh(repo_root, ["api", endpoint], runner=gh_runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "visible": True, "message": "GitHub Actions status timed out.", "repositoryUrl": github_url, **context, "badgeState": "unavailable", "recentRuns": []}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "visible": True, "message": f"Unable to collect GitHub Actions status: {exc}", "repositoryUrl": github_url, **context, "badgeState": "unavailable", "recentRuns": []}
    if runs_result.returncode != 0:
        message = (runs_result.stderr or runs_result.stdout or "GitHub Actions status failed.").strip().splitlines()[0]
        return {"state": "unavailable", "visible": True, "message": message, "repositoryUrl": github_url, **context, "badgeState": "unavailable", "recentRuns": []}

    try:
        parsed = json.loads(runs_result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "visible": True, "message": "GitHub Actions status returned invalid JSON.", "repositoryUrl": github_url, **context, "badgeState": "unavailable", "recentRuns": []}
    workflow_runs = parsed.get("workflow_runs") if isinstance(parsed, dict) else None
    runs = [run for run in workflow_runs if isinstance(run, dict)] if isinstance(workflow_runs, list) else []
    if not runs:
        return {"state": "ok", "visible": True, "message": "No GitHub Actions runs found for the current branch.", "repositoryUrl": github_url, **context, "badgeState": "unknown", "run": None, "jobs": [], "recentRuns": []}

    selected, match_source = _select_github_actions_run(runs, head_sha)
    run_payload = _parse_github_actions_run(selected, match_source=match_source)
    jobs: list[dict[str, str]] = []
    run_id = run_payload.get("id")
    if run_id:
        try:
            jobs_result = _viewer._run_read_only_gh(repo_root, ["api", f"repos/{owner}/{repo}/actions/runs/{run_id}/jobs?per_page=100"], runner=gh_runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            jobs_result = None
        if jobs_result is not None and jobs_result.returncode == 0:
            jobs = _parse_github_actions_jobs(jobs_result.stdout)

    return {
        "state": "ok",
        "visible": True,
        "message": "",
        "repositoryUrl": github_url,
        **context,
        "badgeState": run_payload["badgeState"],
        "run": run_payload,
        "jobs": jobs,
        "recentRuns": _viewer._recent_ci_runs(runs),
    }


def _gitlab_ci_status_payload(repo_root: Path, gitlab_url: str, *, git_runner: Any | None = None, glab_runner: Any | None = None) -> dict[str, Any]:
    project_path = _gitlab_project_path_from_web_url(gitlab_url)
    if not project_path:
        return {"state": "hidden", "visible": False, "message": "GitLab remote could not be parsed."}
    context = _current_git_ci_context(repo_root, runner=git_runner)
    branch = context.get("branch", "")
    project_id = quote(project_path, safe="")
    endpoint = f"projects/{project_id}/pipelines?per_page=30"
    if branch:
        endpoint = f"{endpoint}&ref={quote(branch, safe='')}"
    try:
        pipelines_result = _viewer._run_read_only_glab(repo_root, ["api", endpoint], runner=glab_runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "visible": True, "message": "GitLab CI status timed out.", "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unavailable", "recentRuns": []}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "visible": True, "message": f"Unable to collect GitLab CI status: {exc}", "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unavailable", "recentRuns": []}
    if pipelines_result.returncode != 0:
        message = (pipelines_result.stderr or pipelines_result.stdout or "GitLab CI status failed.").strip().splitlines()[0]
        return {"state": "unavailable", "visible": True, "message": message, "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unavailable", "recentRuns": []}

    try:
        parsed = json.loads(pipelines_result.stdout or "[]")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "visible": True, "message": "GitLab CI status returned invalid JSON.", "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unavailable", "recentRuns": []}
    pipelines = [pipeline for pipeline in parsed if isinstance(pipeline, dict)] if isinstance(parsed, list) else []
    if not pipelines:
        return {"state": "ok", "visible": True, "message": "No GitLab pipelines found for the current branch.", "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unknown", "run": None, "jobs": []}

    selected, match_source = _select_gitlab_pipeline(pipelines, context.get("headSha", ""))
    run_payload = _parse_gitlab_pipeline_run(selected, match_source=match_source, context=context)
    jobs: list[dict[str, str]] = []
    pipeline_id = run_payload.get("id")
    if pipeline_id:
        try:
            jobs_result = _viewer._run_read_only_glab(repo_root, ["api", f"projects/{project_id}/pipelines/{pipeline_id}/jobs?per_page=100"], runner=glab_runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            jobs_result = None
        if jobs_result is not None and jobs_result.returncode == 0:
            jobs = _parse_gitlab_jobs(jobs_result.stdout)

    return {
        "state": "ok",
        "visible": True,
        "message": "",
        "repositoryUrl": gitlab_url,
        "provider": "gitlab",
        **context,
        "badgeState": run_payload["badgeState"],
        "run": run_payload,
        "jobs": jobs,
    }


def _github_release_workflow_file(repo_root: Path) -> str:
    """Return the basename of the Release GitHub Actions workflow file, if present.

    The Release workflow is triggered on tag pushes, so its runs do not appear
    on the current branch. We target the workflow file directly via the
    ``actions/workflows/<file>/runs`` endpoint instead of filtering branch runs.
    """
    workflows_dir = repo_root / ".github" / "workflows"
    if not workflows_dir.is_dir():
        return ""
    # Explicit release.yml/.yaml wins for backward compatibility.
    for name in ("release.yml", "release.yaml"):
        if (workflows_dir / name).is_file():
            return name
    # Otherwise detect a release-shaped workflow by its `on:` triggers, so
    # projects whose publish/deploy workflow isn't literally named "release"
    # still light up the badge. ponytail: regex over the text before `jobs:`,
    # not a full YAML parse — enough to spot `tags:`/`release:` triggers;
    # swap in PyYAML if it ever misfires.
    candidates: list[str] = []
    for path in sorted(workflows_dir.glob("*.y*ml")):
        try:
            header = path.read_text(encoding="utf-8").split("\njobs:", 1)[0]
        except OSError:
            continue
        if re.search(r"^\s*(tags:|release:)", header, re.MULTILINE):
            candidates.append(path.name)
    if not candidates:
        return ""

    def _rank(name: str) -> tuple[int, str]:
        low = name.lower()
        for i, keyword in enumerate(("release", "publish", "deploy", "cd")):
            if keyword in low:
                return (i, name)
        return (99, name)

    return min(candidates, key=_rank)


def _github_release_runs_payload(repo_root: Path, github_url: str, workflow_file: str, *, gh_runner: Any | None = None) -> dict[str, Any]:
    owner_repo = _github_owner_repo_from_web_url(github_url)
    if not owner_repo:
        return {"state": "hidden", "visible": False, "message": "GitHub remote could not be parsed."}

    owner, repo = owner_repo
    endpoint = f"repos/{owner}/{repo}/actions/workflows/{workflow_file}/runs?per_page=10"
    try:
        runs_result = _viewer._run_read_only_gh(repo_root, ["api", endpoint], runner=gh_runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "visible": True, "message": "Release workflow status timed out.", "repositoryUrl": github_url, "badgeState": "unavailable", "recentRuns": []}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "visible": True, "message": f"Unable to collect release workflow status: {exc}", "repositoryUrl": github_url, "badgeState": "unavailable", "recentRuns": []}
    if runs_result.returncode != 0:
        message = (runs_result.stderr or runs_result.stdout or "Release workflow status failed.").strip().splitlines()[0]
        return {"state": "unavailable", "visible": True, "message": message, "repositoryUrl": github_url, "badgeState": "unavailable", "recentRuns": []}

    try:
        parsed = json.loads(runs_result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "visible": True, "message": "Release workflow status returned invalid JSON.", "repositoryUrl": github_url, "badgeState": "unavailable", "recentRuns": []}
    workflow_runs = parsed.get("workflow_runs") if isinstance(parsed, dict) else None
    runs = [run for run in workflow_runs if isinstance(run, dict)] if isinstance(workflow_runs, list) else []
    if not runs:
        return {"state": "ok", "visible": True, "message": "No release workflow runs found.", "repositoryUrl": github_url, "badgeState": "unknown", "run": None, "jobs": [], "activeCount": 0}

    # Runs are returned newest-first. Prefer the most recent active run for the
    # badge so an in-progress release is surfaced even if a later-listed run is
    # already complete; otherwise fall back to the latest run.
    active_count = sum(1 for run in runs if _viewer._is_active_ci_status(run))
    selected = next((run for run in runs if _viewer._is_active_ci_status(run)), runs[0])
    match_source = "release-active" if _viewer._is_active_ci_status(selected) else "release-latest"
    run_payload = _parse_github_actions_run(selected, match_source=match_source)
    # Release runs are tag-triggered, so head_branch carries the release tag
    # (e.g. "v2.12.3"). Surface it as the version for the badge label.
    version = run_payload.get("branch") or ""
    run_payload["version"] = version
    jobs: list[dict[str, str]] = []
    run_id = run_payload.get("id")
    if run_id:
        try:
            jobs_result = _viewer._run_read_only_gh(repo_root, ["api", f"repos/{owner}/{repo}/actions/runs/{run_id}/jobs?per_page=100"], runner=gh_runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            jobs_result = None
        if jobs_result is not None and jobs_result.returncode == 0:
            jobs = _parse_github_actions_jobs(jobs_result.stdout)

    return {
        "state": "ok",
        "visible": True,
        "message": "",
        "repositoryUrl": github_url,
        "badgeState": run_payload["badgeState"],
        "version": version,
        "run": run_payload,
        "jobs": jobs,
        "activeCount": active_count,
    }


def _git_dir(repo_root: Path) -> Path | None:
    git_path = repo_root / ".git"
    if git_path.is_dir():
        return git_path
    if git_path.is_file():
        try:
            content = git_path.read_text(encoding="utf-8").strip()
        except OSError:
            return None
        prefix = "gitdir:"
        if content.lower().startswith(prefix):
            candidate = Path(content[len(prefix):].strip())
            if not candidate.is_absolute():
                candidate = (repo_root / candidate).resolve()
            return candidate if candidate.exists() else None
    return None


def _git_event_signature(repo_root: Path) -> dict[str, Any]:
    git_dir = _git_dir(repo_root)
    if git_dir is None:
        return {"available": False}
    files = [git_dir / "HEAD", git_dir / "packed-refs"]
    for dirname in ("refs/heads", "refs/remotes", "refs/tags"):
        ref_root = git_dir / dirname
        if ref_root.is_dir():
            try:
                files.extend(path for path in ref_root.rglob("*") if path.is_file())
            except OSError:
                pass
    signature: list[tuple[str, int, int]] = []
    for path in files:
        try:
            stat = path.stat()
            signature.append((str(path.relative_to(git_dir)), stat.st_mtime_ns, stat.st_size))
        except (OSError, ValueError):
            continue
    return {"available": True, "refs": sorted(signature)}
