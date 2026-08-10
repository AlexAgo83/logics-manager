## item_675_backfill_schema_version_on_the_pre_schema_workflow_docs - Backfill schema version on the pre-schema workflow docs
> From version: 2.21.2
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 09:15:50

# AI Context
- Summary: Backfill schema version on the pre-schema workflow docs
- Keywords: backlog-groom, request, backfill schema version on the pre-schema workflow docs, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Backfill schema version on the pre-schema workflow docs.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
`logics-manager sync schema-status` reports `1311 workflow doc(s) scanned. (missing): 308, 1.0: 1003` — 23% of the corpus carries no `> Schema version:` indicator, so `logics-manager doctor` exits FAILED on this repository. The affected documents are the oldest, written before schema versioning existed (`item_123`), starting at `req_000_kickoff` and running through the early `req_0xx` range. Two outcomes are defensible: backfill the indicator, or declare pre-schema docs exempt. This slice takes the backfill, because an exemption creates a permanent blind spot over the oldest quarter of the corpus, while the indicator itself is a single line whose correct value for every one of these docs is already known to be `1.0`. There is no command to do it today: `sync schema-status` is read-only.

# Scope
- In:
  - A repeatable command that writes the missing `> Schema version: 1.0` indicator, rather than a one-off script — the same corpus problem will recur on any repository adopting Logics after the fact.
  - Apply it to the 308 documents, in a commit whose diff is one added line per file.
  - Leave every other indicator untouched, and do not trip the `modified without updating indicators` gate on 308 documents.
- Out:
  - Any change to what a schema version means or to the migration machinery in `item_123`.
  - Running the full doctor in CI — that is `item_676`, and it depends on this slice landing first.

# Acceptance criteria
- AC3: `logics-manager doctor` exits zero on this repository, with `sync schema-status` reporting zero missing, and the backfill is performed by a command that can be re-run on another corpus rather than by a one-off edit.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: `sync schema-status --apply` (with `--dry-run`) is delivered and covered by 5 tests, and was run over the corpus: `sync schema-status` now reports `1322 doc(s) scanned. - 1.0: 1322`, zero missing, and `logics-manager doctor` exits 0 on this repository. The 53 blocking placeholders it surfaced were resolved first; see the Notes.

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
- Request: `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose`
- Primary task(s): `task_322_orchestrate_the_diagnostics_and_release_surface_cleanup`

# Priority
- Priority: High
- Rationale: Set while scoping req_325's review findings.

# Notes
- The backfill was applied and reverted on 2026-08-10. Applying it wrote one line into 308 documents, which put a quarter of the corpus into the changed set, and `lint --require-status` then reported 361 findings: 308 mechanical `modified without updating indicators` (clearable with `--touch`) and **53 pre-existing placeholder violations that nothing had ever surfaced** -- 41 unfilled proof placeholders and 12 unmapped acceptance criteria, every one of them in a doc whose status is `Done`.
- Those 53 are real debt from before the proof discipline landed in 2.19.6. They are invisible today only because the lint checks documents in the current diff, and nobody has touched those files since. Writing 53 proofs for work delivered months ago would be inventing evidence, which is the failure mode this whole request exists to prevent, so it was not done.
- Resolved by naming the gap instead of inventing evidence for it. In those 53 documents, the bare proof placeholder became `Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.`, and the 42 unmapped criteria became `Scope mapping not recorded. Proof: <the same sentence>`. That is a true, checkable statement about what the record contains; writing a plausible proof would not have been. 524 proof lines and 42 mappings across 53 documents.
- Deliberately scoped to those 53. The corpus holds 1378 bare proof placeholders and 174 unmapped criteria in total; the lint only reports documents in the current diff, so the rest stay latent and untouched. Restating history corpus-wide is a policy decision this slice had no mandate to take.
- Hybrid rationale: Derived from request `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose.md`.
- Generated locally by logics-manager.
