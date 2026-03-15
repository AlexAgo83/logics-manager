## task_044_move_secondary_view_controls_into_a_toggleable_second_toolbar_row - Move secondary view controls into a toggleable second toolbar row
> From version: 1.10.0
> Status: Proposed
> Understanding: 97%
> Confidence: 95%
> Progress: 0%
> Complexity: Medium
> Theme: Toolbar information architecture and control density
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_050_move_secondary_view_controls_into_a_toggleable_second_toolbar_row`.
- Source file: `logics/backlog/item_050_move_secondary_view_controls_into_a_toggleable_second_toolbar_row.md`.
- Related request(s): `req_045_move_secondary_view_controls_into_a_toggleable_second_toolbar_row`.

# Plan
- [ ] 1. Split the toolbar structure into a primary row and a secondary controls row.
- [ ] 2. Add a first-row toggle that shows and hides the second row.
- [ ] 3. Move search, sort, grouping, filter toggles, and reset into the second row with coherent spacing and ordering.
- [ ] 4. Persist the second-row disclosure state per workspace.
- [ ] 5. Add a clear “active controls” hint on the first-row toggle when non-default controls are applied while the row is hidden.
- [ ] 6. Verify the layout stays usable at narrow widths, including wrap/stack behavior where needed.
- [ ] 7. Add or adjust regression coverage for toolbar rendering, persistence, and responsive behavior.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1/AC2 -> Steps 1 and 3.
- AC3 -> Step 2.
- AC4 -> Step 4.
- AC5 -> Step 5.
- AC6 -> Step 6.
- AC7 -> Step 7.

# Links
- Backlog item: `item_050_move_secondary_view_controls_into_a_toggleable_second_toolbar_row`
- Request(s): `req_045_move_secondary_view_controls_into_a_toggleable_second_toolbar_row`

# Validation
- `npm run compile`
- `npm test`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.
