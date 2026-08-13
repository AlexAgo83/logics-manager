## item_715_bring_the_fleet_home_inside_the_viewer_ui_campaign - Bring the fleet home inside the viewer UI campaign
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 92%
> Confidence: 90%
> Progress: 80%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The campaign drives `view` and never `view --fleet`, so every finding in req_344 was invisible to a green suite; have it visit the fleet home and apply the existing layout checks there.
- Keywords: viewer ui campaign, run_local_viewer_visual_smoke, viewer-layout-checks, fleet viewport sweep, regression guard
- Use when: Extending the campaign's screen coverage, or adding a check that must hold on the fleet home.
- Skip when: Adding new check kinds beyond what the layout checks already provide.

# Problem
- The campaign drives `view` and never `view --fleet`, so every finding in this request was invisible to a green suite.

# Scope
- In:
  - Have the campaign reach the fleet home and apply the existing layout checks there across the three viewports.
  - Do this before the redraw, so the campaign observes the change rather than being written around it.
- Out:
  - New check kinds beyond what `viewer-layout-checks.mjs` already provides.

# Acceptance criteria
- AC8: The screen holds at all three viewports with no overlap, clipping or sideways scroll.
- AC9: The campaign visits the fleet home and a regression on AC3-AC8 fails a run.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC8: The screen holds at all three viewports with no overlap, clipping or sideways scroll.
- request-AC9 -> This backlog slice. Proof: AC9: The campaign visits the fleet home and a regression on AC3-AC8 fails a run.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_080_a_fleet_home_an_operator_can_triage_from`
- Architecture decision(s): (none yet)
- Request: `req_344_make_the_fleet_home_read_as_the_product_s_first_screen`
- Primary task(s): `task_341_deliver_the_fleet_home_first_screen_redesign`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
