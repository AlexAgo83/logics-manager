"""Provenance is data, not prose (item_836).

`# Provenance` sections carry which GitHub issues a request came from, or was later
attached to, as `- External issue: <url>` bullets -- but only as prose, so "which issues
does this corpus cover" and "which request covers issue 20" could only be answered by
grepping. This reads what is already written (the intake's shape, `mcp_request.py`'s
`_provenance_lines`), without changing how it is written or migrating anything.

A request can name more than one issue: `_provenance_lines` writes one `External issue:`
bullet, and `attach_issue` (item_835) appends more under the same section rather than
replacing it, so a request accumulates one bullet per attached issue.
"""

from __future__ import annotations

import re
from pathlib import Path

_EXTERNAL_ISSUE_LINE = re.compile(r"^-\s*External issue:\s*(\S+)", re.IGNORECASE)
_ISSUE_URL_NUMBER = re.compile(r"/issues/(\d+)/?$")
_BARE_ISSUE_NUMBER = re.compile(r"^#?(\d+)$")


def issue_number(value: str) -> str | None:
    """The bare issue number from a GitHub issue URL, `#20`, or `20` -- or nothing."""
    stripped = value.strip()
    match = _ISSUE_URL_NUMBER.search(stripped) or _BARE_ISSUE_NUMBER.match(stripped)
    return match.group(1) if match else None


def request_issue_urls(repo_root: Path, rel_path: str) -> list[str]:
    """The issue URLs a request's `# Provenance` section names, in the order written.

    Empty for a request with no Provenance section -- item_836 AC2: nothing, not an
    error.
    """
    path = repo_root / rel_path
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return []
    urls: list[str] = []
    in_section = False
    for line in lines:
        if line.startswith("# "):
            in_section = line[2:].strip().lower() == "provenance"
            continue
        if in_section:
            match = _EXTERNAL_ISSUE_LINE.match(line.strip())
            if match:
                urls.append(match.group(1).rstrip("/"))
    return urls


def all_request_provenance(repo_root: Path) -> dict[str, list[str]]:
    """Every request ref that names at least one issue, mapped to those issue URLs."""
    request_dir = repo_root / "logics" / "request"
    if not request_dir.is_dir():
        return {}
    result: dict[str, list[str]] = {}
    for path in sorted(request_dir.glob("req_*.md")):
        urls = request_issue_urls(repo_root, path.relative_to(repo_root).as_posix())
        if urls:
            result[path.stem] = urls
    return result


def requests_for_issue(repo_root: Path, issue: str) -> list[str]:
    """Which request ref(s) name this issue -- by URL, `#20`, or `20`."""
    target = issue_number(issue)
    if target is None:
        return []
    return [ref for ref, urls in all_request_provenance(repo_root).items() if any(issue_number(url) == target for url in urls)]
