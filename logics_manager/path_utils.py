from __future__ import annotations

from pathlib import Path


class PathEscapesRoot(ValueError):
    """A path resolves outside its expected root.

    req_323/item_668: the containment check every repo-root-scoped path guard
    in this project should share, instead of each reimplementing its own. A
    plain `ValueError` subclass rather than `SystemExit` so it is safe to
    raise from a long-running process (an MCP tool handler, a viewer route) -
    `SystemExit` there would kill the whole server, not just reject one path.
    Each caller catches this and converts it into whatever error shape it
    already uses (a tool error, `None`, `SystemExit` for a CLI helper, ...).
    """


def relative_to_root(path: Path, root: Path) -> Path:
    """Resolve `path` and return it relative to `root`, or raise `PathEscapesRoot`."""
    try:
        return path.resolve().relative_to(root.resolve())
    except ValueError as exc:
        raise PathEscapesRoot(f"`{path}` is outside `{root}`.") from exc


def has_symlink_segment(root: Path, relative: Path) -> bool:
    """Whether resolving `relative` from `root` one segment at a time passes
    through an existing symlink - even one that points back inside `root`.

    Stricter than a single final `.resolve()`, which silently follows such a
    symlink and never reports it: no indirection is trusted here, not only
    no escape.
    """
    current = root
    for part in relative.parts:
        current = current / part
        if current.exists() and current.is_symlink():
            return True
    return False


def ensure_relative_to(path: Path, root: Path, *, label: str = "path") -> Path:
    try:
        return relative_to_root(path, root)
    except PathEscapesRoot as exc:
        raise SystemExit(f"Unsupported {label}: `{path}` is outside the repository.") from exc


def resolve_repo_output_path(repo_root: Path, raw_path: str, *, label: str = "--out") -> tuple[Path, str]:
    candidate = Path(raw_path)
    if candidate.is_absolute() or any(part == ".." for part in candidate.parts):
        raise SystemExit(f"Unsupported {label} path `{raw_path}`. Use a repo-relative path inside the repository.")
    resolved = (repo_root / candidate).resolve()
    relative = ensure_relative_to(resolved, repo_root, label=label)
    return resolved, relative.as_posix()


def resolve_repo_config_path(repo_root: Path, raw_path: str, *, label: str = "configured path") -> tuple[Path, str]:
    candidate = Path(raw_path)
    if any(part == ".." for part in candidate.parts):
        raise SystemExit(f"Unsupported {label} path `{raw_path}`. Use a repo-relative path or absolute path inside the repository.")
    resolved = candidate.resolve() if candidate.is_absolute() else (repo_root / candidate).resolve()
    try:
        relative = ensure_relative_to(resolved, repo_root, label=label)
    except SystemExit as exc:
        raise SystemExit(f"Unsupported {label} path `{raw_path}`. Use a repo-relative path or absolute path inside the repository.") from exc
    return resolved, relative.as_posix()


# --- Workflow directory naming (req_335) ------------------------------------------
#
# Under `logics/`, five directories are singular and two are plural, with no rule to
# infer, so the name has to be memorised per directory. `logics/task/...` matches
# nothing and finding the file costs an extra search -- a small cost, paid by every
# agent and every shell one-liner, indefinitely, and worst for agents, which
# reconstruct paths from a pattern rather than from memory.
#
# Renaming was measured and rejected: 225 occurrences of `logics/tasks` and
# `logics/specs` alone across logics_manager, clients and tests, before counting
# consuming projects, external tooling, docs and every git history link. The
# disruption is out of proportion to a naming papercut.
#
# What is done instead is tolerance: the other form resolves to the same place, so a
# wrong guess costs nothing. Nothing is renamed, moved or created, and the canonical
# form the tool writes is unchanged.

#: The canonical name of every workflow directory. One declaration, so a directory
#: cannot be added with only one of its forms handled.
WORKFLOW_DIRS: tuple[str, ...] = ("request", "backlog", "tasks", "specs", "product", "roadmap", "architecture", "runbook", "external", ".cache")


def _alternate_form(name: str) -> str | None:
    """The other way someone might reasonably spell this directory."""
    if name.startswith("."):
        return None
    if name.endswith("s"):
        return name[:-1]
    return f"{name}s"


#: Accepted alternate spelling -> canonical name. Derived, never hand-maintained.
WORKFLOW_DIR_ALIASES: dict[str, str] = {
    alternate: name
    for name in WORKFLOW_DIRS
    if (alternate := _alternate_form(name)) and alternate not in WORKFLOW_DIRS
}


def canonical_workflow_path(raw: str) -> str:
    """Rewrite `logics/<alias>/...` to `logics/<canonical>/...`, leaving all else alone.

    Purely textual: no filesystem access, and no mutation of anything on disk.
    """
    parts = raw.replace("\\", "/").split("/")
    for index, part in enumerate(parts[:-1]):
        if part == "logics" and parts[index + 1] in WORKFLOW_DIR_ALIASES:
            parts[index + 1] = WORKFLOW_DIR_ALIASES[parts[index + 1]]
            break
    return "/".join(parts)


def duplicate_workflow_dirs(repo_root: Path) -> list[str]:
    """Alias directories that exist on disk beside their canonical form.

    Tolerance must not become ambiguity: the canonical form always wins, and the
    situation is reported rather than silently resolved.
    """
    logics = repo_root / "logics"
    return sorted(
        f"logics/{alias}"
        for alias, canonical in WORKFLOW_DIR_ALIASES.items()
        if (logics / alias).is_dir() and (logics / canonical).is_dir()
    )
