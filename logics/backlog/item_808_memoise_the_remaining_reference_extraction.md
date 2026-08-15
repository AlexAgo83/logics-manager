## item_808_memoise_the_remaining_reference_extraction - Memoise the remaining reference extraction
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Not re-reading what was just read
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: memoise, remaining, reference, extraction
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `_extract_refs` is called 8127 times per audit for 0.38s. The memo added in an earlier wave covers `_declared_refs`; the calls that remain come from `_prose_only_refs`, which scans a document's whole text for every target kind.
- The same document's text is scanned repeatedly for the same prefix, which is the same defect the earlier memo fixed one level up.

# Scope
- In:
  - Memoise prose-level extraction per document and prefix, on the same per-run instance the existing memo uses.
  - Confirm the audit payload is unchanged.
- Out:
  - A process-wide or persistent cache: the memo must not outlive a run, since the documents are re-read each time.
  - Changing the reference syntax or which prefixes are recognised.

# Acceptance criteria
- AC1: A document's text is scanned at most once per target prefix per audit run.
- AC2: The audit payload for this repository's corpus is unchanged.

# Report
- `_prose_only_refs` scanned a document's whole text once per target kind, and is asked for several kinds per document -- 8127 calls to `_extract_refs` per audit for 0.38s. The result is memoised per prefix on the same per-run `DocMeta` instance the declared-refs memo uses, so it cannot outlive the read of the file it describes.
- With item_807, the audit went 1.03s to 0.91s on this repository's corpus, payload byte-identical.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: A document's text is scanned at most once per target prefix per audit run.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_095_corpus_screens_that_stay_usable_as_the_corpus_grows`
- Architecture decision(s): (none yet)
- Request: `req_364_make_insights_and_health_answer_quickly_on_a_large_corpus`
- Primary task(s): `task_375_orchestrate_the_audit_cost_work_behind_insights_and_health`

# Priority
- Priority: Low - a real cost, and the smallest of them
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_375_orchestrate_the_audit_cost_work_behind_insights_and_health` was finished via `logics-manager flow finish task` on 2026-08-15.
