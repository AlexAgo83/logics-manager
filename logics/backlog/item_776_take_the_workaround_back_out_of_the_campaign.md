## item_776_take_the_workaround_back_out_of_the_campaign - Take the workaround back out of the campaign
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Low
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The harness settles 400ms and re-opens a screen if a late render took it back -- the test compensating for a product defect, and it will keep doing so silently after the fix.
- Keywords: campaign workaround, settle and reopen, remove compensation, proof the fix holds
- Use when: After the superseded-render guard lands.
- Skip when: The rest of the harness, which is not a workaround.

# Problem
- The campaign harness settles for 400ms and re-opens a screen if a late render took it back. That is the test compensating for a product defect, and it will quietly keep doing so after the defect is fixed.

# Scope
- In:
  - Remove the settle-and-reopen once the product no longer needs it, and confirm the campaign still passes without it.
- Out:
  - The rest of the harness, which is not a workaround.

# Acceptance criteria
- AC4: The workaround is gone and the campaign passes without it.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: The workaround is gone and the campaign passes without it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_090_a_viewer_that_knows_which_screen_you_are_on`
- Architecture decision(s): (none yet)
- Request: `req_354_stop_a_slow_screen_from_rendering_over_the_one_the_operator_moved_to`
- Primary task(s): `task_351_deliver_the_superseded_render_guard`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
