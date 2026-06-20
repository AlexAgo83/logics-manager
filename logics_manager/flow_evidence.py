from __future__ import annotations

from datetime import date
import re


SUCCESS_RESULTS = {"pass", "passed", "ok", "success", "succeeded"}
SUCCESS_WORD_PATTERN = re.compile(r"\b(pass(?:ed)?|validated|verified|verification|regression)\b")
OK_WORD_PATTERN = re.compile(r"\bok\b")


def section_lines(lines: list[str], heading: str) -> list[str]:
    start_idx = None
    target = heading.strip().lower()
    for idx, line in enumerate(lines):
        if line.startswith("# ") and line[2:].strip().lower() == target:
            start_idx = idx + 1
            break
    if start_idx is None:
        return []
    out: list[str] = []
    for idx in range(start_idx, len(lines)):
        line = lines[idx]
        if line.startswith("# "):
            break
        out.append(line)
    return out


def has_validation_evidence(text: str) -> bool:
    concrete_ok_context = ("lint", "audit", "test", "pytest", "npm", "ci", "coverage", "smoke", "package")
    invalid_markers = ("...", "todo", "tbd", "pending", "needs ", "need ", "not ok", "failed", "failure", "failing")
    for line in section_lines(text.splitlines(), "Validation"):
        stripped = line.strip()
        if not stripped.startswith("- "):
            continue
        value = stripped[2:].strip().lower()
        if not value or value.startswith("run `") or value.startswith("run the "):
            continue
        if any(marker in value for marker in invalid_markers):
            continue
        if "command:" in value and "result:" in value and ("date:" in value or "session:" in value):
            result_match = re.search(r"\bresult:\s*([^|,;]+)", value)
            result = result_match.group(1).strip() if result_match else ""
            if result in SUCCESS_RESULTS:
                return True
        if SUCCESS_WORD_PATTERN.search(value):
            return True
        if OK_WORD_PATTERN.search(value) and any(marker in value for marker in concrete_ok_context):
            return True
    return False


def has_ac_proof(text: str, ac_id: str) -> bool:
    ac_pattern = re.compile(rf"(?<![A-Z0-9]){re.escape(ac_id.upper())}(?![A-Z0-9])")
    for line in text.splitlines():
        if "proof:" not in line.lower():
            continue
        if ac_pattern.search(line.upper()):
            return True
    return False


def structured_validation_line(command: str, result: str, note: str | None) -> str:
    normalized_result = result.strip().lower() or "passed"
    parts = [
        f"command: `{command.strip()}`",
        f"result: {normalized_result}",
        f"date: {date.today().isoformat()}",
    ]
    if note and note.strip():
        parts.append(f"note: {note.strip()}")
    return " | ".join(parts)
