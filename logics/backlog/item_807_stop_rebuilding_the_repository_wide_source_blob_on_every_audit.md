## item_807_stop_rebuilding_the_repository_wide_source_blob_on_every_audit - Stop rebuilding the repository-wide source blob on every audit
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Work priced by the repository rather than the corpus
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: rebuilding, repository, wide, source, blob, audit
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `_repo_blob` reads every source file in the repository into one 44 MB string on each audit, to answer whether a backticked symbol appears anywhere. It costs 0.25s here and is paid again on every run.
- Its cost tracks the size of the repository, not the size of the corpus, so it is charged in full even when nothing about the corpus has changed.

# Scope
- In:
  - Reuse the blob across audits while the source is unchanged, or replace it with a set of identifiers built once -- whichever is measured to be better.
  - Keep the current answers: a symbol reported as missing today must still be reported as missing.
- Out:
  - Changing which sections are treated as code anchors, or which tokens count as a symbol.
  - Changing the deferred-hint severity of a missing symbol.

# Acceptance criteria
- AC1: Two consecutive audits with unchanged source read the repository's files once, not twice.
- AC2: The unresolved-anchor findings for this repository's corpus are unchanged.

# Report
- `_repo_blob` caches its result per repository against a (file count, newest mtime) signature gathered during the same walk it already performs. The walk still happens -- it is what produces the signature, and it is cheap -- and only the 44 MB of reading is skipped: 0.199s to 0.095s on this repository.
- Kept as one string rather than replaced by a set of identifiers, deliberately. The check is a substring test, so `foo` is satisfied by `foobar`; splitting into tokens would report more symbols as missing, which is a change to what an audit finds rather than to what it costs.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Two consecutive audits with unchanged source read the repository's files once, not twice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_095_corpus_screens_that_stay_usable_as_the_corpus_grows`
- Architecture decision(s): (none yet)
- Request: `req_364_make_insights_and_health_answer_quickly_on_a_large_corpus`
- Primary task(s): `task_375_orchestrate_the_audit_cost_work_behind_insights_and_health`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
