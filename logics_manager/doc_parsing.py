"""Shared parsing helpers for Logics workflow documents.

These were previously copy-pasted across audit/lint/sync/assist/insights with
subtly inconsistent return types; this module is the single definition each.
Callers that legitimately differ pass keyword flags (strip_mermaid, timeout,
include_staged, ...) rather than forking the implementation.
"""
from __future__ import annotations

import re
import subprocess
import threading
import time
from pathlib import Path

_MERMAID_BLOCK = re.compile(r"```mermaid\s*\n.*?\n```", flags=re.DOTALL)
PRIORITY_TIERS = ("High", "Medium", "Low")
DEFAULT_PRIORITY = "Medium"


def strip_mermaid_blocks(text: str) -> str:
    return _MERMAID_BLOCK.sub("", text)


FENCED_BLOCK_PATTERN = re.compile(r"^[ \t]*(`{3,}|~{3,}).*?(?:\n[\s\S]*?)?^[ \t]*\1[ \t]*$", re.MULTILINE)


def strip_fenced_blocks(text: str) -> str:
    """Remove every fenced code block, whatever its language.

    A reference inside a fence is an example, not a link. Only mermaid fences used
    to be stripped, so a document that quoted a reference — a runbook, a convention
    note, a field report — created an unresolvable link by describing one. Inline
    code spans are deliberately kept: backticks are how this corpus writes its real
    links, so excluding them would delete every genuine reference.
    """
    return FENCED_BLOCK_PATTERN.sub("", text)


def extract_refs(text: str, prefix: str, *, strip_mermaid: bool = False) -> list[str]:
    """Return the sorted, de-duplicated doc refs of ``prefix`` found in ``text``."""
    if strip_mermaid:
        text = strip_mermaid_blocks(text)
    text = strip_fenced_blocks(text)
    pattern = re.compile(rf"\b{re.escape(prefix)}_\d+_[a-z0-9_]+\b")
    return sorted({match.group(0) for match in pattern.finditer(text)})


def indicator_value(lines: list[str], key: str) -> str | None:
    """Return the value of a ``> Key: value`` indicator line, or None."""
    pattern = re.compile(rf"^\s*>\s*{re.escape(key)}\s*:\s*(.+)\s*$")
    for line in lines:
        match = pattern.match(line)
        if match:
            return match.group(1).strip()
    return None


def progress_value(value: str | None) -> int | None:
    """Parse the first integer in ``value`` and clamp it to 0..100."""
    if value is None:
        return None
    match = re.search(r"(\d+)", value)
    if not match:
        return None
    return max(0, min(100, int(match.group(1))))


def section_lines(lines: list[str], heading: str) -> list[str]:
    """Return the lines under a ``# Heading`` up to the next ``# `` heading."""
    target = heading.strip().lower()
    start_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == target:
            start_idx = idx + 1
            break
    if start_idx is None:
        return []
    out: list[str] = []
    for idx in range(start_idx, len(lines)):
        line = lines[idx]
        if line.startswith("# "):
            break
        out.append(line)
    return out


def priority_tier(lines: list[str]) -> str:
    """Return High/Medium/Low from ``# Priority``; default to Medium."""
    values: dict[str, str] = {}
    for line in section_lines(lines, "Priority"):
        match = re.match(r"^\s*-\s*([^:]+)\s*:\s*(.+?)\s*$", line)
        if match:
            values[match.group(1).strip().lower()] = match.group(2).strip().title()
    direct = values.get("priority")
    if direct in PRIORITY_TIERS:
        return direct
    impact = values.get("impact")
    urgency = values.get("urgency")
    if impact == "High" or urgency == "High":
        return "High"
    if impact == "Low" and urgency == "Low":
        return "Low"
    return DEFAULT_PRIORITY


def priority_rank(value: str | None) -> int:
    return {"High": 0, "Medium": 1, "Low": 2}.get(value or DEFAULT_PRIORITY, 1)


_LAST_CHANGE_CACHE: dict[str, tuple[str, dict[str, int]]] = {}
# The viewer that calls this is a threading server: without a lock, requests
# arriving together each ran their own ~0.3s history walk. Measured at six walks
# for six concurrent callers. A per-key lock, so one repository's walk does not
# block another's.
_LAST_CHANGE_LOCKS: dict[str, threading.Lock] = {}
_LAST_CHANGE_LOCKS_GUARD = threading.Lock()


def _cache_lock(key: str) -> threading.Lock:
    with _LAST_CHANGE_LOCKS_GUARD:
        return _LAST_CHANGE_LOCKS.setdefault(key, threading.Lock())


def _current_commit(repo_root: Path) -> str:
    """The repository's current commit, or "" when there is no history."""
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
            timeout=10,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return completed.stdout.strip() if completed.returncode == 0 else ""


def git_last_change_times(repo_root: Path, subdir: str = "logics") -> dict[str, int]:
    """Repo-relative path -> commit timestamp of its most recent change.

    One `git log` walk for the whole subtree, cached against the commit it was
    read at. A watchdog doing this per document instead spent one subprocess per
    file just to date it; the batched walk costs about as much as a single one.

    The cache is keyed on the current commit, not merely on the repository: it
    originally had no invalidation at all, which is harmless for a one-shot
    command and wrong for a long-running one. In `mcp serve`, a document
    committed after the first lookup was never dated and every age froze for the
    life of the process. Re-reading the commit costs a few milliseconds against
    the walk's few hundred.
    """
    key = f"{repo_root}:{subdir}"
    head = _current_commit(repo_root)
    cached = _LAST_CHANGE_CACHE.get(key)
    if cached is not None and cached[0] == head:
        return cached[1]

    with _cache_lock(key):
        # Re-check inside the lock: whoever held it may have just done the walk.
        cached = _LAST_CHANGE_CACHE.get(key)
        if cached is not None and cached[0] == head:
            return cached[1]
        return _read_change_times(repo_root, subdir, key, head)


def _read_change_times(repo_root: Path, subdir: str, key: str, head: str) -> dict[str, int]:
    times: dict[str, int] = {}
    try:
        completed = subprocess.run(
            ["git", "log", "--format=C%ct", "--name-only", "--", subdir],
            cwd=repo_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
            timeout=30,
        )
    except (OSError, subprocess.TimeoutExpired):
        _LAST_CHANGE_CACHE[key] = (head, times)
        return times
    if completed.returncode == 0 and completed.stdout:
        current = 0
        for line in completed.stdout.splitlines():
            if line.startswith("C"):
                try:
                    current = int(line[1:])
                except ValueError:
                    current = 0
                continue
            path = line.strip()
            # the log is newest-first, so the first sighting is the latest change
            if path and current and path not in times:
                times[path] = current
    _LAST_CHANGE_CACHE[key] = (head, times)
    return times


def last_change_time(repo_root: Path, path: str, times: dict[str, int] | None = None) -> int | None:
    """Last-change timestamp for one doc, falling back to filesystem mtime.

    An untracked or newly written doc has no commit yet; dating it from the
    filesystem is better than reporting nothing.
    """
    lookup = git_last_change_times(repo_root) if times is None else times
    stamp = lookup.get(path)
    if stamp:
        return stamp
    try:
        return int((repo_root / path).stat().st_mtime)
    except OSError:
        return None


def age_in_days(timestamp: int | None, *, now: int | None = None) -> int | None:
    if not timestamp:
        return None
    reference = int(time.time()) if now is None else now
    return max(0, int((reference - timestamp) / 86400))


def git_changed_paths(
    repo_root: Path,
    *,
    include_staged: bool = False,
    include_untracked: bool = False,
    timeout: float | None = None,
    dedupe: bool = False,
) -> list[str]:
    """Return paths changed in the working tree, optionally staged/untracked."""
    def _run(args: list[str]) -> subprocess.CompletedProcess[str] | None:
        try:
            return subprocess.run(
                ["git", *args],
                cwd=repo_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
                timeout=timeout,
            )
        except (OSError, subprocess.TimeoutExpired):
            return None

    diff = _run(["diff", "--name-only", "--relative=."])
    if diff is None or diff.returncode != 0:
        return []
    changed = [line.strip() for line in diff.stdout.splitlines() if line.strip()]
    if include_staged:
        staged = _run(["diff", "--cached", "--name-only", "--relative=."])
        if staged is not None and staged.returncode == 0:
            changed.extend(line.strip() for line in staged.stdout.splitlines() if line.strip())
    if include_untracked:
        untracked = _run(["ls-files", "--others", "--exclude-standard"])
        if untracked is not None and untracked.returncode == 0:
            changed.extend(line.strip() for line in untracked.stdout.splitlines() if line.strip())
    if dedupe:
        return sorted(dict.fromkeys(changed))
    return changed
