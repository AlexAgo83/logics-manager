"""Status and health across every Logics corpus under one directory.

There was no way to ask about more than one repository, so an external
orchestrator implemented corpus discovery twice and wrote its own aggregation
loop over the per-repository commands -- including the decision, made on its
own, that one repository's failure must not fail the whole report.

Discovery is a directory listing, deliberately: a maintained registry of
repositories is one more thing to keep in sync with reality.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from .cli_output import render_payload
from .config import ConfigError, holds_corpus
from .insights import health_payload, status_payload
from .sync import _load_workflow_docs
from .termstyle import colorize_help


HELP = """Logics Fleet CLI
Report status and health across every Logics corpus under a root directory.

Usage:
  logics-manager fleet status [--root DIR] [--limit N] [--format text|json]
  logics-manager fleet health [--root DIR] [--limit N] [--format text|json]
  logics-manager fleet roadmap [--root DIR] [--format text|json]

Flags:
  --root DIR   Directory whose immediate children are scanned. Defaults to the
               current directory.
  --limit N    Per-repository item limit, passed through to each report.
  --format     text (default) or json.

`roadmap` shows, for each repository with a roadmap, the first milestone whose
cited workflow docs are not all closed, and how many of them are.

Discovery is a directory listing: any immediate child containing a `logics/`
directory counts. A repository that fails is reported inline, and the remaining
repositories are still reported.
"""


def discover_corpora(root: Path) -> list[Path]:
    """Immediate children of `root` that hold a Logics corpus."""
    if not root.is_dir():
        return []
    found = [child for child in root.iterdir() if child.is_dir() and holds_corpus(child)]
    return sorted(found, key=lambda path: path.name)


_MILESTONE = re.compile(r"^## (?!(?:req|item|task|road)_\d)(.+?) - (.+)$")
_WORKFLOW_REF = re.compile(r"\b(?:req|item|task)_\d{3,}_[a-z0-9_]+")
_CLOSED = {"done", "closed", "archived", "obsolete"}


def roadmap_progress(repo_root: Path, *, limit: int = 10) -> dict[str, object]:
    """Where a repository stands on its roadmaps, from the docs each milestone cites.

    A milestone is a `## <version> - <title>` heading; it is done when every
    workflow doc it cites is closed. Counting docs rather than reading a
    "delivered" mark works whatever the roadmap's author wrote.
    """
    statuses = {doc.ref: (doc.indicators.get("Status") or "").strip().lower() for doc in _load_workflow_docs(repo_root).values()}
    roadmaps = []
    for path in sorted((repo_root / "logics" / "roadmap").glob("road_*.md")):
        milestones: list[dict[str, object]] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            match = _MILESTONE.match(line)
            if match:
                milestones.append({"version": match.group(1).strip(), "title": match.group(2).strip(), "refs": []})
            elif line.startswith("## "):
                milestones.append({"version": None, "title": None, "refs": []})
            elif milestones:
                milestones[-1]["refs"].extend(ref for ref in _WORKFLOW_REF.findall(line) if ref in statuses)
        milestones = [m for m in milestones if m["version"]]
        for milestone in milestones:
            refs = sorted(set(milestone.pop("refs")))
            milestone["total"] = len(refs)
            milestone["done"] = sum(statuses[ref] in _CLOSED for ref in refs)
        current = next((m for m in milestones if m["total"] and m["done"] < m["total"]), None)
        roadmaps.append({"ref": path.stem, "current": current, "milestones": milestones})
    return {"ok": True, "roadmaps": roadmaps}


def fleet_payload(root: Path, *, report: str = "status", limit: int = 10) -> dict[str, object]:
    builder = {"status": status_payload, "health": health_payload, "roadmap": roadmap_progress}[report]
    repositories: dict[str, object] = {}
    failed = 0
    for path in discover_corpora(root):
        try:
            repositories[path.name] = builder(path, limit=limit)
        except (ConfigError, OSError, ValueError) as exc:
            # inline, so one broken repository does not hide every other one
            repositories[path.name] = {"ok": False, "error": str(exc)}
            failed += 1
    return {
        "ok": failed == 0,
        "report": report,
        "root": str(root.resolve()),
        "repository_count": len(repositories),
        "failed_count": failed,
        "repositories": repositories,
    }


def _render_text(payload: dict[str, object]) -> str:
    repositories = payload["repositories"]
    lines = [f"Logics fleet {payload['report']}: {payload['repository_count']} repository(ies) under {payload['root']}"]
    if not repositories:
        lines.append("- no Logics corpus found")
        return "\n".join(lines)
    for name, entry in repositories.items():  # type: ignore[union-attr]
        if entry.get("error"):
            lines.append(f"- {name}: ERROR {entry['error']}")
            continue
        if payload["report"] == "roadmap":
            if not entry.get("roadmaps"):
                continue
            for roadmap in entry["roadmaps"]:
                current = roadmap["current"]
                where = (f"{current['version']} - {current['title']}: {current['done']}/{current['total']} done"
                         if current else "every cited milestone done")
                lines.append(f"- {name} ({roadmap['ref']}): {where}")
            continue
        if payload["report"] == "status":
            actions = entry.get("next_actions") or []
            lines.append(f"- {name}: {entry.get('open_count', 0)} open")
            lines.extend(f"    {action}" for action in actions)
        else:
            stale = entry.get("stale_doc_count") or 0
            suffix = f", {stale} stale" if stale else ""
            lines.append(
                f"- {name}: {entry.get('issue_count', 0)} issue signal(s){suffix}"
                f" across {entry.get('workflow_doc_count', 0)} workflow doc(s)"
            )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    argv = list(argv or [])
    if not argv or argv[0] in {"-h", "--help"}:
        print(colorize_help(HELP))
        return 0 if argv else 1
    if argv[0] not in {"status", "health", "roadmap"}:
        raise SystemExit("Usage: logics-manager fleet <status|health|roadmap> [args...]")

    parser = argparse.ArgumentParser(prog=f"logics-manager fleet {argv[0]}")
    parser.add_argument("--root", default=".")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parsed = parser.parse_args(argv[1:])

    root = Path(parsed.root).expanduser()
    if not root.is_dir():
        raise SystemExit(f"--root path does not exist or is not a directory: {root}")

    payload = fleet_payload(root, report=argv[0], limit=parsed.limit)
    print(render_payload(payload, parsed.format, lambda: _render_text(payload)))
    return 0 if payload["ok"] else 1
