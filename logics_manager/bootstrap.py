from __future__ import annotations

import json
from pathlib import Path


WORKFLOW_DIRS: tuple[str, ...] = ("request", "backlog", "tasks", "specs", "product", "architecture", "external", ".cache")


DEFAULT_INSTRUCTIONS = """# Codex Context

This file defines the working context for Codex in this repository.

## Workflow

Use the canonical `logics-manager` CLI to create, promote, and finish Logics docs:

- `python3 -m logics_manager flow new request --title \"...\"`
- `python3 -m logics_manager flow promote request-to-backlog logics/request/req_NNN_*.md`
- `python3 -m logics_manager flow finish task logics/tasks/task_NNN_*.md`
- `python3 -m logics_manager lint --require-status`
- `python3 -m logics_manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`

Do not edit indicator lines or workflow links by hand.
"""


def _workflow_directories(repo_root: Path) -> list[Path]:
    return [repo_root / "logics" / name for name in WORKFLOW_DIRS]


def bootstrap_payload(repo_root: Path, *, check: bool) -> dict[str, object]:
    logics_root = repo_root / "logics"
    directory_actions: list[dict[str, object]] = []
    created_paths: list[str] = []
    missing_paths: list[str] = []

    if not logics_root.exists():
        missing_paths.append("logics/")
    elif not logics_root.is_dir():
        raise SystemExit(f"`{logics_root}` exists but is not a directory.")

    if not check and not logics_root.exists():
        logics_root.mkdir(parents=True, exist_ok=True)
        created_paths.append("logics/")

    for directory in _workflow_directories(repo_root):
        relative = directory.relative_to(repo_root).as_posix()
        needs_create = not directory.exists()
        needs_gitkeep = (
            True
            if not directory.exists()
            else directory.is_dir()
            and not any(entry.is_file() for entry in directory.iterdir())
            and not (directory / ".gitkeep").exists()
        )
        directory_actions.append({"path": relative, "exists": directory.exists(), "needs_gitkeep": needs_gitkeep})
        if needs_create:
            missing_paths.append(relative + "/")
            if not check:
                directory.mkdir(parents=True, exist_ok=True)
                created_paths.append(relative + "/")
                gitkeep = directory / ".gitkeep"
                if not gitkeep.exists():
                    gitkeep.write_text("", encoding="utf-8")
                    created_paths.append(f"{relative}/.gitkeep")
        elif needs_gitkeep:
            missing_paths.append(f"{relative}/.gitkeep")
            if not check:
                (directory / ".gitkeep").write_text("", encoding="utf-8")
                created_paths.append(f"{relative}/.gitkeep")

    instructions_path = logics_root / "instructions.md"
    instructions_missing = not instructions_path.exists()
    if instructions_missing:
        missing_paths.append("logics/instructions.md")
        if not check:
            instructions_path.write_text(DEFAULT_INSTRUCTIONS.rstrip() + "\n", encoding="utf-8")
            created_paths.append("logics/instructions.md")

    ok = not missing_paths if check else True
    return {
        "command": "bootstrap",
        "repo_root": repo_root.as_posix(),
        "check": check,
        "ok": ok,
        "missing_paths": missing_paths,
        "created_paths": created_paths,
        "directory_actions": directory_actions,
    }


def render_bootstrap(payload: dict[str, object], *, output_format: str) -> str:
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)
    if payload["check"]:
        if payload["ok"]:
            return "Bootstrap check: OK"
        lines = ["Bootstrap check: actions required"]
        for path in payload["missing_paths"]:
            lines.append(f"- missing: {path}")
        return "\n".join(lines)
    lines = ["Bootstrap: OK"]
    if payload["created_paths"]:
        lines.append("- created:")
        for path in payload["created_paths"]:
            lines.append(f"  - {path}")
    else:
        lines.append("- nothing to create")
    return "\n".join(lines)
