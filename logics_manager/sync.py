from __future__ import annotations

import argparse
import json
import os
import re
from copy import deepcopy
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from .config import find_repo_root
from .doc_parsing import age_in_days, extract_refs, git_changed_paths, git_last_change_times, indicator_value, last_change_time, priority_tier
from .help_flags import flag_lines, subparser_for
from .lint import REVIEWED_INDICATOR, expected_workflow_mermaid_signature
from .statuses import canonical_status, transition_error
from .path_utils import canonical_workflow_path, resolve_repo_output_path
from .release import release_context_pack_payload
from .i18n import i18n_plan_payload
from .termstyle import colorize_help


@dataclass(frozen=True)
class WorkflowDocModel:
    kind: str
    path: str
    ref: str
    title: str
    indicators: dict[str, str]
    sections: dict[str, list[str]]
    refs: dict[str, list[str]]
    ai_context: dict[str, str]
    schema_version: str


DOC_KINDS = {
    "request": {"directory": "logics/request", "prefix": "req"},
    "backlog": {"directory": "logics/backlog", "prefix": "item"},
    "task": {"directory": "logics/tasks", "prefix": "task"},
}
COMPANION_KINDS = {
    "prod": {"directory": "logics/product", "kind": "product"},
    "road": {"directory": "logics/roadmap", "kind": "roadmap"},
    "adr": {"directory": "logics/architecture", "kind": "architecture"},
    "run": {"directory": "logics/runbook", "kind": "runbook"},
}
INDICATOR_TARGET_KINDS = {
    **DOC_KINDS,
    "product": {"directory": "logics/product", "prefix": "prod"},
    "roadmap": {"directory": "logics/roadmap", "prefix": "road"},
    "architecture": {"directory": "logics/architecture", "prefix": "adr"},
    "spec": {"directory": "logics/specs", "prefix": ("spec", "req")},
    "runbook": {"directory": "logics/runbook", "prefix": "run"},
}

_find_repo_root = find_repo_root

REF_PREFIXES = ("req", "item", "task", "prod", "road", "adr", "spec", "run")
_CONTEXT_PACK_CACHE: dict[str, dict[str, object]] = {}
MERMAID_BLOCK_PATTERN = re.compile(r"```mermaid\s*\n(.*?)\n```", re.DOTALL)
MERMAID_SIGNATURE_PATTERN = re.compile(r"^\s*%%\s*logics-signature:\s*(.+?)\s*$", re.MULTILINE)
APPROVED_WORKFLOW_INDICATORS = ("Status", "Progress", "Understanding", "Confidence", "Theme", "Complexity", "Category", "Verified")
# Link indicators are mutable too: without them, attaching an existing document to a
# chain has no supported path and `companion_doc_missing_primary_link` has no remedy.
RELATED_WORKFLOW_INDICATORS = ("Related request", "Related backlog", "Related task", "Related product", "Related architecture")
MUTABLE_WORKFLOW_INDICATORS = (*APPROVED_WORKFLOW_INDICATORS, *RELATED_WORKFLOW_INDICATORS)


def approved_indicators_for_kind(kind: str) -> tuple[str, ...]:
    """Indicators this document kind accepts, derived from the linter's declaration.

    The mutation path used to validate against one global tuple while `lint.KINDS`
    declared them per kind, so the indicator gate could recommend a flag the target
    kind rejects. Both now read the same source.
    """
    from .lint import KINDS as _LINT_KINDS

    spec = _LINT_KINDS.get(kind)
    if spec is None:
        return MUTABLE_WORKFLOW_INDICATORS
    declared = set(spec.mutable_indicators)
    if not spec.requires_progress:
        declared.discard("Progress")
    return tuple(key for key in MUTABLE_WORKFLOW_INDICATORS if key in declared)
SEEDED_SECTION_PLACEHOLDERS = {"- (no validation recorded yet)", "- Not started."}
MAX_MUTATION_TEXT_CHARS = 2000
OPEN_STATUS_EXCLUSIONS = {"accepted", "archived", "closed", "done", "obsolete", "settled", "superseded", "validated"}


def _read_text(repo_root: Path, path: Path) -> str:
    root = os.path.realpath(repo_root)
    absolute_name = os.path.realpath(path)
    try:
        common = os.path.commonpath([root, absolute_name])
    except ValueError as exc:
        raise SystemExit(f"Unsupported workflow doc path `{path}`.") from exc
    if common != root:
        raise SystemExit(f"Unsupported workflow doc path `{path}`.")
    absolute = Path(absolute_name)
    approved_dirs = {Path(os.path.realpath(repo_root / str(kind["directory"]))) for kind in INDICATOR_TARGET_KINDS.values()}
    if absolute.parent not in approved_dirs:
        raise SystemExit(f"Unsupported workflow doc path `{path}`.")
    return absolute.read_text(encoding="utf-8")


def _read_repo_bounded_text(repo_root: Path, path: Path, *, approved_dirs: set[Path], label: str) -> str:
    root = os.path.realpath(repo_root)
    absolute_name = os.path.realpath(path)
    try:
        common = os.path.commonpath([root, absolute_name])
    except ValueError as exc:
        raise SystemExit(f"Unsupported {label} path `{path}`.") from exc
    if common != root:
        raise SystemExit(f"Unsupported {label} path `{path}`.")
    absolute = Path(absolute_name)
    if absolute.parent not in approved_dirs:
        raise SystemExit(f"Unsupported {label} path `{path}`.")
    return absolute.read_text(encoding="utf-8")


def _read_lines(repo_root: Path, path: Path) -> list[str]:
    return _read_text(repo_root, path).splitlines()


def _is_relative_path(path: Path) -> bool:
    return not path.is_absolute() and ".." not in path.parts


_indicator_value = indicator_value
_extract_refs = extract_refs


def _strip_mermaid_blocks(text: str) -> str:
    return MERMAID_BLOCK_PATTERN.sub("", text)


def _extract_title(lines: list[str]) -> str:
    for line in lines:
        if line.startswith("## "):
            payload = line.removeprefix("## ").strip()
            if " - " in payload:
                return payload.split(" - ", 1)[1].strip()
            return payload
    return ""


def _extract_ai_context(sections: dict[str, list[str]]) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in sections.get("AI Context", []):
        match = re.match(r"^\s*-\s*([^:]+)\s*:\s*(.+?)\s*$", line.strip())
        if match:
            fields[match.group(1).strip().lower()] = match.group(2).strip()
    return fields


def _extract_sections(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in text.splitlines():
        if line.startswith("# "):
            current = line[2:].strip()
            sections.setdefault(current, [])
            continue
        if current is not None:
            sections[current].append(line)
    return sections


def _detect_workflow_kind(path: Path) -> str:
    normalized = path.as_posix()
    for kind, spec in INDICATOR_TARGET_KINDS.items():
        if f"/{spec['directory']}/" in f"/{normalized}":
            return kind
    return "unknown"


def parse_workflow_doc(path: Path, *, repo_root: Path | None = None) -> WorkflowDocModel:
    text = _read_text(repo_root or path.parent.parent.parent, path)
    lines = text.splitlines()
    sections = _extract_sections(text)
    indicators = {key: value for key in ("From version", "Schema version", "Status", "Understanding", "Confidence", "Progress", "Complexity", "Theme", "Date", "Drivers", "Related request", "Related backlog", "Related task", "Reminder", "Category", "Verified") if (value := _indicator_value(lines, key)) is not None}
    indicators["Priority"] = priority_tier(lines)
    return WorkflowDocModel(
        kind=_detect_workflow_kind(path),
        path=(path.relative_to(repo_root).as_posix() if repo_root is not None else path.as_posix()),
        ref=path.stem,
        title=_extract_title(lines) or path.stem,
        indicators=indicators,
        sections=sections,
        refs={prefix: _extract_refs(_strip_mermaid_blocks(text), prefix) for prefix in REF_PREFIXES},
        ai_context=_extract_ai_context(sections),
        schema_version=indicators.get("Schema version", "1.0"),
    )


def _load_workflow_docs(repo_root: Path, *, only_kinds: tuple[str, ...] | None = None) -> dict[str, WorkflowDocModel]:
    # ponytail: `only_kinds` is a directory filter, not a cache. Parsing all ~1700 docs to
    # return 2 runbooks cost the viewer 8s per /api/runbooks call; skipping the directories
    # the caller already filtered out afterwards is the whole fix. Add caching only if a
    # caller that genuinely needs every kind becomes the slow one.
    docs: dict[str, WorkflowDocModel] = {}
    for name, kind in INDICATOR_TARGET_KINDS.items():
        if only_kinds is not None and name not in only_kinds:
            continue
        directory = repo_root / kind["directory"]
        if not directory.is_dir():
            continue
        for prefix in _prefixes(kind):
            for path in sorted(directory.glob(f"{prefix}_*.md")):
                doc = parse_workflow_doc(path, repo_root=repo_root)
                docs[doc.ref] = doc
    return docs


def _workflow_neighborhood(seed: WorkflowDocModel, docs: dict[str, WorkflowDocModel]) -> list[WorkflowDocModel]:
    ordered: list[WorkflowDocModel] = [seed]
    seen = {seed.ref}
    linked_refs = []
    for values in seed.refs.values():
        linked_refs.extend(values)
    for ref in linked_refs:
        candidate = docs.get(ref)
        if candidate is None or candidate.ref in seen:
            continue
        ordered.append(candidate)
        seen.add(candidate.ref)
    for candidate in docs.values():
        if candidate.ref in seen:
            continue
        if seed.ref in sum(candidate.refs.values(), []):
            ordered.append(candidate)
            seen.add(candidate.ref)
    return ordered


def _context_profile_limit(profile: str) -> int:
    # req_286/item_522: a clear error instead of a bare KeyError when an unknown
    # profile reaches here (scaffold pre-flight validation catches it first).
    limits = {"tiny": 2, "normal": 4, "deep": 8}
    if profile not in limits:
        raise ValueError(f"Unknown context profile {profile!r}; expected one of {', '.join(limits)}.")
    return limits[profile]


def _git_changed_paths(repo_root: Path) -> list[str]:
    return git_changed_paths(repo_root, include_staged=True, include_untracked=True, dedupe=True)


def _context_pack_doc_entry(doc: WorkflowDocModel, mode: str) -> dict[str, object]:
    entry = {
        "ref": doc.ref,
        "kind": doc.kind,
        "path": doc.path,
        "title": doc.title,
        "status": doc.indicators.get("Status", ""),
        "schema_version": doc.schema_version,
        "ai_context": doc.ai_context,
        "linked_refs": {prefix: refs for prefix, refs in doc.refs.items() if refs},
    }
    if mode == "summary-only":
        return entry
    section_names = {
        "request": ["Needs", "Acceptance criteria"],
        "backlog": ["Problem", "Acceptance criteria"],
        "task": ["Context", "Validation"],
        "roadmap": ["Summary", "Milestones", "Sequencing", "Risks"],
        "runbook": ["Trigger", "Prerequisites", "Procedure", "Verification"],
    }.get(doc.kind, [])
    entry["sections"] = {heading: [line for line in doc.sections.get(heading, []) if line.strip()][:6] for heading in section_names}
    return entry


def _companion_doc_entry(repo_root: Path, ref: str, *, mode: str) -> dict[str, object] | None:
    prefix = ref.split("_", 1)[0]
    spec = COMPANION_KINDS.get(prefix)
    if spec is None:
        return None
    path = repo_root / str(spec["directory"]) / f"{ref}.md"
    if not path.is_file():
        return None
    approved_dirs = {Path(os.path.realpath(repo_root / str(item["directory"]))) for item in COMPANION_KINDS.values()}
    text = _read_repo_bounded_text(repo_root, path, approved_dirs=approved_dirs, label="companion doc")
    lines = text.splitlines()
    sections = _extract_sections(text)
    entry: dict[str, object] = {
        "ref": ref,
        "kind": spec["kind"],
        "path": path.relative_to(repo_root).as_posix(),
        "title": _extract_title(lines) or ref,
        "status": _indicator_value(lines, "Status") or "",
        "linked_refs": {prefix_name: _extract_refs(_strip_mermaid_blocks(text), prefix_name) for prefix_name in REF_PREFIXES if _extract_refs(_strip_mermaid_blocks(text), prefix_name)},
    }
    if mode != "summary-only":
        entry["sections"] = {
            heading: [line for line in sections.get(heading, []) if line.strip()][:6]
            for heading in ("Overview", "Goals", "Key product decisions", "References")
            if sections.get(heading)
        }
    return entry


def _context_pack_companion_entries(repo_root: Path, docs: list[WorkflowDocModel], *, mode: str) -> list[dict[str, object]]:
    refs: list[str] = []
    seen: set[str] = set()
    for doc in docs:
        for prefix in ("prod", "road", "adr"):
            for ref in doc.refs.get(prefix, []):
                if ref in seen:
                    continue
                seen.add(ref)
                refs.append(ref)
    entries: list[dict[str, object]] = []
    for ref in refs:
        entry = _companion_doc_entry(repo_root, ref, mode=mode)
        if entry is not None:
            entries.append(entry)
    return entries


def _context_pack_validation_summary(docs: list[WorkflowDocModel]) -> list[dict[str, object]]:
    summary: list[dict[str, object]] = []
    for doc in docs:
        if doc.kind != "task":
            continue
        lines = [line for line in doc.sections.get("Validation", []) if line.strip()][:8]
        if lines:
            summary.append({"ref": doc.ref, "path": doc.path, "items": lines})
    return summary


def _context_pack_cache_key(
    repo_root: Path,
    seed_ref: str,
    *,
    mode: str,
    profile: str,
    changed_paths: list[str],
    ordered_docs: list[WorkflowDocModel],
    release_context: dict[str, object],
    i18n_context: dict[str, object],
    handoff: bool,
) -> str:
    payload = {
        "repo_root": str(repo_root.resolve()),
        "seed_ref": seed_ref,
        "mode": mode,
        "profile": profile,
        "changed_paths": changed_paths,
        "release": release_context,
        "i18n": i18n_context,
        "handoff": handoff,
        "docs": [
            {
                "ref": doc.ref,
                "kind": doc.kind,
                "path": doc.path,
                "schema_version": doc.schema_version,
                "status": doc.indicators.get("Status", ""),
                "linked_refs": {prefix: refs for prefix, refs in doc.refs.items() if refs},
            }
            for doc in ordered_docs
        ],
    }
    return __import__("hashlib").sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def _build_context_pack(
    repo_root: Path,
    seed_ref: str,
    *,
    mode: str,
    profile: str,
    config: dict[str, object] | None = None,
    handoff: bool = False,
) -> dict[str, object]:
    seed_refs = [ref for ref in seed_ref.split(",") if ref]
    docs = _load_workflow_docs(repo_root)
    seeds = [docs.get(ref) for ref in seed_refs]
    missing = [ref for ref, doc in zip(seed_refs, seeds) if doc is None]
    if missing:
        raise SystemExit(f"Unknown workflow ref(s): {', '.join(f'`{ref}`' for ref in missing)}.")
    ordered: list[WorkflowDocModel] = []
    seen: set[str] = set()
    per_seed_limit = _context_profile_limit(profile)
    for seed in seeds:
        if seed is None:
            continue
        for doc in _workflow_neighborhood(seed, docs)[:per_seed_limit]:
            if doc.ref in seen:
                continue
            ordered.append(doc)
            seen.add(doc.ref)
    changed_paths = _git_changed_paths(repo_root) if mode == "diff-first" else []
    release_context = release_context_pack_payload(repo_root)
    i18n_context = i18n_plan_payload(repo_root)
    cache_key = _context_pack_cache_key(
        repo_root,
        seed_ref,
        mode=mode,
        profile=profile,
        changed_paths=changed_paths,
        ordered_docs=ordered,
        release_context=release_context,
        i18n_context=i18n_context,
        handoff=handoff,
    )
    cached_pack = _CONTEXT_PACK_CACHE.get(cache_key)
    if isinstance(cached_pack, dict):
        return deepcopy(cached_pack)
    pack_docs = [_context_pack_doc_entry(doc, mode) for doc in ordered]
    companion_docs = _context_pack_companion_entries(repo_root, ordered, mode=mode) if handoff else []
    validation_summary = _context_pack_validation_summary(ordered) if handoff else []
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    payload = {
        "ref": seed_ref,
        "mode": mode,
        "profile": profile,
        "refs": seed_refs,
        "generated_at": generated_at,
        "command": "logics-manager sync context-pack "
        + " ".join(seed_refs)
        + f" --mode {mode} --profile {profile}"
        + (" --handoff" if handoff else ""),
        "budgets": {"max_docs": per_seed_limit * max(1, len(seed_refs)), "max_docs_per_ref": per_seed_limit},
        "changed_paths": changed_paths,
        "release": release_context,
        "i18n": i18n_context,
        "handoff": {
            "enabled": handoff,
            "source_refs": seed_refs,
            "companion_doc_count": len(companion_docs),
            "validation_summary_count": len(validation_summary),
        },
        "docs": pack_docs,
        "companion_docs": companion_docs,
        "validation_summary": validation_summary,
        "estimates": {
            "doc_count": len(pack_docs),
            "companion_doc_count": len(companion_docs),
            "char_count": sum(len(json.dumps(entry, sort_keys=True)) for entry in [*pack_docs, *companion_docs]),
        },
    }
    _CONTEXT_PACK_CACHE[cache_key] = deepcopy(payload)
    return payload


def _prefixes(kind: dict[str, object]) -> tuple[str, ...]:
    prefix = kind["prefix"]
    if isinstance(prefix, tuple):
        return tuple(str(item) for item in prefix)
    return (str(prefix),)


def _resolve_target_docs(repo_root: Path, sources: list[str], *, kinds: dict[str, dict[str, object]] | None = None) -> list[tuple[str, Path]]:
    search_kinds = kinds or DOC_KINDS
    candidates: dict[str, tuple[str, Path]] = {}
    if not sources:
        targets: list[tuple[str, Path]] = []
        for kind_name, kind in search_kinds.items():
            directory = repo_root / str(kind["directory"])
            if not directory.is_dir():
                continue
            for prefix in _prefixes(kind):
                for path in sorted(directory.glob(f"{prefix}_*.md")):
                    targets.append((kind_name, path))
        return targets

    for kind_name, kind in search_kinds.items():
        directory = repo_root / str(kind["directory"])
        if not directory.is_dir():
            continue
        for prefix in _prefixes(kind):
            for path in sorted(directory.glob(f"{prefix}_*.md")):
                candidates[path.relative_to(repo_root).as_posix()] = (kind_name, path)
                candidates[path.stem] = (kind_name, path)

    resolved: list[tuple[str, Path]] = []
    for source in sources:
        # req_335: `logics/task/...` and `logics/tasks/...` name the same file.
        source = canonical_workflow_path(source)
        raw_source = Path(source)
        if not _is_relative_path(raw_source):
            raise SystemExit(f"Unsupported workflow doc target `{source}`.")
        normalized = raw_source.as_posix()
        target = candidates.get(normalized) or candidates.get(Path(source).stem if "/" not in normalized else "")
        if target is not None:
            resolved.append(target)
            continue
        raise SystemExit(f"Could not resolve workflow doc target `{source}`.")
    return resolved


def _schema_status(repo_root: Path, targets: list[str]) -> dict[str, object]:
    docs = [parse_workflow_doc(path, repo_root=repo_root) for _kind, path in _resolve_target_docs(repo_root, targets)]
    counts: dict[str, int] = {}
    outdated: list[str] = []
    missing: list[str] = []
    for doc in docs:
        schema_version = doc.indicators.get("Schema version", "")
        if not schema_version:
            missing.append(doc.path)
            schema_version = "(missing)"
        counts[schema_version] = counts.get(schema_version, 0) + 1
        if schema_version not in {"(missing)", "1.0"}:
            outdated.append(doc.path)
    return {
        "current_schema_version": "1.0",
        "counts": dict(sorted(counts.items())),
        "missing": missing,
        "outdated": outdated,
        "doc_count": len(docs),
    }


def backfill_schema_versions(repo_root: Path, targets: list[str], *, dry_run: bool = False) -> list[str]:
    """Write `> Schema version: 1.0` into workflow docs that predate the indicator.

    item_675: 23% of this corpus was written before schema versioning existed, so
    `doctor` failed on the project's own documents. Every one of them is at 1.0 by
    definition -- the indicator records which parser shape the doc follows, and there
    has only ever been one. This lives beside `schema-status` because the command that
    reports the gap is the one an operator reaches for to close it, and any repository
    adopting Logics after the fact meets the same gap on day one.

    The indicator goes directly under `> Status:` when there is one, so backfilled docs
    read like generated ones; otherwise it goes after the heading.
    """
    written: list[str] = []
    for _kind, path in _resolve_target_docs(repo_root, targets):
        lines = path.read_text(encoding="utf-8").splitlines()
        if any(line.strip().startswith("> Schema version:") for line in lines):
            continue
        insert_at = next(
            (index + 1 for index, line in enumerate(lines) if line.strip().startswith("> Status:")),
            next((index + 1 for index, line in enumerate(lines) if line.startswith("## ")), 0),
        )
        if not dry_run:
            lines.insert(insert_at, "> Schema version: 1.0")
            path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        written.append(path.relative_to(repo_root).as_posix())
    return written


def build_context_pack_payload(repo_root: Path, ref: str, *, mode: str = "summary-only", profile: str = "normal", config: dict[str, object] | None = None, handoff: bool = False) -> dict[str, object]:
    return _build_context_pack(repo_root, ref, mode=mode, profile=profile, config=config, handoff=handoff)


def _default_section_names(kind: str) -> list[str]:
    return {
        "request": ["Needs", "Context", "Acceptance criteria", "Backlog", "Tasks", "AI Context"],
        "backlog": ["Problem", "Scope", "Acceptance criteria", "AC Traceability", "Tasks", "AI Context"],
        "task": ["Definition of Done (DoD)", "Backlog", "Acceptance criteria", "Validation", "Report", "AI Context"],
        "roadmap": ["Summary", "Milestones", "Sequencing", "Risks", "References", "AI Context"],
        "runbook": ["Trigger", "Prerequisites", "Procedure", "Verification", "Rollback", "References"],
    }.get(kind, ["AI Context"])


def read_logics_doc_payload(repo_root: Path, source: str, *, max_chars: int = 4000, sections: list[str] | None = None) -> dict[str, object]:
    targets = _resolve_target_docs(repo_root, [source], kinds=INDICATOR_TARGET_KINDS)
    if len(targets) != 1:
        raise SystemExit(f"Expected one workflow doc target for `{source}`.")
    kind, path = targets[0]
    doc = parse_workflow_doc(path, repo_root=repo_root)
    requested_sections = sections or _default_section_names(kind)
    selected_sections = {
        heading: [line for line in doc.sections.get(heading, []) if line.strip()]
        for heading in requested_sections
        if heading in doc.sections
    }
    text = _read_text(repo_root, path)
    return {
        "ref": doc.ref,
        "kind": doc.kind,
        "path": doc.path,
        "title": doc.title,
        "status": doc.indicators.get("Status", ""),
        "indicators": doc.indicators,
        "linked_refs": {prefix: refs for prefix, refs in doc.refs.items() if refs},
        **_doc_age_fields(repo_root, doc.path),
        "sections": selected_sections,
        "content": text[:max_chars],
        "truncated": len(text) > max_chars,
        "max_chars": max_chars,
    }


def _doc_age_fields(repo_root: Path, path: str, times: dict[str, int] | None = None) -> dict[str, object]:
    """Last-change timestamp and age, so callers stop shelling out per document."""
    stamp = last_change_time(repo_root, path, times)
    return {
        "updated_at": stamp,
        "age_days": age_in_days(stamp),
    }


def list_logics_docs_payload(
    repo_root: Path,
    *,
    kind: str = "all",
    status: str | None = None,
    ref_prefix: str | None = None,
    limit: int = 50,
    recent: bool = False,
    open_only: bool = False,
    changed: bool = False,
) -> dict[str, object]:
    docs = sorted(_load_workflow_docs(repo_root, only_kinds=None if kind == "all" else (kind,)).values(), key=lambda doc: doc.path)
    changed_paths = set(_git_changed_paths(repo_root)) if changed else set()
    change_times = git_last_change_times(repo_root)
    if kind != "all":
        docs = [doc for doc in docs if doc.kind == kind]
    if status:
        expected_status = " ".join(status.split()).lower()
        docs = [doc for doc in docs if " ".join(doc.indicators.get("Status", "").split()).lower() == expected_status]
    if open_only:
        docs = [
            doc
            for doc in docs
            if " ".join(doc.indicators.get("Status", "").split()).lower() not in OPEN_STATUS_EXCLUSIONS
        ]
    if changed:
        docs = [doc for doc in docs if doc.path in changed_paths]
    if ref_prefix:
        docs = [doc for doc in docs if doc.ref.startswith(ref_prefix)]
    if recent:
        docs = sorted(docs, key=lambda doc: (-(repo_root / doc.path).stat().st_mtime, doc.path))
    limited = docs[:limit]
    return {
        "view": "changed" if changed else "open" if open_only else "recent" if recent else "all",
        "filters": {
            "kind": kind,
            "status": status,
            "ref_prefix": ref_prefix,
            "recent": recent,
            "open": open_only,
            "changed": changed,
        },
        "changed_paths": sorted(changed_paths),
        "items": [
            {
                "ref": doc.ref,
                "kind": doc.kind,
                "path": doc.path,
                "title": doc.title,
                "status": doc.indicators.get("Status", ""),
                "linked_refs": {prefix: refs for prefix, refs in doc.refs.items() if refs},
                **_doc_age_fields(repo_root, doc.path, change_times),
            }
            for doc in limited
        ],
        "total_count": len(docs),
        "returned_count": len(limited),
        "truncated": len(docs) > len(limited),
        "limit": limit,
    }


def _snippet_for_line(lines: list[str], index: int, *, max_chars: int) -> str:
    start = max(0, index - 1)
    end = min(len(lines), index + 2)
    snippet = "\n".join(line for line in lines[start:end] if line.strip())
    return snippet[:max_chars]


def search_logics_docs_payload(
    repo_root: Path,
    query: str,
    *,
    kind: str = "all",
    status: str | None = None,
    limit: int = 20,
    max_snippet_chars: int = 240,
) -> dict[str, object]:
    normalized_query = query.strip().lower()
    if not normalized_query:
        raise SystemExit("Search query is required.")
    docs_payload = list_logics_docs_payload(repo_root, kind=kind, status=status, limit=10000)
    docs_by_ref = _load_workflow_docs(repo_root)
    matches: list[dict[str, object]] = []
    truncated = False
    for item in docs_payload["items"]:
        ref = str(item["ref"])
        doc = docs_by_ref.get(ref)
        if doc is None:
            continue
        text = _strip_mermaid_blocks(_read_text(repo_root, repo_root / doc.path))
        lines = text.splitlines()
        for idx, line in enumerate(lines):
            if normalized_query in line.lower():
                matches.append(
                    {
                        "ref": doc.ref,
                        "kind": doc.kind,
                        "path": doc.path,
                        "title": doc.title,
                        "status": doc.indicators.get("Status", ""),
                        "line": idx + 1,
                        "snippet": _snippet_for_line(lines, idx, max_chars=max_snippet_chars),
                    }
                )
                if len(matches) > limit:
                    truncated = True
                    matches = matches[:limit]
                break
        if truncated:
            break
    return {
        "query": query,
        "matches": matches,
        "returned_count": len(matches),
        "truncated": truncated,
        "limit": limit,
    }


RUNBOOK_MATCH_LIMIT = 3


def match_runbooks_payload(repo_root: Path, query: str, *, limit: int = RUNBOOK_MATCH_LIMIT, include_hidden: bool = False) -> dict[str, object]:
    """Bounded, explainable runbook lookup (req_330/item_688).

    A thin wrapper over the same doc-loading `search_logics_docs_payload` uses:
    only Active runbooks are eligible, an exact match on the Category field or
    the Trigger section ranks above a path/ref match, which ranks above a
    plain text match anywhere in the doc. No bespoke scoring engine -- ranking
    is four fixed tiers, each carrying a human-readable reason.
    """
    normalized = " ".join(query.strip().lower().split())
    if not normalized:
        raise SystemExit("Match query is required.")
    docs_payload = list_logics_docs_payload(repo_root, kind="runbook", status=None if include_hidden else "Active", limit=10000)
    docs_by_ref = _load_workflow_docs(repo_root, only_kinds=("runbook",))
    scored: list[tuple[int, str, dict[str, object]]] = []
    for item in docs_payload["items"]:
        ref = str(item["ref"])
        doc = docs_by_ref.get(ref)
        if doc is None:
            continue
        category = (doc.indicators.get("Category") or "").strip().lower()
        trigger_lines = [line.strip("- ").lower() for line in doc.sections.get("Trigger", [])]
        text = _strip_mermaid_blocks(_read_text(repo_root, repo_root / doc.path)).lower()

        tier: int | None = None
        reason = ""
        if category and (normalized == category or normalized in category):
            tier, reason = 0, f"category matches `{category}`"
        elif normalized in ref.lower() or normalized in doc.path.lower():
            tier, reason = 1, "matches the runbook's ref or path"
        elif any(normalized in line for line in trigger_lines):
            tier, reason = 2, "matches this runbook's Trigger"
        elif normalized in text:
            tier, reason = 3, "matches the runbook's text"

        if tier is not None:
            scored.append(
                (
                    tier,
                    ref,
                    {
                        "ref": ref,
                        "kind": "runbook",
                        "path": doc.path,
                        "title": doc.title,
                        "category": doc.indicators.get("Category", ""),
                        "verified": doc.indicators.get("Verified", ""),
                        "reason": reason,
                    },
                )
            )

    scored.sort(key=lambda entry: (entry[0], entry[1]))
    matches = [entry[2] for entry in scored[:limit]]
    return {
        "query": query,
        "matches": matches,
        "returned_count": len(matches),
        "no_match": not matches,
        "limit": limit,
    }


def list_active_runbooks_payload(repo_root: Path, *, limit: int = 10, include_hidden: bool = False) -> dict[str, object]:
    """Recent Active runbooks for the viewer's landing view (req_330/item_689).

    Same category/verified shape as `match_runbooks_payload`'s results, so the
    client renders both lists with one card component. Not itself a match --
    `reason` is always "recent"; the empty case is a normal empty library, not
    a no-match search result.
    """
    listed = list_logics_docs_payload(repo_root, kind="runbook", status=None if include_hidden else "Active", limit=10000, recent=True)
    docs_by_ref = _load_workflow_docs(repo_root, only_kinds=("runbook",))
    items: list[dict[str, object]] = []
    for item in listed["items"][:limit]:
        doc = docs_by_ref.get(str(item["ref"]))
        if doc is None:
            continue
        items.append(
            {
                "ref": doc.ref,
                "kind": "runbook",
                "path": doc.path,
                "title": doc.title,
                "category": doc.indicators.get("Category", ""),
                "verified": doc.indicators.get("Verified", ""),
                "reason": "recent",
            }
        )
    return {"query": "", "matches": items, "returned_count": len(items), "no_match": not items, "limit": limit}


def _clean_mutation_text(text: str, *, field: str) -> str:
    cleaned = " ".join(text.split())
    if not cleaned:
        raise SystemExit(f"{field} is required.")
    if len(cleaned) > MAX_MUTATION_TEXT_CHARS:
        raise SystemExit(f"{field} exceeds {MAX_MUTATION_TEXT_CHARS} characters.")
    if cleaned.startswith("#") or "```" in cleaned:
        raise SystemExit(f"{field} contains unsupported Markdown structure.")
    return cleaned


def _formatted_indicator_value(lines: list[str], key: str, value: str) -> str:
    """Keep the document's existing notation so a corpus never mixes two forms.

    Templates write `> Understanding: 90%`; writing a bare number next to them left
    both spellings live in the same corpus and both rendered in INDEX.md.
    """
    current = _indicator_value(lines, key)
    if current and current.strip().endswith("%") and value.isdigit():
        return f"{value}%"
    return value


def _review_stamp(moment: datetime) -> str:
    return moment.isoformat(sep=" ", timespec="seconds")


def _replace_indicator(lines: list[str], key: str, value: str) -> tuple[list[str], bool]:
    rendered = f"> {key}: {value}"
    for idx, line in enumerate(lines):
        if line.startswith(f"> {key}:"):
            if line == rendered:
                return lines, False
            updated = list(lines)
            updated[idx] = rendered
            return updated, True
    insert_at = 1
    while insert_at < len(lines) and lines[insert_at].startswith("> "):
        insert_at += 1
    updated = list(lines)
    updated.insert(insert_at, rendered)
    return updated, True


def update_workflow_indicators_payload(
    repo_root: Path,
    source: str,
    indicators: dict[str, str],
    *,
    dry_run: bool = False,
    touch: bool = False,
) -> dict[str, object]:
    unknown = sorted(set(indicators) - set(MUTABLE_WORKFLOW_INDICATORS))
    if unknown:
        raise SystemExit(f"Unsupported workflow indicator(s): {', '.join(unknown)}.")
    cleaned = {key: _clean_mutation_text(value, field=key) for key, value in indicators.items() if value is not None}
    if not cleaned and not touch:
        raise SystemExit("At least one workflow indicator is required, or pass --touch to re-baseline without changing values.")

    targets = _resolve_target_docs(repo_root, [source], kinds=INDICATOR_TARGET_KINDS)
    if len(targets) != 1:
        raise SystemExit(f"Expected one workflow doc target for `{source}`.")
    kind, path = targets[0]
    allowed = approved_indicators_for_kind(kind)
    rejected = sorted(set(cleaned) - set(allowed))
    if rejected:
        raise SystemExit(
            f"{', '.join(rejected)} not accepted for {kind} documents "
            f"(accepted: {', '.join(allowed) or 'none'})."
        )
    lines = _read_lines(repo_root, path)
    if "Status" in cleaned:
        previous_status = _indicator_value(lines, "Status")
        cleaned["Status"] = canonical_status(kind, cleaned["Status"])
        error = transition_error(kind, previous_status, cleaned["Status"])
        if error:
            raise SystemExit(error)
    changed = False
    for key in MUTABLE_WORKFLOW_INDICATORS:
        if key not in cleaned:
            continue
        lines, key_changed = _replace_indicator(lines, key, _formatted_indicator_value(lines, key, cleaned[key]))
        changed = changed or key_changed
    if touch:
        # Stamping the review moment is a true statement, and it gives the indicator
        # gate a diff to see without inventing movement in the values themselves.
        # Second precision, and never the value already on the line: a day-precision
        # stamp made the second reviewed edit of the same day write back what was
        # already there, so the gate saw no change and the remediation the gate itself
        # recommends could not clear it. One second is enough to separate two edits;
        # the retry covers two re-baselines landing inside the same second.
        moment = datetime.now().replace(microsecond=0)
        for offset in range(2):
            lines, stamped = _replace_indicator(
                lines, REVIEWED_INDICATOR, _review_stamp(moment + timedelta(seconds=offset))
            )
            if stamped:
                break
    write = changed or touch
    if write and not dry_run:
        path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
        if kind in DOC_KINDS:
            refresh_workflow_mermaid_signature_file(path, kind, dry_run=False, repo_root=repo_root)
    return {
        "path": path.relative_to(repo_root).as_posix(),
        "ref": path.stem,
        "kind": kind,
        "approved_indicators": list(allowed),
        "updated_indicators": cleaned,
        "changed": changed,
        "touched": bool(touch),
        "dry_run": dry_run,
    }


def _section_for_note(kind: str, note_kind: str) -> str:
    if note_kind == "report":
        if kind != "task":
            raise SystemExit("Report entries are only supported for task documents.")
        return "Report"
    if note_kind == "validation":
        return "Validation"
    if note_kind == "decision":
        return "Decision framing" if kind == "backlog" else "Notes"
    raise SystemExit(f"Unsupported note kind `{note_kind}`.")


def append_workflow_note_payload(repo_root: Path, source: str, *, note_kind: str, text: str, dry_run: bool = False) -> dict[str, object]:
    targets = _resolve_target_docs(repo_root, [source])
    if len(targets) != 1:
        raise SystemExit(f"Expected one workflow doc target for `{source}`.")
    kind, path = targets[0]
    section = _section_for_note(kind, note_kind)
    cleaned = _clean_mutation_text(text, field="text")
    bullet = f"- {cleaned}"
    lines = _read_lines(repo_root, path)
    insert_at = None
    section_start = None
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == section.lower():
            section_start = idx + 1
            insert_at = section_start
            while insert_at < len(lines) and lines[insert_at].strip().startswith("- "):
                insert_at += 1
            break
    changed = True
    if insert_at is None or section_start is None:
        lines.extend(["", f"# {section}", bullet])
    else:
        existing = {line.strip() for line in lines[section_start:insert_at] if line.strip().startswith("- ")}
        if bullet in existing:
            changed = False
        else:
            lines.insert(insert_at, bullet)
            # Drop the scaffold's seeded placeholder once real content arrives, so a
            # section never shows "nothing recorded" next to what was just recorded.
            for idx in range(insert_at - 1, section_start - 1, -1):
                if lines[idx].strip() in SEEDED_SECTION_PLACEHOLDERS:
                    del lines[idx]
    mermaid_signature_refreshed = False
    if changed and not dry_run:
        path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
        mermaid_signature_refreshed = refresh_workflow_mermaid_signature_file(path, kind, dry_run=False, repo_root=repo_root)
    return {
        "path": path.relative_to(repo_root).as_posix(),
        "ref": path.stem,
        "kind": kind,
        "section": section,
        "text": cleaned,
        "changed": changed,
        "mermaid_signature_refreshed": mermaid_signature_refreshed,
        "dry_run": dry_run,
    }


def _graph_payload(repo_root: Path, *, config: dict[str, object] | None = None) -> dict[str, object]:
    docs = _load_workflow_docs(repo_root)
    nodes = []
    edges = []
    for doc in docs.values():
        nodes.append(
            {
                "ref": doc.ref,
                "kind": doc.kind,
                "title": doc.title,
                "path": doc.path,
                "status": doc.indicators.get("Status", ""),
            }
        )
        for refs in doc.refs.values():
            for ref in refs:
                if ref in docs:
                    edges.append({"from": doc.ref, "to": ref})
    return {"nodes": nodes, "edges": edges}


def _collect_docs_linking_ref(repo_root: Path, kind: str, ref: str) -> list[Path]:
    directory = repo_root / DOC_KINDS[kind]["directory"]
    linked: list[Path] = []
    for path in sorted(directory.glob("*.md")):
        if ref in _read_text(repo_root, path):
            linked.append(path)
    return linked


def _is_doc_done(repo_root: Path, path: Path, kind: str) -> bool:
    lines = _read_lines(repo_root, path)
    status_value = _indicator_value(lines, "Status")
    if status_value is not None and " ".join(status_value.split()).lower() in {"done", "archived"}:
        return True
    if kind in {"backlog", "task"}:
        progress_value = _indicator_value(lines, "Progress")
        if progress_value is not None and progress_value.strip() == "100%":
            return True
    return False


def _close_doc(repo_root: Path, path: Path, kind: str, dry_run: bool) -> None:
    if dry_run:
        return
    lines = _read_lines(repo_root, path)
    updated = []
    saw_status = False
    saw_progress = False
    for line in lines:
        if line.startswith("> Status:"):
            updated.append("> Status: Done")
            saw_status = True
        elif kind in {"backlog", "task"} and line.startswith("> Progress:"):
            updated.append("> Progress: 100%")
            saw_progress = True
        else:
            updated.append(line)
    if not saw_status:
        updated.insert(1, "> Status: Done")
    if kind in {"backlog", "task"} and not saw_progress:
        insert_at = 2 if saw_status else 3
        updated.insert(insert_at, "> Progress: 100%")
    path.write_text("\n".join(updated).rstrip() + "\n", encoding="utf-8")


def _refresh_workflow_mermaid_signature_text(text: str, kind: str, *, repo_root: Path | None = None, dry_run: bool = False) -> tuple[str, bool]:
    match = MERMAID_BLOCK_PATTERN.search(text)
    if match is None:
        return text, False
    lines = text.splitlines()
    title = _extract_title(lines)
    if not title:
        return text, False
    expected_signature = expected_workflow_mermaid_signature(kind, lines)
    if not expected_signature:
        return text, False
    block = match.group(1)
    signature_match = MERMAID_SIGNATURE_PATTERN.search(block)
    if signature_match is None:
        return text, False
    current = signature_match.group(1).strip()
    if current == expected_signature:
        return text, False
    refreshed_block = MERMAID_SIGNATURE_PATTERN.sub(f"%% logics-signature: {expected_signature}", block, count=1)
    refreshed_text = text[: match.start()] + "```mermaid\n" + refreshed_block + "\n```" + text[match.end() :]
    return refreshed_text, True


def refresh_workflow_mermaid_signature_file(path: Path, kind: str, dry_run: bool, *, repo_root: Path | None = None) -> bool:
    original = _read_text(repo_root or path.parent.parent.parent, path)
    refreshed, changed = _refresh_workflow_mermaid_signature_text(original, kind, repo_root=repo_root, dry_run=dry_run)
    if not changed:
        return False
    if not dry_run:
        path.write_text(refreshed.rstrip() + "\n", encoding="utf-8")
    return True


def _close_eligible_requests(repo_root: Path, dry_run: bool, *, quiet: bool = False) -> tuple[int, int]:
    request_dir = repo_root / DOC_KINDS["request"]["directory"]
    closed = 0
    scanned = 0
    for request_path in sorted(request_dir.glob("req_*.md")):
        scanned += 1
        if _is_doc_done(repo_root, request_path, "request"):
            continue
        request_ref = request_path.stem
        linked_items = _collect_docs_linking_ref(repo_root, "backlog", request_ref)
        if not linked_items:
            continue
        if all(_is_doc_done(repo_root, item_path, "backlog") for item_path in linked_items):
            _close_doc(repo_root, request_path, "request", dry_run)
            if not quiet:
                print(f"Auto-closed request {request_ref} (all linked backlog items are done).")
            closed += 1
    return scanned, closed


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager sync",
        description="Synchronize workflow closure transitions.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    close_eligible = sub.add_parser("close-eligible-requests", help="Auto-close requests when all linked backlog items are done.")
    close_eligible.add_argument("--format", choices=("text", "json"), default="text")
    close_eligible.add_argument("--dry-run", action="store_true")
    close_eligible.set_defaults(func=cmd_close_eligible_requests)

    refresh_mermaid = sub.add_parser("refresh-mermaid-signatures", help="Refresh stale workflow Mermaid signatures without rewriting the full diagram body.")
    refresh_mermaid.add_argument("sources", nargs="*", help="Optional workflow refs or paths to scope the refresh.")
    refresh_mermaid.add_argument("--changed-only", action="store_true", help="Refresh only changed workflow docs.")
    refresh_mermaid.add_argument("--format", choices=("text", "json"), default="text")
    refresh_mermaid.add_argument("--dry-run", action="store_true")
    refresh_mermaid.set_defaults(func=cmd_refresh_mermaid_signatures)

    schema_status = sub.add_parser("schema-status", help="Report schema-version coverage for workflow docs.")
    schema_status.add_argument("sources", nargs="*", help="Optional workflow refs or paths to scope the scan.")
    schema_status.add_argument("--format", choices=("text", "json"), default="text")
    schema_status.add_argument("--apply", action="store_true", help="Write the missing `> Schema version: 1.0` indicator into the docs that lack it.")
    schema_status.add_argument("--dry-run", action="store_true", help="With --apply, list what would be written without writing it.")
    schema_status.set_defaults(func=cmd_schema_status)

    read_doc = sub.add_parser("read-doc", help="Read a bounded workflow document payload by ref or path.")
    read_doc.add_argument("source", help="Workflow ref or repo-relative path.")
    read_doc.add_argument("--max-chars", type=int, default=4000)
    read_doc.add_argument("--section", action="append", default=[], help="Section heading to include; repeatable.")
    read_doc.add_argument("--format", choices=("text", "json"), default="text")
    read_doc.set_defaults(func=cmd_read_doc)

    list_docs = sub.add_parser("list-docs", help="List workflow docs by bounded criteria.")
    list_docs.add_argument("--kind", choices=("all", "request", "backlog", "task", "product", "roadmap", "architecture", "spec", "runbook"), default="all")
    list_docs.add_argument("--status", default=None)
    list_docs.add_argument("--ref-prefix", default=None)
    list_docs.add_argument("--limit", type=int, default=50)
    list_docs.add_argument("--recent", action="store_true", help="Sort by newest filesystem modification time first.")
    list_docs.add_argument("--open", action="store_true", dest="open_only", help="Only include workflow docs that are not terminal/closed.")
    list_docs.add_argument("--changed", action="store_true", help="Only include workflow docs changed in git, including untracked files.")
    list_docs.add_argument("--format", choices=("text", "json"), default="text")
    list_docs.set_defaults(func=cmd_list_docs)

    search_docs = sub.add_parser("search-docs", help="Search approved workflow docs with bounded snippets.")
    search_docs.add_argument("query")
    search_docs.add_argument("--kind", choices=("all", "request", "backlog", "task", "product", "roadmap", "architecture", "spec", "runbook"), default="all")
    search_docs.add_argument("--status", default=None)
    search_docs.add_argument("--limit", type=int, default=20)
    search_docs.add_argument("--max-snippet-chars", type=int, default=240)
    search_docs.add_argument("--format", choices=("text", "json"), default="text")
    search_docs.set_defaults(func=cmd_search_docs)

    match_runbooks = sub.add_parser(
        "match-runbooks", help="Find at most 3 relevant Active runbooks for an intent, symptom, path, or task context."
    )
    match_runbooks.add_argument("query")
    match_runbooks.add_argument("--limit", type=int, default=RUNBOOK_MATCH_LIMIT)
    match_runbooks.add_argument("--format", choices=("text", "json"), default="text")
    match_runbooks.set_defaults(func=cmd_match_runbooks)

    update_indicators = sub.add_parser("update-indicators", help="Update approved indicators on one workflow doc.")
    update_indicators.add_argument("source", help="Workflow ref or repo-relative path.")
    update_indicators.add_argument("--status")
    update_indicators.add_argument("--progress")
    update_indicators.add_argument("--understanding")
    update_indicators.add_argument("--confidence")
    update_indicators.add_argument("--theme")
    update_indicators.add_argument("--complexity")
    update_indicators.add_argument("--related-request")
    update_indicators.add_argument("--related-backlog")
    update_indicators.add_argument("--related-task")
    update_indicators.add_argument("--related-product")
    update_indicators.add_argument("--related-architecture")
    update_indicators.add_argument("--category")
    update_indicators.add_argument("--verified")
    update_indicators.add_argument(
        "--touch",
        action="store_true",
        help="Re-baseline after a body edit without changing any indicator value.",
    )
    update_indicators.add_argument("--format", choices=("text", "json"), default="text")
    update_indicators.add_argument("--dry-run", action="store_true")
    update_indicators.set_defaults(func=cmd_update_indicators)

    append_note = sub.add_parser("append-note", help="Append a bounded note to an approved workflow section.")
    append_note.add_argument("source", help="Workflow ref or repo-relative path.")
    append_note.add_argument("--section", choices=("report", "validation", "decision"), required=True)
    append_note.add_argument("--text", required=True)
    append_note.add_argument("--format", choices=("text", "json"), default="text")
    append_note.add_argument("--dry-run", action="store_true")
    append_note.set_defaults(func=cmd_append_note)

    context_pack = sub.add_parser("context-pack", help="Build a compact context pack from workflow docs.")
    context_pack.add_argument("refs", nargs="+", help="Seed workflow ref(s) for the context pack.")
    context_pack.add_argument("--mode", choices=("summary-only", "diff-first", "full"), default="summary-only")
    context_pack.add_argument("--profile", choices=("tiny", "normal", "deep"), default="normal")
    context_pack.add_argument("--handoff", action="store_true", help="Include implementation handoff metadata, companion docs, and validation summary.")
    context_pack.add_argument("--out", help="Write the JSON artifact to this relative path.")
    context_pack.add_argument("--format", choices=("text", "json"), default="text")
    context_pack.add_argument("--dry-run", action="store_true")
    context_pack.set_defaults(func=cmd_context_pack)

    export_graph = sub.add_parser("export-graph", help="Export workflow relationships as a machine-readable graph.")
    export_graph.add_argument("--out", help="Write the JSON graph to this relative path.")
    export_graph.add_argument("--format", choices=("text", "json"), default="text")
    export_graph.add_argument("--dry-run", action="store_true")
    export_graph.set_defaults(func=cmd_export_graph)

    return parser


def _build_help() -> str:
    return "\n".join(
        [
            "Logics Sync CLI",
            "Manage workflow transitions and exports.",
            "",
            "Usage:",
            "  logics-manager sync <command> [args...]",
            "",
            "Commands:",
            "  close-eligible-requests",
            "    Auto-close requests when all linked backlog items are done.",
            "    Flags: --format {text,json}, --dry-run",
            "",
            "  refresh-mermaid-signatures",
            "    Refresh stale Mermaid signatures without rewriting diagram bodies.",
            "    Args: [refs-or-paths...]",
            "    Flags: --changed-only, --format {text,json}, --dry-run",
            "",
            "  schema-status [sources...]",
            "    Report schema-version coverage for selected workflow docs.",
            "    Flags: --format {text,json}",
            "",
            "  context-pack <refs...>",
            "    Build a compact JSON context pack from workflow docs.",
            "    Flags: --mode {summary-only,diff-first,full}, --profile {tiny,normal,deep}, --out, --format {text,json}, --dry-run",
            "",
            "  read-doc <source>",
            "    Read a bounded workflow document payload by ref or path.",
            "    Flags: --max-chars, --section, --format {text,json}",
            "",
            "  list-docs",
            "    List workflow docs by bounded criteria.",
            "    Flags: --kind {all,request,backlog,task,product,roadmap,architecture,spec,runbook}, --status, --ref-prefix, --limit, --recent, --open, --changed, --format {text,json}",
            "",
            "  search-docs <query>",
            "    Search approved workflow docs with bounded snippets.",
            "    Flags: --kind {all,request,backlog,task,product,roadmap,architecture,spec,runbook}, --status, --limit, --max-snippet-chars, --format {text,json}",
            "",
            "  match-runbooks <query>",
            "    Find at most 3 relevant Active runbooks for an intent, symptom, path, or task context.",
            "    Flags: --limit, --format {text,json}",
            "",
            "  update-indicators <source>",
            "    Update approved indicators on one workflow doc.",
            "    Flags: --status, --progress, --understanding, --confidence, --theme, --complexity, --format {text,json}, --dry-run",
            "",
            "  append-note <source>",
            "    Append a bounded note to an approved workflow section.",
            "    Flags: --section {report,validation,decision}, --text, --format {text,json}, --dry-run",
            "",
            "  export-graph",
            "    Export workflow relationships as a machine-readable graph.",
            "    Flags: --out, --format {text,json}, --dry-run",
            "",
            "Examples:",
            "  logics-manager sync schema-status",
            "  logics-manager sync list-docs --open --recent --limit 10 --format json",
            "  logics-manager sync context-pack req_001_my_request task_002_fix_bug --handoff --out logics/context-pack.json",
            "  logics-manager sync export-graph --format json",
        ]
    )


def _flag_lines(command: str) -> list[str]:
    return flag_lines(subparser_for(build_parser(), [command]))


def _build_subcommand_help(command: str) -> str:
    if command == "close-eligible-requests":
        return "\n".join(
            [
                "Logics Sync Close Eligible Requests",
                "Auto-close requests when all linked backlog items are done.",
                "",
                "Usage:",
                "  logics-manager sync close-eligible-requests [args...]",
                "",
                "Flags:",
                *_flag_lines(command),
                "",
                "Example:",
                "  logics-manager sync close-eligible-requests --dry-run",
            ]
        )
    if command == "refresh-mermaid-signatures":
        return "\n".join(
            [
                "Logics Sync Refresh Mermaid Signatures",
                "Refresh stale workflow Mermaid signatures without rewriting diagram bodies.",
                "",
                "Usage:",
                "  logics-manager sync refresh-mermaid-signatures [refs-or-paths...] [args...]",
                "",
                "Flags:",
                *_flag_lines(command),
            ]
        )
    if command == "schema-status":
        return "\n".join(
            [
                "Logics Sync Schema Status",
                "Report schema-version coverage for workflow docs.",
                "",
                "Usage:",
                "  logics-manager sync schema-status [sources...]",
                "",
                "Flags:",
                *_flag_lines(command),
                "",
                "Example:",
                "  logics-manager sync schema-status logics/request",
            ]
        )
    if command == "context-pack":
        return "\n".join(
            [
                "Logics Sync Context Pack",
                "Build a compact JSON context pack from workflow docs.",
                "",
                "Usage:",
                "  logics-manager sync context-pack <refs...> [args...]",
                "",
                "Flags:",
                *_flag_lines(command),
                "",
                "Example:",
                "  logics-manager sync context-pack req_001_my_request task_002_fix_bug --out logics/context-pack.json",
            ]
        )
    if command == "read-doc":
        return "\n".join(
            [
                "Logics Sync Read Doc",
                "Read a bounded workflow document payload by ref or path.",
                "",
                "Usage:",
                "  logics-manager sync read-doc <source> [args...]",
                "",
                "Flags:",
                *_flag_lines(command),
            ]
        )
    if command == "list-docs":
        return "\n".join(
            [
                "Logics Sync List Docs",
                "List workflow docs by bounded criteria.",
                "",
                "Usage:",
                "  logics-manager sync list-docs [args...]",
                "",
                "Flags:",
                *_flag_lines(command),
                "",
                "Examples:",
                "  logics-manager sync list-docs --open --recent --limit 10",
                "  logics-manager sync list-docs --changed --format json",
            ]
        )
    if command == "search-docs":
        return "\n".join(
            [
                "Logics Sync Search Docs",
                "Search approved workflow docs with bounded snippets.",
                "",
                "Usage:",
                "  logics-manager sync search-docs <query> [args...]",
                "",
                "Flags:",
                *_flag_lines(command),
            ]
        )
    if command == "update-indicators":
        return "\n".join(
            [
                "Logics Sync Update Indicators",
                "Update approved indicators on one workflow doc.",
                "",
                "Usage:",
                "  logics-manager sync update-indicators <source> [args...]",
                "",
                "Flags:",
                *_flag_lines(command),
                "",
                "Status values:",
                "  request/backlog/task: Draft, Ready, In progress, Blocked, Done, Obsolete, Archived",
                "  aliases accepted: In Progress, in_progress, in progress",
                "",
                "Examples:",
                "  logics-manager sync update-indicators task_001_demo --status \"In progress\" --progress 25%",
                "  logics-manager sync update-indicators req_001_demo --confidence 90",
                "  Add `> Non-semantic edit:` when the doc change intentionally does not alter indicators.",
            ]
        )
    if command == "append-note":
        return "\n".join(
            [
                "Logics Sync Append Note",
                "Append a bounded note to an approved workflow section.",
                "",
                "Usage:",
                "  logics-manager sync append-note <source> --section <section> --text <text> [args...]",
                "",
                "Flags:",
                *_flag_lines(command),
            ]
        )
    if command == "export-graph":
        return "\n".join(
            [
                "Logics Sync Export Graph",
                "Export workflow relationships as a machine-readable graph.",
                "",
                "Usage:",
                "  logics-manager sync export-graph [args...]",
                "",
                "Flags:",
                *_flag_lines(command),
                "",
                "Example:",
                "  logics-manager sync export-graph --format json",
            ]
        )
    return _build_help()


def _print_help(text: str) -> None:
    print(colorize_help(text))


def cmd_close_eligible_requests(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    scanned, closed = _close_eligible_requests(repo_root, args.dry_run, quiet=args.format == "json")
    payload = {
        "command": "sync",
        "kind": "close-eligible-requests",
        "repo_root": repo_root.as_posix(),
        "scanned": scanned,
        "closed": closed,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Scanned {scanned} request(s); closed {closed}.")
    return payload


def cmd_refresh_mermaid_signatures(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    modified: list[str] = []
    if args.changed_only:
        changed_sources = [
            path
            for path in _git_changed_paths(repo_root)
            if path.startswith(("logics/request/", "logics/backlog/", "logics/tasks/")) and path.endswith(".md")
        ]
        targets = _resolve_target_docs(repo_root, changed_sources)
    else:
        targets = _resolve_target_docs(repo_root, args.sources)
    for kind, path in targets:
        if refresh_workflow_mermaid_signature_file(path, kind, args.dry_run, repo_root=repo_root):
            modified.append(path.relative_to(repo_root).as_posix())

    payload = {
        "command": "sync",
        "kind": "refresh-mermaid-signatures",
        "repo_root": repo_root.as_posix(),
        "modified_files": modified,
        "scanned_files": [path.relative_to(repo_root).as_posix() for _kind, path in targets],
        "changed_only": args.changed_only,
        "dry_run": args.dry_run,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        if args.dry_run:
            print(f"Dry run: {len(modified)} Mermaid signature update(s) would be applied.")
        else:
            print(f"Refreshed Mermaid signatures in {len(modified)} workflow doc(s).")
        for rel_path in modified:
            print(f"- {rel_path}")
    return payload


def cmd_schema_status(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    dry_run = bool(getattr(args, "dry_run", False))
    backfilled: list[str] = []
    if getattr(args, "apply", False):
        backfilled = backfill_schema_versions(repo_root, args.sources, dry_run=dry_run)
    payload = _schema_status(repo_root, args.sources)
    payload["backfilled"] = backfilled
    payload["dry_run"] = dry_run
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Schema status: {payload['doc_count']} workflow doc(s) scanned.")
        for version, count in payload["counts"].items():
            print(f"- {version}: {count}")
        if getattr(args, "apply", False):
            verb = "Would backfill" if dry_run else "Backfilled"
            print(f"{verb} `> Schema version: 1.0` in {len(backfilled)} doc(s).")
    return {"command": "sync", "kind": "schema-status", "repo_root": repo_root.as_posix(), **payload}


def _bounded_positive(value: int, *, default: int, maximum: int) -> int:
    if value <= 0:
        return default
    return min(value, maximum)


def cmd_read_doc(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = read_logics_doc_payload(repo_root, args.source, max_chars=_bounded_positive(args.max_chars, default=4000, maximum=12000), sections=args.section or None)
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"{payload['ref']} ({payload['kind']}): {payload['title']}")
        print(f"- path: {payload['path']}")
        print(f"- status: {payload['status']}")
        print(f"- truncated: {payload['truncated']}")
        print("")
        print(str(payload["content"]).rstrip())
    return {"command": "sync", "kind": "read-doc", "repo_root": repo_root.as_posix(), **payload}


def cmd_list_docs(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = list_logics_docs_payload(
        repo_root,
        kind=args.kind,
        status=args.status,
        ref_prefix=args.ref_prefix,
        limit=_bounded_positive(args.limit, default=50, maximum=200),
        recent=args.recent,
        open_only=args.open_only,
        changed=args.changed,
    )
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Workflow docs ({payload['view']}): {payload['returned_count']} returned of {payload['total_count']}")
        for item in payload["items"]:
            print(f"- {item['ref']} [{item['status']}]: {item['title']}")
    return {"command": "sync", "kind": "list-docs", "repo_root": repo_root.as_posix(), **payload}


def cmd_search_docs(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = search_logics_docs_payload(
        repo_root,
        args.query,
        kind=args.kind,
        status=args.status,
        limit=_bounded_positive(args.limit, default=20, maximum=100),
        max_snippet_chars=_bounded_positive(args.max_snippet_chars, default=240, maximum=1000),
    )
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Search `{payload['query']}`: {payload['returned_count']} match(es)")
        for match in payload["matches"]:
            print(f"- {match['ref']}:{match['line']} {match['title']}")
    return {"command": "sync", "kind": "search-docs", "repo_root": repo_root.as_posix(), **payload}


def cmd_match_runbooks(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = match_runbooks_payload(
        repo_root,
        args.query,
        limit=_bounded_positive(args.limit, default=RUNBOOK_MATCH_LIMIT, maximum=RUNBOOK_MATCH_LIMIT),
    )
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    elif payload["no_match"]:
        print(f"No Active runbook matched `{payload['query']}`.")
    else:
        print(f"Match `{payload['query']}`: {payload['returned_count']} runbook(s)")
        for match in payload["matches"]:
            print(f"- {match['ref']} [{match['category']}] {match['title']} -- {match['reason']}")
    return {"command": "sync", "kind": "match-runbooks", "repo_root": repo_root.as_posix(), **payload}


def cmd_update_indicators(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    indicators = {
        "Status": args.status,
        "Progress": args.progress,
        "Understanding": args.understanding,
        "Confidence": args.confidence,
        "Theme": args.theme,
        "Complexity": args.complexity,
        "Related request": args.related_request,
        "Related backlog": args.related_backlog,
        "Related task": args.related_task,
        "Related product": args.related_product,
        "Related architecture": args.related_architecture,
        "Category": args.category,
        "Verified": args.verified,
    }
    payload = update_workflow_indicators_payload(
        repo_root,
        args.source,
        {key: value for key, value in indicators.items() if value is not None},
        dry_run=args.dry_run,
        touch=args.touch,
    )
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    elif payload["touched"] and not payload["changed"]:
        print(f"Re-baselined {payload['path']} without changing any indicator value.")
    else:
        print(f"Updated indicators for {payload['path']} (changed: {payload['changed']}).")
    return {"command": "sync", "kind": "update-indicators", "repo_root": repo_root.as_posix(), **payload}


def cmd_append_note(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = append_workflow_note_payload(repo_root, args.source, note_kind=args.section, text=args.text, dry_run=args.dry_run)
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Appended {args.section} note to {payload['path']} (changed: {payload['changed']}).")
        if payload.get("mermaid_signature_refreshed"):
            print("- Mermaid signature refreshed.")
    return {"command": "sync", "kind": "append-note", "repo_root": repo_root.as_posix(), **payload}


def cmd_context_pack(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    profile = "deep" if args.handoff and args.profile == "normal" else args.profile
    payload = _build_context_pack(repo_root, ",".join(args.refs), mode=args.mode, profile=profile, config=None, handoff=args.handoff)
    if args.out:
        out_path, output_path = resolve_repo_output_path(repo_root, args.out)
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        payload["output_path"] = output_path
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Wrote {output_path}")
    else:
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Context pack: {', '.join(args.refs)} ({payload['mode']}, {payload['profile']})")
            print(f"- docs: {payload['estimates']['doc_count']}")
    return {"command": "sync", "kind": "context-pack", "repo_root": repo_root.as_posix(), **payload}


def cmd_export_graph(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = _graph_payload(repo_root, config=None)
    payload["repo_root"] = repo_root.as_posix()
    if args.out:
        out_path, output_path = resolve_repo_output_path(repo_root, args.out)
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        payload["output_path"] = output_path
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Wrote {output_path}")
    else:
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Graph: {len(payload['nodes'])} node(s), {len(payload['edges'])} edge(s).")
    return {"command": "sync", "kind": "export-graph", "repo_root": repo_root.as_posix(), **payload}


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        _print_help(_build_help())
        return 0
    if argv[0] in {"close-eligible-requests", "refresh-mermaid-signatures", "schema-status", "read-doc", "list-docs", "search-docs", "match-runbooks", "update-indicators", "append-note", "context-pack", "export-graph"} and len(argv) > 1 and argv[1] in ("-h", "--help"):
        _print_help(_build_subcommand_help(argv[0]))
        return 0
    parser = build_parser()
    args = parser.parse_args(argv)
    payload = args.func(args)
    return 0 if isinstance(payload, dict) else 1
