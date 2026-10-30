"""Record generic work executions without editing document prose."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

from ..executions import LINE_SEPARATORS, STATES, parse_executions, replace_executions, valid_pr
from ..path_utils import ensure_relative_to
from .docs import DOC_KINDS


def record_run_payload(repo_root: Path, source: str, *, runner: str, run_id: str, state: str, title: str | None = None,
                       pr: str | None = None, notes: str | None = None, progress: str | None = None, dry_run: bool = False) -> dict[str, object]:
    from . import _resolve_any_workflow_source, progress_task_payload

    repo_root = repo_root.resolve()
    path, kind = _resolve_any_workflow_source(repo_root, source)
    if kind not in {"request", "backlog", "task"}:
        raise SystemExit("Executions are supported only for requests, backlog items and tasks.")
    # Bare refs and fallback resolution may return unresolved paths.
    path = path.resolve()
    relative = ensure_relative_to(path, repo_root, label="source")
    if relative.parent != Path(DOC_KINDS[kind].directory):
        raise SystemExit(f"Expected source under `{DOC_KINDS[kind].directory}`. Got: `{relative.as_posix()}`.")
    if state not in STATES:
        raise SystemExit(f"Invalid execution state: {state}")
    if not runner.strip() or not run_id.strip() or any(char in runner + run_id for char in LINE_SEPARATORS):
        raise SystemExit("Runner and run id must be nonempty single-line values.")
    if pr is not None and pr and not valid_pr(pr):
        raise SystemExit("Invalid PR URL: expected an absolute HTTP or HTTPS URL.")
    if progress is not None and (progress != "auto" or kind != "task"):
        raise SystemExit("--progress auto is supported only on tasks.")
    with path.open(encoding="utf-8", newline="") as handle:
        original = handle.read()
    try:
        rows = parse_executions(original)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    runner, run_id = runner.strip(), run_id.strip()
    previous = next((row for row in rows if (row["Runner"], row["Run id"]) == (runner, run_id)), {})
    row = {"When": datetime.now(timezone.utc).isoformat(), "Runner": runner, "Run id": run_id, "State": state,
           "Title": title if title is not None else previous.get("Title", ""),
           "PR": pr if pr is not None else previous.get("PR", ""),
           "Notes": notes if notes is not None else previous.get("Notes", "")}
    rows = [row] + [old for old in rows if (old["Runner"], old["Run id"]) != (runner, run_id)]
    rows.sort(key=lambda entry: datetime.fromisoformat(entry["When"].replace("Z", "+00:00")), reverse=True)
    updated = replace_executions(original, rows)
    changed_files = [path.relative_to(repo_root).as_posix()]
    payload = {"command": "record-run", "source": changed_files[0], "kind": kind, "execution": row,
               "changed_files": changed_files, "dry_run": dry_run}
    if not dry_run:
        with path.open("w", encoding="utf-8", newline="") as handle:
            handle.write(updated)
    if progress == "auto":
        value = round(100 * sum(row["State"] in {"succeeded", "merged"} for row in rows) / len(rows))
        result = progress_task_payload(repo_root, source, progress=str(value), dry_run=dry_run)
        payload["progress"] = result["progress"]
        payload["changed_files"] = sorted(set(changed_files + result["changed_files"]))
    return payload


def cmd_record_run(args: argparse.Namespace) -> dict[str, object]:
    from . import _find_repo_root, print_payload

    payload = record_run_payload(_find_repo_root(Path.cwd()), args.source, runner=args.runner, run_id=args.run_id,
                                 state=args.state, title=args.title, pr=args.pr, notes=args.notes,
                                 progress=args.progress, dry_run=args.dry_run)
    if args.format == "json":
        print_payload(payload, args.format)
    else:
        action = "Would record" if args.dry_run else "Recorded"
        print(f"{action} execution for {payload['source']}: {args.runner}/{args.run_id} {args.state}")
    return payload


def add_record_run_parser(sub: argparse._SubParsersAction) -> None:
    parser = sub.add_parser("record-run", help="Record or update an execution on a request, backlog item or task.")
    parser.add_argument("source", metavar="ref")
    parser.add_argument("--runner", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--state", required=True, choices=STATES)
    for option in ("title", "pr", "notes"):
        parser.add_argument(f"--{option}")
    parser.add_argument("--progress", choices=("auto",))
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--dry-run", action="store_true")
    parser.set_defaults(func=cmd_record_run)
