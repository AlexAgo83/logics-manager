## item_814_warm_the_corpus_reports_off_the_request_path - Warm the corpus reports off the request path
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Paying before being asked
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: warm, corpus, reports, off, request, path
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- Nothing is computed until it is asked for, so the first operator to open Insights or Health after a viewer start pays the whole cold cost -- about thirteen seconds on this corpus -- on the request path.
- The viewer is usually started well before either screen is opened, so that time is available and unused.

# Scope
- In:
  - Compute the cached reports once shortly after the server starts, in the background.
  - Do not delay startup or the first page load waiting for it.
  - Make a request that arrives mid-warm-up wait for the answer already being computed rather than starting a second one.
- Out:
  - Recomputing on a schedule: the signature already decides when an answer is stale.
  - Warming anything the screens do not read.

# Acceptance criteria
- AC1: Opening Insights or Health shortly after a viewer start does not pay the full cold computation.
- AC2: Startup and the first page load are not delayed by the warm-up.
- AC3: A request arriving during the warm-up does not trigger a second computation of the same report.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Opening Insights or Health shortly after a viewer start does not pay the full cold computation.
- request-AC4 -> This backlog slice. Proof: AC2: Startup and the first page load are not delayed by the warm-up.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_097_corpus_screens_that_are_quick_on_the_first_look_too`
- Architecture decision(s): (none yet)
- Request: `req_366_finish_the_insights_and_health_work_the_first_measurement_got_wrong`
- Primary task(s): `task_377_orchestrate_the_second_look_at_insights_and_health`

# Priority
- Priority: Medium - the first look is the one that is still slow
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_377_orchestrate_the_second_look_at_insights_and_health` was finished via `logics-manager flow finish task` on 2026-08-15.
