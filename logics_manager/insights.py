from __future__ import annotations

import json
import re
import shlex
from dataclasses import dataclass
from pathlib import Path


from logics_manager.config import load_repo_config
from logics_manager.doc_parsing import age_in_days, declared_refs, git_last_change_times, last_change_time, priority_rank, priority_tier, progress_value, strip_mermaid_blocks
from logics_manager.path_utils import duplicate_workflow_dirs
from logics_manager.statuses import closed_statuses, open_statuses

WORKFLOW_KINDS = ("request", "backlog", "task")
COMPANION_KINDS = ("product", "roadmap", "architecture", "runbook")
OPEN_STATUSES = set(open_statuses())
CLOSED_STATUSES = set(closed_statuses())


@dataclass(frozen=True)
class LogicsDoc:
    kind: str
    path: Path
    rel_path: str
    ref: str
    title: str
    status: str | None
    owner: str | None
    progress: int | None
    priority: str
    content: str


def _doc_dirs(repo_root: Path) -> dict[str, Path]:
    return {
        "request": repo_root / "logics" / "request",
        "backlog": repo_root / "logics" / "backlog",
        "task": repo_root / "logics" / "tasks",
        "product": repo_root / "logics" / "product",
        "roadmap": repo_root / "logics" / "roadmap",
        "architecture": repo_root / "logics" / "architecture",
        "runbook": repo_root / "logics" / "runbook",
    }


_progress_value = progress_value


def _parse_doc(repo_root: Path, kind: str, path: Path) -> LogicsDoc:
    content = path.read_text(encoding="utf-8")
    title = "(missing title)"
    status: str | None = None
    owner: str | None = None
    progress: int | None = None
    for line in content.splitlines():
        if line.startswith("## "):
            # Only the first `## ref - Title` line is the title; later `##`
            # lines are body sub-sections.
            if title != "(missing title)":
                continue
            heading = line.removeprefix("## ").strip()
            if " - " in heading:
                _, title = heading.split(" - ", 1)
            else:
                title = heading
            continue
        if line.startswith("> Status:"):
            status = line.split(":", 1)[1].strip()
            continue
        if line.startswith("> Owner:"):
            owner = line.split(":", 1)[1].strip()
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
        owner=owner,
        progress=progress,
        priority=priority_tier(content.splitlines()),
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


def _doc_summary(doc: LogicsDoc, *, priority: str | None = None) -> dict[str, object]:
    return {
        "ref": doc.ref,
        "title": doc.title,
        "kind": doc.kind,
        "status": doc.status,
        "owner": doc.owner,
        "progress": doc.progress,
        "priority": priority or doc.priority,
        "path": doc.rel_path,
    }


def _effective_priority(doc: LogicsDoc, by_ref: dict[str, LogicsDoc]) -> str:
    if doc.kind != "task":
        return doc.priority
    for item_ref in declared_refs("task", strip_mermaid_blocks(doc.content), "backlog"):
        if item_ref in by_ref:
            return by_ref[item_ref].priority
    return doc.priority


def _backlog_with_task(docs: list[LogicsDoc]) -> set[str]:
    """Backlog refs a task declares, or that declare a task themselves.

    Declared links only: a task that merely mentions an item in prose does not
    give it a task, so the item still shows under "Backlog without task".
    """
    refs = {ref for doc in docs if doc.kind == "task" for ref in declared_refs("task", doc.content, "backlog")}
    refs.update(doc.ref for doc in docs if doc.kind == "backlog" and declared_refs("backlog", doc.content, "task"))
    return refs


def _priority_sorted(docs: list[LogicsDoc], by_ref: dict[str, LogicsDoc]) -> list[LogicsDoc]:
    return sorted(docs, key=lambda doc: (priority_rank(_effective_priority(doc, by_ref)), doc.rel_path))


def _priority_summaries(docs: list[LogicsDoc], by_ref: dict[str, LogicsDoc], limit: int) -> list[dict[str, object]]:
    return [_doc_summary(doc, priority=_effective_priority(doc, by_ref)) for doc in _priority_sorted(docs, by_ref)[:limit]]


def status_payload(repo_root: Path, *, limit: int = 10) -> dict[str, object]:
    docs = collect_logics_docs(repo_root, kinds=WORKFLOW_KINDS)
    by_ref = {doc.ref: doc for doc in docs}
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
    with_task = _backlog_with_task(docs)
    backlog_without_task = [doc for doc in ready_backlog if doc.ref not in with_task]
    draft_requests = [doc for doc in open_docs if doc.kind == "request" and doc.status == "Draft"]
    # A Draft request that a backlog item or task already cites is being delivered:
    # it needs its status moved, not grooming.
    delivered_requests = {ref for doc in docs if doc.kind in {"backlog", "task"} for ref in declared_refs(doc.kind, doc.content, "request")}
    draft_requests_in_delivery = [doc for doc in draft_requests if doc.ref in delivered_requests]
    draft_requests = [doc for doc in draft_requests if doc not in draft_requests_in_delivery]
    blocked_docs = [doc for doc in open_docs if doc.status == "Blocked"]
    complete_not_done = [doc for doc in open_docs if doc.progress == 100]

    next_actions: list[str] = []
    if blocked_docs:
        next_actions.append(f"Review {len(blocked_docs)} blocked doc(s).")
    if complete_not_done:
        next_actions.append(
            f"Close out {len(complete_not_done)} doc(s) at 100% still open "
            "(`logics-manager flow closeout <task>`)."
        )
    if active_tasks:
        next_actions.append(f"Continue or finish {len(active_tasks)} active task(s).")
    if backlog_without_task:
        next_actions.append(f"Promote {len(backlog_without_task)} ready backlog item(s) without detected task links.")
    if draft_requests:
        next_actions.append(f"Groom {len(draft_requests)} draft request(s).")
    if draft_requests_in_delivery:
        next_actions.append(
            f"Start {len(draft_requests_in_delivery)} draft request(s) already in delivery "
            "(`logics-manager flow start <ref>`)."
        )
    if not next_actions:
        next_actions.append("No open workflow action detected.")

    return {
        "ok": True,
        "counts": _status_counts(docs),
        "open_count": len(open_docs),
        "active_tasks": _priority_summaries(active_tasks, by_ref, limit),
        "backlog_without_task": _priority_summaries(backlog_without_task, by_ref, limit),
        "draft_requests": _priority_summaries(draft_requests, by_ref, limit),
        "draft_requests_in_delivery": _priority_summaries(draft_requests_in_delivery, by_ref, limit),
        "blocked_docs": _priority_summaries(blocked_docs, by_ref, limit),
        "complete_not_done": _priority_summaries(complete_not_done, by_ref, limit),
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
        ("draft_requests_in_delivery", "Draft requests already in delivery"),
        ("blocked_docs", "Blocked docs"),
        ("complete_not_done", "At 100% but still open"),
    ):
        items = payload[key]
        if not items:
            continue
        lines.append(f"- {label}:")
        for item in items:
            owner = f" owner={item['owner']}" if item.get("owner") else ""
            lines.append(f"  - {item['ref']} [{item['status']}; {item['priority']}]{owner}: {item['title']}")
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

    with_task = _backlog_with_task(workflow_docs)
    backlog_without_task = [
        doc
        for doc in open_docs
        if doc.kind == "backlog" and doc.status in {"Ready", "In progress", "Blocked"} and doc.ref not in with_task
    ]

    issue_groups = {
        "missing_status": missing_status,
        "done_without_full_progress": done_without_full_progress,
        "complete_progress_not_done": complete_progress_not_done,
        "blocked_docs": blocked_docs,
        "backlog_without_task": backlog_without_task,
    }
    issue_count = sum(len(items) for items in issue_groups.values())
    stale_after_days, stale = _stale_docs(repo_root, open_docs)
    return {
        "ok": issue_count == 0,
        "doc_count": len(docs),
        "workflow_doc_count": len(workflow_docs),
        "open_workflow_count": len(open_docs),
        "counts": _status_counts(docs),
        "issue_count": issue_count,
        "issues": {key: [_doc_summary(doc) for doc in items[:limit]] for key, items in issue_groups.items()},
        # Reported separately from `issues`: age is a nudge, not a correctness
        # problem, and folding it into issue_count would flip `ok` for every
        # existing corpus that has an old open doc.
        "stale_after_days": stale_after_days,
        "stale_doc_count": len(stale),
        "stale_docs": stale[:limit],
        # req_335: tolerating an alias spelling must not become ambiguity. The
        # canonical directory always wins; a real alias directory beside it is a
        # corpus anomaly and is reported rather than silently resolved.
        "duplicate_workflow_dirs": duplicate_workflow_dirs(repo_root),
    }


def _stale_docs(repo_root: Path, open_docs: list) -> tuple[int, list[dict[str, object]]]:
    """Open docs untouched for longer than the configured threshold.

    A watchdog looking for forgotten drafts had to run one `git log` per
    document and apply its own hardcoded threshold, duplicating a judgement
    that belongs to the corpus.
    """
    config, _ = load_repo_config(repo_root)
    raw = (config.get("health") or {}).get("stale_after_days", 14)
    try:
        threshold = int(raw)
    except (TypeError, ValueError):
        threshold = 14

    times = git_last_change_times(repo_root)
    stale: list[dict[str, object]] = []
    for doc in open_docs:
        stamp = last_change_time(repo_root, doc.rel_path, times)
        age = age_in_days(stamp)
        if age is None or age < threshold:
            continue
        entry = _doc_summary(doc)
        entry["updated_at"] = stamp
        entry["age_days"] = age
        stale.append(entry)
    stale.sort(key=lambda entry: (-int(entry["age_days"] or 0), str(entry.get("ref", ""))))
    return threshold, stale


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
    for duplicate in payload.get("duplicate_workflow_dirs", []):
        lines.append(f"- anomaly: `{duplicate}` exists beside its canonical directory; the canonical one is used")
    issues = payload["issues"]
    for key, items in issues.items():
        if not items:
            continue
        label = key.replace("_", " ")
        lines.append(f"- {label}:")
        for item in items:
            lines.append(f"  - {item['ref']} [{item['status']}]: {item['title']}")
    if payload.get("stale_doc_count"):
        lines.append(
            f"- stale docs (untouched {payload['stale_after_days']}+ days): {payload['stale_doc_count']}"
        )
        for item in payload["stale_docs"]:
            lines.append(f"  - {item['ref']} [{item['status']}]: {item['age_days']}d")
    return "\n".join(lines)


def _slug_command_title(text: str) -> str:
    cleaned = re.sub(r"`([^`]+)`", r"\1", text)
    cleaned = re.sub(r"[*_]+", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned.strip(" .:-"))
    if len(cleaned) > 96:
        cleaned = cleaned[:93].rstrip(" ,.;:") + "..."
    return cleaned[:1].upper() + cleaned[1:] if cleaned else "Follow up"


def _is_actionable_followup(text: str) -> bool:
    normalized = re.sub(r"\s+", " ", text.strip(" .")).lower()
    if normalized in {"none", "n/a", "not needed", "no follow-up"}:
        return False
    if normalized.startswith("no ") and "follow-up" in normalized:
        return False
    if normalized.startswith("no ") and "is required" in normalized:
        return False
    if "no new adr is required" in normalized:
        return False
    if "no new architecture decision" in normalized:
        return False
    return True


def followups_payload(
    repo_root: Path,
    *,
    limit: int = 50,
    source_kind: str = "all",
    include_closed: bool = False,
    closed_only: bool = False,
) -> dict[str, object]:
    docs = collect_logics_docs(repo_root, kinds=WORKFLOW_KINDS + COMPANION_KINDS)
    if source_kind != "all":
        docs = [doc for doc in docs if doc.kind == source_kind]
    if closed_only:
        docs = [doc for doc in docs if doc.status in CLOSED_STATUSES]
    elif not include_closed:
        docs = [doc for doc in docs if doc.status not in CLOSED_STATUSES]
    followups: list[dict[str, object]] = []
    patterns = ("Follow-up area:", "Product follow-up:", "Architecture follow-up:")
    for doc in docs:
        for index, line in enumerate(doc.content.splitlines(), start=1):
            stripped = line.strip().lstrip("- ").strip()
            matched = next((pattern for pattern in patterns if stripped.startswith(pattern)), None)
            if not matched:
                continue
            text = stripped.removeprefix(matched).strip()
            if not _is_actionable_followup(text):
                continue
            title = _slug_command_title(text)
            quoted_title = shlex.quote(title)
            followups.append(
                {
                    "source_ref": doc.ref,
                    "source_path": doc.rel_path,
                    "source_kind": doc.kind,
                    "line": index,
                    "text": text,
                    "suggested_title": title,
                    "suggested_command": f"python3 -m logics_manager flow new request --title {quoted_title}",
                }
            )
    return {
        "ok": True,
        "count": len(followups),
        "returned_count": min(len(followups), limit),
        "filters": {
            "source_kind": source_kind,
            "include_closed": include_closed,
            "closed_only": closed_only,
        },
        "followups": followups[:limit],
    }


def render_followups(
    repo_root: Path,
    *,
    output_format: str = "text",
    limit: int = 50,
    source_kind: str = "all",
    include_closed: bool = False,
    closed_only: bool = False,
) -> str:
    payload = followups_payload(
        repo_root,
        limit=limit,
        source_kind=source_kind,
        include_closed=include_closed,
        closed_only=closed_only,
    )
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    lines = [f"Logics follow-ups: {payload['count']} found"]
    for item in payload["followups"]:
        lines.append(f"- {item['source_ref']}:{item['line']} {item['text']}")
        lines.append(f"  command: {item['suggested_command']}")
    return "\n".join(lines)


def _related_refs(content: str, label: str) -> list[str]:
    prefix = f"> Related {label}:"
    for line in content.splitlines():
        if not line.startswith(prefix):
            continue
        value = line.split(":", 1)[1].strip()
        # Companion metadata can name several docs, with or without backticks.
        # Keep every entry so a valid first reference cannot hide a broken later one.
        refs = []
        for part in value.split(","):
            # Preserve annotations such as `req_001_demo` (refreshed).
            match = re.search(r"`([^`]+)`", part)
            refs.append((match.group(1) if match else part).strip())
        return [ref for ref in refs if ref and not ref.lower().startswith("(none")]
    return []


def product_consistency_payload(repo_root: Path, *, limit: int = 50) -> dict[str, object]:
    docs = collect_logics_docs(repo_root, kinds=WORKFLOW_KINDS + COMPANION_KINDS)
    docs_by_ref = {doc.ref: doc for doc in docs}
    product_docs = [doc for doc in docs if doc.kind == "product"]
    checked_product_docs = [doc for doc in product_docs if doc.status != "Proposed"]
    issues: list[dict[str, object]] = []
    expected = {
        "request": "request",
        "backlog": "backlog",
        "task": "task",
    }
    for doc in checked_product_docs:
        missing_related: list[str] = []
        broken_related: list[dict[str, str]] = []
        for label, expected_kind in expected.items():
            refs = _related_refs(doc.content, label)
            if not refs:
                missing_related.append(label)
                continue
            for ref in refs:
                target = docs_by_ref.get(ref)
                if target is None:
                    broken_related.append({"kind": label, "ref": ref, "reason": "missing"})
                elif target.kind != expected_kind:
                    broken_related.append({"kind": label, "ref": ref, "reason": f"expected {expected_kind}, found {target.kind}"})
        if missing_related or broken_related:
            issues.append(
                {
                    "ref": doc.ref,
                    "title": doc.title,
                    "status": doc.status,
                    "path": doc.rel_path,
                    "missing_related": missing_related,
                    "broken_related": broken_related,
                }
            )
    return {
        "ok": not issues,
        "product_count": len(product_docs),
        "checked_product_count": len(checked_product_docs),
        "skipped_product_count": len(product_docs) - len(checked_product_docs),
        "issue_count": len(issues),
        "issues": issues[:limit],
        "truncated": len(issues) > limit,
        "limit": limit,
    }


def render_product_consistency(repo_root: Path, *, output_format: str = "text", limit: int = 50) -> str:
    payload = product_consistency_payload(repo_root, limit=limit)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    lines = [
        "Product consistency:",
        f"- product briefs: {payload['product_count']}",
        f"- issue signals: {payload['issue_count']}",
    ]
    for issue in payload["issues"]:
        details: list[str] = []
        if issue["missing_related"]:
            details.append("missing " + ", ".join(issue["missing_related"]))
        if issue["broken_related"]:
            details.append("broken " + ", ".join(item["ref"] for item in issue["broken_related"]))
        lines.append(f"- {issue['ref']} [{issue['status']}]: {'; '.join(details)}")
    return "\n".join(lines)
