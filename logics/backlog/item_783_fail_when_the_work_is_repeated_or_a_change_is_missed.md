## item_783_fail_when_the_work_is_repeated_or_a_change_is_missed - Fail when the work is repeated or a change is missed
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:10:26

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: fail, work, repeated, change, missed
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- Nothing measures this today, which is why it degraded silently for several sessions and was diagnosed as campaign flakiness instead.

# Scope
- In:
  - A regression that fails when an unchanged corpus is rebuilt.
  - A regression that fails when a document changed on disk does not appear.
  - Record what the campaign's card timeout was really reporting, so the next person does not raise it again.
- Out:
  - A performance budget in CI, unless the regression above shows it is the cheaper answer.

# Delivery notes
- `tests/test_viewer_payload_cache.py` covers both halves of AC6. The repeat is **counted, not timed** -- a timing assertion is a flaky assertion on a busy machine, and this whole request began with a measurement taken on a busy machine.
- Six cases: an unchanged corpus is parsed exactly once across three calls; a new document appears; a deleted one disappears; an edit that keeps the byte count appears (the case a size-only signature would miss, so the test sleeps past the filesystem's timestamp resolution rather than asserting something the signature cannot see); a caller mutating what it was handed cannot corrupt the cache; and switching repository does not serve the previous one.
- `tests/viewer.refresh-cadence.test.ts` covers `item_782`: the delay rule at four cost levels, and the wiring -- that the scheduler reads the derived delay rather than the raw interval, that the cost is recorded on the failure path as well as the success path, and that the control says when it is throttled. Asserted against the source because the pacing is three small functions over module-local state, and a test that booted the whole browser host to reach them would be measuring the boot.
- **What the campaign's card timeout was really reporting is written where the check lives**, not only here, so the next person reads it before touching the number. Two causes, both since removed: the readiness probe matched a literal the panel had stopped printing, and then a regex the template literal had eaten -- a single-escaped `d` in a template literal is a plain `d`, so it reached the browser as `/d+s+ofs+d+/` and could never match, timing out on every run while the count was on screen. And the endpoint rebuilt all 1615 documents per request. Several sessions went into raising budgets that were never the problem.
- No CI performance budget. The regressions above fail on the thing that actually regresses -- work repeated for an unchanged corpus -- without needing a machine fast enough for a wall-clock threshold to mean anything.

# Acceptance criteria
- AC6: Repeated work fails a test, and so does a missed change.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: Repeated work fails a test, and so does a missed change.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_092_a_viewer_that_stays_as_fast_as_it_started`
- Architecture decision(s): (none yet)
- Request: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
- Primary task(s): `task_356_keep_the_viewer_as_fast_as_it_started`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
