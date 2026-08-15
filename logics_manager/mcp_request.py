"""Request-document mutation helpers used by the MCP surface."""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urlparse

from .lint import expected_workflow_mermaid_signature

_GITHUB_ISSUE_URL = re.compile(r"^https://github\.com/[^/]+/[^/]+/issues/(\d+)/?$")


def _replace_section(lines: list[str], heading: str, replacement: list[str]) -> list[str]:
    start = next((index + 1 for index, line in enumerate(lines) if line.startswith("# ") and line[2:].strip().lower() == heading.lower()), None)
    if start is None:
        return lines
    end = next((index for index in range(start, len(lines)) if lines[index].startswith("# ")), len(lines))
    return [*lines[:start], *replacement, "", *lines[end:]]


def _section_content(lines: list[str], heading: str) -> list[str] | None:
    """The bullet lines already under `heading`, or None if the section is absent."""
    start = next((index + 1 for index, line in enumerate(lines) if line.startswith("# ") and line[2:].strip().lower() == heading.lower()), None)
    if start is None:
        return None
    end = next((index for index in range(start, len(lines)) if lines[index].startswith("# ")), len(lines))
    return [line for line in lines[start:end] if line.strip()]


def _upsert_section(lines: list[str], heading: str, replacement: list[str]) -> list[str]:
    updated = _replace_section(lines, heading, replacement)
    return updated if updated != lines else [*lines, "", f"# {heading}", *replacement]


def _write_signed_content(path: Path, lines: list[str]) -> None:
    content = "\n".join(lines)
    expected = expected_workflow_mermaid_signature("request", lines)
    if expected:
        content = re.sub(r"^(\s*%%\s*logics-signature:\s*).+$", rf"\g<1>{expected}", content, count=1, flags=re.MULTILINE)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def _provenance_lines(arguments: dict[str, object]) -> list[str]:
    origin = str(arguments.get("origin") or "human").strip()
    external_url = str(arguments.get("external_url") or "").strip()
    external_id = str(arguments.get("external_id") or "").strip()
    actor = str(arguments.get("actor") or "").strip()
    if external_url and (urlparse(external_url).scheme != "https" or not urlparse(external_url).netloc):
        raise ValueError("external_url must be an absolute HTTPS URL.")
    if origin == "github" and not _GITHUB_ISSUE_URL.match(external_url):
        raise ValueError("GitHub-originated requests require a GitHub issue URL.")
    lines = [f"- Origin: `{origin}`"]
    if actor:
        lines.append(f"- Actor: `{actor}`")
    if external_id:
        lines.append(f"- External id: `{external_id}`")
    if external_url:
        lines.append(f"- External issue: {external_url}")
    return [*lines, "- Approval: required before implementation starts."]


def update_created_request(repo_root: Path, rel_path: str, arguments: dict[str, object]) -> None:
    path = repo_root / rel_path
    lines = path.read_text(encoding="utf-8").splitlines()
    bullets = lambda key: [str(item).strip() for item in arguments.get(key, []) if str(item).strip()] if isinstance(arguments.get(key), list) else []
    acceptance = [
        "- AC{}: {}".format(index, re.sub(r"^AC\d+\s*:\s*", "", item).strip())
        for index, item in enumerate(bullets("acceptance_criteria"), start=1)
    ]
    lines = _replace_section(lines, "Needs", [f"- {item}" for item in bullets("needs")])
    lines = _replace_section(lines, "Context", [f"- {item}" for item in bullets("context")])
    lines = _replace_section(lines, "Acceptance criteria", acceptance)
    lines = _upsert_section(lines, "Provenance", _provenance_lines(arguments))
    _write_signed_content(path, lines)


def attach_issue(repo_root: Path, rel_path: str, issue_url: str, *, actor: str | None = None) -> dict[str, object]:
    """item_835: attach one GitHub issue to a request that already exists.

    Writes the same `# Provenance` shape intake already produces (item_835 AC1). A
    request that already names an issue keeps it -- the new id/issue bullets are
    appended, not a replacement (AC2) -- with `# Approval` staying the trailing line,
    matching the intake's own shape.
    """
    match = _GITHUB_ISSUE_URL.match(issue_url.strip())
    if not match:
        raise ValueError("Only a GitHub issue URL can be attached (https://github.com/<owner>/<repo>/issues/<number>).")
    number = match.group(1)
    path = repo_root / rel_path
    lines = path.read_text(encoding="utf-8").splitlines()
    existing = _section_content(lines, "Provenance")
    if existing is None:
        provenance = _provenance_lines({"origin": "human", "actor": actor or "", "external_id": f"#{number}", "external_url": issue_url})
    else:
        kept = [line for line in existing if not line.strip().lower().startswith("- approval:")]
        provenance = [*kept, f"- External id: `#{number}`", f"- External issue: {issue_url}", "- Approval: required before implementation starts."]
    lines = _upsert_section(lines, "Provenance", provenance)
    _write_signed_content(path, lines)
    return {"path": Path(rel_path).as_posix(), "issue_url": issue_url, "issue_number": number}
