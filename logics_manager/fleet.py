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
import subprocess
from pathlib import Path
from urllib.parse import quote

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
  logics-manager fleet brief [--root DIR] [--limit N] [--no-reviews] [--format text|json]

Flags:
  --root DIR   Directory whose immediate children are scanned. Defaults to the
               current directory.
  --limit N    Per-repository item limit, passed through to each report.
  --format     text (default) or json.

`brief` ranks the next moves across every repository and keeps the first N
(3 by default): blocked docs, then pull and merge requests awaiting your review
(GitHub with `gh`, GitLab with `glab`; a CLI that is not installed is skipped,
`--no-reviews` leaves them out),
then docs at 100% left open, High-priority active
tasks, Draft requests already in delivery, then the other active tasks.

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


#: What a brief puts first; lower is more urgent.
_BRIEF_ORDER = (
    ("blocked_docs", "unblock"),
    ("review_requests", "review"),
    ("complete_not_done", "close out"),
    ("active_tasks:High", "finish"),
    ("draft_requests_in_delivery", "start"),
    ("active_tasks", "continue"),
)


def _cli_json(command: list[str]) -> tuple[object, str | None]:
    """A CLI's JSON output; (None, None) when the CLI is not installed."""
    label = " ".join(command[:3])
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False, timeout=30)
    except FileNotFoundError:
        return None, None
    except subprocess.TimeoutExpired:
        return None, f"{label} timed out"
    if result.returncode != 0:
        detail = " ".join(result.stderr.split()) or str(result.returncode)  # glab spreads one error over 3 lines
        return None, f"{label} failed: {detail}"
    return json.loads(result.stdout or "null"), None


def review_requests() -> tuple[list[dict[str, object]], str | None]:
    """Open GitHub PRs and GitLab MRs waiting for the user's review, and why some could not be read.

    A CLI that is not installed means that forge is not used here: nothing to
    report, not an error. A CLI that fails (logged out, offline) is reported,
    so an empty review list is never mistaken for an empty queue.
    """
    items: list[dict[str, object]] = []
    errors: list[str] = []
    prs, error = _cli_json(["gh", "search", "prs", "--review-requested=@me", "--state", "open",
                            "--json", "number,title,repository,url", "--limit", "50"])
    items += [{"repository": (pr.get("repository") or {}).get("nameWithOwner") or "?", "ref": f"#{pr['number']}",
               "status": "review requested", "title": pr.get("title") or "", "url": pr.get("url")}
              for pr in prs or []]
    errors += [error] if error else []
    # glab mr list only sees one project; the API searches the whole instance.
    user, error = _cli_json(["glab", "api", "user"])
    if user:
        mrs, error = _cli_json(["glab", "api", "merge_requests?scope=all&state=opened&per_page=50"
                                f"&reviewer_username={quote(str(user.get('username') or ''))}"])
        for mr in mrs or []:
            path, _, iid = ((mr.get("references") or {}).get("full") or f"?!{mr.get('iid')}").rpartition("!")
            items.append({"repository": path, "ref": f"!{iid}", "status": "review requested",
                          "title": mr.get("title") or "", "url": mr.get("web_url")})
    errors += [error] if error else []
    return items, "; ".join(errors) or None


def fleet_brief(root: Path, *, limit: int = 3, reviews: bool = True) -> dict[str, object]:
    """The few moves that matter most across every repository under `root`."""
    statuses = fleet_payload(root, report="status", limit=50)
    pending, review_error = review_requests() if reviews else ([], None)
    by_repository: dict[str, dict[str, list]] = {}
    for pr in pending:
        by_repository.setdefault(str(pr.pop("repository")), {"review_requests": []})["review_requests"].append(pr)
    moves: list[dict[str, object]] = []
    seen: set[tuple[str, str]] = set()
    for rank, (key, verb) in enumerate(_BRIEF_ORDER):
        field, _, priority = key.partition(":")
        entries = by_repository if field == "review_requests" else statuses["repositories"]
        for name, entry in entries.items():  # type: ignore[union-attr]
            for item in entry.get(field) or []:
                if priority and item.get("priority") != priority:
                    continue
                if (name, item["ref"]) in seen:
                    continue
                seen.add((name, item["ref"]))
                turn = sum(1 for move in moves if move["rank"] == rank and move["repository"] == name)
                moves.append({"rank": rank, "turn": turn, "verb": verb, "repository": name, **item})
    # Within one urgency, one move per repository before a second from any: a
    # brief that lists three items of one project hides the other projects.
    moves.sort(key=lambda move: (move["rank"], move["turn"]))
    return {
        "ok": statuses["ok"],
        "report": "brief",
        "root": statuses["root"],
        "repository_count": statuses["repository_count"],
        "move_count": len(moves),
        "moves": moves[:limit],
        "review_error": review_error,
    }


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


def _render_brief(payload: dict[str, object]) -> str:
    total = payload["move_count"]
    lines = [f"Logics fleet brief: top {len(payload['moves'])} of {total} move(s) across {payload['repository_count']} repository(ies)"]
    if not payload["moves"]:
        lines.append("- nothing open needs a move")
    for index, move in enumerate(payload["moves"], 1):  # type: ignore[union-attr]
        lines.append(f"{index}. {move['repository']}: {move['verb']} {move['ref']} [{move.get('status') or 'no status'}] {move['title']}")
    if payload.get("review_error"):
        lines.append(f"- review requests unknown: {payload['review_error']}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    argv = list(argv or [])
    if not argv or argv[0] in {"-h", "--help"}:
        print(colorize_help(HELP))
        return 0 if argv else 1
    if argv[0] not in {"status", "health", "roadmap", "brief"}:
        raise SystemExit("Usage: logics-manager fleet <status|health|roadmap|brief> [args...]")

    parser = argparse.ArgumentParser(prog=f"logics-manager fleet {argv[0]}")
    parser.add_argument("--root", default=".")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--format", choices=("text", "json"), default="text")
    if argv[0] == "brief":
        parser.add_argument("--no-reviews", action="store_true")
    parsed = parser.parse_args(argv[1:])

    root = Path(parsed.root).expanduser()
    if not root.is_dir():
        raise SystemExit(f"--root path does not exist or is not a directory: {root}")

    if argv[0] == "brief":
        payload = fleet_brief(root, limit=parsed.limit if parsed.limit != 10 else 3, reviews=not parsed.no_reviews)
        print(render_payload(payload, parsed.format, lambda: _render_brief(payload)))
        return 0 if payload["ok"] else 1
    payload = fleet_payload(root, report=argv[0], limit=parsed.limit)
    print(render_payload(payload, parsed.format, lambda: _render_text(payload)))
    return 0 if payload["ok"] else 1
