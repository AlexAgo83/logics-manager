from __future__ import annotations

import argparse
import json
import os
import re
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .config import find_repo_root
from .lint import expected_workflow_mermaid_signature
from .path_utils import resolve_repo_output_path
from .release import release_context_pack_payload
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
    "adr": {"directory": "logics/architecture", "kind": "architecture"},
}
INDICATOR_TARGET_KINDS = {
    **DOC_KINDS,
    "product": {"directory": "logics/product", "prefix": "prod"},
    "architecture": {"directory": "logics/architecture", "prefix": "adr"},
    "spec": {"directory": "logics/specs", "prefix": ("spec", "req")},
}

_find_repo_root = find_repo_root

REF_PREFIXES = ("req", "item", "task", "prod", "adr", "spec")
_CONTEXT_PACK_CACHE: dict[str, dict[str, object]] = {}
MERMAID_BLOCK_PATTERN = re.compile(r"```mermaid\s*\n(.*?)\n```", re.DOTALL)
MERMAID_SIGNATURE_PATTERN = re.compile(r"^\s*%%\s*logics-signature:\s*(.+?)\s*$", re.MULTILINE)
APPROVED_WORKFLOW_INDICATORS = ("Status", "Progress", "Understanding", "Confidence", "Theme", "Complexity")
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


def _indicator_value(lines: list[str], key: str) -> str | None:
    pattern = re.compile(rf"^\s*>\s*{re.escape(key)}\s*:\s*(.+?)\s*$")
    for line in lines:
        match = pattern.match(line)
        if match:
            return match.group(1).strip()
    return None


def _section_lines(lines: list[str], heading: str) -> list[str]:
    target = heading.strip().lower()
    start_idx = None
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


def _extract_refs(text: str, prefix: str) -> list[str]:
    pattern = re.compile(rf"\b{re.escape(prefix)}_\d+_[a-z0-9_]+\b")
    return sorted({match.group(0) for match in pattern.finditer(text)})


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
    for kind, spec in DOC_KINDS.items():
        if f"/{spec['directory']}/" in f"/{normalized}":
            return kind
    return "unknown"


def parse_workflow_doc(path: Path, *, repo_root: Path | None = None) -> WorkflowDocModel:
    text = _read_text(repo_root or path.parent.parent.parent, path)
    lines = text.splitlines()
    sections = _extract_sections(text)
    indicators = {key: value for key in ("From version", "Schema version", "Status", "Understanding", "Confidence", "Progress", "Complexity", "Theme", "Date", "Drivers", "Related request", "Related backlog", "Related task", "Reminder") if (value := _indicator_value(lines, key)) is not None}
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


def _load_workflow_docs(repo_root: Path) -> dict[str, WorkflowDocModel]:
    docs: dict[str, WorkflowDocModel] = {}
    for kind in DOC_KINDS.values():
        directory = repo_root / kind["directory"]
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob(f"{kind['prefix']}_*.md")):
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
    return {"tiny": 2, "normal": 4, "deep": 8}[profile]


def _git_changed_paths(repo_root: Path) -> list[str]:
    try:
        diff_result = __import__("subprocess").run(
            ["git", "diff", "--name-only", "--relative=."],
            cwd=repo_root,
            stdout=__import__("subprocess").PIPE,
            stderr=__import__("subprocess").PIPE,
            text=True,
            check=False,
        )
        staged_result = __import__("subprocess").run(
            ["git", "diff", "--cached", "--name-only", "--relative=."],
            cwd=repo_root,
            stdout=__import__("subprocess").PIPE,
            stderr=__import__("subprocess").PIPE,
            text=True,
            check=False,
        )
        untracked_result = __import__("subprocess").run(
            ["git", "ls-files", "--others", "--exclude-standard"],
            cwd=repo_root,
            stdout=__import__("subprocess").PIPE,
            stderr=__import__("subprocess").PIPE,
            text=True,
            check=False,
        )
    except OSError:
        return []
    if diff_result.returncode != 0:
        return []
    changed = [line.strip() for line in diff_result.stdout.splitlines() if line.strip()]
    if staged_result.returncode == 0:
        changed.extend(line.strip() for line in staged_result.stdout.splitlines() if line.strip())
    if untracked_result.returncode == 0:
        changed.extend(line.strip() for line in untracked_result.stdout.splitlines() if line.strip())
    return sorted(dict.fromkeys(changed))


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
        for prefix in ("prod", "adr"):
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
    handoff: bool,
) -> str:
    payload = {
        "repo_root": str(repo_root.resolve()),
        "seed_ref": seed_ref,
        "mode": mode,
        "profile": profile,
        "changed_paths": changed_paths,
        "release": release_context,
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
    cache_key = _context_pack_cache_key(
        repo_root,
        seed_ref,
        mode=mode,
        profile=profile,
        changed_paths=changed_paths,
        ordered_docs=ordered,
        release_context=release_context,
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


