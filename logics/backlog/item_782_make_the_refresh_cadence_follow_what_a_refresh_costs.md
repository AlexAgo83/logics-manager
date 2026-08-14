## item_782_make_the_refresh_cadence_follow_what_a_refresh_costs - Make the refresh cadence follow what a refresh costs
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: refresh, cadence, follow, costs
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The client polls every 15 seconds by a constant chosen when the corpus was a fraction of this size, each open tab polls independently, and the measured result is a server at 85% CPU with nobody using it.

# Scope
- In:
  - Have the interval account for how long a refresh actually takes.
  - Bound what an idle viewer costs, and state the bound.
  - Consider what several open tabs do, since each carries its own timer.
- Out:
  - Removing auto-refresh, which is why the screen is worth leaving open.

# Acceptance criteria
- AC4: The cadence accounts for the cost of a refresh.
- AC5: Idle CPU is bounded and the bound is stated.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: The cadence accounts for the cost of a refresh.
- request-AC5 -> This backlog slice. Proof: AC5: Idle CPU is bounded and the bound is stated.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_092_a_viewer_that_stays_as_fast_as_it_started`
- Architecture decision(s): (none yet)
- Request: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
- Primary task(s): `task_356_keep_the_viewer_as_fast_as_it_started`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
