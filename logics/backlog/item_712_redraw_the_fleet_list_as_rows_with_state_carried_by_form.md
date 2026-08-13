## item_712_redraw_the_fleet_list_as_rows_with_state_carried_by_form - Redraw the fleet list as rows with state carried by form
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 93%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Replace the three stacked metric tiles per project with one row carrying status accent, name, inline path and inline counts, so state is seen rather than read.
- Keywords: renderFleetHome, renderMetricCards, viewer-fleet css, row layout, status colour, zero de-emphasis, favorite star
- Use when: Changing the fleet project card or row layout, its counts, its path display, or its favorite control.
- Skip when: Changing the metric card component other screens use, or which counts the fleet reports.

# Problem
- Three stacked metric tiles per project cost ~360px to show three digits, zeros render at 26px bold in their own bordered tile, and nothing is coloured -- so a clean project and one with four issues are drawn identically and two projects fill a 1440x900 screen.

# Scope
- In:
  - One row per project: status accent, name, inline path, inline counts, open action.
  - Colour the state and subordinate zero counts to non-zero ones.
  - Bring the path onto the row and make the favorite control legible when set.
  - Retire the per-project `renderMetricCards` call and the `.viewer-fleet__project` tile rules it depends on.
- Out:
  - The metric card component itself, which other screens use.
  - Which counts are shown; the set stays open, issues and stale.

# Acceptance criteria
- AC3: At least eight projects visible at 1440x900 without scrolling.
- AC4: State legible without reading counts; zeros visually subordinate.
- AC5: Path on the row without a disclosure, truncated not wrapped; favorite state readable at a glance.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: At least eight projects visible at 1440x900 without scrolling.
- request-AC4 -> This backlog slice. Proof: AC4: State legible without reading counts; zeros visually subordinate.
- request-AC5 -> This backlog slice. Proof: AC5: Path on the row without a disclosure, truncated not wrapped; favorite state readable at a glance.

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

# Tasks
- `task_341_deliver_the_fleet_home_first_screen_redesign`

# Notes
- Task `task_341_deliver_the_fleet_home_first_screen_redesign` was finished via `logics-manager flow finish task` on 2026-08-13.
