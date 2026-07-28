from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from .cli_output import render_payload
from .config import find_repo_root
from .doc_parsing import priority_rank
from .sync import _load_workflow_docs

OPEN_DONE_STATUSES = {"done", "closed", "archived", "obsolete", "accepted", "validated"}


def _open_docs(repo_root: Path) -> list[dict[str, str]]:
    docs = _load_workflow_docs(repo_root)
    rows: list[dict[str, str]] = []
    for doc in docs.values():
        if doc.kind not in {"request", "backlog", "task"}:
            continue
        status = (doc.indicators.get("Status") or "").strip()
        if status.lower() in OPEN_DONE_STATUSES:
            continue
        priority = doc.indicators.get("Priority") or "Medium"
        if priority not in {"High", "Medium"}:
            continue
        rows.append({"ref": doc.ref, "kind": doc.kind, "title": doc.title, "status": status, "priority": priority, "path": doc.path})
    return sorted(rows, key=lambda row: (priority_rank(row["priority"]), row["ref"]))


def _roadmap_files(repo_root: Path) -> list[Path]:
    return sorted((repo_root / "logics" / "roadmap").glob("road_*.md"))


def roadmap_status_payload(repo_root: Path) -> dict[str, object]:
    roadmaps = _roadmap_files(repo_root)
    roadmap_text = "\n".join(path.read_text(encoding="utf-8") for path in roadmaps)
    open_docs = _open_docs(repo_root)
    unplaced = [row for row in open_docs if row["ref"] not in roadmap_text]
    return {
        "ok": True,
        "state": "ok",
        "roadmaps": [{"path": str(path.relative_to(repo_root)), "ref": path.stem} for path in roadmaps],
        "open_high_medium": open_docs,
        "unplaced": unplaced,
        "message": f"{len(unplaced)} open High/Medium workflow docs are not mentioned in roadmap files.",
    }


def _resolve_roadmap(repo_root: Path, raw: str | None) -> Path:
    roadmaps = _roadmap_files(repo_root)
    if raw:
        candidate = repo_root / raw if "/" in raw or raw.endswith(".md") else repo_root / "logics" / "roadmap" / f"{raw}.md"
        if not candidate.is_file():
            raise SystemExit(f"Roadmap not found: {raw}")
        return candidate
    if not roadmaps:
        raise SystemExit("No roadmap file found under logics/roadmap.")
    return roadmaps[0]


def roadmap_place_payload(repo_root: Path, ref: str, milestone: str, *, roadmap: str | None = None, dry_run: bool = False) -> dict[str, object]:
    docs = _load_workflow_docs(repo_root)
    if ref not in docs:
        raise SystemExit(f"Unknown workflow ref: {ref}")
    path = _resolve_roadmap(repo_root, roadmap)
    text = path.read_text(encoding="utf-8")
    if re.search(rf"\b{re.escape(ref)}\b", text):
        return {"ok": True, "state": "unchanged", "path": str(path.relative_to(repo_root)), "ref": ref, "message": f"{ref} is already in {path.name}."}
    line = f"- `{ref}`: {docs[ref].title}"
    pattern = re.compile(rf"(^##+\s+{re.escape(milestone)}\s*$)", re.MULTILINE)
    match = pattern.search(text)
    next_text = f"{text.rstrip()}\n\n## {milestone}\n\n{line}\n" if not match else text[: match.end()] + "\n\n" + line + text[match.end():]
    if not dry_run:
        path.write_text(next_text, encoding="utf-8")
    return {"ok": True, "state": "planned" if dry_run else "updated", "path": str(path.relative_to(repo_root)), "ref": ref, "milestone": milestone, "line": line}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="logics-manager roadmap")
    sub = parser.add_subparsers(dest="command", required=True)
    status = sub.add_parser("status")
    status.add_argument("--format", choices=("text", "json"), default="text")
    place = sub.add_parser("place")
    place.add_argument("ref")
    place.add_argument("--milestone", required=True)
    place.add_argument("--roadmap")
    place.add_argument("--dry-run", action="store_true")
    place.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args(argv)
    repo_root = find_repo_root(Path.cwd())
    if args.command == "status":
        payload = roadmap_status_payload(repo_root)
        if args.format == "json":
            print(render_payload(payload, "json"))
        else:
            print(payload["message"])
            for row in payload["unplaced"][:20]:
                print(f"- {row['ref']} [{row['priority']}] {row['title']}")
        return 0
    payload = roadmap_place_payload(repo_root, args.ref, args.milestone, roadmap=args.roadmap, dry_run=args.dry_run)
    print(render_payload(payload, args.format))
    return 0
