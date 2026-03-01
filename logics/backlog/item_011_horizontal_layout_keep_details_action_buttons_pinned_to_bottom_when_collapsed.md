## item_011_horizontal_layout_keep_details_action_buttons_pinned_to_bottom_when_collapsed - Horizontal layout: keep details action buttons pinned to bottom when collapsed
> From version: 1.1.0
> Status: Ready
> Understanding: 98%
> Confidence: 95%
> Progress: 0%
> Complexity: Medium
> Theme: UX Layout Consistency
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
In horizontal split layout, collapsing Details can visually shift action buttons upward. This reduces consistency and makes quick actions less predictable.

# Scope
- In:
  - Keep action buttons anchored at bottom of Details panel in collapsed horizontal mode.
  - Preserve click/keyboard behavior on action buttons while body is hidden.
  - Ensure no regression in stacked layout.
- Out:
  - Redesign of button labels/actions.
  - Refactor of stacked splitter behavior (tracked by item_010).

# Acceptance criteria
- In horizontal layout, collapsed Details keeps actions pinned at panel bottom.
- Action buttons remain visible and clickable while details body is hidden.
- Expanding Details restores full body rendering without layout jumps.
- Stacked layout behavior remains unchanged.
- Keyboard navigation for actions remains intact.

# AC Traceability
- AC1 -> Details collapsed/horizontal CSS rules in `media/main.css`.
- AC2 -> Collapse toggle and rendering behavior in `media/main.js`.
- AC3 -> Manual validation evidence in harness and VS Code runtime.

# Priority
- Impact:
  - Medium-High for ergonomic action access.
- Urgency:
  - Medium, coupled with item_010 delivery wave.

# Notes
- Derived from `logics/request/req_011_horizontal_layout_keep_details_action_buttons_pinned_to_bottom_when_collapsed.md`.

# Tasks
- `logics/tasks/task_013_orchestration_delivery_for_req_010_and_req_011_details_panel_collapse_ux.md`
