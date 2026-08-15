## item_805_serve_the_audit_answer_from_a_cache_keyed_on_the_corpus_not_on_a_timer - Serve the audit answer from a cache keyed on the corpus, not on a timer
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Reusing an answer that has not changed
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: serve, audit, answer, cache, keyed, corpus, not, timer
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- Nothing caches the audit. Opening Insights and then Health computes the same answer twice, and the viewer's 15-second auto-refresh computes it again on each tick.
- The viewer's existing `status_component` cache expires on a time-to-live, which is the wrong invalidation for this: it would both serve a stale answer after an edit and recompute an unchanged corpus once the timer lapses. What decides whether the answer is still good is whether the corpus changed.

# Scope
- In:
  - Cache the audit payload against a cheap signature of the corpus -- for example the document count and the newest modification time across the workflow directories.
  - Recompute when that signature changes, so an edited document is reflected on the next look.
  - Share the cached answer between the lint/audit consumers so Insights and Health do not each pay for it.
  - Make the cold path visible: the first computation after a change is still the full cost, and the screen should say it is working rather than appear stuck.
- Out:
  - Persisting the cache across viewer restarts.
  - Caching lint or the workflow health report, which cost 0.16s and 0.15s respectively.
  - Changing the auto-refresh interval.

# Acceptance criteria
- AC1: A second request for the audit with the corpus unchanged returns without recomputing, measured over HTTP.
- AC2: Editing a workflow document changes the next audit answer, with no wait beyond the recomputation itself.
- AC3: Opening Insights and then Health computes the audit once, not twice.

# Report
- `/api/audit` is served from `LogicsViewerServer.cached_audit_payload`, keyed on a corpus signature: the number of workflow documents and the newest modification time across the workflow directories, read by `stat` rather than by parsing. The signature costs 6.4ms against the ~1s audit it guards.
- Deliberately not the existing `status_component` time-to-live cache. A TTL is wrong in both directions here: it serves a stale verdict to an operator who has just edited a document, and it recomputes an unchanged corpus when a timer happens to lapse. What makes an audit stale is the corpus changing, so that is what is measured.
- The lock is not held across the computation. Two concurrent first-requests may both compute; holding the lock would instead queue every consumer behind the first audit, which is a worse failure than a duplicated one.
- Measured over HTTP on this repository's corpus: first audit 1.17s, next 12ms (about 95x), 0.95s again immediately after touching a document, then 12ms. Insights and Health share the same cached answer, so opening one after the other now computes once.
- Left alone on purpose: lint (0.34s) and workflow health (0.12s), neither of which is a cost worth guarding.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A second request for the audit with the corpus unchanged returns without recomputing, measured over HTTP.
- request-AC5 -> This backlog slice. Proof: AC2: Editing a workflow document changes the next audit answer, with no wait beyond the recomputation itself.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_095_corpus_screens_that_stay_usable_as_the_corpus_grows`
- Architecture decision(s): (none yet)
- Request: `req_364_make_insights_and_health_answer_quickly_on_a_large_corpus`
- Primary task(s): `task_375_orchestrate_the_audit_cost_work_behind_insights_and_health`

# Priority
- Priority: High - the largest gain an operator actually feels
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_375_orchestrate_the_audit_cost_work_behind_insights_and_health` was finished via `logics-manager flow finish task` on 2026-08-15.
