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
> Indicators reviewed: 2026-08-14 10:20:50

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

# Further evidence

Recurred 2026-08-14 while delivering `req_349`, on a full campaign run at 390x844:
`mobile: insights: reachable` failed with `showing 'Fleet'`. The settle-and-reopen the
harness carries did not recover it that time -- the reopen timed out too. An isolated
mobile-only run passed, so it remains intermittent and load-dependent rather than
deterministic.

Worth recording because the original report came from one run: this is the second
independent observation, and the first where the workaround itself failed. It also
narrows the shape -- it is the fleet home's late render specifically, arriving over
whichever screen was opened next, not a general race between any two screens.

Third occurrence 2026-08-14, same run shape: full campaign, `mobile: insights: reachable`
reporting `showing 'Fleet'`, and an isolated mobile-only run immediately after passing. It
is reproducible enough to be worth fixing and not reproducible on demand, which is the
awkward middle this item has to be designed for.

**One thing the three observations agree on:** it is always the fleet home's late render,
always at the narrow viewport, and always on the first screen opened after it. That is a
narrower target than "any two screens racing", and the fix should be judged against it.

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
