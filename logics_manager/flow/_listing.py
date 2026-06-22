from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from ..audit import audit_payload
from ..cli_output import print_payload
from ..flow_evidence import has_ac_proof as _has_ac_proof
from ..flow_evidence import has_validation_evidence as _has_validation_evidence
from ..flow_evidence import structured_validation_line as _structured_validation_line
from ..index import index_payload
from ..lint import expected_workflow_mermaid_signature, lint_payload
from ..path_utils import ensure_relative_to, resolve_repo_output_path
from ..sync import build_context_pack_payload, read_logics_doc_payload
from ..termstyle import colorize_help


@dataclass(frozen=True)
class DocKind:
    kind: str
    directory: str
    prefix: str
    include_progress: bool


@dataclass(frozen=True)
class PlannedDoc:
    ref: str
    path: Path


DOC_KINDS = {
    "request": DocKind("request", "logics/request", "req", False),
    "backlog": DocKind("backlog", "logics/backlog", "item", True),
    "task": DocKind("task", "logics/tasks", "task", True),
}

STATUS_BY_KIND_DEFAULT = {
    "request": "Draft",
    "backlog": "Ready",
    "task": "Ready",
}
HELP_FLAGS = ("-h", "--help")
LIST_KIND_CHOICES = ("all", "request", "backlog", "task")
ACTIVE_FLOW_STATUSES = {"draft", "ready", "in progress", "blocked"}
FLOW_KIND_ORDER = {"request": 0, "backlog": 1, "task": 2}


def _help_requested(argv: list[str], index: int) -> bool:
    return len(argv) <= index or argv[index] in HELP_FLAGS


def _format_flag_list(flags: list[str]) -> str:
    return ", ".join(flags)


def _normalize_status(value: str | None) -> str:
    return " ".join(value.split()).lower() if value else ""


def _is_active_flow_doc(status: str | None) -> bool:
    return _normalize_status(status) in ACTIVE_FLOW_STATUSES


@dataclass(frozen=True)
class FlowListEntry:
    kind: str
    path: Path
    ref: str
    title: str
    status: str | None
    owner: str | None
    progress: str | None


def _parse_flow_doc(path: Path, kind: str) -> FlowListEntry:
    lines = path.read_text(encoding="utf-8").splitlines()
    ref = path.stem
    title = _extract_doc_title(path)
    status: str | None = None
    owner: str | None = None
    progress: str | None = None

    for line in lines:
        if line.startswith("> Status:"):
            status = line.split(":", 1)[1].strip()
            continue
        if line.startswith("> Owner:"):
            owner = line.split(":", 1)[1].strip()
            continue
        if line.startswith("> Progress:"):
            progress = line.split(":", 1)[1].strip()

    return FlowListEntry(
        kind=kind,
        path=path,
        ref=ref,
        title=title,
        status=status,
        owner=owner,
        progress=progress,
    )


def _collect_flow_list_entries(repo_root: Path, kind_filter: str = "all") -> list[FlowListEntry]:
    entries: list[FlowListEntry] = []
    for kind, doc_kind in DOC_KINDS.items():
        if kind_filter != "all" and kind_filter != kind:
            continue
        directory = repo_root / doc_kind.directory
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            entry = _parse_flow_doc(path, kind)
            if _is_active_flow_doc(entry.status):
                entries.append(entry)
    entries.sort(key=lambda entry: (FLOW_KIND_ORDER.get(entry.kind, 99), _normalize_status(entry.status), entry.ref))
    return entries


def _render_flow_list_section(title: str, entries: list[FlowListEntry], out_dir: Path) -> str:
    lines: list[str] = [f"## {title}", ""]
    if not entries:
        lines.append("_None_")
        lines.append("")
        return "\n".join(lines)

    lines.extend(["| Doc | Title | Status | Owner | Progress | Path |", "|---|---|---|---|---|---|"])
    for entry in entries:
        rel = entry.path.relative_to(out_dir).as_posix()
        doc_link = f"[{entry.ref}]({rel})"
        lines.append(
            f"| {doc_link} | {entry.title} | {entry.status or ''} | {entry.owner or ''} | {entry.progress or ''} | {rel} |"
        )
    lines.append("")
    return "\n".join(lines)


def flow_list_payload(repo_root: Path, *, kind: str = "all") -> dict[str, object]:
    repo_root = repo_root.resolve()
    entries = _collect_flow_list_entries(repo_root, kind_filter=kind)
    by_kind: dict[str, list[FlowListEntry]] = {key: [] for key in ("request", "backlog", "task")}
    for entry in entries:
        by_kind[entry.kind].append(entry)
    counts = {key: len(values) for key, values in by_kind.items()}
    return {
        "ok": True,
        "kind": kind,
        "count": len(entries),
        "counts_by_kind": counts,
        "entries": [
            {
                "kind": entry.kind,
                "ref": entry.ref,
                "title": entry.title,
                "status": entry.status,
                "owner": entry.owner,
                "progress": entry.progress,
                "path": entry.path.relative_to(repo_root).as_posix(),
            }
            for entry in entries
        ],
    }


def render_flow_list(repo_root: Path, *, kind: str = "all", output_format: str = "text") -> str:
    payload = flow_list_payload(repo_root, kind=kind)
    if output_format == "json":
        return json.dumps(payload, indent=2, sort_keys=True)

    entries = [
        FlowListEntry(
            kind=str(item["kind"]),
            path=repo_root / str(item["path"]),
            ref=str(item["ref"]),
            title=str(item["title"]),
            status=item["status"],
            owner=item["owner"],
            progress=item["progress"],
        )
        for item in payload["entries"]
    ]
    if not entries:
        return "Flow docs in progress: 0\n\n_None_"

    sections: list[str] = [f"Flow docs in progress: {payload['count']}", ""]
    kind_titles = {"request": "Requests", "backlog": "Backlog", "task": "Tasks"}
    for key in ("request", "backlog", "task"):
        if kind != "all" and kind != key:
            continue
        section_entries = [entry for entry in entries if entry.kind == key]
        sections.append(_render_flow_list_section(f"{kind_titles[key]} ({len(section_entries)})", section_entries, repo_root))
    return "\n".join(sections).rstrip()
