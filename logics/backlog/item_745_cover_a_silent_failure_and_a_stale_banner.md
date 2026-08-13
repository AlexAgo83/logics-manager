## item_745_cover_a_silent_failure_and_a_stale_banner - Cover a silent failure and a stale banner
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Nothing reports that a supervised child can die without an error being set, that a post's failure can render as success, or that a banner can outlive its subject -- so all three shipped.
- Keywords: connector exit coverage, response failure coverage, stale banner coverage, behaviour over implementation
- Use when: Adding coverage for the connector failure path, an action's failed post, or the update cache.
- Skip when: Coverage unrelated to those three paths.

# Problem
- Nothing in the suite reports that a supervised child can die without an error being set, that a post's failure can be rendered as success, or that a banner can outlive its subject.

# Scope
- In:
  - Cover a connector that exits before publishing a URL, a post whose response reports failure, and a banner surviving the update it recommended.
  - Prefer covering the behaviour an operator meets over the function beneath it.
- Out:
  - Coverage unrelated to these three paths.

# Acceptance criteria
- AC8: All three are covered, and each test fails when its defect is reintroduced.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC8: All three are covered, and each test fails when its defect is reintroduced.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_084_a_viewer_that_repeats_what_it_was_told`
- Architecture decision(s): (none yet)
- Request: `req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update`
- Primary task(s): `task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check`

# Notes
- Task `task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check` was finished via `logics-manager flow finish task` on 2026-08-13.
