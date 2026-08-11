## item_698_stop_reading_a_mentioned_reference_as_a_lineage_link - Stop reading a mentioned reference as a lineage link
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Stop reading a mentioned reference as a lineage link
- Keywords: backlog-groom, request, stop reading a mentioned reference as a lineage link, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Stop reading a mentioned reference as a lineage link.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
A document must be able to name prior art without inheriting it. Today it cannot: mentioning another chain's reference anywhere in the body — a sentence of context, a line under `# References` — makes that chain a parent for audit purposes.
Two consequences, and the second is the dangerous one.
**Lifecycle is inherited from a stranger.** Deferred findings become blocking as soon as *any* linked task is Done. Citing a finished chain therefore flips a brand-new Draft request's findings from "expected at closeout" to "blocking", for work nobody has started.
**Proof is inherited from a stranger.** Because proof is matched by AC identifier only, an unrelated linked document that proved its own `AC1` through `AC4` silently satisfies this request's `AC1` through `AC4`. They are different criteria that happen to share a numbering scheme.
Observed 2026-08-11 while filing a request about audit reporting. It cited the earlier lifecycle-aware-findings work as prior art. The audit reported exactly one blocking finding — its `AC5` — because the cited chain had proved four criteria and stopped there. Four unproven criteria read as proven, and the one that surfaced did so for a reason unrelated to its own state. The workaround was to delete the citation, which is the wrong direction: it makes the corpus poorer to keep the audit honest.
Silence is what makes this severe. Nothing reports that a link was inferred, so a false parent is invisible until it changes an outcome — and when it hides a gap rather than inventing one, it never changes an outcome at all.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: Lineage is derived only from the declared link sections of a document; a reference appearing in narrative prose does not create a parent or child relationship.
- AC2: A document may cite any other document by reference in its body without changing its own findings, its lifecycle state, or its proof coverage.
- AC3: Acceptance proof is matched within the declared chain only, so a criterion sharing an identifier with an unrelated document's criterion is never counted as proven.
- AC4: A document whose only link to a parent is a prose mention is reported once, naming the document, the inferred parent, and the section the link belongs in — so no existing lineage disappears without being announced.
- AC5: Tests cover a prose citation of a Done chain leaving findings deferred, an AC id shared across two unrelated chains staying unproven on both sides, and the announcement in AC4 firing exactly once per document.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Lineage is derived only from the declared link sections of a document; a reference appearing in narrative prose does not create a parent or child relationship.
- request-AC2 -> This backlog slice. Proof: AC2: A document may cite any other document by reference in its body without changing its own findings, its lifecycle state, or its proof coverage.
- request-AC3 -> This backlog slice. Proof: AC3: Acceptance proof is matched within the declared chain only, so a criterion sharing an identifier with an unrelated document's criterion is never counted as proven.
- request-AC4 -> This backlog slice. Proof: AC4: A document whose only link to a parent is a prose mention is reported once, naming the document, the inferred parent, and the section the link belongs in — so no existing lineage disappears without being announced.
- request-AC5 -> This backlog slice. Proof: AC5: Tests cover a prose citation of a Done chain leaving findings deferred, an AC id shared across two unrelated chains staying unproven on both sides, and the announcement in AC4 firing exactly once per document.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_337_stop_reading_a_mentioned_reference_as_a_lineage_link.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_337_stop_reading_a_mentioned_reference_as_a_lineage_link` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_337_stop_reading_a_mentioned_reference_as_a_lineage_link.md`.
- Generated locally by logics-manager.
- Task `task_334_stop_reading_a_mentioned_reference_as_a_lineage_link` was finished via `logics-manager flow finish task` on 2026-08-11.

# Tasks
- `task_334_stop_reading_a_mentioned_reference_as_a_lineage_link`
