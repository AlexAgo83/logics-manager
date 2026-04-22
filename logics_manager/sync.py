from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from logics_flow_support_workflow_core import DOC_KINDS, _find_repo_root, refresh_workflow_mermaid_signature_file  # noqa: E402
from logics_flow_support_workflow_extra import _close_doc, _collect_docs_linking_ref, _is_doc_done  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager sync",
        description="Synchronize workflow closure transitions.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    close_eligible = sub.add_parser(
        "close-eligible-requests",
        help="Auto-close requests when all linked backlog items are done.",
    )
    close_eligible.add_argument("--format", choices=("text", "json"), default="text")
    close_eligible.add_argument("--dry-run", action="store_true")
    close_eligible.set_defaults(func=cmd_close_eligible_requests)

    refresh_mermaid = sub.add_parser(
        "refresh-mermaid-signatures",
        help="Refresh stale workflow Mermaid signatures without rewriting the full diagram body.",
    )
    refresh_mermaid.add_argument("--format", choices=("text", "json"), default="text")
    refresh_mermaid.add_argument("--dry-run", action="store_true")
    refresh_mermaid.set_defaults(func=cmd_refresh_mermaid_signatures)

    schema_status = sub.add_parser(
        "schema-status",
        help="Report schema-version coverage for workflow docs.",
    )
    schema_status.add_argument("sources", nargs="*", help="Optional workflow refs or paths to scope the scan.")
    schema_status.add_argument("--format", choices=("text", "json"), default="text")
    schema_status.set_defaults(func=cmd_schema_status)

    return parser


def _close_eligible_requests(repo_root: Path, dry_run: bool) -> tuple[int, int]:
    request_dir = repo_root / DOC_KINDS["request"].directory
    closed = 0
    scanned = 0
    for request_path in sorted(request_dir.glob("req_*.md")):
        scanned += 1
        if _is_doc_done(request_path, DOC_KINDS["request"]):
            continue
        request_ref = request_path.stem
        linked_items = _collect_docs_linking_ref(repo_root, DOC_KINDS["backlog"], request_ref)
        if not linked_items:
            continue
        if all(_is_doc_done(item_path, DOC_KINDS["backlog"]) for item_path in linked_items):
            _close_doc(request_path, DOC_KINDS["request"], dry_run)
            print(f"Auto-closed request {request_ref} (all linked backlog items are done).")
            closed += 1
    return scanned, closed


def _schema_status(repo_root: Path, targets: list[str]) -> dict[str, object]:
    if targets:
        docs: list[Path] = []
        seen: set[Path] = set()
        for target in targets:
            candidate = Path(target)
            if not candidate.is_absolute():
                candidate = (repo_root / target).resolve()
            if candidate.is_file():
                if candidate not in seen:
                    docs.append(candidate)
                    seen.add(candidate)
                continue
            ref_match = re.search(r"\b(?:req|item|task)_\d{3}_[a-z0-9_]+\b", target)
            if ref_match:
                ref = ref_match.group(0)
                for kind in ("request", "backlog", "task"):
                    path = repo_root / DOC_KINDS[kind].directory / f"{ref}.md"
                    if path.is_file() and path not in seen:
                        docs.append(path)
                        seen.add(path)
    else:
        docs = []
        for kind in ("request", "backlog", "task"):
            docs.extend(sorted((repo_root / DOC_KINDS[kind].directory).glob("*.md")))

    counts: dict[str, int] = {}
    missing: list[str] = []
    outdated: list[str] = []
    for path in docs:
        text = path.read_text(encoding="utf-8")
        match = re.search(r"^\s*>\s*Schema version:\s*(.+?)\s*$", text, flags=re.MULTILINE)
        schema_version = match.group(1) if match else ""
        if not schema_version:
            missing.append(path.relative_to(repo_root).as_posix())
            schema_version = "(missing)"
        counts[schema_version] = counts.get(schema_version, 0) + 1
        if schema_version not in {"(missing)", "1.0"}:
            outdated.append(path.relative_to(repo_root).as_posix())

    return {
        "current_schema_version": "1.0",
        "counts": dict(sorted(counts.items())),
        "missing": missing,
        "outdated": outdated,
        "doc_count": len(docs),
    }


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
        directory = repo_root / DOC_KINDS[kind].directory
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


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    payload = args.func(args)
    return 0 if isinstance(payload, dict) else 1
