## item_783_fail_when_the_work_is_repeated_or_a_change_is_missed - Fail when the work is repeated or a change is missed
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

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
