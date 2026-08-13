## item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on - Drop a screen's late render when the operator has moved on
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: An operator clicking faster than a screen loads sees the previous screen paint over the new one; several screens take twenty seconds or more against a large corpus.
- Keywords: late render, current screen, async screen load, regression without the guard
- Use when: Making a screen's asynchronous work stop rendering once its screen is no longer current.
- Skip when: Making any screen faster.

# Problem
- The campaign opened the fleet home, waited for its title, opened Corpus insights, and reported `insights: reachable -- showing 'Fleet'`. An operator clicking faster than a screen loads sees the same thing, and several screens take twenty seconds or more.

# Scope
- In:
  - Extend the existing guard so a screen's asynchronous work stops rendering once its screen is no longer current.
  - Cover every screen that loads asynchronously, not only the one this was found on.
  - A regression that fails when the guard is removed.
- Out:
  - Making any screen faster.

# Acceptance criteria
- AC1: A superseded screen does not render.
- AC3: It holds for every asynchronous screen.
- AC6: A regression covers it and fails without the guard.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A superseded screen does not render.
- request-AC3 -> This backlog slice. Proof: AC3: It holds for every asynchronous screen.
- request-AC6 -> This backlog slice. Proof: AC6: A regression covers it and fails without the guard.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_090_a_viewer_that_knows_which_screen_you_are_on`
- Architecture decision(s): (none yet)
- Request: `req_354_stop_a_slow_screen_from_rendering_over_the_one_the_operator_moved_to`
- Primary task(s): `task_351_deliver_the_superseded_render_guard`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
