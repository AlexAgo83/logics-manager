"""Shared parsing helpers for Logics workflow documents.

These were previously copy-pasted across audit/lint/sync/assist/insights with
subtly inconsistent return types; this module is the single definition each.
Callers that legitimately differ pass keyword flags (strip_mermaid, timeout,
include_staged, ...) rather than forking the implementation.
"""
from __future__ import annotations

import re
import subprocess
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
