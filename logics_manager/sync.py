from __future__ import annotations

import argparse
import json
import re
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .config import find_repo_root
from .lint import expected_workflow_mermaid_signature


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

_find_repo_root = find_repo_root

REF_PREFIXES = ("req", "item", "task", "prod", "adr", "spec")
_CONTEXT_PACK_CACHE: dict[str, dict[str, object]] = {}
MERMAID_BLOCK_PATTERN = re.compile(r"```mermaid\s*\n(.*?)\n```", re.DOTALL)
MERMAID_SIGNATURE_PATTERN = re.compile(r"^\s*%%\s*logics-signature:\s*(.+?)\s*$", re.MULTILINE)


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _read_lines(path: Path) -> list[str]:
    return _read_text(path).splitlines()


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
    pattern = re.compile(rf"\b{re.escape(prefix)}_\d{{3}}_[a-z0-9_]+\b")
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
    text = _read_text(path)
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
        result = __import__("subprocess").run(
            ["git", "diff", "--name-only", "--relative=."],
            cwd=repo_root,
            stdout=__import__("subprocess").PIPE,
            stderr=__import__("subprocess").PIPE,
            text=True,
            check=False,
        )
    except OSError:
        return []
    if result.returncode != 0:
        return []
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


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


def _context_pack_cache_key(
    repo_root: Path,
    seed_ref: str,
    *,
    mode: str,
    profile: str,
    changed_paths: list[str],
    ordered_docs: list[WorkflowDocModel],
) -> str:
    payload = {
        "repo_root": str(repo_root.resolve()),
        "seed_ref": seed_ref,
        "mode": mode,
        "profile": profile,
        "changed_paths": changed_paths,
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
) -> dict[str, object]:
    docs = _load_workflow_docs(repo_root)
    seed = docs.get(seed_ref)
    if seed is None:
        raise SystemExit(f"Unknown workflow ref `{seed_ref}`.")
    ordered = _workflow_neighborhood(seed, docs)[: _context_profile_limit(profile)]
    changed_paths = _git_changed_paths(repo_root) if mode == "diff-first" else []
    cache_key = _context_pack_cache_key(
        repo_root,
        seed_ref,
        mode=mode,
        profile=profile,
        changed_paths=changed_paths,
        ordered_docs=ordered,
    )
    cached_pack = _CONTEXT_PACK_CACHE.get(cache_key)
    if isinstance(cached_pack, dict):
        return deepcopy(cached_pack)
    pack_docs = [_context_pack_doc_entry(doc, mode) for doc in ordered]
    payload = {
        "ref": seed_ref,
        "mode": mode,
        "profile": profile,
        "budgets": {"max_docs": _context_profile_limit(profile)},
        "changed_paths": changed_paths,
        "docs": pack_docs,
        "estimates": {
            "doc_count": len(pack_docs),
            "char_count": sum(len(json.dumps(entry, sort_keys=True)) for entry in pack_docs),
        },
    }
    _CONTEXT_PACK_CACHE[cache_key] = deepcopy(payload)
    return payload


def _resolve_target_docs(repo_root: Path, sources: list[str]) -> list[tuple[str, Path]]:
    if not sources:
        targets: list[tuple[str, Path]] = []
        for kind_name, kind in DOC_KINDS.items():
            directory = repo_root / kind["directory"]
            if not directory.is_dir():
                continue
            for path in sorted(directory.glob(f"{kind['prefix']}_*.md")):
                targets.append((kind_name, path))
        return targets

    resolved: list[tuple[str, Path]] = []
    for source in sources:
        candidate = (repo_root / source).resolve()
        if candidate.is_file():
            for kind_name, kind in DOC_KINDS.items():
                if candidate.parent == (repo_root / kind["directory"]).resolve():
                    resolved.append((kind_name, candidate))
                    break
            continue
        for kind_name, kind in DOC_KINDS.items():
            path = repo_root / kind["directory"] / f"{source}.md"
            if path.is_file():
                resolved.append((kind_name, path))
                break
        else:
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
        if ref in _read_text(path):
            linked.append(path)
    return linked


def _is_doc_done(path: Path, kind: str) -> bool:
    lines = _read_lines(path)
    status_value = _indicator_value(lines, "Status")
    if status_value is not None and " ".join(status_value.split()).lower() in {"done", "archived"}:
        return True
    if kind in {"backlog", "task"}:
        progress_value = _indicator_value(lines, "Progress")
        if progress_value is not None and progress_value.strip() == "100%":
            return True
    return False


def _close_doc(path: Path, kind: str, dry_run: bool) -> None:
    if dry_run:
        return
    lines = _read_lines(path)
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
    original = _read_text(path)
    refreshed, changed = _refresh_workflow_mermaid_signature_text(original, kind, repo_root=repo_root, dry_run=dry_run)
    if not changed:
        return False
    if not dry_run:
        path.write_text(refreshed.rstrip() + "\n", encoding="utf-8")
    return True


def _close_eligible_requests(repo_root: Path, dry_run: bool) -> tuple[int, int]:
    request_dir = repo_root / DOC_KINDS["request"]["directory"]
    closed = 0
    scanned = 0
    for request_path in sorted(request_dir.glob("req_*.md")):
        scanned += 1
        if _is_doc_done(request_path, "request"):
            continue
        request_ref = request_path.stem
        linked_items = _collect_docs_linking_ref(repo_root, "backlog", request_ref)
        if not linked_items:
            continue
        if all(_is_doc_done(item_path, "backlog") for item_path in linked_items):
            _close_doc(request_path, "request", dry_run)
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
    refresh_mermaid.add_argument("--format", choices=("text", "json"), default="text")
    refresh_mermaid.add_argument("--dry-run", action="store_true")
    refresh_mermaid.set_defaults(func=cmd_refresh_mermaid_signatures)

    schema_status = sub.add_parser("schema-status", help="Report schema-version coverage for workflow docs.")
    schema_status.add_argument("sources", nargs="*", help="Optional workflow refs or paths to scope the scan.")
    schema_status.add_argument("--format", choices=("text", "json"), default="text")
    schema_status.set_defaults(func=cmd_schema_status)

    context_pack = sub.add_parser("context-pack", help="Build a compact context pack from workflow docs.")
    context_pack.add_argument("ref", help="Seed workflow ref for the context pack.")
    context_pack.add_argument("--mode", choices=("summary-only", "diff-first", "full"), default="summary-only")
    context_pack.add_argument("--profile", choices=("tiny", "normal", "deep"), default="normal")
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


def cmd_close_eligible_requests(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    scanned, closed = _close_eligible_requests(repo_root, args.dry_run)
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
    for kind in ("request", "backlog", "task"):
        directory = repo_root / DOC_KINDS[kind]["directory"]
        for path in sorted(directory.glob("*.md")):
            if refresh_workflow_mermaid_signature_file(path, kind, args.dry_run, repo_root=repo_root):
                modified.append(path.relative_to(repo_root).as_posix())

    payload = {
        "command": "sync",
        "kind": "refresh-mermaid-signatures",
        "repo_root": repo_root.as_posix(),
        "modified_files": modified,
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
    payload = _schema_status(repo_root, args.sources)
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Schema status: {payload['doc_count']} workflow doc(s) scanned.")
        for version, count in payload["counts"].items():
            print(f"- {version}: {count}")
    return {"command": "sync", "kind": "schema-status", "repo_root": repo_root.as_posix(), **payload}


def cmd_context_pack(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = _build_context_pack(repo_root, args.ref, mode=args.mode, profile=args.profile, config=None)
    if args.out:
        out_path = (repo_root / args.out).resolve()
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        if not args.dry_run:
            out_path.write_text(serialized, encoding="utf-8")
        print(f"Wrote {out_path.relative_to(repo_root)}")
        payload["output_path"] = out_path.relative_to(repo_root).as_posix()
    else:
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Context pack: {payload['ref']} ({payload['mode']}, {payload['profile']})")
            print(f"- docs: {payload['estimates']['doc_count']}")
    return {"command": "sync", "kind": "context-pack", "repo_root": repo_root.as_posix(), **payload}


def cmd_export_graph(args: argparse.Namespace) -> dict[str, object]:
    repo_root = _find_repo_root(Path.cwd())
    payload = _graph_payload(repo_root, config=None)
    payload["repo_root"] = repo_root.as_posix()
    if args.out:
        out_path = (repo_root / args.out).resolve()
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        if not args.dry_run:
            out_path.write_text(serialized, encoding="utf-8")
        print(f"Wrote {out_path.relative_to(repo_root)}")
        payload["output_path"] = out_path.relative_to(repo_root).as_posix()
    else:
        if args.format == "json":
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(f"Graph: {len(payload['nodes'])} node(s), {len(payload['edges'])} edge(s).")
    return {"command": "sync", "kind": "export-graph", "repo_root": repo_root.as_posix(), **payload}


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    payload = args.func(args)
    return 0 if isinstance(payload, dict) else 1
