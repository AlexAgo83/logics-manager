## item_841_answer_nothing_changed_without_rebuilding_the_corpus - Answer 'nothing changed' without rebuilding the corpus
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Cheap enough to ask often
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 17:28:49

# AI Context
- Summary: A 304 on /api/items costs 0.156s because the 6.17 MB payload is rebuilt and hashed to discover nothing changed; corpus_signature answers that in 6ms.
- Keywords: etag, corpus signature, 304, payload rebuild
- Use when: Deciding whether a cached answer is still valid.
- Skip when: Shrinking the payload itself, which is a separate measurement.

# Problem
- the items route is 6.17 MB. The ETag added by item_786 means an unchanged corpus transfers nothing, and it works -- but the server rebuilds and hashes the whole payload to discover that, so a 304 costs 0.156s.
- `corpus_signature` answers the same question in 6ms and is already used by three other reports.

# Scope
- In:
  - Decide freshness from the corpus signature and serve the stored validator when it has not moved.
  - Keep the answer identical for a corpus that has changed: this is about what it costs to say no, not about what it says.
  - Measure the 304 path before and after.
- Out:
  - Shrinking the 6.17 MB payload itself, which is a separate question with its own measurement.
  - Changing the ETag contract with the client.
  - A file watcher.

# Acceptance criteria
- AC1: A conditional request against an unchanged corpus is answered without building the payload.
- AC2: A changed corpus returns the new payload, byte-identical to what it returns today.
- AC3: The 304 cost is measured before and after and stated.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A conditional request against an unchanged corpus is answered without building the payload.
- request-AC4 -> This backlog slice. Proof: AC2: A changed corpus returns the new payload, byte-identical to what it returns today.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_104_a_poll_that_costs_what_it_is_worth`
- Architecture decision(s): (none yet)
- Request: `req_373_make_the_auto_refresh_cost_what_it_is_worth`
- Primary task(s): `task_384_orchestrate_the_auto_refresh_cost_work`

# Priority
- Priority: Medium
- Rationale: 5% of the measured tick against 74% for item_839, so it follows it -- and it is the slice that makes a file watcher unnecessary.

# Validation
- Measured over this repo's own corpus (6.19 MB payload): cold call (payload rebuild) 1.568s; warm call (corpus_signature match, cached body/etag reused) 0.0102s. AC1 and AC2 covered by test_viewer_items_body_is_cached_until_the_corpus_changes (tests/python/test_viewer_cli.py), which also asserts the changed-corpus response is byte-identical to an uncached rebuild.

# Tasks
- `task_384_orchestrate_the_auto_refresh_cost_work`

# Notes
- Task `task_384_orchestrate_the_auto_refresh_cost_work` was finished via `logics-manager flow finish task` on 2026-08-15.
