## item_010_stacked_layout_disable_splitter_and_compact_details_when_collapsed - Stacked layout: disable splitter and compact details when collapsed
> From version: 1.1.0
> Status: Done
> Understanding: 99%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: UX Behavior and Interaction Guardrails
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
In stacked (vertical split) layout, collapsing Details still leaves splitter interactions active. This creates an inconsistent UX: details content is hidden but resize mechanics remain available.

# Scope
- In:
  - Disable splitter drag/resize interactions while Details is collapsed in stacked mode.
  - Keep collapsed Details compact at the bottom (header/actions footprint).
  - Restore normal splitter behavior on expand.
- Out:
  - Desktop/horizontal layout redesign.
  - Changes to action semantics (`Promote`, `Edit`, `Read`).

# Acceptance criteria
- In stacked layout with collapsed Details, pointer drag on splitter has no effect.
- In stacked layout with collapsed Details, keyboard resize interactions are ignored.
- Collapsed Details remains compact at bottom and board area stays stable.
- Re-expanding Details restores splitter behavior and split ratio handling.
- Non-stacked behavior is unchanged.

# AC Traceability
- AC1 -> Splitter guard logic in `media/main.js` for collapsed stacked mode. Proof: TODO.
- AC2 -> Compact collapsed layout rules in `media/main.css`. Proof: TODO.
- AC3 -> Validation evidence from harness + VS Code runtime smoke checks. Proof: TODO.
- AC4 -> TODO: map this acceptance criterion to scope. Proof: TODO.
- AC5 -> TODO: map this acceptance criterion to scope. Proof: TODO.

# Priority
- Impact:
  - High for usability on stacked/small layout.
- Urgency:
  - Medium-High to remove contradictory interaction states.

# Notes
- Derived from `logics/request/req_010_stacked_layout_disable_splitter_and_compact_details_when_collapsed.md`.

# Tasks
- `logics/tasks/task_013_orchestration_delivery_for_req_010_and_req_011_details_panel_collapse_ux.md`
