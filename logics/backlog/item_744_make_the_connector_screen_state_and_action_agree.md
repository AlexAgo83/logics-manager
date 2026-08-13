## item_744_make_the_connector_screen_state_and_action_agree - Make the connector screen state and action agree
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The heading reads `Connector ON` while the button beneath reads `OFF -- stop connector`: one names the state, the other the action, and together they read as a contradiction.
- Keywords: connector screen, state versus action, button labelling, chatgpt developer mode
- Use when: Changing the wording or labelling on the MCP connector screen.
- Skip when: The Settings screen's own redesign, tracked separately.

# Problem
- The heading reads `Connector ON` while the button beneath reads `OFF -- stop connector`: one names the state, the other the action, and together they read as a contradiction.

# Scope
- In:
  - State the current state and the available action without the two appearing to disagree.
- Out:
  - The Settings screen's own redesign, tracked separately.

# Acceptance criteria
- AC7: State and action are both legible and do not contradict.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC7: State and action are both legible and do not contradict.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_084_a_viewer_that_repeats_what_it_was_told`
- Architecture decision(s): (none yet)
- Request: `req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update`
- Primary task(s): `task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check`

# Priority
- Priority: Low
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check`

# Notes
- Task `task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check` was finished via `logics-manager flow finish task` on 2026-08-13.
