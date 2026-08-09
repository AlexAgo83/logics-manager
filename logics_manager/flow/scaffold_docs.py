"""Document builders for `flow scaffold request-chain` and the AC-aware split.

Extracted from `logics_manager.flow` to keep that module inside its line budget
(req_273). These functions render Markdown from the scaffold input and depend on
nothing else in the package, so the import runs one way only.
"""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path


def _slugify(text: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "_" for ch in text)
    cleaned = "_".join(part for part in cleaned.split("_") if part)
    return cleaned or "request"


def _resolved_from_version(repo_root: Path, from_version: str | None) -> str:
    if from_version:
        return from_version
    package_json = repo_root / "package.json"
    if not package_json.is_file():
        return "1.0.0"
    try:
        payload = json.loads(package_json.read_text(encoding="utf-8"))
    except Exception:
        return "1.0.0"
    version = payload.get("version") if isinstance(payload, dict) else None
    return str(version).strip() if version else "1.0.0"


def _next_product_ref(repo_root: Path, title: str) -> str:
    directory = repo_root / "logics" / "product"
    highest = 0
    if directory.is_dir():
        for path in directory.glob("prod_*.md"):
            stem = path.stem
            if stem.startswith("prod_"):
                parts = stem.split("_", 2)
                if len(parts) >= 2 and parts[1].isdigit():
                    highest = max(highest, int(parts[1]))
    return f"prod_{highest + 1:03d}_{_slugify(title)}"


def _string_list(payload: object, key: str, *, default: list[str] | None = None) -> list[str]:
    if not isinstance(payload, dict) or key not in payload:
        return list(default or [])
    value = payload.get(key)
    if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
        raise SystemExit(f"`{key}` must be an array of non-empty strings.")
    return [item.strip() for item in value]

def _string_value(payload: object, key: str, *, default: str = "") -> str:
    if not isinstance(payload, dict):
        return default
    value = payload.get(key, default)
    if value is None:
        return default
    if not isinstance(value, str):
        raise SystemExit(f"`{key}` must be a string.")
    return value.strip() or default

def _bullets_or_default(values: list[str], fallback: str) -> list[str]:
    return [f"- {value}" for value in values] if values else [f"- {fallback}"]

def _normalize_ac_id(value: str) -> str:
    match = re.search(r"\bAC(\d+)\b", value, flags=re.IGNORECASE)
    return f"AC{match.group(1)}" if match else value.strip()

def _build_scaffold_request_doc(repo_root: Path, ref: str, title: str, input_payload: dict[str, object]) -> str:
    request = input_payload.get("request") if isinstance(input_payload.get("request"), dict) else {}
    from_version = _resolved_from_version(repo_root, _string_value(input_payload, "from_version", default=""))
    needs = _string_list(request, "needs", default=[f"Deliver {title.lower()} as a development-ready Logics workflow."])
    context = _string_list(request, "context", default=["Generated from structured request-chain scaffold input."])
    acceptance = _string_list(request, "acceptance_criteria", default=["AC1: The scaffolded workflow is ready for implementation."])
    references = _string_list(input_payload, "references", default=["`logics_manager/flow.py`"])
    product_title = _string_value(input_payload.get("product") if isinstance(input_payload.get("product"), dict) else {}, "title", default=title)
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> From version: {from_version}",
            "> Schema version: 1.0",
            "> Status: Draft",
            "> Understanding: 90%",
            "> Confidence: 85%",
            f"> Complexity: {_string_value(request, 'complexity', default='High')}",
            f"> Theme: {_string_value(request, 'theme', default='Operator workflow')}",
            "> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.",
            "",
            "# AI Context",
            f"- Summary: {title}",
            f"- Keywords: request-chain-scaffold, {title.lower()}, development-ready",
            f"- Use when: You need to implement or review the scaffolded workflow for {title}.",
            "- Skip when: The change is unrelated to this scaffolded request chain.",
            "",
            "# Needs",
            *_bullets_or_default(needs, f"Deliver {title.lower()}."),
            "",
            "# Context",
            *_bullets_or_default(context, "Generated from structured scaffold input."),
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance],
            "",
            "# Definition of Ready (DoR)",
            "- [x] Problem statement is explicit and user impact is clear.",
            "- [x] Scope boundaries (in/out) are explicit.",
            "- [x] Acceptance criteria are testable.",
            "- [x] Dependencies and known risks are listed.",
            "",
            "# Companion docs",
            f"- Product brief(s): `{_next_product_ref(repo_root, product_title)}`",
            "- Architecture decision(s): (none yet)",
            "",
            "# References",
            *[f"- {item}" for item in references],
            "",
            "# Backlog",
            "- none",
            "",
        ]
    ).rstrip() + "\n"

def _build_scaffold_product_doc(repo_root: Path, ref: str, request_ref: str, item_refs: list[str], task_ref: str, input_payload: dict[str, object]) -> str:
    product = input_payload.get("product") if isinstance(input_payload.get("product"), dict) else {}
    title = _string_value(product, "title", default=_string_value(input_payload, "title", default="Scaffolded product"))
    overview = _string_value(product, "overview", default=f"Development-ready workflow corpus for {title.lower()}.")
    goals = _string_list(product, "goals", default=["Make the generated corpus usable without transcript context."])
    non_goals = _string_list(product, "non_goals", default=["Automatically implementing generated tasks."])
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> Date: {date.today().isoformat()}",
            "> Status: Proposed",
            f"> Related request: `{request_ref}`",
            f"> Related backlog: {', '.join(f'`{item}`' for item in item_refs)}",
            f"> Related task: `{task_ref}`",
            "> Related architecture: (none yet)",
            "> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.",
            "",
            "# Overview",
            overview,
            "",
            "# Goals",
            *_bullets_or_default(goals, "Keep the generated corpus implementation-ready."),
            "",
            "# Non-goals",
            *_bullets_or_default(non_goals, "Automatically implementing generated tasks."),
            "",
            "# Scope and guardrails",
            "- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.",
            "- Out: unrelated workflow docs and implementation of generated tasks.",
            "",
            "# Key product decisions",
            "- Use structured input as the source of truth for generated docs.",
            "- Keep generated write paths local and repo-bounded.",
            "",
            "# Success signals",
            "- Generated docs pass lint and audit without broad manual rewrites.",
            "- Context-pack output can be handed to an implementation agent directly.",
            "",
            "# References",
            f"- Product back-reference: `{request_ref}`",
            f"- Task back-reference: `{task_ref}`",
            "",
        ]
    ).rstrip() + "\n"

def _build_scaffold_backlog_doc(repo_root: Path, ref: str, request_ref: str, product_ref: str, task_ref: str, item: dict[str, object]) -> str:
    title = _string_value(item, "title", default="Scaffolded backlog slice")
    problem = _string_list(item, "problem", default=[f"Deliver {title.lower()}."])
    scope_in = _string_list(item, "scope_in", default=["the bounded implementation slice"])
    scope_out = _string_list(item, "scope_out", default=["unrelated sibling slices"])
    acceptance = _string_list(item, "acceptance_criteria", default=["AC1: The slice is implementation-ready."])
    request_acs = [_normalize_ac_id(value) for value in _string_list(item, "request_acs", default=[])]
    if not request_acs:
        request_acs = [f"AC{idx}" for idx in range(1, len(acceptance) + 1)]
    ac_trace = [
        f"- request-{ac_id} -> This backlog slice. Proof: {acceptance[min(idx, len(acceptance) - 1)]}"
        for idx, ac_id in enumerate(request_acs)
    ]
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> From version: {_resolved_from_version(repo_root, None)}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            f"> Complexity: {_string_value(item, 'complexity', default='Medium')}",
            f"> Theme: {_string_value(item, 'theme', default='Implementation delivery')}",
            "> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.",
            "",
            "# AI Context",
            f"- Summary: {title}",
            f"- Keywords: scaffolded-backlog, {title.lower()}, implementation-ready",
            f"- Use when: Implementing the scaffolded slice for {title}.",
            "- Skip when: The change belongs to another backlog slice.",
            "",
            "# Problem",
            *_bullets_or_default(problem, f"Deliver {title.lower()}."),
            "",
            "# Scope",
            "- In:",
            *[f"  - {value}" for value in scope_in],
            "- Out:",
            *[f"  - {value}" for value in scope_out],
            "",
            "# Acceptance criteria",
            *[f"- {value}" for value in acceptance],
            "",
            "# AC Traceability",
            *ac_trace,
            "",
            "# Decision framing",
            "- Product framing: Not needed",
            "- Architecture framing: Not needed",
            "",
            "# Links",
            f"- Product brief(s): `{product_ref}`",
            "- Architecture decision(s): (none yet)",
            f"- Request: `{request_ref}`",
            f"- Primary task(s): `{task_ref}`",
            "",
            "# Priority",
            f"- Priority: {_string_value(item, 'priority', default='Medium')}",
            "- Rationale: Set by scaffold input or defaulted for grooming.",
            "",
        ]
    ).rstrip() + "\n"

def _scaffold_input_request_ac_ids(input_payload: dict[str, object]) -> list[str]:
    """Acceptance criterion identifiers declared by the scaffold input, in declaration order."""
    request = input_payload.get("request") if isinstance(input_payload.get("request"), dict) else {}
    ids: list[str] = []
    for entry in _string_list(request, "acceptance_criteria", default=[]):
        match = re.match(r"\s*(AC\d+)\b", entry.strip(), re.IGNORECASE)
        if match:
            ids.append(_normalize_ac_id(match.group(1)))
    return ids

def _scaffold_ac_ownership(input_payload: dict[str, object], item_refs: list[str]) -> tuple[dict[str, list[str]], list[str]]:
    """Map each backlog item ref to the request ACs it claims, and list the unclaimed ones.

    The mapping already exists in the scaffold input under `backlog_items[].request_acs`;
    deriving it here is what surfaces request criteria that no slice has taken on.
    """
    items = input_payload.get("backlog_items") if isinstance(input_payload.get("backlog_items"), list) else []
    owned: dict[str, list[str]] = {}
    claimed: set[str] = set()
    for item_ref, item in zip(item_refs, items):
        if not isinstance(item, dict):
            continue
        acs = [_normalize_ac_id(value) for value in _string_list(item, "request_acs", default=[])]
        if acs:
            owned[item_ref] = acs
            claimed.update(acs)
    unclaimed = [ac_id for ac_id in _scaffold_input_request_ac_ids(input_payload) if ac_id not in claimed]
    return owned, unclaimed

def _scaffold_task_ac_trace(input_payload: dict[str, object], item_refs: list[str]) -> list[str]:
    owned, unclaimed = _scaffold_ac_ownership(input_payload, item_refs)
    # One line per criterion, because the closeout gate counts them that way: a line
    # naming several criteria is evidence for none of them. This used to emit grouped
    # lines, so a corpus the scaffold produced could not satisfy the gate the same tool
    # applies to it at closeout, and every operator rewrote them by hand.
    lines = [
        f"- request-{ac_id} -> `{item_ref}`. Proof deferred to slice closeout."
        for item_ref, acs in owned.items()
        for ac_id in acs
    ]
    lines.extend(
        f"- request-{ac_id} -> (unclaimed). No backlog slice declares this criterion."
        for ac_id in unclaimed
    )
    return lines or ["- (no request acceptance criteria declared in the scaffold input)"]

def _build_scaffold_task_doc(repo_root: Path, ref: str, title: str, request_ref: str, product_ref: str, item_refs: list[str], input_payload: dict[str, object]) -> str:
    task = input_payload.get("orchestration_task") if isinstance(input_payload.get("orchestration_task"), dict) else {}
    title = _string_value(task, "title", default=title)
    steps = _string_list(task, "plan", default=["Review generated corpus.", "Promote or implement the first backlog slice.", "Validate and update workflow docs."])
    ac_trace = _scaffold_task_ac_trace(input_payload, item_refs)
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> From version: {_resolved_from_version(repo_root, None)}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            "> Complexity: Medium",
            "> Theme: Implementation delivery",
            "> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.",
            "",
            "# AI Context",
            f"- Summary: {title}",
            "- Keywords: scaffolded-task, request-chain-scaffold, orchestration",
            "- Use when: Coordinating implementation of a scaffolded request chain.",
            "- Skip when: Working on one isolated sibling slice.",
            "",
            "# Context",
            "- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.",
            "",
            "# Plan",
            *[f"- [ ] {idx}. {step}" for idx, step in enumerate(steps, start=1)],
            "- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.",
            "- [ ] Keep commit creation under operator control; do not force one commit per micro-step.",
            "- [ ] GATE: do not close until lint, audit, and scaffold validation pass.",
            "",
            "# Backlog",
            *[f"- `{item_ref}`" for item_ref in item_refs],
            "",
            "# Definition of Done (DoD)",
            "- [ ] Generated request, product, backlog, and task docs are present.",
            "- [ ] Context-pack handoff is available when requested.",
            "- [ ] Validation passes.",
            "- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.",
            "",
            "# AC Traceability",
            *ac_trace,
            "",
            "# Validation",
            "- (no validation recorded yet)",
            "",
            "# Report",
            "- Not started.",
            "",
            "# Links",
            f"- Request: `{request_ref}`",
            f"- Product brief(s): `{product_ref}`",
            "- Architecture decision(s): (none yet)",
            "",
        ]
    ).rstrip() + "\n"

def _build_split_orchestration_task_doc(repo_root: Path, ref: str, title: str, request_ref: str, item_refs: list[str], summary: str) -> str:
    return "\n".join(
        [
            f"## {ref} - {title}",
            f"> From version: {_resolved_from_version(repo_root, None)}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            "> Complexity: Medium",
            "> Theme: Implementation delivery",
            "> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.",
            "",
            "# AI Context",
            f"- Summary: {title}",
            "- Keywords: ac-aware-split, orchestration-task, generated-task",
            "- Use when: Coordinating the generated backlog slices from an AC-aware request split.",
            "- Skip when: Implementing one individual backlog slice.",
            "",
            "# Context",
            f"- {summary or 'Coordinate the AC-aware split backlog items without implementing them directly.'}",
            "",
            "# Plan",
            "- [ ] 1. Review the generated backlog slices and request AC mapping.",
            "- [ ] 2. Promote or implement the next highest-priority slice.",
            "- [ ] 3. Keep validation and request traceability updated as slices close.",
            "- [ ] 4. Apply ADR 009 checkpoints: update affected Logics docs during each meaningful wave and leave the repo commit-ready.",
            "",
            "# Backlog",
            *[f"- `{item_ref}`" for item_ref in item_refs],
            "",
            "# Definition of Done (DoD)",
            "- [ ] Generated backlog slices are linked and ready for implementation.",
            "- [ ] Slice ownership and next action are clear.",
            "- [ ] Validation passes.",
            "- [ ] Meaningful waves followed ADR 009 without automatic commits or one commit per micro-step.",
            "",
            "# AC Traceability",
            "- request-AC2 -> This task. Proof: orchestration task coordinates the AC-aware split.",
            "- request-AC6 -> This task. Proof: generated task keeps split work explicit and bounded.",
            "- request-AC7 -> This task. Proof: generated task is covered by split request tests.",
            "",
            "# Validation",
            "- (no validation recorded yet)",
            "",
            "# Report",
            "- Not started.",
            "",
            "# Links",
            f"- Request: `{request_ref}`",
            "- Product brief(s): (none yet)",
            "- Architecture decision(s): (none yet)",
            "",
        ]
    ).rstrip() + "\n"
