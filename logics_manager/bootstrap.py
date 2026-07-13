from __future__ import annotations

import json
import shutil
from pathlib import Path

from .assist import _build_claude_instructions


WORKFLOW_DIRS: tuple[str, ...] = ("request", "backlog", "tasks", "specs", "product", "architecture", "external", ".cache")
MANAGED_LOGICS_START = "<!-- logics-manager:managed:start -->"
MANAGED_LOGICS_END = "<!-- logics-manager:managed:end -->"
AGENTS_LOGICS_REFERENCE = "@LOGICS.md"
LOCAL_ASSISTANT_GITIGNORE_ENTRIES = ("AGENTS.md", "LOGICS.md")


def _workflow_directories(repo_root: Path) -> list[Path]:
    return [repo_root / "logics" / name for name in WORKFLOW_DIRS]


def _legacy_runtime_paths(repo_root: Path) -> list[Path]:
    return [repo_root / ".claude", repo_root / "logics" / "skills"]


def _remove_legacy_runtime_paths(repo_root: Path, *, check: bool) -> list[str]:
    removed_paths: list[str] = []
    for target in _legacy_runtime_paths(repo_root):
        if not target.exists():
            continue
        removed_paths.append(target.relative_to(repo_root).as_posix() + ("/" if target.is_dir() else ""))
        if not check:
            if target.is_dir():
                shutil.rmtree(target)
            else:
                target.unlink()
    return removed_paths


def _logics_bridge_content() -> str:
    return "\n".join(
        [
            "# Logics Local Assistant Bridge",
            "",
            MANAGED_LOGICS_START,
            "This local file is refreshed by `logics-manager bootstrap`.",
            "Canonical generated instructions live in `logics/instructions.md`.",
            "If unmanaged notes in this file conflict with this section, follow this managed section.",
            "",
            "Core rules:",
            "- Read `logics/instructions.md` before editing workflow docs.",
            "- Run `logics-manager bootstrap` after updating Logics Manager to refresh this bridge.",
            "- Use `logics-manager --help` and subcommand `--help` for the current CLI contract.",
            "- Do not hand-edit Logics indicators, lineage links, Mermaid signatures, or done status.",
            "",
            "Inspection and validation:",
            "- Use `logics-manager status` for the next work signal.",
            "- Use `logics-manager health` for corpus-level anomalies.",
            "- Run `logics-manager lint --require-status` and `logics-manager audit --group-by-doc` after workflow edits.",
            "- Treat `# Priority` as an execution signal: choose High/Medium/Low deliberately with a short rationale, then plan higher-priority work first when dependencies allow.",
            "",
            "Bounded context:",
            "- Use `logics-manager sync read-doc <ref> --max-chars <n>` before opening large docs directly.",
            "- Use `logics-manager sync list-docs`, `search-docs`, and `context-pack` for bounded discovery.",
            "",
            "Workflow lifecycle:",
            "- Use `logics-manager flow new|promote|start|closeout|finish` for request, backlog, and task lifecycle changes.",
            "- Use `logics-manager flow start <ref>` before active implementation to mark `Status: In progress` and record `Owner`.",
            "- Use `logics-manager flow progress task <ref> --progress <n>%` during multi-wave task work instead of editing `Progress` by hand.",
            "- Use `logics-manager flow finish task <path>` instead of setting `Status: Done` manually.",
            "- Treat task waves as ADR 009 checkpoints: update affected Logics docs in the wave and leave the repo commit-ready without forcing one commit per micro-step.",
            "- Use `logics-manager sync refresh-mermaid-signatures` after editing Mermaid diagrams.",
            "",
            "Release workflow:",
            "- Use `logics-manager release status` before claiming release readiness.",
            "- Use `logics-manager release plan <version>` and `logics-manager release validate <version>` for release checks.",
            "- Record release proof with `logics-manager release evidence add ...`.",
            "- Do not treat conversation memory or a successful command without matching evidence as release-ready proof.",
            "",
            "Internationalization readiness:",
            "- Use `logics-manager i18n status` before adding or restructuring user-facing copy.",
            "- For a new UI project, use `logics-manager i18n init --source-locale <locale>`; one source locale is sufficient initially.",
            "- Use `logics-manager i18n validate` after adopting the optional project-owned contract.",
            "- Projects that own no user-facing copy may explicitly initialize the contract as not applicable.",
            "",
            "Viewer and MCP:",
            "- Use `logics-manager view` for the browser viewer and focus workflows.",
            "- Use `logics-manager mcp ...` only when an MCP client surface is the right fit.",
            "",
            "Document hygiene:",
            "- Keep paths in Logics docs repo-relative, never absolute filesystem paths.",
            "- Keep Mermaid labels plain ASCII, short, and free of raw route braces or inline code.",
            MANAGED_LOGICS_END,
            "",
        ]
    )


def _managed_logics_block() -> str:
    content = _logics_bridge_content()
    start = content.index(MANAGED_LOGICS_START)
    end = content.index(MANAGED_LOGICS_END) + len(MANAGED_LOGICS_END)
    return content[start:end]


def _merge_managed_logics_bridge(existing: str | None) -> str:
    desired_block = _managed_logics_block()
    if existing is None or not existing.strip():
        return _logics_bridge_content()
    if MANAGED_LOGICS_START in existing and MANAGED_LOGICS_END in existing:
        start = existing.index(MANAGED_LOGICS_START)
        end = existing.index(MANAGED_LOGICS_END) + len(MANAGED_LOGICS_END)
        merged = existing[:start] + desired_block + existing[end:]
    else:
        merged = _logics_bridge_content()
    return merged if merged.endswith("\n") else merged + "\n"


def _ensure_line(text: str, line: str) -> str:
    lines = text.splitlines()
    if line in {entry.strip() for entry in lines}:
        return text if text.endswith("\n") else text + "\n"
    prefix = text if text.endswith("\n") or not text else text + "\n"
    return prefix + line + "\n"


def bootstrap_payload(repo_root: Path, *, check: bool) -> dict[str, object]:
    logics_root = repo_root / "logics"
    instructions_manifest = _build_claude_instructions(repo_root)
    directory_actions: list[dict[str, object]] = []
    created_paths: list[str] = []
    updated_paths: list[str] = []
    removed_paths: list[str] = []
    missing_paths: list[str] = []

    removed_paths.extend(_remove_legacy_runtime_paths(repo_root, check=check))

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
    instructions_content = str(instructions_manifest["content"])
    instructions_missing = not instructions_path.exists()
    instructions_stale = False
    if not instructions_missing:
        try:
            instructions_stale = instructions_path.read_text(encoding="utf-8") != instructions_content
        except Exception:
            instructions_stale = True
    if instructions_missing or instructions_stale:
        missing_paths.append("logics/instructions.md")
        if not check:
            instructions_path.write_text(instructions_content, encoding="utf-8")
            (created_paths if instructions_missing else updated_paths).append("logics/instructions.md")

    logics_bridge_path = repo_root / "LOGICS.md"
    existing_logics_bridge: str | None = None
    logics_bridge_missing = not logics_bridge_path.exists()
    logics_bridge_stale = False
    if not logics_bridge_missing:
        try:
            existing_logics_bridge = logics_bridge_path.read_text(encoding="utf-8")
            logics_bridge_stale = _merge_managed_logics_bridge(existing_logics_bridge) != existing_logics_bridge
        except Exception:
            logics_bridge_stale = True
    if logics_bridge_missing or logics_bridge_stale:
        missing_paths.append("LOGICS.md")
        if not check:
            next_content = _merge_managed_logics_bridge(existing_logics_bridge)
            logics_bridge_path.write_text(next_content, encoding="utf-8")
            (created_paths if logics_bridge_missing else updated_paths).append("LOGICS.md")

    agents_path = repo_root / "AGENTS.md"
    agents_missing = not agents_path.exists()
    agents_stale = False
    agents_text = ""
    if not agents_missing:
        try:
            agents_text = agents_path.read_text(encoding="utf-8")
            agents_stale = _ensure_line(agents_text, AGENTS_LOGICS_REFERENCE) != agents_text
        except Exception:
            agents_stale = True
    if agents_missing or agents_stale:
        missing_paths.append("AGENTS.md")
        if not check:
            next_agents = _ensure_line(agents_text, AGENTS_LOGICS_REFERENCE)
            agents_path.write_text(next_agents, encoding="utf-8")
            (created_paths if agents_missing else updated_paths).append("AGENTS.md")

    gitignore_path = repo_root / ".gitignore"
    gitignore_missing = not gitignore_path.exists()
    gitignore_text = ""
    gitignore_next = ""
    if not gitignore_missing:
        try:
            gitignore_text = gitignore_path.read_text(encoding="utf-8")
        except Exception:
            gitignore_text = ""
    gitignore_next = gitignore_text
    for entry in LOCAL_ASSISTANT_GITIGNORE_ENTRIES:
        gitignore_next = _ensure_line(gitignore_next, entry)
    if gitignore_missing or gitignore_next != gitignore_text:
        missing_paths.append(".gitignore")
        if not check:
            gitignore_path.write_text(gitignore_next, encoding="utf-8")
            (created_paths if gitignore_missing else updated_paths).append(".gitignore")

    ok = not missing_paths if check else True
    return {
        "command": "bootstrap",
        "repo_root": repo_root.as_posix(),
        "check": check,
        "ok": ok,
        "missing_paths": missing_paths,
        "created_paths": created_paths,
        "updated_paths": updated_paths,
        "removed_paths": removed_paths,
        "directory_actions": directory_actions,
        "claude_instruction_line_count": instructions_manifest["line_count"],
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
    if payload.get("removed_paths"):
        lines.append("- removed:")
        for path in payload["removed_paths"]:
            lines.append(f"  - {path}")
    if payload["created_paths"]:
        lines.append("- created:")
        for path in payload["created_paths"]:
            lines.append(f"  - {path}")
    if payload.get("updated_paths"):
        lines.append("- updated:")
        for path in payload["updated_paths"]:
            lines.append(f"  - {path}")
    if not payload["created_paths"] and not payload.get("updated_paths"):
        lines.append("- nothing to create")
    return "\n".join(lines)
