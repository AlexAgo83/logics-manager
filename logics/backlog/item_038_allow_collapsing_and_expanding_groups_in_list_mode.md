## item_038_allow_collapsing_and_expanding_groups_in_list_mode - Allow collapsing and expanding groups in list mode
> From version: 1.9.3
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Progress: 100%
> Complexity: Medium
> Theme: List-mode navigation and density control
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
List mode keeps the grouped structure of the workflow, but once several groups are populated it can become vertically dense and harder to scan. Users need a way to temporarily collapse groups they do not need while staying in list mode.

Without per-group collapse/expand, list mode can trade horizontal clarity for excessive vertical sprawl. The missing control is a lightweight progressive-disclosure mechanism directly on the group headers.

# Scope
- In:
  - Add collapse/expand controls to list-mode group headers.
  - Hide/show group body content while keeping headers visible.
  - Preserve current grouped list structure and item interactions.
  - Support primary-flow groups and optional groups such as companion-doc sections or `SPEC` when visible.
  - Add regression coverage for the new behavior.
- Out:
  - Changing board-mode column behavior.
  - Flattening list mode into an ungrouped list.
  - Redesigning detail-panel collapse behavior.
  - Changing filter semantics.

# Acceptance criteria
- AC1: Each visible group in list mode exposes a collapse/expand control.
- AC2: Collapsing a group hides its items while keeping the group header visible.
- AC3: Expanding a collapsed group restores its items in place.
- AC4: Collapse/expand works for primary-flow groups and optional groups such as companion-doc sections or `SPEC` when visible.
- AC5: Group headers remain readable and stable whether the group is expanded or collapsed.
- AC6: Existing item selection and navigation behavior continue to work after collapsing or re-expanding groups.
- AC7: If group collapse state is persisted, it restores cleanly without breaking current filters or list-mode rendering.
- AC8: Webview tests cover the new group collapse/expand behavior in list mode.

# AC Traceability
- AC1/AC2/AC3 -> list-view group headers are now interactive buttons that collapse and expand their section bodies in place. Proof: `media/renderBoard.js`.
- AC4 -> the collapse state is stage-based, so it applies equally to primary-flow groups and optional visible groups such as companion docs or `SPEC`. Proof: `media/renderBoard.js`.
- AC5 -> the list header remains rendered as a stable full-width control with a lightweight chevron affordance in either state. Proof: `media/css/board.css`.
- AC6 -> toggling only hides section bodies and does not change item-card rendering or selection wiring. Proof: `media/renderBoard.js`.
- AC7 -> collapsed list stages persist through webview state using an isolated `collapsedListStages` bucket. Proof: `media/main.js`.
- AC8 -> harness coverage verifies collapse/expand state and persistence for list groups. Proof: `tests/webview.harness-a11y.test.ts`.

# Priority
- Impact:
  - Medium: improves list-mode usability and scanability when many groups are visible.
- Urgency:
  - Medium: useful UX refinement once list mode becomes a more common fallback.

# Notes
- Derived from `logics/request/req_033_allow_collapsing_and_expanding_groups_in_list_mode.md`.
- List groups should remain expanded by default; collapse is a density-control affordance, not the default presentation.

# Tasks
- `logics/tasks/task_032_allow_collapsing_and_expanding_groups_in_list_mode.md`
