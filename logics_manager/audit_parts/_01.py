from __future__ import annotations

import argparse
import json
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .config import find_repo_root
from .flow_evidence import has_ac_proof as _has_ac_with_proof


CURRENT_WORKFLOW_SCHEMA_VERSION = "1.0"
STRICT_AC_PROOF_FROM_VERSION = (2, 11, 6)

DOC_KINDS = {
    "request": ("logics/request", "req", False),
    "backlog": ("logics/backlog", "item", True),
    "task": ("logics/tasks", "task", True),
    "product": ("logics/product", "prod", False),
    "architecture": ("logics/architecture", "adr", False),
}

REF_PREFIXES = ("req", "item", "task", "prod", "adr", "spec")
STATUS_IN_PROGRESS = {"draft", "ready", "in progress", "blocked"}
STATUS_DONE = {"done", "archived", "obsolete", "validated", "settled", "superseded"}

COMPANION_PLACEHOLDERS: dict[str, tuple[str, ...]] = {
    "product": (
        "Summarize the product direction, the targeted user value, and the main expected outcomes.",
        "Describe the user or business problem this brief resolves.",
        "Primary user or segment",
        "Primary product goal",
        "Main open product question to resolve",
    ),
    "architecture": (
        "Summarize the chosen direction, what changes, and the main impacted areas.",
        "Describe the problem, constraints, and drivers.",
        "State the chosen option and rationale.",
        "Describe the rollout or migration step.",
    ),
}
TOKEN_HYGIENE_PLACEHOLDERS = (
    "Summarize the need, scope, and expected outcome",
    "logics, workflow",
    "Use when framing scope, context, and acceptance checks",
)
TOKEN_HYGIENE_SECTION_LIMITS: dict[str, dict[str, int]] = {
    "request": {"Context": 24},
    "backlog": {"Problem": 16, "Notes": 24},
    "task": {"Context": 16, "Report": 16},
}
GOVERNANCE_PROFILES = {
    "relaxed": {
        "stale_days": 0,
        "require_gates": False,
        "require_ac_traceability": False,
        "token_hygiene": False,
    },
    "standard": {
        "stale_days": 45,
        "require_gates": True,
        "require_ac_traceability": True,
        "token_hygiene": False,
    },
    "strict": {
        "stale_days": 30,
        "require_gates": True,
        "require_ac_traceability": True,
        "token_hygiene": True,
    },
}

HYBRID_CACHE_JSONL_FILES = (
    Path("logics/.cache/hybrid_assist_audit.jsonl"),
    Path("logics/.cache/hybrid_assist_measurements.jsonl"),
)


@dataclass(frozen=True)
class DocKind:
    kind: str
    directory: str
    prefix: str
    has_progress: bool


DOC_KIND_OBJECTS = {
    name: DocKind(name, directory, prefix, has_progress)
    for name, (directory, prefix, has_progress) in DOC_KINDS.items()
}


@dataclass
class DocMeta:
    kind: DocKind
    path: Path
    ref: str
    status: str | None
    progress: int | None
    from_version: tuple[int, int, int] | None
    text: str


@dataclass(frozen=True)
class AuditIssue:
    code: str
    path: Path | None
    message: str
    severity: str = "blocking"
    repair_command: str | None = None


def _indicator_value(lines: list[str], key: str) -> str | None:
    pattern = re.compile(rf"^\s*>\s*{re.escape(key)}\s*:\s*(.+)\s*$")
    for line in lines:
        match = pattern.match(line)
        if match:
            return match.group(1).strip()
    return None


def _status_normalized(value: str | None) -> str | None:
    if value is None:
        return None
    return " ".join(value.split()).lower()


def _canonical_status(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = _status_normalized(value)
    allowed = ("Draft", "Ready", "In progress", "Blocked", "Done", "Archived")
    for candidate in allowed:
        if normalized == candidate.lower():
            return candidate
    return value


def _progress_value(value: str | None) -> int | None:
    if value is None:
        return None
    match = re.search(r"(\d{1,3})", value)
    if match is None:
        return None
    try:
        parsed = int(match.group(1))
    except ValueError:
        return None
    return max(0, min(100, parsed))


def _parse_semver(value: str | None) -> tuple[int, int, int] | None:
    if value is None:
        return None
    match = re.search(r"\b(\d+)\.(\d+)\.(\d+)\b", value.strip())
    if match is None:
        return None
    return (int(match.group(1)), int(match.group(2)), int(match.group(3)))


def _extract_refs(text: str, prefix: str) -> set[str]:
    text = re.sub(r"```mermaid\s*\n.*?\n```", "", text, flags=re.DOTALL)
    pattern = re.compile(rf"\b{re.escape(prefix)}_\d+_[a-z0-9_]+\b")
    return {match.group(0) for match in pattern.finditer(text)}


def _has_mermaid_block(text: str) -> bool:
    return "```mermaid" in text


def _companion_doc_is_mature(doc: "DocMeta") -> bool:
    status = _status_normalized(doc.status)
    if doc.kind.kind == "product":
        return status in {"active", "accepted", "validated", "settled", "archived"}
    if doc.kind.kind == "architecture":
        return status in {"accepted", "validated", "superseded", "settled", "archived"}
    return False


def _decision_framing_value(text: str, label: str) -> str | None:
    pattern = re.compile(rf"^\s*-\s*{re.escape(label)}\s*:\s*(.+)\s*$", re.MULTILINE)
    match = pattern.search(text)
    if match is None:
        return None
    return match.group(1).strip()


def _extract_section_lines(text: str, heading_title: str) -> list[str]:
    lines = text.splitlines()
    start_idx = None
    target = heading_title.strip().lower()
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == target:
            start_idx = idx + 1
            break
    if start_idx is None:
        return []

    section: list[str] = []
    for idx in range(start_idx, len(lines)):
        line = lines[idx]
        if line.startswith("# "):
            break
        section.append(line)
    return section


def _extract_section_bounds(lines: list[str], heading_title: str) -> tuple[int, int] | None:
    start_idx = None
    target = heading_title.strip().lower()
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == target:
            start_idx = idx
            break
    if start_idx is None:
        return None

    end_idx = len(lines)
    for idx in range(start_idx + 1, len(lines)):
        if lines[idx].startswith("# "):
            end_idx = idx
            break
    return start_idx, end_idx


def _extract_checkboxes(section_lines: Iterable[str]) -> list[tuple[bool, str]]:
    out: list[tuple[bool, str]] = []
    pattern = re.compile(r"^\s*-\s*\[([ xX])\]\s*(.+)$")
    for line in section_lines:
        match = pattern.match(line)
        if match:
            out.append((match.group(1).lower() == "x", match.group(2).strip()))
    return out


def _section_content_line_count(text: str, heading: str) -> int:
    return sum(1 for line in _extract_section_lines(text, heading) if line.strip())


def _extract_request_ac_ids(request: DocMeta) -> list[str]:
    section = _extract_section_lines(request.text, "Acceptance criteria")
    ids: set[str] = set()
    pattern = re.compile(r"\b(AC\d+[a-z]?)\b", re.IGNORECASE)
    for line in section:
        for match in pattern.finditer(line):
            ids.add(match.group(1).upper())
    return sorted(ids)


def _extract_ai_context_fields(text: str) -> dict[str, str]:
    section = _extract_section_lines(text, "AI Context")
    fields: dict[str, str] = {}
    pattern = re.compile(r"^\s*-\s*([^:]+)\s*:\s*(.+?)\s*$")
    for line in section:
        match = pattern.match(line.strip())
        if match is None:
            continue
        fields[match.group(1).strip().lower()] = match.group(2).strip()
    return fields


def _is_done(doc: DocMeta) -> bool:
    if doc.status is not None and doc.status in STATUS_DONE:
        return True
    if doc.kind.has_progress and doc.progress == 100:
        return True
    return False


def _find_repo_root_from(start: Path) -> Path:
    try:
        return find_repo_root(start)
    except Exception as exc:
        raise SystemExit(str(exc)) from exc


def _collect_docs(repo_root: Path) -> dict[str, DocMeta]:
    docs: dict[str, DocMeta] = {}
    for kind in DOC_KIND_OBJECTS.values():
        directory = repo_root / kind.directory
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            text = path.read_text(encoding="utf-8")
            lines = text.splitlines()
            docs[path.stem] = DocMeta(
                kind=kind,
                path=path,
                ref=path.stem,
                status=_status_normalized(_indicator_value(lines, "Status")),
                progress=_progress_value(_indicator_value(lines, "Progress")),
                from_version=_parse_semver(_indicator_value(lines, "From version")),
                text=text,
            )
    return docs


def _scope_by_paths(docs: dict[str, DocMeta], repo_root: Path, raw_paths: list[str]) -> set[str]:
    included: set[str] = set()
    resolved_targets = [(repo_root / raw_path).resolve() for raw_path in raw_paths]
    for ref, doc in docs.items():
        doc_path = doc.path.resolve()
        for target in resolved_targets:
            if doc_path == target or target in doc_path.parents:
                included.add(ref)
                break
    return included


def _scope_by_refs(docs: dict[str, DocMeta], seed_refs: set[str]) -> set[str]:
    included: set[str] = set()
    queue = list(seed_refs)
    while queue:
        ref = queue.pop()
        if ref in included:
            continue
        doc = docs.get(ref)
        if doc is None:
            continue
        included.add(ref)

        linked_refs: set[str] = set()
        for prefix in REF_PREFIXES:
            linked_refs.update(_extract_refs(doc.text, prefix))
        for candidate in docs.values():
            if ref in candidate.text:
                linked_refs.add(candidate.ref)

        for linked_ref in linked_refs:
            if linked_ref not in included:
                queue.append(linked_ref)
    return included


def _apply_scope(
    docs: dict[str, DocMeta],
    repo_root: Path,
    scope_paths: list[str],
    scope_refs: list[str],
    scope_since_version: tuple[int, int, int] | None,
) -> dict[str, DocMeta]:
    allowed_refs = set(docs)
    if scope_paths:
        allowed_refs &= _scope_by_paths(docs, repo_root, scope_paths)
    if scope_refs:
        allowed_refs &= _scope_by_refs(docs, set(scope_refs))
    if scope_since_version is not None:
        allowed_refs &= {
            ref
            for ref, doc in docs.items()
            if doc.from_version is not None and doc.from_version >= scope_since_version
        }
    return {ref: doc for ref, doc in docs.items() if ref in allowed_refs}


def _linked_items_for_request(request: DocMeta, docs: dict[str, DocMeta]) -> list[DocMeta]:
    refs = _extract_refs(request.text, DOC_KIND_OBJECTS["backlog"].prefix)
    return [docs[ref] for ref in sorted(refs) if ref in docs and docs[ref].kind.kind == "backlog"]


def _linked_tasks_for_item(item: DocMeta, docs: dict[str, DocMeta]) -> list[DocMeta]:
    linked: list[DocMeta] = []
    for doc in docs.values():
        if doc.kind.kind != "task":
            continue
        if item.ref in doc.text:
            linked.append(doc)
    return linked


def _linked_requests_for_item(item: DocMeta, docs: dict[str, DocMeta]) -> list[DocMeta]:
    refs = _extract_refs(item.text, DOC_KIND_OBJECTS["request"].prefix)
    return [docs[ref] for ref in sorted(refs) if ref in docs and docs[ref].kind.kind == "request"]


def _last_modified_age_days(path: Path) -> float:
    return (time.time() - path.stat().st_mtime) / 86400.0


def _is_strict_scope(doc: DocMeta, cutoff: tuple[int, int, int] | None) -> bool:
    if cutoff is None:
        return True
    if doc.from_version is None:
        return False
    return doc.from_version >= cutoff


def _has_legacy_ac_with_proof(text: str, ac_id: str) -> bool:
    return (ac_id.upper() in text.upper()) and ("proof:" in text.lower())


def _doc_has_ac_with_proof(doc: DocMeta, ac_id: str) -> bool:
    if doc.from_version is not None and doc.from_version < STRICT_AC_PROOF_FROM_VERSION:
        return _has_legacy_ac_with_proof(doc.text, ac_id)
    return _has_ac_with_proof(doc.text, ac_id)


def _ac_traceability_issue(code: str, request: DocMeta, ac_id: str, level: str, *, deferred: bool) -> AuditIssue:
    """Build an AC traceability finding that is lifecycle-aware.

    Proof (test results) cannot exist before the work is done, so while no
    linked task is Done the finding is surfaced as a non-blocking, deferred
    warning. Once a linked task is Done (or at closeout, which enforces proof
    via its own preflight) the same gap is genuinely blocking.
    """
    request_ref = request.path.stem
    repair = f'python3 -m logics_manager flow validate {request_ref} --apply-fixes --proof "<evidence>"'
    if deferred:
        return AuditIssue(
            code=code,
            path=request.path,
            message=(
                f"`{ac_id}` {level}-level traceability proof is deferred — expected at task "
                f"closeout; no linked task is Done yet (supply proof then)"
            ),
            severity="warning",
            repair_command=repair,
        )
    return AuditIssue(
        code=code,
        path=request.path,
        message=f"`{ac_id}` missing {level}-level traceability with proof",
        severity="blocking",
        repair_command=repair,
    )


def _upsert_indicator(lines: list[str], key: str, value: str) -> None:
    pattern = re.compile(rf"^\s*>\s*{re.escape(key)}\s*:\s*(.+)\s*$")
    heading_idx = next((idx for idx, line in enumerate(lines) if line.startswith("## ")), None)
    if heading_idx is None:
        return
    for idx, line in enumerate(lines):
        if pattern.match(line):
            lines[idx] = f"> {key}: {value}"
            return
    insert_at = heading_idx + 1
    while insert_at < len(lines) and lines[insert_at].lstrip().startswith(">"):
        insert_at += 1
    lines.insert(insert_at, f"> {key}: {value}")


def _insert_section(lines: list[str], heading: str, body: list[str]) -> None:
    bounds = _extract_section_bounds(lines, heading)
    if bounds is not None:
        start_idx, end_idx = bounds
        lines[start_idx:end_idx] = [f"# {heading}", *body]
        return
    lines.append("")
    lines.extend([f"# {heading}", *body])


