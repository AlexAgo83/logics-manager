## task_334_stop_reading_a_mentioned_reference_as_a_lineage_link - Stop reading a mentioned reference as a lineage link
> From version: 2.21.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Implement stop reading a mentioned reference as a lineage link.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_698_stop_reading_a_mentioned_reference_as_a_lineage_link`

# Acceptance criteria
- AC1: Lineage is derived only from the declared link sections of a document; a reference appearing in narrative prose does not create a parent or child relationship.
- AC2: A document may cite any other document by reference in its body without changing its own findings, its lifecycle state, or its proof coverage.
- AC3: Acceptance proof is matched within the declared chain only, so a criterion sharing an identifier with an unrelated document's criterion is never counted as proven.
- AC4: A document whose only link to a parent is a prose mention is reported once, naming the document, the inferred parent, and the section the link belongs in — so no existing lineage disappears without being announced.
- AC5: Tests cover a prose citation of a Done chain leaving findings deferred, an AC id shared across two unrelated chains staying unproven on both sides, and the announcement in AC4 firing exactly once per document.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_334_stop_reading_a_mentioned_reference_as_a_lineage_link.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_334_stop_reading_a_mentioned_reference_as_a_lineage_link.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_337_stop_reading_a_mentioned_reference_as_a_lineage_link`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
