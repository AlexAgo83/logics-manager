from __future__ import annotations

import os
import re
import sys


RESET = "\033[0m"
BOLD = "\033[1m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
MAGENTA = "\033[35m"
BLUE = "\033[34m"
RED = "\033[31m"


def _color_mode() -> str:
    value = os.environ.get("LOGICS_MANAGER_COLOR", "auto").strip().lower()
    if value in {"always", "auto", "never"}:
        return value
    return "auto"


def supports_color(stream=None) -> bool:
    if stream is None:
        stream = sys.stdout
    mode = _color_mode()
    if mode == "always":
        return True
    if mode == "never" or os.environ.get("NO_COLOR") is not None:
        return False
    return bool(getattr(stream, "isatty", lambda: False)())


def wrap(text: str, *codes: str) -> str:
    if not codes:
        return text
    return f"{''.join(codes)}{text}{RESET}"


_TITLE_RE = re.compile(r"^Logics .* CLI$")
_SECTION_RE = re.compile(r"^(Usage|Commands|Kinds|Top-level options|Runtime and diagnostics|Review and governance|Context and prompts|Examples|Flags):$")
_COMMAND_RE = re.compile(r"^\s{2,}[a-z][a-z0-9-]*(?:\s|$)")
_FLAG_LINE_RE = re.compile(r"^\s{4,}--")
_EXAMPLE_RE = re.compile(r"^\s{2,}logics-manager\b")


def colorize_help(text: str) -> str:
    if not supports_color():
        return text

    lines: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            lines.append(line)
            continue
        if _TITLE_RE.match(stripped):
            lines.append(wrap(line, BOLD, CYAN))
            continue
        if _SECTION_RE.match(stripped):
            lines.append(wrap(line, BOLD, MAGENTA))
            continue
        if _EXAMPLE_RE.match(line):
            lines.append(wrap(line, GREEN))
            continue
        if _FLAG_LINE_RE.match(line):
            lines.append(wrap(line, YELLOW))
            continue
        if _COMMAND_RE.match(line):
            lines.append(wrap(line, BLUE))
            continue
        lines.append(line)
    return "\n".join(lines)
