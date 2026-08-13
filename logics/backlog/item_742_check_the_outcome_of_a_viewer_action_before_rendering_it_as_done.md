## item_742_check_the_outcome_of_a_viewer_action_before_rendering_it_as_done - Check the outcome of a viewer action before rendering it as done
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `fetch(...).then(() => showChatgptMcp())` checks neither the HTTP status nor the body's `ok`, so a refusal re-renders unchanged state and reads as nothing happening.
- Keywords: unchecked fetch, response.ok, mcp-connector endpoint, action outcome, silent refusal
- Use when: Changing how a viewer action decides whether its post succeeded.
- Skip when: Designing where a failure is displayed; that belongs to the sibling request.

# Problem
- The connector click handler runs `fetch(...).then(() => showChatgptMcp())`, checking neither the HTTP status nor the body's `ok` field, so a refusal re-renders unchanged state and reads as nothing happening.

# Scope
- In:
  - Check the response before treating a post as successful.
  - Route the failure into whatever the sibling request establishes for showing a failed action.
  - Look for the same unchecked shape elsewhere in the host and treat it the same way.
- Out:
  - Designing where a failure is displayed; that belongs to the sibling request.

# Acceptance criteria
- AC4: A post's outcome is checked before its result is rendered.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: A post's outcome is checked before its result is rendered.

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
