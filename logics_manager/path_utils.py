from __future__ import annotations

from pathlib import Path


def ensure_relative_to(path: Path, root: Path, *, label: str = "path") -> Path:
    try:
        return path.resolve().relative_to(root.resolve())
    except ValueError as exc:
        raise SystemExit(f"Unsupported {label}: `{path}` is outside the repository.") from exc


def resolve_repo_output_path(repo_root: Path, raw_path: str, *, label: str = "--out") -> tuple[Path, str]:
    candidate = Path(raw_path)
    if candidate.is_absolute() or any(part == ".." for part in candidate.parts):
        raise SystemExit(f"Unsupported {label} path `{raw_path}`. Use a repo-relative path inside the repository.")
    resolved = (repo_root / candidate).resolve()
    relative = ensure_relative_to(resolved, repo_root, label=label)
    return resolved, relative.as_posix()
