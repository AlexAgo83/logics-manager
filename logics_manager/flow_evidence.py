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


def has_ac_traceability_line(text: str, ac_id: str) -> bool:
    """Whether a traceability line for `ac_id` exists at all, in any shape.

    Deliberately looser than `has_ac_proof`: a repair uses this to decide whether to leave
    an entry alone. It used to ask whether the criterion was *proven*, so a proof written
    by hand in a shape the strict check does not read got a placeholder appended beside it
    and the operator deleted one of the two. Skipping never destroys authored content;
    replacing can.
    """
    pattern = re.compile(rf"^\s*-\s*request-{re.escape(ac_id)}\b", re.IGNORECASE | re.MULTILINE)
    return bool(pattern.search(text))


def ac_proof_state(text: str, ac_id: str) -> str:
    """`proven`, `placeholder` when a repair prepared the line, or `missing`."""
    line = _ac_line(text, ac_id)
    if line is None:
        return "missing"
    return "placeholder" if AC_PROOF_PLACEHOLDER.split(" --")[0] in line else "proven"


def has_ac_proof(text: str, ac_id: str, *, legacy: bool = False) -> bool:
    """Whether `ac_id` is proven in `text`.

    `legacy` is the looser rule kept for documents written before the per-line format
    existed: the criterion named anywhere and the keyword present anywhere. It lived in
    the audit while the closeout gate used the strict rule, which is why the two answered
    the same question differently on the same document. One implementation now, with the
    allowance named rather than duplicated.
    """
    if legacy:
        return (ac_id.upper() in text.upper()) and ("proof:" in text.lower())
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


# --- Per-criterion evidence capture (req_338) -------------------------------------
#
# Proof used to be writable only for a whole request at once, with one shared string
# landing on every criterion still missing an entry. That shape is right for filling
# structural gaps and wrong for evidence: one sentence cannot be true of AC1 and AC5
# at once, so the text that satisfies the check is necessarily vaguer than the check
# intends -- and it is written at closeout, hours after the thing it describes was
# true. A latency figure, a transport checked on three hosts, an icon captured from a
# real session: each was re-derived from memory, and one of them was wrong because the
# process being measured had exited early. Proof written from memory cannot catch its
# own invalidity.
#
# Records are append-only bullets in the task's own `# Evidence` section: a re-run
# after a fix is the common case, and the second result is not always the interesting
# one.

EVIDENCE_SECTION = "Evidence"
_EVIDENCE_LINE = re.compile(r"^-\s*(AC\d+)\s*\|\s*(.+)$", re.IGNORECASE)


def evidence_line(ac_id: str, summary: str, command: str | None, result: str | None) -> str:
    """One append-only record, addressed to one acceptance criterion."""
    parts = [ac_id.upper(), f"date: {date.today().isoformat()}"]
    if command and command.strip():
        # What was actually run, not only a claim about it -- this is what separates a
        # record from a faster way to write the same sentence.
        parts.append(f"command: `{command.strip()}`")
    if result and result.strip():
        parts.append(f"result: {result.strip().lower()}")
    parts.append(summary.strip())
    return "- " + " | ".join(parts)


def evidence_for_ac(text: str, ac_id: str) -> list[str]:
    """Every record captured for `ac_id`, in the order they were captured."""
    wanted = ac_id.strip().upper()
    records: list[str] = []
    for line in section_lines(text.splitlines(), EVIDENCE_SECTION):
        match = _EVIDENCE_LINE.match(line.strip())
        if match and match.group(1).upper() == wanted:
            records.append(match.group(2).strip())
    return records


def composed_ac_proof(text: str, ac_id: str) -> str | None:
    """Proof for `ac_id` composed from its records, or None if none were captured."""
    records = evidence_for_ac(text, ac_id)
    if not records:
        return None
    if len(records) == 1:
        return records[0]
    # Both kept, in order: a re-run after a fix is the common case.
    return " Then: ".join(records)
