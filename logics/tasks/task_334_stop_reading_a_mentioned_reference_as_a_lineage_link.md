## task_334_stop_reading_a_mentioned_reference_as_a_lineage_link - Stop reading a mentioned reference as a lineage link
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 05:21:03

# AI Context
- Summary: Implement stop reading a mentioned reference as a lineage link.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

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
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-11.
- Linked backlog item(s): `item_698_stop_reading_a_mentioned_reference_as_a_lineage_link`
- Related request(s): `req_337_stop_reading_a_mentioned_reference_as_a_lineage_link`

# AC Traceability
- request-AC1 -> This task. Proof: `_declared_refs` reads refs only from the sections named in `DECLARED_LINK_SECTIONS`; `_linked_items_for_request`, `_linked_tasks_for_item` and `_linked_requests_for_item` all route through it, and the substring test `if item.ref in doc.text` is gone. Source: `ba000ba8`
- request-AC2 -> This task. Proof: `test_prose_citation_of_a_done_chain_leaves_findings_deferred` builds a Done chain and a fresh Draft chain that only mentions it in `# Context`; the fresh chain reports zero blocking issues and keeps its deferred warnings. Red before the change (findings were blocking), green after. Source: `ba000ba8`
- request-AC3 -> This task. Proof: `test_ac_ids_shared_across_unrelated_chains_stay_unproven_on_both_sides` gives the cited chain proof for AC1..AC4 and asserts the citing chain reports all five of its own AC unproven, not just AC5 — the exact failure observed while filing req_333. Source: `ba000ba8`
- request-AC4 -> This task. Proof: New `lineage_mentioned_but_not_declared` warning names the doc, the inferred parent and the section it belongs in. First measurement was taken with the installed `logics-manager` binary, which is a versioned copy and was still running pre-change code; it reported 0 and was wrong. Re-run through `python3 -m logics_manager`, the tightening did drop lineage: 4 blocking regressions on req_089..req_092, whose AC-to-item mapping lives in `# AC Traceability` and nowhere else, plus 234 announcements on closed legacy docs. Fixed by treating `# AC Traceability` as the declared section it is, and by scoping the announcement to open docs — history is not nagged. Corpus now: 0 blocking, 0 prose-only announcements. Source: `ba000ba8`, corrected in the follow-up commit.
- request-AC5 -> This task. Proof: Three tests added to `tests/python/test_audit_cli.py`, all three confirmed failing pre-fix via `git stash push logics_manager/audit.py`. Full suite 1310 passed; `logics-manager lint` OK and `audit` blocking 0. Source: `ba000ba8`

# Links
- Request: `req_337_stop_reading_a_mentioned_reference_as_a_lineage_link`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
