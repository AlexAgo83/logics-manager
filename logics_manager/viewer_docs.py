"""Pure Logics-document parsing helpers for the viewer.

Extracted from ``viewer.py`` to keep that module under its line budget. These
functions are deliberately free of subprocess/runtime state so they stay easy
to test in isolation and cheap to import.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlencode

from .doc_parsing import priority_tier


@dataclass(frozen=True)
class ViewerDocFamily:
    stage: str
    directory: str
    prefixes: tuple[str, ...]


DOC_FAMILIES = (
    ViewerDocFamily("request", "logics/request", ("req_",)),
    ViewerDocFamily("backlog", "logics/backlog", ("item_",)),
    ViewerDocFamily("task", "logics/tasks", ("task_",)),
    ViewerDocFamily("product", "logics/product", ("prod_",)),
    ViewerDocFamily("roadmap", "logics/roadmap", ("road_",)),
    ViewerDocFamily("architecture", "logics/architecture", ("adr_",)),
    ViewerDocFamily("spec", "logics/specs", ("spec_", "req_")),
)

STAGE_ORDER = {family.stage: index for index, family in enumerate(DOC_FAMILIES)}


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _parse_title(lines: list[str], fallback: str) -> str:
    for line in lines:
        if not line.startswith("## "):
            continue
        raw = line[3:].strip()
        match = re.match(r"^\S+\s*-\s*(.+)$", raw)
        return (match.group(1) if match else raw).strip()
    return fallback


def _parse_indicators(lines: list[str]) -> dict[str, str]:
    indicators: dict[str, str] = {}
    for line in lines:
        if not line.startswith(">"):
            continue
        trimmed = re.sub(r"^>\s*", "", line).strip()
        if ":" not in trimmed:
            continue
        key, value = trimmed.split(":", 1)
        if key.strip() and value.strip():
            indicators[key.strip()] = value.strip()
    return indicators


def _viewer_indicators(lines: list[str]) -> dict[str, str]:
    indicators = _parse_indicators(lines)
    indicators["Priority"] = priority_tier(lines)
    return indicators


def _extract_section_lines(content: str, section_title: str) -> list[str]:
    expected = f"# {section_title}".lower()
    collected: list[str] = []
    in_section = False
    for line in content.splitlines():
        if line.strip().lower() == expected:
            in_section = True
            continue
        if not in_section:
            continue
        if line.startswith("# "):
            break
        collected.append(line)
    return collected


def _summary_entries(content: str, section_title: str, limit: int) -> list[str]:
    entries: list[str] = []
    for raw_line in _extract_section_lines(content, section_title):
        line = raw_line.strip()
        if not line or line.startswith("```") or line.startswith("%%") or re.fullmatch(r"-+", line):
            continue
        bullet = re.match(r"^[-*]\s+(.*)$", line)
        value = bullet.group(1) if bullet else line
        if not value.startswith("#"):
            normalized = re.sub(r"\s+", " ", value.replace("> ", "")).strip()
            if normalized and normalized.lower() not in {entry.lower() for entry in entries}:
                entries.append(normalized)
        if len(entries) >= limit:
            break
    return entries


def _build_summary_points(content: str, fallback_title: str) -> list[str]:
    entries = [
        *_summary_entries(content, "Needs", 2),
        *_summary_entries(content, "Problem", 2),
        *_summary_entries(content, "Context", 2),
        *_summary_entries(content, "Scope", 2),
        *_summary_entries(content, "Provenance", 2),
    ]
    deduped: list[str] = []
    for entry in entries:
        if entry.lower() not in {existing.lower() for existing in deduped}:
            deduped.append(entry)
    return deduped[:4] or [fallback_title]


def _provenance(content: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in _extract_section_lines(content, "Provenance"):
        match = re.match(r"\s*-\s*(Origin|External issue):\s*(.+)", line, flags=re.IGNORECASE)
        if not match:
            continue
        key = "origin" if match.group(1).lower() == "origin" else "externalUrl"
        values[key] = match.group(2).strip().strip("`")
    return values


def _collect_backticked_links(text: str) -> list[str]:
    return [match.group(1) for match in re.finditer(r"`([^`]+)`", text) if match.group(1)]


def _normalize_ref(value: str) -> str:
    normalized = value.replace("\\", "/").lstrip("./").strip()
    if "/" in normalized:
        return normalized
    bare_name = normalized[:-3] if normalized.endswith(".md") else normalized
    for family in DOC_FAMILIES:
        if bare_name.startswith(family.prefixes):
            return f"{family.directory}/{bare_name}.md"
    return normalized


def normalize_viewer_focus_target(repo_root: Path, value: str) -> str:
    raw = unquote(value).replace("\\", "/").strip()
    if not raw:
        raise ValueError("Focus target cannot be empty.")
    if raw.startswith("~"):
        raise ValueError("Focus target must be a workflow ref or repo-relative Logics path.")
    if raw.startswith(("/", "\\")) or re.match(r"^[A-Za-z]:", raw):
        absolute = Path(raw).expanduser().resolve()
        root = repo_root.resolve()
        if root != absolute and root not in absolute.parents:
            raise ValueError("Focus target must be a workflow ref or repo-relative Logics path.")
        raw = absolute.relative_to(root).as_posix()
    parts = [part for part in raw.split("/") if part]
    if any(part == ".." for part in parts):
        raise ValueError("Focus target cannot contain path traversal.")
    normalized = _normalize_ref(raw.lstrip("./")).lstrip("/")
    if "/" not in raw and normalized == raw:
        raise ValueError("Focus target must be a known workflow ref or repo-relative Logics path.")
    if "/" in normalized:
        absolute = (repo_root.resolve() / normalized).resolve()
        root = repo_root.resolve()
        if root != absolute and root not in absolute.parents:
            raise ValueError("Focus target escapes repository root.")
        allowed_prefixes = tuple(f"{family.directory}/" for family in DOC_FAMILIES)
        if not normalized.startswith(allowed_prefixes) or not normalized.endswith(".md"):
            raise ValueError("Focus target must point to a Logics Markdown document.")
    return normalized


def build_viewer_url(host: str, port: int, *, focus: str | None = None, read: bool = False, scheme: str = "http") -> str:
    url = f"{scheme}://{host}:{port}"
    query: dict[str, str] = {}
    if focus:
        query["focus"] = focus
    if read:
        query["read"] = "1"
    if query:
        url = f"{url}?{urlencode(query, quote_via=quote)}"
    return url


def _section_links(content: str, section_title: str) -> list[str]:
    links: list[str] = []
    for line in _extract_section_lines(content, section_title):
        if "(none yet)" in line:
            continue
        links.extend(_collect_backticked_links(line))
    return sorted({_normalize_ref(link) for link in links})


def _indicator_links(lines: list[str], keys: set[str]) -> list[str]:
    links: list[str] = []
    for line in lines:
        if not line.startswith(">"):
            continue
        trimmed = re.sub(r"^>\s*", "", line).strip()
        if ":" not in trimmed:
            continue
        key, value = trimmed.split(":", 1)
        if key.strip().lower() in keys:
            links.extend(_collect_backticked_links(value))
    return sorted({_normalize_ref(link) for link in links})


def _extract_references(content: str, lines: list[str]) -> list[dict[str, str]]:
    references: list[dict[str, str]] = []
    for label, pattern in (
        ("Promoted from", re.compile(r"Promoted from `([^`]+)`", re.IGNORECASE)),
        ("Derived from", re.compile(r"Derived from(?: [a-z][a-z ]+)? `([^`]+)`", re.IGNORECASE)),
    ):
        for match in pattern.finditer(content):
            references.append({"kind": "from", "label": label, "path": _normalize_ref(match.group(1))})
    for link in _section_links(content, "Backlog"):
        references.append({"kind": "backlog", "label": "Backlog", "path": link})
    manual_links = {
        *_section_links(content, "References"),
        *_indicator_links(lines, {"related request", "related backlog", "related task", "related architecture"}),
        *_indicator_links(lines, {"related product", "related roadmap"}),
    }
    for link in sorted(manual_links):
        references.append({"kind": "manual", "label": "Reference", "path": link})
    return references


def _infer_stage(rel_path: str, doc_id: str) -> str:
    normalized = rel_path.replace("\\", "/").lower()
    for family in DOC_FAMILIES:
        if normalized.startswith(f"{family.directory}/") or doc_id.startswith(family.prefixes):
            return family.stage
    return "request"


def _to_usage(rel_path: str, items_by_rel_path: dict[str, dict[str, Any]]) -> dict[str, str]:
    normalized = _normalize_ref(rel_path)
    matched = items_by_rel_path.get(normalized)
    if matched:
        return {
            "id": str(matched["id"]),
            "title": str(matched["title"]),
            "stage": str(matched["stage"]),
            "relPath": str(matched["relPath"]),
        }
    doc_id = Path(normalized).stem
    return {
        "id": doc_id or normalized,
        "title": doc_id or normalized,
        "stage": _infer_stage(normalized, doc_id),
        "relPath": normalized,
    }


def collect_viewer_items(repo_root: Path) -> list[dict[str, Any]]:
    repo_root = repo_root.resolve()
    items: list[dict[str, Any]] = []
    promoted_sources: set[str] = set()
    usage_map: dict[str, list[dict[str, str]]] = {}
    manual_used_by: dict[str, list[str]] = {}

    for family in DOC_FAMILIES:
        directory = repo_root / family.directory
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob("*.md")):
            if not path.name.startswith(family.prefixes):
                continue
            content = _read_text(path)
            lines = content.splitlines()
            rel_path = path.relative_to(repo_root).as_posix()
            title = _parse_title(lines, path.stem)
            references = _extract_references(content, lines)
            manual_used_by[rel_path] = _section_links(content, "Used by")
            for ref in references:
                if ref["kind"] == "from":
                    promoted_sources.add(_normalize_ref(ref["path"]))
            stat = path.stat()
            items.append(
                {
                    "id": path.stem,
                    "title": title,
                    "stage": family.stage,
                    "path": str(path),
                    "relPath": rel_path,
                    "filename": path.name,
                    "updatedAt": stat.st_mtime_ns,
                    "indicators": _viewer_indicators(lines),
                    "summaryPoints": _build_summary_points(content, title),
                    "provenance": _provenance(content),
                    "acceptanceCriteria": _summary_entries(content, "Acceptance criteria", 6),
                    "lineCount": len(lines),
                    "charCount": len(content),
                    "isPromoted": False,
                    "references": references,
                    "usedBy": [],
                }
            )

    items_by_rel_path = {str(item["relPath"]): item for item in items}
    for item in items:
        rel_path = str(item["relPath"])
        item["isPromoted"] = rel_path in promoted_sources
        for ref in item["references"]:
            target = _normalize_ref(str(ref["path"]))
            if target in items_by_rel_path:
                usage_map.setdefault(target, []).append(
                    {
                        "id": str(item["id"]),
                        "title": str(item["title"]),
                        "stage": str(item["stage"]),
                        "relPath": rel_path,
                    }
                )

    for item in items:
        rel_path = str(item["relPath"])
        usages = usage_map.get(rel_path, [])
        for link in manual_used_by.get(rel_path, []):
            usage = _to_usage(link, items_by_rel_path)
            if not any(existing["relPath"] == usage["relPath"] for existing in usages):
                usages.append(usage)
        item["usedBy"] = sorted(usages, key=lambda usage: (STAGE_ORDER.get(usage["stage"], 99), usage["id"]))
        if str(item["stage"]) == "request" and any(usage["stage"] in {"backlog", "task"} for usage in usages):
            item["isPromoted"] = True
        if str(item["stage"]) == "backlog" and any(usage["stage"] == "task" for usage in usages):
            item["isPromoted"] = True

    items.sort(key=lambda item: (STAGE_ORDER.get(str(item["stage"]), 99), str(item["id"])))
    for item in items:
        item["updatedAt"] = datetime.fromtimestamp(Path(str(item["path"])).stat().st_mtime).isoformat()
    return items
