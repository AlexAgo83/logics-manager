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

import os
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
#: A Logics document reference, which is lineage rather than a code citation. `SKIP_DIRS`
#: excludes `logics` from the blob on purpose -- the check is about citations *into the
#: codebase* -- so asking the codebase whether `req_367_...` exists asks the one place it
#: never will, and every brief that cites its own request was reported as stale. Whether
#: these resolve is already the corpus's own question, answered by the link and lineage
#: checks in audit.py.
_WORKFLOW_REF = re.compile(r"^(?:req|item|task|prod|road|adr|spec|run)_\d+_")
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
            elif _WORKFLOW_REF.match(token):
                continue
            elif _SYMBOL.match(token) and "." not in token and not token.endswith("()"):
                # A bare dotted name is ambiguous with a filename, and `foo()` reads as
                # prose more often than as a grep target; both are left alone.
                symbols.add(token)
    return paths, symbols


#: item_807: the last blob per repository, with the (file count, newest mtime) it was read
#: at. The blob is 44 MB on this repository and was re-read on every audit, at a cost priced
#: by the size of the *repository* rather than of the corpus -- so it was charged in full
#: even when nothing about the corpus had changed. The walk still happens (it is what
#: produces the signature, and it is cheap); only the reading is skipped.
_REPO_BLOB_CACHE: dict[Path, tuple[tuple[int, int], str]] = {}


def _repo_blob(repo_root: Path) -> str:
    """The repository's source, once, as one string.

    Built only when a symbol actually needs checking, and only for open docs, so the
    candidate set is a handful of documents rather than the whole corpus.

    Kept as one string rather than a set of identifiers on purpose: the check is a
    substring test, so `foo` is satisfied by `foobar`. Splitting into tokens would report
    more symbols as missing, which is a change to what an audit finds, not to its cost.
    """
    paths: list[Path] = []
    count = 0
    newest = 0
    # `rglob` descends into a skipped directory and only then discards what it found there,
    # so `node_modules` alone accounted for most of the 43k entries this walk yielded on a
    # repo whose source is a few thousand files. `os.walk` prunes in place, before descending.
    for current, dirnames, filenames in os.walk(repo_root):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        for name in filenames:
            path = Path(current) / name
            if path.suffix not in SOURCE_SUFFIXES:
                continue
            try:
                stat = path.stat()
            except OSError:
                continue
            paths.append(path)
            count += 1
            newest = max(newest, stat.st_mtime_ns)

    signature = (count, newest)
    cached = _REPO_BLOB_CACHE.get(repo_root)
    if cached is not None and cached[0] == signature:
        return cached[1]

    chunks: list[str] = []
    for path in paths:
        try:
            chunks.append(path.read_text(encoding="utf-8", errors="ignore"))
        except OSError:
            continue
    blob = "\n".join(chunks)
    _REPO_BLOB_CACHE[repo_root] = (signature, blob)
    return blob


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
