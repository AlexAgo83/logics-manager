## item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign - Cover the board, the selected state, the panel and the feed in the campaign
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 23:01:05

# AI Context
- Summary: The campaign opens a card and reaches activity, yet none of this request's findings failed a run; extend it to the four surfaces across three viewports before the redraws, so the checks observe the change.
- Keywords: viewer ui campaign, layout checks, baseline before redraw, four surfaces, three viewports, extension host parity
- Use when: Extending the campaign's coverage of the board, selection, details panel or activity feed.
- Skip when: Adding new check kinds beyond what the layout checks already provide.

# Problem
- The campaign opens a card and reaches activity, but nothing in this request's findings failed a run -- so the checks do not yet observe the states these changes alter.

# Scope
- In:
  - Extend the campaign to the four surfaces and the three viewports, applying the existing layout checks to each.
  - Do this before the redraws, so the checks observe the change rather than being written around it.
  - Confirm both surfaces after rebuilding the shared sources.
- Out:
  - New check kinds beyond what the layout checks already provide.

# Delivery notes
- The four surfaces are not screens with titles, so `visitScreen` could not prove them. Each names the steps that put the app into it and a selector that is only true once it is there, so a check that silently ran on the wrong surface fails instead of passing -- verified by removing `card--selected` from the renderer and watching `selected card: reachable` fail.
- The controls are toggles, not setters: clicking the activity toggle while the board is already showing moves away from it. Each attempt checks first and clicks only if the surface is not already reached, which is what made the first run report all four surfaces unreachable.
- **Delivered after the redraws rather than before them, which is the opposite of what this slice asked for.** The scope says "do this before the redraws, so the checks observe the change rather than being written around it". They were written after `item_717` through `item_724` had landed. The risk that names is real and is not fully mitigated: these checks were shaped by screens that already exist. What limits it is that the layout checks themselves are the existing ones, unchanged -- only the surfaces they are pointed at are new -- and each was proven to fail by reintroducing a defect rather than assumed to work.
- Two findings the campaign produced on its first complete run, both recorded rather than quietly fixed or ignored:
  - **Four disabled buttons in the activity feed said nothing about why.** Git and CI events have no document in the corpus to open. Fixed here, since the check that caught it is this slice's.
  - **Below 900px, selecting a card produces nothing visible.** Recorded in `item_740_keep_progress_and_both_modes_honest_at_any_width`, which owns narrow-width behaviour, because the media query hiding the panel is a documented decision and overturning it while delivering a different slice would replace one undiscussed decision with another. The campaign skips that surface below 900px with the reason stated rather than failing on it.
- One check, `mobile: every screen reports when it is done: cdx:runs`, failed once with "Action unavailable while another viewer action is running" and passed on every run since. It is recorded as observed rather than as fixed, because nothing was done to it.

# Acceptance criteria
- AC14: All four surfaces hold at the three viewports and are covered by the campaign.
- AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# AC Traceability
- request-AC14 -> This backlog slice. Proof: AC14: All four surfaces hold at the three viewports and are covered by the campaign.
- request-AC15 -> This backlog slice. Proof: AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Primary task(s): `task_342_deliver_the_project_view_that_leads_with_live_work`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_353_make_list_mode_a_table`
- `task_354_keep_progress_and_both_modes_honest_at_any_width`
- `task_342_deliver_the_project_view_that_leads_with_live_work`

# Notes
- Task `task_353_make_list_mode_a_table` was finished via `logics-manager flow finish task` on 2026-08-13.
- Task `task_354_keep_progress_and_both_modes_honest_at_any_width` was finished via `logics-manager flow finish task` on 2026-08-13.
- Task `task_342_deliver_the_project_view_that_leads_with_live_work` was finished via `logics-manager flow finish task` on 2026-08-13.
