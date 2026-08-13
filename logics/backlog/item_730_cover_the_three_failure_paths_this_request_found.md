## item_730_cover_the_three_failure_paths_this_request_found - Cover the three failure paths this request found
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 23:19:11

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

# Delivery notes
- All three paths are covered by driving the screen, not by reading the source. That distinction is the point of this slice: the failure-banner path already had a test, and it worked by slicing `withPrimaryAction` out of `index.js` and matching a regex against it. A test that asserts the implementation agrees with itself cannot notice that the operator sees nothing, which is how all three of this request's defects shipped past a suite that was otherwise thorough.
- **A failed action surfaces its reason.** Driven through the MCP connector action, which `item_742` routed into `withPrimaryAction` for exactly this reason: a refused POST now puts the server's own words in the alert, named with the action that failed, and a second attempt clears it rather than leaving a stale reason to be read as the outcome of what was just done. Proven by putting `setMeta` back in place of `showActionFailure` and watching it fail.
- **The picker fallback is reached.** Driven by clicking the fleet-root control against a server that refuses -- the modal opens, repeating the server's reason rather than inventing one. Proven by dropping the refusal on the floor again, which is exactly what the operator reported: the button did nothing.
- **The fleet flag decides both server mode and landing view**, covered on the Python side by `test_fleet_capability_and_launch_intent_are_separate`, and the path validation by `test_fleet_root_browser_fallback_adds_a_root_and_refuses_an_escape`.
- One thing found while writing this: the harness's own DOM fixture omitted `role="alert"` on the failure banner, which the product's `index.html` carries. A behaviour test could have asserted the banner appears and still never noticed that a screen reader is not told about it. The fixture mirrors the product now, and the markup the harness cannot exercise is checked against the real file beside the behaviour.

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

# Tasks
- `task_343_deliver_the_fleet_root_recovery_visible_failures_and_an_honest_fleet_flag`

# Notes
- Task `task_343_deliver_the_fleet_root_recovery_visible_failures_and_an_honest_fleet_flag` was finished via `logics-manager flow finish task` on 2026-08-13.
