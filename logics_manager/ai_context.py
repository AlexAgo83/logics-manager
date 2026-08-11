"""The `# AI Context` block a generator writes, and the check that it was groomed.

`# AI Context` exists so an agent can decide, cheaply, whether to open a document.
That only works if its lines say something the title does not -- and as generated they
did not. `flow new request --title "Keep deferred traceability findings out of the
default audit report"` produced, verbatim, *Summary: Draft a bounded request for keep
deferred traceability findings out of the default audit report*: the title, lowercased,
behind a fixed prefix. Keywords named the tool (`logics-manager, python runtime`)
rather than the subject, and `Use when` described the act of scaffolding.

Nothing ever asked for it to be replaced, so delivered documents still carried it, and
the cost was paid on every read, by every agent, forever: four lines spent to learn the
title a second time.

Two directions were open. **Generate better** -- derive a real summary from the body --
risks producing plausible filler, which is the failure this is about. **Prompt to
fill** makes the gap visible instead of disguising it, and is what this does.

The placeholder set the audit checks against is derived from what is written here, so a
template cannot move and leave the check blind to it -- which is exactly what had
happened: the tuple in audit.py held three strings the scaffold no longer emitted.
"""

from __future__ import annotations

import re

#: The marker a generator writes where a human or agent must say something real.
UNFILLED = "(unfilled: replace before this doc is used)"

#: Words that say nothing about a subject, so they never become keywords.
_STOPWORDS = frozenset(
    """a an and are as at be but by for from give had has have how in into is it its keep
    make of on or so stop that the their then there these this to up use used using was
    what when where which who why will with without every one every""".split()
)


def keywords_for(title: str) -> str:
    """Keywords describing the subject of the document, not the tool that made it."""
    words = [word for word in re.findall(r"[A-Za-z0-9]+", title.lower()) if word not in _STOPWORDS and len(word) > 2]
    # Ten is the audit's own limit; a title longer than that is trimmed, not rejected.
    return ", ".join(dict.fromkeys(words))[:200] or UNFILLED


def block(title: str) -> list[str]:
    """The generated `# AI Context` block: keywords derived, the rest asked for."""
    return [
        "# AI Context",
        f"- Summary: {UNFILLED}",
        f"- Keywords: {keywords_for(title)}",
        f"- Use when: {UNFILLED}",
        f"- Skip when: {UNFILLED}",
    ]


#: What the audit looks for. Derived from `block`, never hand-maintained beside it.
PLACEHOLDERS: tuple[str, ...] = (
    UNFILLED,
    # Retired wordings, kept so documents generated before this change are still
    # recognised as ungroomed rather than silently passing.
    "Summarize the need, scope, and expected outcome",
    "logics, workflow",
    "Use when framing scope, context, and acceptance checks",
    "Draft a bounded request for",
    "You need a new bounded request doc for the Logics workflow",
    "You need a bounded implementation task for a backlog item",
    "You need to implement or review the scaffolded workflow for",
    "request-chain-scaffold",
)


def is_ungroomed(value: str | None) -> bool:
    """True when an `# AI Context` field still carries generator wording."""
    if not value or not value.strip():
        return True
    lowered = value.lower()
    return any(snippet.lower() in lowered for snippet in PLACEHOLDERS)
