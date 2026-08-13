## item_727_put_a_failed_viewer_action_where_the_operator_will_see_it - Put a failed viewer action where the operator will see it
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Every primary action reports failure through `setMeta`, which writes the small grey subtitle and is overwritten by the next auto-refresh -- so a clear server refusal reads as nothing happening.
- Keywords: withPrimaryAction, setMeta, renderMeta, auto refresh overwrite, action failure, operator feedback
- Use when: Changing how a failed viewer action is surfaced, or what the meta line carries.
- Skip when: Changing what an individual action does, or server-side error wording.

# Problem
- `withPrimaryAction` reports every failure through `setMeta`, which writes the small grey subtitle beside the document count -- and `renderMeta` overwrites it on the next auto-refresh tick, within 60 seconds by default. A clear server refusal reads as nothing happening.

# Scope
- In:
  - Present a failed primary action's reason where it will be read, and keep it until dismissed or superseded.
  - Cover every action that takes this path, not only the fleet root picker.
  - Leave the meta line to the status it is for.
- Out:
  - Changing what any individual action does, or the wording of server-side error messages.

# Acceptance criteria
- AC3: A failed primary action's reason is visible and is not overwritten by the next status render.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: A failed primary action's reason is visible and is not overwritten by the next status render.

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
