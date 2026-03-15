## item_050_move_secondary_view_controls_into_a_toggleable_second_toolbar_row - Move secondary view controls into a toggleable second toolbar row
> From version: 1.10.0
> Status: Proposed
> Understanding: 97%
> Confidence: 95%
> Progress: 0%
> Complexity: Medium
> Theme: Toolbar information architecture and control density
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The current toolbar model relies on a floating/popup-style control area for secondary view controls.
That makes the plugin feel busier than it should, while also hiding search, sort, grouping, filter toggles, and reset behind an interaction that is not as direct or scalable as it could be.

The plugin needs a cleaner toolbar structure:
- a compact first row for primary actions,
- a second row for denser view controls,
- and a clear way to show or hide that second row without losing awareness of active filters.

# Scope
- In:
  - Replace the floating/popup-style secondary controls area with a second toolbar row.
  - Add a first-row toggle that shows and hides that row.
  - Move secondary controls such as search, sort, grouping, filters, and reset into that row.
  - Persist the disclosure state by workspace.
  - Surface a useful active-state hint when the row is closed but non-default controls are active.
- Out:
  - Changing the semantics of existing filters or sort/group controls.
  - Introducing advanced filtering syntax or command-palette behavior.
  - Refactoring unrelated browsing surfaces.

# Acceptance criteria
- AC1: The plugin exposes a primary toolbar row that stays focused on the main actions.
- AC2: Secondary view controls move into a second toolbar row rendered directly below the primary row.
- AC3: The second row can be shown and hidden from the primary row with a clear toggle button.
- AC4: The open/closed state of the second row persists per workspace.
- AC5: When the second row is closed, the primary row still gives a useful signal if non-default view controls are active.
- AC6: The second row remains usable in narrow widths, including wrapped or stacked layout behavior when needed.
- AC7: The change does not regress existing filtering, search, grouping, sorting, reset, or responsive behavior.

# Priority
- Impact:
  - Medium-High: this directly improves control discoverability and perceived UI cleanliness.
- Urgency:
  - Medium: worthwhile before the toolbar accumulates even more view controls.

# Notes
- Derived from `logics/request/req_045_move_secondary_view_controls_into_a_toggleable_second_toolbar_row.md`.
- The change should improve information architecture, not merely relocate the same clutter.
- The primary-row toggle should make active non-default controls visible even when the second row is hidden.

# Tasks
- `logics/tasks/task_044_move_secondary_view_controls_into_a_toggleable_second_toolbar_row.md`
