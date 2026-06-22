"""Shared private helpers for the assist subcommand modules.

Functions here are split out of ``assist.py`` to keep the themed command
modules small. Names that tests monkeypatch on ``logics_manager.assist``
(for example ``_git_changed_paths``, ``_resolve_workflow_doc``,
``doctor_payload``, ``lint_payload``) are resolved through the ``assist``
module at call time so monkeypatching keeps working.
"""

from __future__ import annotations

import json
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
import re
from pathlib import Path
import subprocess
from typing import Any

from . import assist as _assist
from .assist_surface import build_changed_surface_summary as _build_changed_surface_summary
from .path_utils import resolve_repo_config_path


DEFAULT_HYBRID_AUDIT_LOG = "logics/.cache/hybrid_assist_audit.jsonl"
DEFAULT_HYBRID_MEASUREMENT_LOG = "logics/.cache/hybrid_assist_measurements.jsonl"
DEFAULT_HYBRID_ROI_RECENT_LIMIT = 8
DEFAULT_HYBRID_ROI_WINDOW_DAYS = 14
DEFAULT_ESTIMATED_REMOTE_TOKENS_PER_LOCAL_RUN = 1200
HELP_FLAGS = ("-h", "--help")


CLAUDE_BRIDGE_VARIANTS: tuple[dict[str, object], ...] = (
    {
        "id": "hybrid-assist",
        "title": "Logics Assist",
        "command_path": ".claude/commands/logics-assist.md",
        "agent_path": ".claude/agents/logics-hybrid-delivery-assistant.md",
        "fallback_prompt": "Use $logics-hybrid-delivery-assistant for commit-all, summaries, next-step, triage, handoff, or split-suggestion requests.",
    },
    {
        "id": "request-draft",
        "title": "Logics Request Draft",
        "command_path": ".claude/commands/logics-request-draft.md",
        "agent_path": ".claude/agents/logics-request-draft.md",
        "fallback_prompt": "Use $logics-hybrid-delivery-assistant for bounded request-draft proposals from a short intent; keep the output proposal-only and do not create files directly.",
        "prompt_override": "Use $logics-hybrid-delivery-assistant for bounded request-draft proposals from a short intent; keep the output proposal-only and do not create files directly.",
        "reviewer_nudge": "Validate the generated Needs and Context blocks before promoting them into a real request doc or committing follow-up work.",
    },
    {
        "id": "spec-first-pass",
        "title": "Logics Spec First Pass",
        "command_path": ".claude/commands/logics-spec-first-pass.md",
        "agent_path": ".claude/agents/logics-spec-first-pass.md",
        "fallback_prompt": "Use $logics-hybrid-delivery-assistant for bounded spec-first-pass outlines from a backlog item; keep the output proposal-only and operator-reviewed.",
        "prompt_override": "Use $logics-hybrid-delivery-assistant for bounded spec-first-pass outlines from a backlog item; keep the output proposal-only and operator-reviewed.",
        "reviewer_nudge": "Validate the proposed spec sections, constraints, and open questions before turning them into a real spec file.",
    },
    {
        "id": "backlog-groom",
        "title": "Logics Backlog Groom",
        "command_path": ".claude/commands/logics-backlog-groom.md",
        "agent_path": ".claude/agents/logics-backlog-groom.md",
        "fallback_prompt": "Use $logics-hybrid-delivery-assistant for bounded backlog-groom proposals from a request doc; keep the output proposal-only and reviewable.",
        "prompt_override": "Use $logics-hybrid-delivery-assistant for bounded backlog-groom proposals from a request doc; keep the output proposal-only and reviewable.",
        "reviewer_nudge": "Validate the scoped title, complexity, and acceptance-criteria proposal before creating or committing a backlog item.",
    },
)

ASSIST_FLOW_DEFAULTS: dict[str, dict[str, object]] = {
    "context-pack": {"mode": "summary-only", "profile": "normal", "include_graph": False, "include_registry": False, "include_doctor": False},
    "request-draft": {"mode": "summary-only", "profile": "normal", "include_graph": False, "include_registry": False, "include_doctor": False},
    "next-step": {"mode": "diff-first", "profile": "deep", "include_graph": True, "include_registry": True, "include_doctor": True},
    "diff-risk": {"mode": "diff-first", "profile": "tiny", "include_graph": False, "include_registry": False, "include_doctor": False},
    "commit-plan": {"mode": "summary-only", "profile": "normal", "include_graph": False, "include_registry": False, "include_doctor": False},
}


def _get_nested(config: dict[str, object], *keys: str, default: object) -> object:
    current: object = config
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key, default)
    return default if current is None else current


def _hybrid_audit_log(config: dict[str, object]) -> str:
    return str(_get_nested(config, "hybrid_assist", "audit_log", default=DEFAULT_HYBRID_AUDIT_LOG))


def _hybrid_measurement_log(config: dict[str, object]) -> str:
    return str(_get_nested(config, "hybrid_assist", "measurement_log", default=DEFAULT_HYBRID_MEASUREMENT_LOG))


def _repo_path(repo_root: Path, value: str | None, default: str, *, label: str) -> Path:
    resolved, _relative = resolve_repo_config_path(repo_root, value or default, label=label)
    return resolved


def _parse_package_version(repo_root: Path) -> str:
    package_json = repo_root / "package.json"
    if not package_json.is_file():
        return "1.0.0"
    try:
        payload = json.loads(package_json.read_text(encoding="utf-8"))
    except Exception:
        return "1.0.0"
    version = payload.get("version") if isinstance(payload, dict) else None
    return str(version).strip() if version else "1.0.0"


def _slugify(text: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "_", text.lower())
    return cleaned.strip("_") or "request"


def _title_from_request_intent(intent: str) -> str:
    cleaned = " ".join(intent.split()).strip()
    cleaned = re.sub(r"^(draft|create|add|write|prepare)\s+(a|an)?\s*request\s*(for|about)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip(" .:-")
    if not cleaned:
        return "Request draft"
    return cleaned[:1].upper() + cleaned[1:120]


def _next_request_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "request"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("req_*.md"):
            match = re.match(r"^req_(\d{3})_", path.stem)
            if match:
                highest = max(highest, int(match.group(1)))
    return f"req_{highest + 1:03d}_{_slugify(title)}"


def _build_request_draft(repo_root: Path, *, intent: str) -> dict[str, object]:
    title = _title_from_request_intent(intent)
    ref = _next_request_ref(repo_root, title)
    from_version = _parse_package_version(repo_root)
    needs = [f"Deliver {title.lower()}"]
    context = [
        "Draft generated locally by logics-manager.",
        "No manual skills bootstrap or bridge editing is required.",
    ]
    acceptance = [
        f"AC1: The request clearly states the bounded need for {title.lower()}.",
        "AC2: Scope boundaries and operator impact are explicit.",
        "AC3: The request is ready to be promoted into a backlog slice.",
    ]
    content = "\n".join(
        [
            f"## {ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            "> Status: Draft",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Complexity: Medium",
            "> Theme: Operator workflow",
            "> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.",
            "",
            "# Needs",
            *[f"- {item}" for item in needs],
            "",
            "# Context",
            *[f"- {item}" for item in context],
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# Definition of Ready (DoR)",
            "- [ ] Problem statement is explicit and user impact is clear.",
            "- [ ] Scope boundaries (in/out) are explicit.",
            "- [ ] Acceptance criteria are testable.",
            "- [ ] Dependencies and known risks are listed.",
            "",
            "# Companion docs",
            "- Product brief(s): (none yet)",
            "- Architecture decision(s): (none yet)",
            "",
            "# AI Context",
            f"- Summary: Draft a bounded request for {title.lower()}.",
            "- Keywords: request-draft, logics-manager, python runtime, bundled CLI",
            "- Use when: You need a new bounded request doc for the Logics workflow.",
            "- Skip when: The work already has an existing request or should go straight to a backlog slice.",
            "",
            "# Backlog",
            "- none",
            "",
        ]
    ).rstrip() + "\n"
    return {
        "ref": ref,
        "title": title,
        "from_version": from_version,
        "path": f"logics/request/{ref}.md",
        "content": content,
        "needs": needs,
        "context": context,
        "acceptance": acceptance,
    }


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


def _bullet_values(lines: list[str]) -> list[str]:
    values: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("- "):
            value = stripped[2:].strip()
            if value:
                values.append(value)
    return values


def _extract_title_from_doc(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            if " - " in payload:
                return payload.split(" - ", 1)[1].strip()
            return payload
    return path.stem


def _next_spec_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "specs"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("spec_*.md"):
            match = re.match(r"^spec_(\d{3})_", path.stem)
            if match:
                highest = max(highest, int(match.group(1)))
    return f"spec_{highest + 1:03d}_{_slugify(title)}"


def _next_backlog_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "backlog"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("item_*.md"):
            match = re.match(r"^item_(\d{3})_", path.stem)
            if match:
                highest = max(highest, int(match.group(1)))
    return f"item_{highest + 1:03d}_{_slugify(title)}"


def _split_backlog_problem(lines: list[str]) -> list[str]:
    return _bullet_values(_section_lines(lines, "Problem"))


def _split_request_acceptance(lines: list[str]) -> list[str]:
    return _bullet_values(_section_lines(lines, "Acceptance criteria"))


def _append_section_bullets(path: Path, heading: str, bullets: list[str], *, dry_run: bool) -> None:
    if dry_run:
        return
    lines = path.read_text(encoding="utf-8").splitlines()
    start_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == heading.strip().lower():
            start_idx = idx + 1
            break
    if start_idx is None:
        lines.extend(["", f"# {heading}", *[f"- {bullet}" for bullet in bullets]])
    else:
        insert_at = start_idx
        while insert_at < len(lines) and lines[insert_at].strip().startswith("- "):
            insert_at += 1
        existing = {line.strip() for line in lines[start_idx:insert_at] if line.strip().startswith("- ")}
        for bullet in bullets:
            rendered = f"- {bullet}"
            if rendered not in existing:
                lines.insert(insert_at, rendered)
                insert_at += 1
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _build_spec_first_pass(repo_root: Path, backlog_ref: str) -> dict[str, object]:
    backlog_path = _assist._resolve_workflow_doc(repo_root, backlog_ref)
    if backlog_path is None:
        raise SystemExit(f"Unknown backlog ref `{backlog_ref}`.")
    if backlog_path.parent.name != "backlog":
        raise SystemExit(f"`spec-first-pass` requires a backlog ref. Got `{backlog_ref}`.")
    lines = backlog_path.read_text(encoding="utf-8").splitlines()
    title = _extract_title_from_doc(backlog_path)
    spec_title = f"{title} first-pass spec"
    ref = _next_spec_ref(repo_root, spec_title)
    problem = _bullet_values(_section_lines(lines, "Problem"))
    acceptance = _bullet_values(_section_lines(lines, "Acceptance criteria"))
    summary = problem[0] if problem else f"Derive a first-pass spec for {title.lower()}."
    goals = [
        f"Capture the bounded delivery scope for {title.lower()}.",
        "Keep the spec proposal-only and concise.",
    ]
    non_goals = [
        "Do not add implementation details that belong in a task.",
    ]
    use_cases = [
        f"Operators need a concise spec for `{backlog_ref}` before implementation starts.",
    ]
    reqs = [
        f"Summarize the bounded scope of `{backlog_ref}`.",
        "Translate backlog acceptance criteria into a short functional spec.",
    ]
    acs = acceptance or [
        "AC1: The outline stays bounded and proposal-only.",
        "AC2: The spec highlights the core user-facing behavior.",
    ]
    validation = [
        f"Check the backlog item `{backlog_ref}` and ensure the spec follows it closely.",
        "Run `python3 -m logics_manager lint --require-status` after saving the spec.",
    ]
    questions = [
        "Which acceptance criterion needs the deepest traceability?",
    ]
    content = "\n".join(
        [
            f"## {ref} - {spec_title}",
            f"> From version: {_parse_package_version(repo_root)}",
            "> Status: Draft",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "",
            "# Overview",
            summary,
            "",
            "# Goals",
            *[f"- {item}" for item in goals],
            "",
            "# Non-goals",
            *[f"- {item}" for item in non_goals],
            "",
            "# Users & use cases",
            *[f"- {item}" for item in use_cases],
            "",
            "# Scope",
            "- In:",
            f"  - Deliver a spec for `{backlog_ref}` that stays bounded.",
            "- Out:",
            "  - Implementation details and unrelated sibling slices.",
            "",
            "# Requirements",
            *[f"- {item}" for item in reqs],
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acs],
            "",
            "# Validation / test plan",
            *[f"- {item}" for item in validation],
            "",
            "# Open questions",
            *[f"- {item}" for item in questions],
            "",
            "# Backlog",
            f"- source backlog: `{backlog_ref}`",
            "",
        ]
    ).rstrip() + "\n"
    return {
        "ref": ref,
        "title": spec_title,
        "path": f"logics/specs/{ref}.md",
        "backlog_ref": backlog_ref,
        "backlog_path": backlog_path.relative_to(repo_root).as_posix(),
        "content": content,
        "overview": summary,
        "goals": goals,
        "acceptance": acs,
        "validation": validation,
    }


