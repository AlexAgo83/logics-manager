"""Check that what a workflow doc says about the code is still true.

A `# Context` or `# References` section earns its cost by pointing at real code.
Those pointers age -- files move, functions are renamed -- and nothing reported it:
`companion_doc_refs_missing_target` checks references *between* workflow documents,
and there was no equivalent for references *into* the codebase. A missing pointer
costs a search; a wrong one costs a search plus the time spent believing it, and an
agent has no instinct that says "this file felt like it should exist".

Two tiers, and deliberately not a third:

* a **path** either exists or does not -- decidable, reported as a plain warning;
* a **symbol** can only be searched for, so its absence is strong evidence and not
  proof -- reported as a deferred hint, which keeps it out of the default report;
* a **line number** is stale almost immediately and is never checked at all.
"""

from __future__ import annotations

import re
from pathlib import Path

from .doc_parsing import section_lines

#: Where a document points at code. Prose elsewhere is not an anchor.
ANCHOR_SECTIONS = ("References", "Context")

#: Directories that are never the subject of a code anchor, or are too large to scan.
SKIP_DIRS = {".git", "node_modules", "logics", "dist", "out", "__pycache__", ".venv", "coverage"}

#: Extensions worth reading when looking for a symbol.
SOURCE_SUFFIXES = {".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".md", ".html", ".css", ".sh", ".yml", ".yaml", ".toml"}

_BACKTICKED = re.compile(r"`([^`\n]+)`")
#: A symbol: an identifier, optionally dotted or ending in (). Not a path, not prose.
_SYMBOL = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*(?:\(\))?$")


def _anchor_text(text: str) -> list[str]:
    lines = text.splitlines()
    return [line for heading in ANCHOR_SECTIONS for line in section_lines(lines, heading)]


def _strip_locator(token: str) -> str:
    """Drop a trailing `:123` or `:12-34`. Line numbers are never validated."""
    return re.sub(r":\d+(?:-\d+)?$", "", token).strip()


def anchors(text: str) -> tuple[set[str], set[str]]:
    """Split a document's backticked code anchors into (paths, symbols)."""
    paths: set[str] = set()
    symbols: set[str] = set()
    for line in _anchor_text(text):
        for raw in _BACKTICKED.findall(line):
            token = _strip_locator(raw)
            if not token or " " in token:
                continue
            if "/" in token:
                paths.add(token.rstrip("/"))
            elif _SYMBOL.match(token) and "." not in token and not token.endswith("()"):
                # A bare dotted name is ambiguous with a filename, and `foo()` reads as
                # prose more often than as a grep target; both are left alone.
                symbols.add(token)
    return paths, symbols


def _repo_blob(repo_root: Path) -> str:
    """The repository's source, once, as one string.

    Built only when a symbol actually needs checking, and only for open docs, so the
    candidate set is a handful of documents rather than the whole corpus.
    """
    chunks: list[str] = []
    for path in repo_root.rglob("*"):
        if not path.is_file() or path.suffix not in SOURCE_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(repo_root).parts):
            continue
        try:
            chunks.append(path.read_text(encoding="utf-8", errors="ignore"))
        except OSError:
            continue
    return "\n".join(chunks)


def unresolved_anchors(repo_root: Path, text: str, *, blob: list[str | None] | None = None) -> tuple[list[str], list[str]]:
    """Return (missing paths, missing symbols) for one document.

    `blob` is a one-slot cache the caller passes across documents so the repository
    is read at most once per audit.
    """
    paths, symbols = anchors(text)
    missing_paths = sorted(path for path in paths if not (repo_root / path).exists())
    if not symbols:
        return missing_paths, []
    if blob is None:
        blob = [None]
    if blob[0] is None:
        blob[0] = _repo_blob(repo_root)
    return missing_paths, sorted(symbol for symbol in symbols if symbol not in blob[0])
