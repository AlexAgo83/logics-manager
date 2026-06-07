from __future__ import annotations

from pathlib import Path
import subprocess

from .assist_surface import build_changed_surface_summary


def _git_lines(repo_root: Path, args: list[str]) -> list[str]:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=repo_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
        )
    except OSError:
        return []
    if completed.returncode != 0:
        return []
    return [line.strip() for line in completed.stdout.splitlines() if line.strip()]


def _git_range_changed_paths(repo_root: Path, since: str) -> list[str]:
    return sorted(set(_git_lines(repo_root, ["diff", "--name-only", f"{since}..HEAD"])))


def _git_range_commits(repo_root: Path, since: str) -> list[dict[str, str]]:
    commits: list[dict[str, str]] = []
    for line in _git_lines(repo_root, ["log", "--oneline", f"{since}..HEAD"]):
        commit, _, subject = line.partition(" ")
        commits.append({"commit": commit, "subject": subject})
    return commits


def _section_lines(lines: list[str], heading: str) -> list[str]:
    start_idx = None
    target = heading.strip().lower()
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


def _doc_status(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("> Status:"):
            return stripped.split(":", 1)[1].strip()
    return "Unknown"


def _doc_title_from_path(path: Path) -> str:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return path.stem
    for line in lines:
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            if " - " in payload:
                return payload.split(" - ", 1)[1].strip()
            return payload
    return path.stem


def _validation_lines_from_task(path: Path) -> list[str]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return []
    values: list[str] = []
    for line in _section_lines(lines, "Validation"):
        stripped = line.strip()
        if not stripped.startswith("- "):
            continue
        value = stripped[2:].strip()
        if value and not value.lower().startswith("run `") and not value.lower().startswith("run the "):
            values.append(value)
    return values


def build_handoff(repo_root: Path, since: str) -> dict[str, object]:
    changed_paths = _git_range_changed_paths(repo_root, since)
    commits = _git_range_commits(repo_root, since)
    surface = build_changed_surface_summary(changed_paths)
    logics_docs: list[dict[str, object]] = []
    validations: list[str] = []
    for rel_path in changed_paths:
        if not rel_path.startswith("logics/") or not rel_path.endswith(".md"):
            continue
        path = repo_root / rel_path
        kind = path.parent.name
        entry = {
            "path": rel_path,
            "ref": path.stem,
            "kind": kind,
            "title": _doc_title_from_path(path),
            "status": _doc_status(path) if path.is_file() else "Unknown",
        }
        logics_docs.append(entry)
        if kind == "tasks":
            validations.extend(_validation_lines_from_task(path))
    next_actions = [
        "Run lint/audit if not already included in validation evidence.",
        "Review changed files before committing or handing off.",
    ]
    if any(path.startswith("logics_manager/") for path in changed_paths):
        next_actions.append("Run `PYTHONPATH=\"$PWD\" pytest python_tests -q` for Python CLI changes.")
    if any(path.startswith("src/") for path in changed_paths):
        next_actions.append("Run the TypeScript/vitest checks for extension changes.")
    return {
        "since": since,
        "commit_count": len(commits),
        "commits": commits,
        "changed_paths": changed_paths,
        "surface": surface,
        "logics_docs": logics_docs,
        "validations": sorted(set(validations)),
        "next_actions": next_actions,
    }
