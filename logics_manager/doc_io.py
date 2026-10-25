"""The one way a workflow command reads, rewrites and writes a Logics doc.

Three things used to go wrong between reading a doc and writing it back:

- `str.splitlines()` also splits on form feed, U+2028, U+0085 and friends, so a
  rewrite silently turned those characters into line breaks. Lines are split on
  `\\n` only here.
- `Path.write_text` wrote LF whatever the file used, so one `flow progress` on a
  CRLF doc rewrote every line. A doc keeps the newline style it already has.
- A crash halfway through a write left a truncated doc. Writes go to a temp file
  in the same directory and replace the doc in one `os.replace`.

Indicator rewrites belong to the header block only (`header_end`): a `> Status:`
line inside a fenced example in the body is text, not the doc's status.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path


def split_lines(text: str) -> list[str]:
    """`text` split on `\\n` only, without the empty string after a final newline."""
    lines = text.split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    return lines


def read_lines(path: Path) -> list[str]:
    return split_lines(path.read_text(encoding="utf-8"))


def read_raw(path: Path) -> str:
    """The doc exactly as stored, newline style included."""
    with open(path, encoding="utf-8", newline="") as handle:
        return handle.read()


def header_end(lines: list[str]) -> int:
    """Index just after the last indicator line of the header block.

    The header is line 1 (the `## ref - title` line) and the `> ` indicator lines
    under it. Blank lines may separate indicator groups (roadmaps and older docs
    write a blank line after the title), so the header ends at the first line that
    is neither blank nor `> `: the first heading, body text or code fence. Returns 1
    when there is no indicator, which is where a first indicator is inserted.
    """
    end = 1
    idx = 1
    while idx < len(lines) and (lines[idx].startswith("> ") or not lines[idx].strip()):
        if lines[idx].startswith("> "):
            end = idx + 1
        idx += 1
    return min(end, len(lines))


def write_doc(path: Path, text: str, *, exact: bool = False) -> None:
    """Atomically write `text` (LF newlines) to `path` in the doc's own newline style.

    `exact` writes `text` byte for byte, for restoring a snapshot taken with `read_raw`.
    """
    if not path.exists():
        # Nothing to lose yet, and a plain create keeps the process umask's mode.
        with open(path, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
        return
    mode = path.stat().st_mode & 0o7777
    if not exact and b"\r\n" in path.read_bytes():
        text = text.replace("\r\n", "\n").replace("\n", "\r\n")
    fd, tmp_name = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
        os.chmod(tmp_name, mode)
        os.replace(tmp_name, path)
    except BaseException:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise
