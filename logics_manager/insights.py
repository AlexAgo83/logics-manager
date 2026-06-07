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


def health_payload(repo_root: Path, *, limit: int = 10) -> dict[str, object]:
    docs = collect_logics_docs(repo_root, kinds=WORKFLOW_KINDS + COMPANION_KINDS)
    workflow_docs = [doc for doc in docs if doc.kind in WORKFLOW_KINDS]
    missing_status = [doc for doc in docs if not doc.status]
    done_without_full_progress = [
        doc for doc in workflow_docs if doc.status == "Done" and doc.kind in {"backlog", "task"} and doc.progress != 100
    ]
    complete_progress_not_done = [
        doc for doc in workflow_docs if doc.progress == 100 and doc.status not in CLOSED_STATUSES
    ]
    blocked_docs = [doc for doc in workflow_docs if doc.status == "Blocked"]
    open_docs = [doc for doc in workflow_docs if doc.status not in CLOSED_STATUSES]

    task_text = "\n".join(doc.content for doc in workflow_docs if doc.kind == "task")
    backlog_without_task = [
        doc
        for doc in open_docs
        if doc.kind == "backlog" and doc.status in {"Ready", "In progress", "Blocked"} and doc.ref not in task_text
    ]

    issue_groups = {
        "missing_status": missing_status,
        "done_without_full_progress": done_without_full_progress,
        "complete_progress_not_done": complete_progress_not_done,
        "blocked_docs": blocked_docs,
        "backlog_without_task": backlog_without_task,
    }
    issue_count = sum(len(items) for items in issue_groups.values())
    return {
        "ok": issue_count == 0,
        "doc_count": len(docs),
        "workflow_doc_count": len(workflow_docs),
        "open_workflow_count": len(open_docs),
        "counts": _status_counts(docs),
        "issue_count": issue_count,
        "issues": {key: [_doc_summary(doc) for doc in items[:limit]] for key, items in issue_groups.items()},
    }


def render_health(repo_root: Path, *, output_format: str = "text", limit: int = 10) -> str:
    payload = health_payload(repo_root, limit=limit)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    lines = [
        "Logics health:",
        f"- docs: {payload['doc_count']}",
        f"- workflow docs: {payload['workflow_doc_count']}",
        f"- open workflow docs: {payload['open_workflow_count']}",
        f"- issue signals: {payload['issue_count']}",
    ]
    issues = payload["issues"]
    for key, items in issues.items():
        if not items:
            continue
        label = key.replace("_", " ")
        lines.append(f"- {label}:")
        for item in items:
            lines.append(f"  - {item['ref']} [{item['status']}]: {item['title']}")
    return "\n".join(lines)


def _slug_command_title(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text.strip(" ."))
    return cleaned[:1].upper() + cleaned[1:] if cleaned else "Follow up"


def followups_payload(repo_root: Path, *, limit: int = 50) -> dict[str, object]:
    docs = collect_logics_docs(repo_root, kinds=WORKFLOW_KINDS + COMPANION_KINDS)
    followups: list[dict[str, object]] = []
    patterns = ("Follow-up area:", "Product follow-up:", "Architecture follow-up:")
    for doc in docs:
        for index, line in enumerate(doc.content.splitlines(), start=1):
            stripped = line.strip().lstrip("- ").strip()
            matched = next((pattern for pattern in patterns if stripped.startswith(pattern)), None)
            if not matched:
                continue
            text = stripped.removeprefix(matched).strip()
            title = _slug_command_title(text)
            followups.append(
                {
                    "source_ref": doc.ref,
                    "source_path": doc.rel_path,
                    "source_kind": doc.kind,
                    "line": index,
                    "text": text,
                    "suggested_title": title,
                    "suggested_command": f'python3 -m logics_manager flow new request --title "{title}"',
                }
            )
    return {
        "ok": True,
        "count": len(followups),
        "returned_count": min(len(followups), limit),
        "followups": followups[:limit],
    }


def render_followups(repo_root: Path, *, output_format: str = "text", limit: int = 50) -> str:
    payload = followups_payload(repo_root, limit=limit)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    lines = [f"Logics follow-ups: {payload['count']} found"]
    for item in payload["followups"]:
        lines.append(f"- {item['source_ref']}:{item['line']} {item['text']}")
        lines.append(f"  command: {item['suggested_command']}")
    return "\n".join(lines)
