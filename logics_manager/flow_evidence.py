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


FAILURE_WORD_PATTERN = re.compile(r"\b(failed|failures?|failing)\b")
# "0 failures", "no failures", "zero failures" state a clean result. Matching the
# bare substring rejected the most precise evidence available, which is what the
# v2.10.0 hardening got wrong.
NEGATED_FAILURE_PATTERN = re.compile(r"\b(?:0|no|zero|without)\s+(?:\w+\s+)?failures?\b")


def has_validation_evidence(text: str) -> bool:
    concrete_ok_context = ("lint", "audit", "test", "pytest", "npm", "ci", "coverage", "smoke", "package")
    invalid_markers = ("...", "todo", "tbd", "pending", "needs ", "need ", "not ok")
    for line in section_lines(text.splitlines(), "Validation"):
        stripped = line.strip()
        if not stripped.startswith("- "):
            continue
        value = stripped[2:].strip().lower()
        if not value or value.startswith("run `") or value.startswith("run the ") or value.startswith("("):
            continue
        if any(marker in value for marker in invalid_markers):
            continue
        # A reported failure still disqualifies the line; a stated absence of
        # failures does not.
        if FAILURE_WORD_PATTERN.search(NEGATED_FAILURE_PATTERN.sub(" ", value)):
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


#: The shape a traceability line must take to count as a proof. Three things are
#: load-bearing and none of them used to be stated anywhere: the target is `This task.`,
#: the keyword is `Proof:`, and there is one line per criterion -- a line naming several
#: criteria is evidence for none of them, because one sentence cannot be the proof of
#: three different claims. The finding prints this, so the format is learned from the
#: finding rather than by running a repair to diff what it wrote.
AC_PROOF_FORMAT = "- request-{ac_id} -> This task. Proof: <how it was verified>"
AC_ITEM_PROOF_FORMAT = "- request-{ac_id} -> This backlog slice. Proof: <how it was verified>"
#: What a repair writes for a criterion with no line yet. It is deliberately not a proof:
#: a repair can prepare the line, it cannot know how the work was verified. Accepting it
#: would let the gate pass on a placeholder, which is the one thing worse than a gate that
#: is hard to satisfy.
AC_PROOF_PLACEHOLDER = "TODO -- state how this was verified"


def ac_proof_expectation(ac_id: str, *, target: str = "task") -> str:
    template = AC_PROOF_FORMAT if target == "task" else AC_ITEM_PROOF_FORMAT
    return template.format(ac_id=ac_id)


def _ac_line(text: str, ac_id: str) -> str | None:
    """The traceability line for `ac_id`, proven or not."""
    ac_pattern = re.compile(rf"(?<![A-Z0-9]){re.escape(ac_id.upper())}(?![A-Z0-9])")
    for line in text.splitlines():
        if "proof:" in line.lower() and ac_pattern.search(line.upper()):
            return line
    return None


def ac_proof_state(text: str, ac_id: str) -> str:
    """`proven`, `placeholder` when a repair prepared the line, or `missing`."""
    line = _ac_line(text, ac_id)
    if line is None:
        return "missing"
    return "placeholder" if AC_PROOF_PLACEHOLDER.split(" --")[0] in line else "proven"


def has_ac_proof(text: str, ac_id: str) -> bool:
    return ac_proof_state(text, ac_id) == "proven"


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
