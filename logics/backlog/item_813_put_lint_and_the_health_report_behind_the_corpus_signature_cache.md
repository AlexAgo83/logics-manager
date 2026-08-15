## item_813_put_lint_and_the_health_report_behind_the_corpus_signature_cache - Put lint and the health report behind the corpus-signature cache
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: One cache for every expensive report
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: put, lint, health, report, behind, corpus, signature, cache
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- req_364 cached the audit alone, on a measurement of lint that was taken in an already-warm process and read 0.16s. Over HTTP against a fresh viewer lint is 4.18s cold and 0.97s warm -- now the dominant cost of both screens.
- The workflow health report is 0.69s cold and 0.39s warm, and is not cached either.

# Scope
- In:
  - Serve `/api/lint` and `/api/health` from the same corpus-signature cache as `/api/audit`.
  - Keep the invalidation rule identical: the corpus changing, not a timer lapsing.
  - Confirm the payloads are unchanged for the same corpus.
- Out:
  - Changing what lint or the health report check.
  - Caching anything whose cost has not been measured over HTTP against a fresh viewer.

# Acceptance criteria
- AC1: A second request for lint or the health report with the corpus unchanged returns without recomputing.
- AC2: Editing a workflow document changes the next answer from both.
- AC3: Both payloads are byte-identical to the current implementation for the same corpus.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A second request for lint or the health report with the corpus unchanged returns without recomputing.
- request-AC4 -> This backlog slice. Proof: AC2: Editing a workflow document changes the next answer from both.
- request-AC5 -> This backlog slice. Proof: the timings that justified caching lint and health were taken with `curl` against a viewer started from the working tree for the measurement, not in a process that had already run an audit -- 9ms on a second look, 0.17s and 0.12s after touching one document. The first attempt measured the npm-installed copy of the package and read an 8.5s audit that had been cached weeks earlier, which is the same error req_364 made in another form.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_097_corpus_screens_that_are_quick_on_the_first_look_too`
- Architecture decision(s): (none yet)
- Request: `req_366_finish_the_insights_and_health_work_the_first_measurement_got_wrong`
- Primary task(s): `task_377_orchestrate_the_second_look_at_insights_and_health`

# Priority
- Priority: High - the dominant cost of both screens
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_377_orchestrate_the_second_look_at_insights_and_health` was finished via `logics-manager flow finish task` on 2026-08-15.
