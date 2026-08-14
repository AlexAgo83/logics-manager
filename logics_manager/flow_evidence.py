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
#: What `flow scaffold request-chain` writes into a task's AC Traceability before any
#: work exists. Generated, not authored, so composing recorded proof over it destroys
#: nothing -- which is why it is named here rather than matched by shape at the call site.
AC_DEFERRED_PLACEHOLDER = "Proof deferred to slice closeout."


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


#: `request-<ac_id> -> <target>. Proof: <text>`, scoped to one line so a proof spanning
#: several lines (which the format doesn't support) is read as ending at the newline,
#: same as `_ac_line` above.
_AC_TRACE_LINE_PATTERN = re.compile(
    r"^\s*-\s*request-(?P<ac_id>[A-Za-z0-9_]+)\s*->\s*(?P<target>.+?)\.\s*Proof:\s*(?P<proof>.+?)\s*$",
    re.IGNORECASE,
)
#: The two self-referential targets a *leaf* document (one that did the work itself,
#: rather than delegating to a child item/task) writes. An orchestration task's own
#: lines point at a child ref instead (`` `item_669_...` ``) -- see `duplicate_proof_ac_ids`.
_SELF_PROOF_TARGETS = {"this task", "this backlog slice"}


def ac_proofs_by_id(text: str) -> dict[str, tuple[str, str]]:
    """`ac_id -> (target, proof text)` for every `request-ACn` line in this doc's own
    `# AC Traceability` section. A later line for a repeated id overwrites an earlier
    one, matching how the section is read elsewhere (last write wins)."""
    entries: dict[str, tuple[str, str]] = {}
    for line in section_lines(text.splitlines(), "AC Traceability"):
        match = _AC_TRACE_LINE_PATTERN.match(line)
        if match:
            entries[match.group("ac_id").upper()] = (match.group("target").strip(), match.group("proof").strip())
    return entries


def duplicate_proof_ac_ids(text: str) -> list[tuple[str, str]]:
    """Pairs of AC ids in this document whose proof text is identical once whitespace
    is normalized -- item_784/GH#20: a proof block shifted or copy-pasted across
    criteria leaves two different `request-ACn` lines carrying the same sentence.

    Deliberately a *signal to check*, not a verdict: this repository's own corpus
    (1497 docs, 350+ Done tasks) has two entirely legitimate patterns that produce the
    same shape -- an orchestration task delegating several ACs to the same child item
    with an identical redirect sentence, and a single implementation wave (one commit,
    one test run) that legitimately closes several ACs with one shared proof sentence.
    A prototype of this check as a *blocking* finding produced 437 false positives
    against exactly those patterns; it is wired in as a warning for a human to
    confirm, not a gate, for that reason. Scoped to lines whose target is the doc's
    own self-reference (`This task.` / `This backlog slice.`) to at least exclude the
    orchestration-redirect shape, which is unambiguous from the doc's own text.
    """
    entries = ac_proofs_by_id(text)
    placeholder_marker = AC_PROOF_PLACEHOLDER.split(" --")[0]
    seen: dict[str, str] = {}
    pairs: list[tuple[str, str]] = []
    for ac_id, (target, proof) in sorted(entries.items()):
        if target.strip().lower() not in _SELF_PROOF_TARGETS:
            continue
        if not proof or placeholder_marker in proof or proof == AC_DEFERRED_PLACEHOLDER:
            continue
        key = " ".join(proof.split()).lower()
        if key in seen:
            pairs.append((seen[key], ac_id))
        else:
            seen[key] = ac_id
    return pairs


# --- Local-AC-to-request-AC mapping (item_784 AC2/AC3, revised) -------------------
#
# AC2/AC3 as originally scoped tried to judge whether a proof's *text* "corresponds
# to" a criterion -- unanswerable by string matching alone, because a slice's own
# local AC numbering and the request's AC numbering are two independent lists with no
# declared correspondence between them (confirmed against a real document, item_786:
# 3 local ACs, 2 `request-ACn` traceability lines, because local AC3 is legitimately
# folded into AC1/AC2's proof rather than owning a dedicated line).
#
# The fix is not a smarter text match -- it's replacing "guess the correspondence
# from prose" with "let the author declare it, and check the declaration is
# consistent." A local AC may name which request AC(s) it backs:
#
#   - AC3 (backs request-AC1, request-AC2): <criterion text>
#
# Purely opt-in: a document that never writes `(backs ...)` gets neither check --
# `has_adopted_backs_annotation` is the gate every function below checks first, so
# the 350+ Done tasks written before this existed are never touched by it.

_LOCAL_AC_LINE = re.compile(r"^-\s*(?P<local_id>AC\d+)\s*(?:\(backs\s+(?P<backs>[^)]*)\))?\s*:", re.IGNORECASE)
_BACKS_TOKEN = re.compile(r"request-(AC\d+)", re.IGNORECASE)
_DECLARED_AC_LINE = re.compile(r"^\s*-\s*request-(?P<ac_id>[A-Za-z0-9_]+)\b", re.IGNORECASE | re.MULTILINE)


def local_ac_backs(text: str) -> dict[str, list[str]]:
    """`local AC id -> [request AC ids it declares backing]`, from this document's own
    `# Acceptance criteria` section. An id with an empty list wrote no `(backs ...)`
    annotation at all -- distinct from "the annotation isn't in use in this document",
    which callers check separately via `has_adopted_backs_annotation`."""
    result: dict[str, list[str]] = {}
    for line in section_lines(text.splitlines(), "Acceptance criteria"):
        match = _LOCAL_AC_LINE.match(line.strip())
        if not match:
            continue
        result[match.group("local_id").upper()] = [tok.upper() for tok in _BACKS_TOKEN.findall(match.group("backs") or "")]
    return result


def has_adopted_backs_annotation(text: str) -> bool:
    """Whether this document declares at least one `(backs request-ACn)` annotation --
    the opt-in gate for both `invalid_backs_references` and `unbacked_local_ac_ids`."""
    return any(local_ac_backs(text).values())


def declared_request_ac_ids(text: str) -> set[str]:
    """Every request-ACn id this document's own `# AC Traceability` section names, in
    any shape (proven, placeholder, or deferred) -- what a `(backs ...)` annotation is
    checked against."""
    section = "\n".join(section_lines(text.splitlines(), "AC Traceability"))
    return {match.group("ac_id").upper() for match in _DECLARED_AC_LINE.finditer(section)}


def invalid_backs_references(text: str) -> list[tuple[str, str]]:
    """`(local_ac_id, request_ac_id)` pairs where a `(backs request-ACn)` annotation
    names a request AC this document's own `# AC Traceability` section has no line
    for at all -- a declared mapping to something that doesn't exist in this document,
    which is wrong rather than merely unproven (item_784 AC2, revised)."""
    if not has_adopted_backs_annotation(text):
        return []
    declared = declared_request_ac_ids(text)
    return [
        (local_id, request_id)
        for local_id, backs in sorted(local_ac_backs(text).items())
        for request_id in backs
        if request_id not in declared
    ]


def unbacked_local_ac_ids(text: str) -> list[str]:
    """Local AC ids with no `(backs request-ACn)` annotation, in a document that has
    adopted the annotation on at least one other AC -- an orphaned slice criterion
    the request never asked for (item_784 AC3, revised). Silent in a document that
    hasn't adopted the annotation at all, which is every document written before it
    existed."""
    backs_map = local_ac_backs(text)
    if not any(backs_map.values()):
        return []
    return sorted(local_id for local_id, backs in backs_map.items() if not backs)


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
