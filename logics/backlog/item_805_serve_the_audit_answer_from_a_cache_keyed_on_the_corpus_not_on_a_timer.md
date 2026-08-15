## item_805_serve_the_audit_answer_from_a_cache_keyed_on_the_corpus_not_on_a_timer - Serve the audit answer from a cache keyed on the corpus, not on a timer
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
