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
