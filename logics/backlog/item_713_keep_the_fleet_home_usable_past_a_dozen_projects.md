## item_713_keep_the_fleet_home_usable_past_a_dozen_projects - Keep the fleet home usable past a dozen projects
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 93%
> Confidence: 90%
> Progress: 80%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Add a filter and attention-first ordering, and move fleet root management into the toolbar, so the screen still works at the fleet sizes `--fleet` exists for.
- Keywords: fleet filter, attention-first sort, favorites grouping, fleet roots toolbar, viewer-fleet__roots
- Use when: Changing how the fleet list is narrowed, ordered, or how roots are managed from the screen.
- Skip when: Changing how roots are discovered or scanned, or the project switcher menu's own ordering.

# Problem
- The grid is favorites-then-source-order with nothing to narrow it, which is adequate at two projects and unusable at the fleet sizes `--fleet` exists for.

# Scope
- In:
  - A filter field over the listed projects.
  - An ordering that brings projects needing attention first, with favorites still grouped.
  - Move fleet root management into the toolbar instead of a stacked section above the grid.
- Out:
  - How roots are discovered or scanned, and the project switcher menu's own ordering.

# Acceptance criteria
- AC6: The screen can be filtered, orders attention first, and manages roots from the toolbar.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: The screen can be filtered, orders attention first, and manages roots from the toolbar.

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
