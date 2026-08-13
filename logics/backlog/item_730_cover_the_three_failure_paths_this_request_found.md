## item_730_cover_the_three_failure_paths_this_request_found - Cover the three failure paths this request found
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Nothing in the suite reports that a picker cannot run, that a failure is invisible, or that a flag does not reach the value it names -- so all three shipped; cover the behaviour an operator meets rather than the function beneath it.
- Keywords: missing dialog coverage, failure surfacing, fleet flag coverage, behaviour over implementation, regression proof
- Use when: Adding coverage for the picker fallback, action failure feedback, or the fleet flag.
- Skip when: Coverage unrelated to those three paths.

# Problem
- Nothing in the suite reports that a picker cannot run, that a failure is invisible, or that a flag does not reach the value it names -- so all three shipped.

# Scope
- In:
  - Cover the missing-dialog path reaching the fallback, a failed action surfacing its reason, and the fleet flag deciding both server mode and landing view.
  - Prefer covering the behaviour an operator meets over the function that implements it, since the existing tests substituted the answer and missed the defect.
- Out:
  - Coverage unrelated to these three paths.

# Acceptance criteria
- AC8: All three paths are covered, and each test fails when its defect is reintroduced.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC8: All three paths are covered, and each test fails when its defect is reintroduced.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_082_a_viewer_that_recovers_and_says_what_happened`
- Architecture decision(s): (none yet)
- Request: `req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing`
- Primary task(s): `task_343_deliver_the_fleet_root_recovery_visible_failures_and_an_honest_fleet_flag`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
