"""Shared execution table contract for workflow writers and readers."""
from __future__ import annotations

import html
import re
from datetime import datetime
from urllib.parse import urlsplit

from .doc_parsing import FENCED_BLOCK_PATTERN

COLUMNS = ("When", "Runner", "Run id", "Title", "State", "PR", "Notes")
STATES = ("queued", "running", "succeeded", "failed", "cancelled", "merged", "closed")
HEADER = "| " + " | ".join(COLUMNS) + " |\n| " + " | ".join("---" for _ in COLUMNS) + " |\n"


def section_bounds(text: str) -> tuple[int, int] | None:
    masked = FENCED_BLOCK_PATTERN.sub(lambda match: re.sub(r"[^\r\n]", " ", match.group()), text)
    headings = list(re.finditer(r"^# Executions[ \t]*\r?$", masked, re.MULTILINE))
    if len(headings) > 1:
        raise ValueError("Executions: duplicate section")
    if not headings:
        return None
    start = headings[0].start()
    following = re.search(r"^# [^\n]+", masked[headings[0].end():], re.MULTILINE)
    end = headings[0].end() + following.start() if following else len(text)
    return start, end


def valid_pr(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        return bool(parsed.scheme in {"http", "https"} and parsed.hostname and (parsed.port is None or 0 <= parsed.port <= 65535) and not parsed.username and not parsed.password and not re.search(r"\s", value))
    except ValueError:
        return False


def parse_executions(text: str) -> list[dict[str, str]]:
    bounds = section_bounds(text)
    if bounds is None:
        return []
    lines = [line.strip() for line in text[bounds[0]:bounds[1]].splitlines()[1:] if line.strip()]
    if len(lines) < 2:
        raise ValueError("Executions: expected a markdown table")
    def cells(line: str) -> list[str]:
        if not line.startswith("|") or not line.endswith("|"):
            raise ValueError("Executions: expected table row")
        return [html.unescape(cell.strip()) for cell in line[1:-1].split("|")]
    if cells(lines[0]) != list(COLUMNS) or len(cells(lines[1])) != len(COLUMNS) or not all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells(lines[1])):
        raise ValueError("Executions: invalid columns or separator")
    rows = []
    seen = set()
    for line in lines[2:]:
        values = cells(line)
        if len(values) != len(COLUMNS):
            raise ValueError("Executions: invalid column count")
        row = dict(zip(COLUMNS, values))
        if row["State"] not in STATES:
            raise ValueError("Executions: invalid state")
        try:
            stamp = datetime.fromisoformat(row["When"].replace("Z", "+00:00"))
            if stamp.tzinfo is None:
                raise ValueError()
        except ValueError as exc:
            raise ValueError("Executions: invalid date (expected ISO 8601 with timezone)") from exc
        key = (row["Runner"], row["Run id"])
        if not all(key) or key in seen:
            raise ValueError("Executions: empty or duplicate runner/run id")
        if row["PR"] and not valid_pr(row["PR"]):
            raise ValueError("Executions: invalid PR URL")
        seen.add(key)
        rows.append(row)
    return sorted(rows, key=lambda row: datetime.fromisoformat(row["When"].replace("Z", "+00:00")), reverse=True)


def render_executions(rows: list[dict[str, str]]) -> str:
    def escape(value: str) -> str:
        return html.escape(value, quote=False).replace("|", "&#124;").replace("\r", " ").replace("\n", " ")
    return "# Executions\n" + HEADER + "".join("| " + " | ".join(escape(row[column]) for column in COLUMNS) + " |\n" for row in rows) + "\n"


def replace_executions(text: str, rows: list[dict[str, str]]) -> str:
    bounds = section_bounds(text)
    section = render_executions(rows)
    if bounds is None:
        return text + ("\n" if text.endswith("\n") else "\n\n") + section
    return text[:bounds[0]] + section + text[bounds[1]:]


def execution_summary(text: str) -> dict[str, object]:
    try:
        rows = parse_executions(text)
    except ValueError as exc:
        return {"rows": [], "older_count": 0, "error": str(exc)}
    return {"rows": rows[:20], "older_count": max(0, len(rows) - 20)}


def bounded_execution_text(summary: dict[str, object]) -> str:
    rows = summary["rows"]
    if not rows and not summary.get("error"):
        return ""
    section = render_executions(rows)
    if summary.get("error"):
        section += str(summary["error"]) + "\n"
    if summary["older_count"]:
        section += f"{summary['older_count']} older executions omitted.\n"
    return section


def execution_read_content(text: str, selected_sections: dict, max_chars: int) -> tuple[str, str, dict]:
    summary = execution_summary(text)
    execution_text = bounded_execution_text(summary)
    try:
        bounds = section_bounds(text)
    except ValueError:
        bounds = None
    if bounds and execution_text:
        text = text[:bounds[0]] + text[bounds[1]:]
    content = text[:max_chars]
    if execution_text:
        selected_sections["Executions"] = execution_text.splitlines()[1:]
        content += "\n" + execution_text
    return text, content, summary


def execution_audit_findings(text: str) -> list[tuple[str, str]]:
    try:
        runs = parse_executions(text)
    except ValueError as exc:
        return [("executions_invalid", str(exc))]
    if runs and runs[0]["State"] == "failed":
        return [("execution_failed", "Latest execution failed and needs attention")]
    return []


def execution_pack_fields(sections: dict) -> dict:
    summary = execution_summary("# Executions\n" + "\n".join(sections["Executions"])) if "Executions" in sections else execution_summary("")
    return {"executions": summary, "execution_table": bounded_execution_text(summary) or (render_executions([]) if "Executions" in sections else "")}
