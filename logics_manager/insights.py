from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


WORKFLOW_KINDS = ("request", "backlog", "task")
COMPANION_KINDS = ("product", "architecture")
OPEN_STATUSES = {"Draft", "Ready", "In progress", "Blocked"}
CLOSED_STATUSES = {"Done", "Archived"}


@dataclass(frozen=True)
class LogicsDoc:
    kind: str
    path: Path
    rel_path: str
    ref: str
    title: str
    status: str | None
    progress: int | None
    content: str


def _doc_dirs(repo_root: Path) -> dict[str, Path]:
    return {
        "request": repo_root / "logics" / "request",
        "backlog": repo_root / "logics" / "backlog",
        "task": repo_root / "logics" / "tasks",
        "product": repo_root / "logics" / "product",
        "architecture": repo_root / "logics" / "architecture",
    }


def _progress_value(raw: str | None) -> int | None:
    if raw is None:
        return None
    match = re.search(r"(\d+)", raw)
    if not match:
        return None
    return max(0, min(100, int(match.group(1))))


def _parse_doc(repo_root: Path, kind: str, path: Path) -> LogicsDoc:
    content = path.read_text(encoding="utf-8")
    title = "(missing title)"
    status: str | None = None
    progress: int | None = None
    for line in content.splitlines():
        if line.startswith("## "):
            heading = line.removeprefix("## ").strip()
            if " - " in heading:
                _, title = heading.split(" - ", 1)
            else:
                title = heading
            continue
        if line.startswith("> Status:"):
            status = line.split(":", 1)[1].strip()
            continue
        if line.startswith("> Progress:"):
            progress = _progress_value(line.split(":", 1)[1].strip())
            continue
    return LogicsDoc(
        kind=kind,
        path=path,
        rel_path=path.relative_to(repo_root).as_posix(),
        ref=path.stem,
        title=title,
        status=status,
        progress=progress,
        content=content,
    )


def collect_logics_docs(repo_root: Path, *, kinds: tuple[str, ...] = WORKFLOW_KINDS + COMPANION_KINDS) -> list[LogicsDoc]:
    docs: list[LogicsDoc] = []
    for kind, directory in _doc_dirs(repo_root).items():
        if kind not in kinds or not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            docs.append(_parse_doc(repo_root, kind, path))
    return docs


def _status_counts(docs: list[LogicsDoc]) -> dict[str, dict[str, int]]:
    counts: dict[str, dict[str, int]] = {}
    for doc in docs:
        status = doc.status or "(missing)"
        counts.setdefault(doc.kind, {})
        counts[doc.kind][status] = counts[doc.kind].get(status, 0) + 1
    return counts


def _doc_summary(doc: LogicsDoc) -> dict[str, object]:
    return {
        "ref": doc.ref,
        "title": doc.title,
        "kind": doc.kind,
        "status": doc.status,
        "progress": doc.progress,
        "path": doc.rel_path,
    }


def status_payload(repo_root: Path, *, limit: int = 10) -> dict[str, object]:
    docs = collect_logics_docs(repo_root, kinds=WORKFLOW_KINDS)
    open_docs = [doc for doc in docs if doc.status not in CLOSED_STATUSES]
    active_tasks = [
        doc
        for doc in open_docs
        if doc.kind == "task" and doc.status in {"Ready", "In progress", "Blocked"}
    ]
    ready_backlog = [
        doc
        for doc in open_docs
        if doc.kind == "backlog" and doc.status in {"Ready", "In progress", "Blocked"}
    ]
    task_text = "\n".join(doc.content for doc in docs if doc.kind == "task")
    backlog_without_task = [doc for doc in ready_backlog if doc.ref not in task_text]
    draft_requests = [doc for doc in open_docs if doc.kind == "request" and doc.status == "Draft"]
    blocked_docs = [doc for doc in open_docs if doc.status == "Blocked"]

    next_actions: list[str] = []
    if blocked_docs:
        next_actions.append(f"Review {len(blocked_docs)} blocked doc(s).")
    if active_tasks:
        next_actions.append(f"Continue or finish {len(active_tasks)} active task(s).")
    if backlog_without_task:
        next_actions.append(f"Promote {len(backlog_without_task)} ready backlog item(s) without detected task links.")
    if draft_requests:
        next_actions.append(f"Groom {len(draft_requests)} draft request(s).")
    if not next_actions:
        next_actions.append("No open workflow action detected.")

    return {
        "ok": True,
        "counts": _status_counts(docs),
        "open_count": len(open_docs),
        "active_tasks": [_doc_summary(doc) for doc in active_tasks[:limit]],
        "backlog_without_task": [_doc_summary(doc) for doc in backlog_without_task[:limit]],
        "draft_requests": [_doc_summary(doc) for doc in draft_requests[:limit]],
        "blocked_docs": [_doc_summary(doc) for doc in blocked_docs[:limit]],
        "next_actions": next_actions,
    }


def render_status(repo_root: Path, *, output_format: str = "text", limit: int = 10) -> str:
    payload = status_payload(repo_root, limit=limit)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    lines = [
        "Logics status:",
        f"- open workflow docs: {payload['open_count']}",
        "- next actions:",
    ]
    lines.extend(f"  - {action}" for action in payload["next_actions"])
    for key, label in (
        ("active_tasks", "Active tasks"),
        ("backlog_without_task", "Backlog without detected task"),
        ("draft_requests", "Draft requests"),
        ("blocked_docs", "Blocked docs"),
    ):
        items = payload[key]
        if not items:
            continue
        lines.append(f"- {label}:")
        for item in items:
            lines.append(f"  - {item['ref']} [{item['status']}]: {item['title']}")
    return "\n".join(lines)
