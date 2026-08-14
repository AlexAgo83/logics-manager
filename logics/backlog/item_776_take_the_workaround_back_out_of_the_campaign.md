## item_776_take_the_workaround_back_out_of_the_campaign - Take the workaround back out of the campaign
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 11:11:51

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

# Delivery notes
- The settle-and-reopen is gone. The harness no longer opens a screen a second time when a late render took it back -- it fails and says so, which is what a campaign is for.
- **This removal is the real test of `item_775`,** and it is the only one available: the defect was intermittent, seen three times over two days and never on demand, so nothing could prove the fix by reproducing it. Five consecutive full campaign runs at all three viewports after the removal: 322 checks each, no findings. Before the fix the same run failed roughly one time in three.
- Five clean runs is evidence, not proof. A defect that appeared once in three runs has perhaps a 1-in-250 chance of hiding through five, which is good enough to remove a workaround and not good enough to call the matter closed. If it returns, the campaign now reports it as a failure with the screen it was showing, rather than quietly opening the screen again.
- The 400ms settle stays. It is not part of the workaround: a screen that has just committed may still be laying out, and the layout checks below it read geometry.

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

# Tasks
- `task_351_deliver_the_superseded_render_guard`

# Notes
- Task `task_351_deliver_the_superseded_render_guard` was finished via `logics-manager flow finish task` on 2026-08-14.
