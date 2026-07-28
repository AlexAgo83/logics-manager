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
from typing import Any

from . import assist as _assist
from .assist_surface import build_changed_surface_summary as _build_changed_surface_summary
from .doc_parsing import git_changed_paths, section_lines
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


_section_lines = section_lines


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


def _build_backlog_groom(repo_root: Path, request_ref: str) -> dict[str, object]:
    request_path = _assist._resolve_workflow_doc(repo_root, request_ref)
    if request_path is None:
        raise SystemExit(f"Unknown request ref `{request_ref}`.")
    if request_path.parent.name != "request":
        raise SystemExit(f"`backlog-groom` requires a request ref. Got `{request_ref}`.")

    lines = request_path.read_text(encoding="utf-8").splitlines()
    title = _extract_title_from_doc(request_path)
    backlog_title = title
    ref = _next_backlog_ref(repo_root, backlog_title)
    problem = _split_backlog_problem(lines)
    acceptance = _split_request_acceptance(lines)
    complexity = "High" if len(acceptance) >= 4 or "runtime" in title.lower() or "plugin" in title.lower() else "Medium"
    theme = "Operator workflow and runtime integration"
    scope_in = [
        "one coherent delivery slice from the source request",
    ]
    scope_out = [
        "unrelated sibling slices that should stay in separate backlog items instead of widening this doc",
    ]
    decision_product = "Not needed"
    decision_architecture = "Not needed"
    product_brief = "logics/product/prod_009_logics_cli_as_the_primary_operator_surface_and_unified_runtime_api.md"
    content = "\n".join(
        [
            f"## {ref} - {backlog_title}",
            f"> From version: {_parse_package_version(repo_root)}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            f"> Complexity: {complexity}",
            f"> Theme: {theme}",
            "> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.",
            "",
            "# Problem",
            *(problem or [f"Deliver the bounded slice for {backlog_title} without widening scope."]),
            "",
            "# Scope",
            "- In:",
            *[f"  - {item}" for item in scope_in],
            "- Out:",
            *[f"  - {item}" for item in scope_out],
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance or [
                "AC1: The backlog slice stays bounded and reviewable.",
                "AC2: The backlog slice preserves the request's core acceptance criteria.",
            ]],
            "",
            "# AC Traceability",
            *(f"- request-AC{idx + 1} -> This backlog slice. Proof: {item}" for idx, item in enumerate(acceptance or ["The request remains bounded and reviewable."])),
            "",
            "# Decision framing",
            f"- Product framing: {decision_product}",
            "- Product signals: (none detected)",
            "- Product follow-up: No product brief follow-up is expected based on current signals.",
            f"- Architecture framing: {decision_architecture}",
            "- Architecture signals: (none detected)",
            "- Architecture follow-up: No architecture decision follow-up is expected based on current signals.",
            "",
            "# Links",
            f"- Product brief(s): `{product_brief}`",
            "- Architecture decision(s): (none yet)",
            f"- Request: `logics/request/{request_ref}.md`",
            "- Primary task(s): (none yet)",
            "",
            "# AI Context",
            f"- Summary: {backlog_title}",
            f"- Keywords: backlog-groom, request, {backlog_title.lower()}, bounded slice",
            f"- Use when: Use when implementing or reviewing the delivery slice for {backlog_title}.",
            "- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.",
            "",
            "# Priority",
            "- Priority: Medium",
            "- Rationale: Default until groomed; choose High/Medium/Low deliberately before implementation.",
            "",
            "# Notes",
            f"- Hybrid rationale: Derived from request `{request_ref}` and kept bounded to one coherent delivery slice.",
            f"- Source file: `logics/request/{request_ref}.md`.",
            "- Generated locally by logics-manager.",
            "",
        ]
    ).rstrip() + "\n"
    return {
        "ref": ref,
        "title": backlog_title,
        "path": f"logics/backlog/{ref}.md",
        "request_ref": request_ref,
        "request_path": request_path.relative_to(repo_root).as_posix(),
        "content": content,
        "problem": problem,
        "acceptance": acceptance or [
            "AC1: The backlog slice stays bounded and reviewable.",
            "AC2: The backlog slice preserves the request's core acceptance criteria.",
        ],
        "complexity": complexity,
    }


def _load_jsonl_records(path: Path) -> tuple[list[dict[str, Any]], int]:
    if not path.is_file():
        return [], 0
    records: list[dict[str, Any]] = []
    invalid_lines = 0
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            invalid_lines += 1
            continue
        if isinstance(payload, dict):
            records.append(payload)
        else:
            invalid_lines += 1
    return records, invalid_lines


def _parse_recorded_at(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _round_rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


def _normalize_reason_label(value: Any, fallback: str = "unspecified") -> str:
    text = "" if value is None else str(value).strip()
    return text or fallback


def _stringify_scalar(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).strip()


def _summarize_validated_payload(payload: dict[str, Any]) -> str:
    for key in ("summary", "title", "subject", "overall", "classification", "risk"):
        text = _stringify_scalar(payload.get(key))
        if text:
            return " ".join(text.split())[:240]
    if isinstance(payload.get("decision"), dict):
        decision = payload["decision"]
        action = _stringify_scalar(decision.get("action"))
        target = _stringify_scalar(decision.get("target_ref"))
        confidence = decision.get("confidence")
        parts = [part for part in (action, target) if part]
        if confidence is not None:
            parts.append(f"confidence {confidence}")
        if parts:
            return "Decision: " + ", ".join(parts)
    return json.dumps(payload, sort_keys=True)[:240]


def _build_validated_excerpt(payload: Any) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None
    excerpt: dict[str, Any] = {}
    for key in ("summary", "title", "subject", "overall", "classification", "risk", "target_ref"):
        value = payload.get(key)
        if value not in (None, "", [], {}):
            excerpt[key] = value
    if isinstance(payload.get("decision"), dict):
        decision = payload["decision"]
        excerpt["decision"] = {
            "action": decision.get("action"),
            "target_ref": decision.get("target_ref"),
            "confidence": decision.get("confidence"),
        }
    return excerpt or None


def _fallback_triggered(record: dict[str, Any]) -> bool:
    requested = _stringify_scalar(record.get("backend_requested") or record.get("requested_backend"))
    used = _stringify_scalar(record.get("backend_used") or record.get("selected_backend"))
    return used == "codex" and requested in {"auto", "ollama", "openai", "gemini"}


def _measurement_review_recommended(record: dict[str, Any]) -> bool:
    if bool(record.get("review_recommended")):
        return True
    confidence = record.get("confidence")
    return isinstance(confidence, (int, float)) and float(confidence) < 0.7


def _audit_review_recommended(record: dict[str, Any]) -> bool:
    if bool(record.get("review_recommended")):
        return True
    if record.get("result_status") == "degraded":
        return True
    if record.get("degraded_reasons"):
        return True
    validated_payload = record.get("validated_payload")
    if isinstance(validated_payload, dict):
        confidence = validated_payload.get("confidence")
        if isinstance(confidence, (int, float)) and float(confidence) < 0.7:
            return True
        decision = validated_payload.get("decision")
        if isinstance(decision, dict):
            decision_confidence = decision.get("confidence")
            if isinstance(decision_confidence, (int, float)) and float(decision_confidence) < 0.7:
                return True
    return False


def _execution_path_label(requested_backend: str, used_backend: str) -> str:
    if used_backend == "ollama":
        return "local"
    if used_backend in {"openai", "gemini"}:
        return "remote"
    if used_backend == "deterministic":
        return "deterministic"
    if used_backend == "codex" and requested_backend in {"auto", "ollama", "openai", "gemini"}:
        return "fallback"
    if used_backend == "codex":
        return "codex-direct"
    return "unknown"


def _git_changed_paths(repo_root: Path) -> list[str]:
    return git_changed_paths(repo_root, timeout=15)


def _is_low_risk_generated_path(path: str) -> bool:
    normalized = path.strip().replace("\\", "/")
    filename = normalized.rsplit("/", 1)[-1]
    lowered = normalized.lower()
    return (
        filename in {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "Cargo.lock", "Pipfile.lock", "poetry.lock", "composer.lock"}
        or ".generated." in lowered
        or lowered.endswith(".snap")
        or lowered.startswith("dist/")
        or lowered.startswith("build/")
    )


def _is_schema_or_migration_path(path: str) -> bool:
    lowered = path.strip().replace("\\", "/").lower()
    return (
        "/migrations/" in lowered
        or lowered.startswith("migrations/")
        or "/migration/" in lowered
        or lowered.startswith("migration/")
        or lowered.endswith("schema.prisma")
        or lowered.endswith("schema.sql")
        or lowered.endswith("/schema.ts")
        or lowered.endswith("/schema.js")
        or "/db/schema" in lowered
        or "/alembic/" in lowered
    )


def _classify_diff_risk(changed_paths: list[str]) -> dict[str, object]:
    if not changed_paths:
        return {
            "risk": "low",
            "summary": "Deterministic pre-classifier marked the empty diff as low risk.",
            "drivers": ["No changed paths were detected in the working tree."],
            "confidence": 0.97,
            "rationale": "An empty diff does not require AI classification.",
            "classification_reason": "empty-diff",
        }
    if any(_is_schema_or_migration_path(path) for path in changed_paths):
        return {
            "risk": "high",
            "summary": "Deterministic pre-classifier escalated the diff because schema or migration files changed.",
            "drivers": ["The change surface includes schema or migration files that require careful review."],
            "confidence": 0.95,
            "rationale": "Schema and migration changes are treated as high risk without an AI round-trip.",
            "classification_reason": "schema-or-migration",
        }
    if all(_is_low_risk_generated_path(path) for path in changed_paths):
        return {
            "risk": "low",
            "summary": "Deterministic pre-classifier marked the diff as low risk because it only touches lock or generated files.",
            "drivers": ["Only lock-file or generated-artifact paths changed."],
            "confidence": 0.94,
            "rationale": "Lock-file-only and generated-only diffs are handled deterministically before any AI dispatch.",
            "classification_reason": "lock-or-generated-only",
        }
    return {
        "risk": "medium",
        "summary": "Deterministic pre-classifier marked the diff as medium risk because it includes general source edits.",
        "drivers": ["The diff includes non-generated source paths.", "No schema or migration paths were detected."],
        "confidence": 0.78,
        "rationale": "General source edits stay bounded but still deserve a review pass.",
        "classification_reason": "mixed-source",
    }


def _render_diff_risk_text(payload: dict[str, object]) -> str:
    lines = [
        f"Diff risk: {payload['risk']}",
        f"- summary: {payload['summary']}",
        f"- confidence: {payload['confidence']}",
        f"- changed paths: {len(payload['changed_paths'])}",
    ]
    for driver in payload["drivers"]:
        lines.append(f"- {driver}")
    return "\n".join(lines)


def _summarize_commit_scope(changed_paths: list[str]) -> tuple[str, str]:
    if not changed_paths:
        return "root", "No changes detected; nothing to commit."
    if any(path.startswith("clients/vscode/src/") or path.startswith("clients/shared-web/media/") for path in changed_paths):
        return "plugin", "Plugin surface changes detected."
    if any(path.startswith("logics_manager/") for path in changed_paths):
        return "python-runtime", "Native Logics manager changes detected."
    if any(path.startswith("logics/") for path in changed_paths):
        return "docs", "Workflow documentation changes detected."
    return "misc", "Mixed repository changes detected."


def _build_commit_plan(changed_paths: list[str]) -> dict[str, object]:
    scope, rationale = _summarize_commit_scope(changed_paths)
    risk = _classify_diff_risk(changed_paths)
    subject = {
        "root": "chore: no changes",
        "plugin": "feat: update plugin runtime wiring",
        "python-runtime": "feat: extend native logics-manager runtime",
        "docs": "docs: update Logics workflow documentation",
        "misc": "chore: update repository changes",
    }.get(scope, "chore: update repository changes")
    body_lines = [
        f"- scope: {scope}",
        f"- changed paths: {len(changed_paths)}",
        f"- risk: {risk['risk']}",
        f"- rationale: {rationale}",
    ]
    if changed_paths:
        body_lines.append("- paths:")
        body_lines.extend(f"  - {path}" for path in changed_paths[:8])
        if len(changed_paths) > 8:
            body_lines.append(f"  - ... and {len(changed_paths) - 8} more")
    return {
        "subject": subject,
        "body": "\n".join(body_lines),
        "scope": scope,
        "confidence": 0.82 if changed_paths else 1.0,
        "rationale": rationale,
        "risk": risk["risk"],
        "changed_paths": changed_paths,
        "review_recommended": risk["risk"] != "low" or len(changed_paths) > 6,
    }


def _build_validation_checklist(changed_paths: list[str]) -> dict[str, object]:
    surface = _build_changed_surface_summary(changed_paths)
    checks: list[str] = [
        "Run `python3 -m pytest tests/python/test_logics_manager_cli.py -q`.",
        "Run `python3 -m compileall logics_manager`.",
        "Run `npm run lint:logics`.",
    ]
    if any(path.startswith("clients/vscode/src/") or path.startswith("clients/shared-web/media/") for path in changed_paths):
        checks.append("Run the plugin test suite that exercises the VS Code entrypoints.")
    if any(path.startswith("logics_manager/") for path in changed_paths):
        checks.append("Smoke-test `python3 -m logics_manager --help` and the affected native subcommands.")
    if any(path.startswith("logics/") for path in changed_paths):
        checks.append("Run `python3 -m logics_manager lint --require-status` and inspect the workflow docs manually.")
    if any(path.startswith("tests/") or path.startswith("tests/python/") for path in changed_paths):
        checks.append("Run the focused affected tests before broad regression sweeps.")
    if not changed_paths:
        checks.append("No validation needed beyond a clean smoke check; there are no tracked changes.")
    return {
        "profile": "deterministic",
        "checks": checks,
        "confidence": 0.91 if changed_paths else 1.0,
        "rationale": surface["summary"],
    }


def _build_test_impact_summary(changed_paths: list[str]) -> dict[str, object]:
    categories = _build_changed_surface_summary(changed_paths)["counts"]
    recommended: list[str] = []
    if "python-runtime" in categories:
        recommended.append("python3 -m pytest tests/python/test_logics_manager_cli.py -q")
    if "plugin" in categories:
        recommended.append("npm run lint")
    if "workflow-docs" in categories:
        recommended.append("npm run lint:logics")
    if "tests" in categories:
        recommended.append("python3 -m pytest tests/python/test_logics_manager_cli.py -q")
    if not recommended:
        recommended.append("python3 -m pytest tests/python/test_logics_manager_cli.py -q")
    return {
        "summary": "Recommended test order derived from the current change surface.",
        "categories": categories,
        "recommended_commands": list(dict.fromkeys(recommended)),
        "confidence": 0.88 if changed_paths else 1.0,
    }


def _build_doc_consistency(repo_root: Path) -> dict[str, object]:
    doctor = _assist.doctor_payload(repo_root)
    lint = _assist.lint_payload(repo_root, require_status=True)
    issues: list[dict[str, object]] = []
    for issue in doctor["issues"]:
        issues.append(
            {
                "source": "doctor",
                "path": issue["path"],
                "message": issue["message"],
                "remediation": issue["remediation"],
                "code": issue["code"],
            }
        )
    for issue in lint["issues"]:
        issues.append(
            {
                "source": "lint",
                "path": issue["path"],
                "message": issue["message"],
                "remediation": "Update the doc so lint and workflow conventions stay aligned.",
                "code": "lint_issue",
            }
        )
    for warning in lint["warnings"]:
        issues.append(
            {
                "source": "lint",
                "path": warning["path"],
                "message": warning["message"],
                "remediation": "Review the warning and confirm it is intentional.",
                "code": "lint_warning",
            }
        )
    overall = "clean" if not issues else "issues-found"
    summary = "Workflow docs are consistent across doctor and lint checks." if overall == "clean" else "Workflow docs have consistency issues that should be reviewed."
    follow_up: list[str] = []
    if doctor["issue_count"]:
        follow_up.append("Fix the doctor issues first because they affect workflow shape and required indicators.")
    if lint["issue_count"]:
        follow_up.append("Fix lint issues next so changed docs preserve indicators and status conventions.")
    if lint["warning_count"]:
        follow_up.append("Review lint warnings to confirm they are intentional.")
    if not follow_up:
        follow_up.append("No follow-up required.")
    return {
        "overall": overall,
        "summary": summary,
        "issues": issues,
        "follow_up": follow_up,
        "confidence": 1.0 if overall == "clean" else 0.86,
        "doctor": {
            "ok": doctor["ok"],
            "issue_count": doctor["issue_count"],
            "workflow_doc_count": doctor["workflow_doc_count"],
            "missing_schema_version_count": doctor["missing_schema_version_count"],
        },
        "lint": {
            "ok": lint["ok"],
            "issue_count": lint["issue_count"],
            "warning_count": lint["warning_count"],
        },
    }


def _build_review_checklist(repo_root: Path) -> dict[str, object]:
    changed_paths = _assist._git_changed_paths(repo_root)
    surface = _build_changed_surface_summary(changed_paths)
    consistency = _build_doc_consistency(repo_root)
    checklist: list[str] = [
        "Read the diff with the native `diff-risk` summary before approving.",
        "Verify the impacted docs or code paths match the intended scope.",
    ]
    if surface["primary_category"] == "python-runtime":
        checklist.append("Run the Python CLI smoke tests for the modified runtime paths.")
    if surface["primary_category"] == "plugin":
        checklist.append("Run the plugin command paths touched by the change and confirm the UI still delegates correctly.")
    if surface["primary_category"] == "workflow-docs":
        checklist.append("Check `lint` and `doctor` output for workflow doc consistency.")
    if consistency["overall"] != "clean":
        checklist.append("Resolve doc consistency issues before merging.")
    else:
        checklist.append("Document checks are clean; confirm no hidden workflow regressions remain.")
    checklist.extend([
        "Confirm the change does not reintroduce a manual `skills/` bootstrap step.",
        "Confirm the change does not add a new compatibility residue for the old kit boundary.",
    ])
    return {
        "summary": surface["summary"],
        "surface": surface,
        "doc_consistency": {
            "overall": consistency["overall"],
            "confidence": consistency["confidence"],
            "doctor_issues": consistency["doctor"]["issue_count"],
            "lint_issues": consistency["lint"]["issue_count"],
        },
        "checklist": checklist,
        "confidence": 0.84 if changed_paths else 1.0,
    }


def _build_validation_summary(repo_root: Path) -> dict[str, object]:
    changed_paths = _assist._git_changed_paths(repo_root)
    doc_consistency = _build_doc_consistency(repo_root)
    validation_checklist = _build_validation_checklist(changed_paths)
    test_impact = _build_test_impact_summary(changed_paths)
    overall = "ok" if doc_consistency["overall"] == "clean" else "needs-attention"
    summary = "Repository validations look healthy." if overall == "ok" else "Repository validations need attention."
    next_actions = list(validation_checklist["checks"][:3])
    if doc_consistency["overall"] != "clean":
        next_actions.insert(0, "Fix doc consistency issues before moving forward.")
    if test_impact["recommended_commands"]:
        next_actions.append(f"Primary test command: {test_impact['recommended_commands'][0]}")
    return {
        "overall": overall,
        "summary": summary,
        "doc_consistency": {
            "overall": doc_consistency["overall"],
            "doctor_issues": doc_consistency["doctor"]["issue_count"],
            "lint_issues": doc_consistency["lint"]["issue_count"],
        },
        "validation_checklist": validation_checklist,
        "test_impact": test_impact,
        "next_actions": next_actions,
        "confidence": 0.9 if overall == "ok" else 0.82,
    }


def _build_hybrid_roi_report(
    repo_root: Path,
    *,
    audit_log: Path,
    measurement_log: Path,
    recent_limit: int = DEFAULT_HYBRID_ROI_RECENT_LIMIT,
    window_days: int = DEFAULT_HYBRID_ROI_WINDOW_DAYS,
) -> dict[str, Any]:
    effective_recent_limit = max(1, recent_limit)
    effective_window_days = max(1, window_days)
    audit_records, audit_invalid_lines = _load_jsonl_records(audit_log)
    measurement_records, measurement_invalid_lines = _load_jsonl_records(measurement_log)
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=effective_window_days)

    measurement_records_sorted = sorted(
        measurement_records,
        key=lambda record: _parse_recorded_at(record.get("recorded_at")) or datetime.min.replace(tzinfo=timezone.utc),
    )
    audit_records_sorted = sorted(
        audit_records,
        key=lambda record: _parse_recorded_at(record.get("recorded_at")) or datetime.min.replace(tzinfo=timezone.utc),
    )

    total_runs = len(measurement_records_sorted)
    by_flow: dict[str, dict[str, Any]] = {}
    backend_requested_counter: Counter[str] = Counter()
    backend_used_counter: Counter[str] = Counter()
    execution_path_counter: Counter[str] = Counter()
    result_status_counter: Counter[str] = Counter()
    recent_result_distribution_counter: Counter[str] = Counter()
    degraded_reason_counter: Counter[str] = Counter()
    fallback_reason_counter: Counter[str] = Counter()
    review_recommended_count = 0
    degraded_count = 0
    fallback_count = 0
    local_runs_count = 0

    for record in measurement_records_sorted:
        flow = _normalize_reason_label(record.get("flow"), fallback="unknown-flow")
        requested_backend = _normalize_reason_label(record.get("backend_requested"), fallback="unknown")
        used_backend = _normalize_reason_label(record.get("backend_used"), fallback="unknown")
        execution_path = _normalize_reason_label(record.get("execution_path"), fallback=_execution_path_label(requested_backend, used_backend))
        result_status = _normalize_reason_label(record.get("result_status"), fallback="unknown")
        review_recommended = _measurement_review_recommended(record)
        degraded_reasons = [
            _normalize_reason_label(reason)
            for reason in record.get("degraded_reasons", [])
            if _normalize_reason_label(reason)
        ]
        recorded_at = _parse_recorded_at(record.get("recorded_at"))

        backend_requested_counter[requested_backend] += 1
        backend_used_counter[used_backend] += 1
        execution_path_counter[execution_path] += 1
        result_status_counter[result_status] += 1
        if used_backend == "ollama":
            local_runs_count += 1
        if review_recommended:
            review_recommended_count += 1
        if result_status == "degraded" or degraded_reasons:
            degraded_count += 1
        if _fallback_triggered(record):
            fallback_count += 1

        if recorded_at is not None and recorded_at >= window_start:
            recent_result_distribution_counter[result_status] += 1
        for reason in degraded_reasons:
            degraded_reason_counter[reason] += 1

        flow_bucket = by_flow.setdefault(
            flow,
            {
                "run_count": 0,
                "backend_requested": {},
                "backend_used": {},
                "execution_paths": {},
                "result_statuses": {},
                "fallback_count": 0,
                "degraded_count": 0,
                "review_recommended_count": 0,
            },
        )
        flow_bucket["run_count"] += 1
        flow_bucket["backend_requested"][requested_backend] = flow_bucket["backend_requested"].get(requested_backend, 0) + 1
        flow_bucket["backend_used"][used_backend] = flow_bucket["backend_used"].get(used_backend, 0) + 1
        flow_bucket["execution_paths"][execution_path] = flow_bucket["execution_paths"].get(execution_path, 0) + 1
        flow_bucket["result_statuses"][result_status] = flow_bucket["result_statuses"].get(result_status, 0) + 1
        if _fallback_triggered(record):
            flow_bucket["fallback_count"] += 1
        if result_status == "degraded" or degraded_reasons:
            flow_bucket["degraded_count"] += 1
        if review_recommended:
            flow_bucket["review_recommended_count"] += 1

    for flow_bucket in by_flow.values():
        run_count = int(flow_bucket["run_count"])
        flow_bucket["fallback_rate"] = _round_rate(int(flow_bucket["fallback_count"]), run_count)
        flow_bucket["degraded_rate"] = _round_rate(int(flow_bucket["degraded_count"]), run_count)
        flow_bucket["review_recommended_rate"] = _round_rate(int(flow_bucket["review_recommended_count"]), run_count)

    recent_runs: list[dict[str, Any]] = []
    for audit_record in reversed(audit_records_sorted):
        backend = audit_record.get("backend")
        backend_requested = "unknown"
        backend_used = "unknown"
        if isinstance(backend, dict):
            backend_requested = _normalize_reason_label(backend.get("requested_backend"), fallback="unknown")
            backend_used = _normalize_reason_label(backend.get("selected_backend"), fallback="unknown")
            backend_reason_values = backend.get("reasons")
            if isinstance(backend_reason_values, list):
                for reason in backend_reason_values:
                    if backend_used == "codex" and backend_requested in {"auto", "ollama"}:
                        fallback_reason_counter[_normalize_reason_label(reason)] += 1
        transport = audit_record.get("transport") if isinstance(audit_record.get("transport"), dict) else {}
        if backend_used == "codex" and backend_requested in {"auto", "ollama"}:
            transport_reason = transport.get("reason") if isinstance(transport, dict) else None
            fallback_reason_counter[_normalize_reason_label(transport_reason)] += 1
        recent_runs.append(
            {
                "recorded_at": audit_record.get("recorded_at"),
                "flow": _normalize_reason_label(audit_record.get("flow"), fallback="unknown-flow"),
                "result_status": _normalize_reason_label(audit_record.get("result_status"), fallback="unknown"),
                "backend_requested": backend_requested,
                "backend_used": backend_used,
                "execution_path": _execution_path_label(backend_requested, backend_used),
                "degraded_reasons": [
                    _normalize_reason_label(reason)
                    for reason in audit_record.get("degraded_reasons", [])
                    if _normalize_reason_label(reason)
                ],
                "review_recommended": _audit_review_recommended(audit_record),
                "safety_class": _normalize_reason_label(audit_record.get("safety_class"), fallback="unknown"),
                "seed_ref": (
                    audit_record.get("context_summary", {}).get("seed_ref")
                    if isinstance(audit_record.get("context_summary"), dict)
                    else None
                ),
                "transport": transport if isinstance(transport, dict) else {},
                "validated_summary": _summarize_validated_payload(audit_record.get("validated_payload", {}))
                if isinstance(audit_record.get("validated_payload"), dict)
                else "",
                "validated_excerpt": _build_validated_excerpt(audit_record.get("validated_payload")),
            }
        )
        if len(recent_runs) >= effective_recent_limit:
            break

    recent_runs.reverse()
    fallback_heavy = _round_rate(fallback_count, total_runs) >= 0.25 if total_runs else False
    degraded_heavy = _round_rate(degraded_count, total_runs) >= 0.2 if total_runs else False
    review_heavy = _round_rate(review_recommended_count, total_runs) >= 0.35 if total_runs else False
    local_offload_rate = _round_rate(local_runs_count, total_runs)
    estimated_remote_token_avoidance = local_runs_count * DEFAULT_ESTIMATED_REMOTE_TOKENS_PER_LOCAL_RUN

    health_summary: list[str] = []
    if total_runs == 0:
        health_summary.append("No hybrid assist measurement records are available yet.")
    else:
        if fallback_heavy:
            health_summary.append("Fallback routing is elevated, which suggests local backend instability or explicit codex preference.")
        if degraded_heavy:
            health_summary.append("Degraded outcomes are elevated and should be reviewed before treating the ROI proxies as healthy.")
        if review_heavy:
            health_summary.append("Review-recommended outcomes are frequent, so operator follow-up remains important.")
        if not health_summary:
            health_summary.append("Recent hybrid assist activity looks operationally healthy under the current bounded metrics.")

    return {
        "schema_version": "1.0",
        "report_kind": "hybrid-assist-roi-report",
        "generated_at": now.isoformat(),
        "ok": True,
        "sources": {
            "audit_log": audit_log.relative_to(repo_root).as_posix() if audit_log.is_absolute() else audit_log.as_posix(),
            "measurement_log": measurement_log.relative_to(repo_root).as_posix() if measurement_log.is_absolute() else measurement_log.as_posix(),
            "audit_records": len(audit_records_sorted),
            "measurement_records": total_runs,
            "invalid_audit_lines": audit_invalid_lines,
            "invalid_measurement_lines": measurement_invalid_lines,
        },
        "limits": {
            "recent_limit": effective_recent_limit,
            "window_days": effective_window_days,
            "window_start": window_start.isoformat(),
        },
        "semantics": {
            "measured": "Values under `measured` come directly from hybrid assist measurement records and recent audit provenance.",
            "derived": "Values under `derived` are deterministic summaries or rates computed from measured counters.",
            "estimated": "Values under `estimated` are conservative proxies only. They are not billing truth and must be read alongside degraded and fallback rates.",
        },
        "measured": {
            "totals": {
                "runs": total_runs,
                "fallback_runs": fallback_count,
                "degraded_runs": degraded_count,
                "review_recommended_runs": review_recommended_count,
                "local_runs": local_runs_count,
            },
            "runs_by_flow": dict(sorted((flow, bucket["run_count"]) for flow, bucket in by_flow.items())),
            "backend_requested": dict(sorted(backend_requested_counter.items())),
            "backend_used": dict(sorted(backend_used_counter.items())),
            "execution_paths": dict(sorted(execution_path_counter.items())),
            "result_statuses": dict(sorted(result_status_counter.items())),
            "review_recommended_by_flow": {flow: bucket["review_recommended_count"] for flow, bucket in sorted(by_flow.items())},
            "recent_result_distribution": dict(sorted(recent_result_distribution_counter.items())),
            "flow_breakdown": dict(sorted(by_flow.items())),
        },
        "derived": {
            "rates": {
                "fallback_rate": _round_rate(fallback_count, total_runs),
                "degraded_rate": _round_rate(degraded_count, total_runs),
                "review_recommended_rate": _round_rate(review_recommended_count, total_runs),
                "local_offload_rate": local_offload_rate,
            },
            "dispatch_split": [{"label": label, "count": count} for label, count in backend_used_counter.most_common()],
            "execution_path_split": [{"label": label, "count": count} for label, count in execution_path_counter.most_common()],
            "top_degraded_reasons": [{"label": label, "count": count} for label, count in degraded_reason_counter.most_common(5)],
            "top_fallback_reasons": [{"label": label, "count": count} for label, count in fallback_reason_counter.most_common(5)],
            "health_summary": health_summary,
            "report_state": {
                "fallback_heavy": fallback_heavy,
                "degraded_heavy": degraded_heavy,
                "review_heavy": review_heavy,
            },
        },
        "estimated": {
            "assumptions": {
                "remote_tokens_per_local_run": DEFAULT_ESTIMATED_REMOTE_TOKENS_PER_LOCAL_RUN,
                "token_avoidance_note": "Each successful local Ollama run is treated as one avoided remote assist dispatch with a conservative illustrative token budget.",
                "interpretation_note": "Use these proxies for relative trend review only. They are not exact cost or billing metrics.",
            },
            "proxies": {
                "estimated_remote_dispatches_avoided": local_runs_count,
                "estimated_remote_token_avoidance": estimated_remote_token_avoidance,
                "estimated_local_offload_share": local_offload_rate,
            },
        },
        "recent_runs": recent_runs,
    }


def _get_global_claude_home() -> Path:
    return Path(os.environ.get("LOGICS_CLAUDE_GLOBAL_HOME") or (Path.home() / ".claude")).resolve()


def _claude_bridge_status(_repo_root: Path) -> dict[str, object]:
    global_home = _get_global_claude_home()
    detected_variants: list[str] = []
    for variant in CLAUDE_BRIDGE_VARIANTS:
        command_path = global_home / str(variant["command_path"]).replace(".claude/", "")
        agent_path = global_home / str(variant["agent_path"]).replace(".claude/", "")
        if command_path.is_file() and agent_path.is_file():
            detected_variants.append(variant["id"])
    return {
        "available": bool(detected_variants),
        "preferred_variant": detected_variants[0] if detected_variants else None,
        "detected_variants": detected_variants,
        "supported_variants": [variant["id"] for variant in CLAUDE_BRIDGE_VARIANTS],
    }


def _render_claude_bridge_lines(variant: dict[str, object], prompt: str) -> tuple[str, str]:
    title = str(variant["title"])
    command_path = str(variant["command_path"])
    agent_path = str(variant["agent_path"])
    reviewer_nudge = variant.get("reviewer_nudge")

    command_lines = [
        f"# {title}",
        "",
        f"Use the published global {title.lower()} bridge for this project.",
        "",
        "Primary prompt:",
        prompt,
        "",
    ]
    agent_lines = [
        f"# {title} Agent",
        "",
        f"Use the published global {title.lower()} agent for this project.",
        "",
        "Default prompt:",
        prompt,
        "",
    ]
    if reviewer_nudge:
        command_lines.extend(["Reviewer nudge:", str(reviewer_nudge), ""])
        agent_lines.extend(["Reviewer nudge:", str(reviewer_nudge), ""])
    command_lines.extend(["References:", f"- `{agent_path}`", "- `logics_manager`", ""])
    agent_lines.extend(["References:", f"- `{command_path}`", "- `logics_manager`", ""])
    return "\n".join(command_lines), "\n".join(agent_lines)


def _build_claude_bridge_manifest(repo_root: Path) -> dict[str, object]:
    bridges: list[dict[str, object]] = []
    for variant in CLAUDE_BRIDGE_VARIANTS:
        prompt = str(variant.get("prompt_override") or variant["fallback_prompt"])
        command_content, agent_content = _render_claude_bridge_lines(variant, prompt)
        bridges.append(
            {
                "id": variant["id"],
                "title": variant["title"],
                "command_path": variant["command_path"],
                "agent_path": variant["agent_path"],
                "prompt": prompt,
                "command_content": command_content,
                "agent_content": agent_content,
            }
        )
    return {
        "command": "assist",
        "kind": "claude-bridge-manifest",
        "repo_root": repo_root.as_posix(),
        "bridge_count": len(bridges),
        "bridges": bridges,
    }


def _build_claude_instructions(repo_root: Path) -> dict[str, object]:
    content = "\n".join(
        [
            "# Codex Context",
            "",
            "This file defines the working context for Codex in this repository.",
            "",
            "## Workflow",
            "",
            "Use the canonical `logics-manager` CLI to create, promote, start, and finish Logics docs:",
            "",
            "- `python3 -m logics_manager flow new request --title \"...\"`",
            "- `python3 -m logics_manager flow promote request-to-backlog logics/request/req_NNN_*.md`",
            "- `python3 -m logics_manager flow start logics/tasks/task_NNN_*.md --owner \"$LOGICS_AGENT\"`",
            "- `python3 -m logics_manager flow progress task logics/tasks/task_NNN_*.md --progress <n>%`",
            "- `python3 -m logics_manager flow finish task logics/tasks/task_NNN_*.md`",
            "- `python3 -m logics_manager lint --require-status`",
            "- `python3 -m logics_manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`",
            "",
            "Bundled agent skills (e.g. `/corpus` for scaffolding a full request chain) can be installed once per machine with `logics-manager skills install`.",
            "",
            "Claude runtime artifacts are generated outside the repository from the integrated runtime.",
            "Do not edit generated runtime artifacts by hand unless you are deliberately repairing a generated artifact.",
            "",
            "Do not edit indicator lines, owner assignments, or workflow links by hand.",
            "During task execution, treat meaningful waves as ADR 009 checkpoints: update affected Logics docs inside the wave and leave the repo commit-ready; actual commits stay under operator control.",
            "When grooming or creating backlog items, set a deliberate `# Priority` tier (`High`, `Medium`, or `Low`) with a one-line rationale instead of leaving the default unreviewed.",
            "Sequence delivery plans and roadmaps by status priority order before lower-priority work when dependencies allow.",
            "When delivery consumes a linked product brief, `flow closeout` should settle it; otherwise set the brief to `Settled` or `Superseded` through the CLI instead of leaving it `Proposed`.",
            "When `rtk` is available, prefer it for noisy commands. Use raw commands or `rtk proxy <cmd>` when exact output or one-off command semantics matter.",
            "For targeted npm binaries, prefer `rtk npm exec -- vitest ...` instead of `rtk npx vitest ...`.",
            "",
        ]
    ).rstrip() + "\n"
    return {
        "command": "assist",
        "kind": "claude-instructions",
        "repo_root": repo_root.as_posix(),
        "path": "logics/instructions.md",
        "content": content,
        "line_count": len(content.splitlines()),
    }


def _select_backend(requested_backend: str | None, bridge_status: dict[str, object]) -> tuple[str, list[str]]:
    if requested_backend and requested_backend != "auto":
        return requested_backend, []
    if bridge_status.get("available"):
        return "codex", ["global Claude runtime published"]
    return "deterministic", ["no global Claude runtime published"]


def _workflow_docs(repo_root: Path) -> list[Path]:
    docs: list[Path] = []
    for directory in ("request", "backlog", "tasks"):
        docs.extend(sorted((repo_root / "logics" / directory).glob("*.md")))
    return docs


def _resolve_workflow_doc(repo_root: Path, ref: str) -> Path | None:
    for path in _workflow_docs(repo_root):
        if path.stem == ref or path.name == f"{ref}.md":
            return path
    return None


def _doc_status(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("> Status:"):
            return stripped.split(":", 1)[1].strip()
    return "Unknown"


def _extract_doc_links(path: Path) -> list[str]:
    links: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            candidate = stripped[2:].strip().strip("`")
            if candidate:
                links.append(candidate)
    return links


def _build_next_step(repo_root: Path, ref: str | None) -> dict[str, object]:
    if ref:
        doc_path = _assist._resolve_workflow_doc(repo_root, ref)
        if doc_path is not None:
            kind = doc_path.parent.name
            status = _doc_status(doc_path)
            if kind == "request":
                if status.lower() in {"draft", "ready"}:
                    action = "promote request to backlog"
                    rationale = "The request is ready to be split into bounded backlog slices."
                    checklist = [
                        f"Run `python3 -m logics_manager flow promote request-to-backlog {doc_path.relative_to(repo_root).as_posix()}`.",
                        "Validate the generated backlog slice for scope and acceptance criteria.",
                    ]
                else:
                    action = "review request status"
                    rationale = "The request is not in a promotion-friendly state yet."
                    checklist = [
                        "Inspect the request status and linked backlog coverage.",
                        "Resolve any missing indicators before promotion.",
                    ]
            elif kind == "backlog":
                if status.lower() in {"draft", "ready"}:
                    action = "promote backlog to task"
                    rationale = "The backlog item is ready to become an executable task."
                    checklist = [
                        f"Run `python3 -m logics_manager flow promote backlog-to-task {doc_path.relative_to(repo_root).as_posix()}`.",
                        "Confirm the task scope remains bounded and executable.",
                    ]
                else:
                    action = "review backlog status"
                    rationale = "The backlog item is not ready for task promotion yet."
                    checklist = [
                        "Inspect the backlog status and task linkage.",
                        "Resolve any missing indicators before promotion.",
                    ]
            else:
                action = "finish task"
                rationale = "Tasks are usually the last step in the Logics chain."
                checklist = [
                    f"Run `python3 -m logics_manager flow finish task {doc_path.relative_to(repo_root).as_posix()}`.",
                    "Verify the linked backlog and request moved to Done if appropriate.",
                ]
            return {
                "ref": ref,
                "doc_path": doc_path.relative_to(repo_root).as_posix(),
                "kind": kind,
                "status": status,
                "action": action,
                "rationale": rationale,
                "checklist": checklist,
                "confidence": 0.92,
            }
    return {
        "ref": ref,
        "doc_path": None,
        "kind": None,
        "status": None,
        "action": "run validation-summary",
        "rationale": "No target doc was resolved, so the safest next step is to inspect repository validation health.",
        "checklist": [
            "Run `python3 -m logics_manager assist validation-summary`.",
            "Then decide whether the next step is a request promotion, backlog promotion, or task finish.",
        ],
        "confidence": 0.74,
    }


def _build_closure_summary(repo_root: Path, ref: str | None) -> dict[str, object]:
    if not ref:
        return {
            "ref": None,
            "doc_path": None,
            "kind": None,
            "status": None,
            "summary": "No target doc was provided.",
            "delivered": [],
            "validations": [],
            "remaining_risks": ["Resolve the target doc reference first."],
            "confidence": 0.6,
        }
    doc_path = _assist._resolve_workflow_doc(repo_root, ref)
    if doc_path is None:
        return {
            "ref": ref,
            "doc_path": None,
            "kind": None,
            "status": None,
            "summary": "Target doc could not be resolved.",
            "delivered": [],
            "validations": [],
            "remaining_risks": [f"Unknown workflow ref `{ref}`."],
            "confidence": 0.55,
        }
    kind = doc_path.parent.name
    status = _doc_status(doc_path)
    title = next((line.split(" - ", 1)[1].strip() for line in doc_path.read_text(encoding="utf-8").splitlines() if line.startswith("## ")), doc_path.stem)
    links = _extract_doc_links(doc_path)
    delivered = [f"{kind} doc `{doc_path.stem}`", f"title: {title}", f"status: {status}"]
    validations = [
        "Check that the linked request/backlog/task chain is complete.",
        "Run the relevant lint/doctor validation before treating the closure as final.",
    ]
    remaining_risks: list[str] = []
    if status.lower() != "done":
        remaining_risks.append("The doc is not marked Done yet.")
    if not links:
        remaining_risks.append("No linked workflow references were found in the document.")
    return {
        "ref": ref,
        "doc_path": doc_path.relative_to(repo_root).as_posix(),
        "kind": kind,
        "status": status,
        "summary": f"{kind.title()} closure summary for {title}.",
        "delivered": delivered,
        "validations": validations,
        "remaining_risks": remaining_risks or ["No obvious remaining risks detected from the local doc shape."],
        "linked_refs": links,
        "confidence": 0.9 if status.lower() == "done" else 0.76,
    }


def _build_context_pack(repo_root: Path, seed_ref: str, *, mode: str, profile: str) -> dict[str, object]:
    docs = _workflow_docs(repo_root)
    selected: list[Path] = []
    for path in docs:
        text = path.read_text(encoding="utf-8")
        if seed_ref in path.stem or seed_ref in text:
            selected.append(path)
    if not selected:
        selected = docs[:4]
    selected = selected[: {"tiny": 2, "normal": 4, "deep": 8}.get(profile, 4)]
    return {
        "ref": seed_ref,
        "mode": mode,
        "profile": profile,
        "budgets": {"max_docs": {"tiny": 2, "normal": 4, "deep": 8}.get(profile, 4)},
        "changed_paths": [],
        "docs": [
            {
                "ref": path.stem,
                "path": path.relative_to(repo_root).as_posix(),
                "kind": path.parent.name,
                "title": path.read_text(encoding="utf-8").splitlines()[0].replace("#", "").strip() if path.read_text(encoding="utf-8").splitlines() else path.stem,
            }
            for path in selected
        ],
        "estimates": {
            "doc_count": len(selected),
            "char_count": sum(len(path.read_text(encoding="utf-8")) for path in selected),
        },
    }
