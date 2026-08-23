## item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling - Repair the Explorer selected row and detail pane scrolling
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 93%
> Confidence: 90%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer explorer
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 15:40:54

# AI Context
- Summary: Fixes the selected row that a grid-placed pseudo-element breaks, and the detail pane that scrolls sideways under its own header.
- Keywords: repair, explorer, selected, row, detail, pane, scrolling
- Use when: fixing Explorer row layout or detail pane scrolling.
- Skip when: changing the Explorer's selection logic or markdown switch.

# Problem
- The selection cue is a `::before` placed at `grid-row: 1; grid-column: 1` of a two-column row grid, so it takes the icon's cell, the icon moves to column two and the name wraps to a clipped second line.
- `.viewer-workspace__preview` uses `overflow: auto`, so a wide line scrolls the whole pane sideways while its `position: sticky` header, which pins only vertically, slides out from under the content.

# Scope
- In:
  - Draw the selection cue without adding a grid item, for example as an inset box-shadow on the row.
  - Keep the selected row on one line with its name truncated by ellipsis, matching every other row.
  - Give the detail pane vertical scrolling only, and let the code viewer and the markdown block own their horizontal scrolling.
  - Keep the pane header fixed at the top of the pane while the body scrolls.
  - Verify the three breakpoints and cover the selected-row markup in browser-host tests.
- Out:
  - The Explorer's selection logic and scroll reset, which are correct.
  - The markdown switch behavior.
  - The file list's contents or ordering.

# Acceptance criteria
- AC1: The selected row keeps the icon column, one line, and an ellipsis rather than a wrap.
- AC2: The selection cue is visible and adds no grid item to the row.
- AC3: The detail pane never scrolls horizontally; wide content scrolls inside its own block.
- AC4: The pane header stays fixed while the body scrolls, in both raw and markdown preview modes.
- AC5: The layout holds at 1440x900, 820x1180 and 390x844.
- AC6: Browser-host tests cover the selected-row markup.
- AC7: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks and `npm run test:viewer-smoke` pass for this slice.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The selected row keeps the icon column, one line, and an ellipsis rather than a wrap. Also: AC2: The selection cue is visible and adds no grid item to the row.
- request-AC5 -> This backlog slice. Proof: AC3: The detail pane never scrolls horizontally; wide content scrolls inside its own block. Also: AC4: The pane header stays fixed while the body scrolls, in both raw and markdown preview modes.
- request-AC8 -> This backlog slice. Proof: AC5: The layout holds at 1440x900, 820x1180 and 390x844.
- request-AC9 -> This backlog slice. Proof: AC6: Browser-host tests cover the selected-row markup.
- request-AC11 -> This backlog slice. Proof: AC7: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks and `npm run test:viewer-smoke` pass for this slice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_114_review_as_a_real_viewer_surface`
- Architecture decision(s): (none yet)
- Request: `req_385_render_review_in_the_main_pane_and_repair_the_explorer_detail_pane_and_surface_control`
- Primary task(s): `task_397_orchestrate_the_review_main_pane_move_and_the_explorer_and_control_repairs`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
