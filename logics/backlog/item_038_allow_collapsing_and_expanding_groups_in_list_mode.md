## item_038_allow_collapsing_and_expanding_groups_in_list_mode - Allow collapsing and expanding groups in list mode
> From version: 1.9.3
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
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
- AC1/AC2/AC3 -> list-view group headers and bodies gain collapse state and toggling behavior. Proof: TODO.
- AC4 -> behavior is validated across primary-flow and optional visible groups. Proof: TODO.
- AC5 -> list header layout stays stable in expanded and collapsed states. Proof: TODO.
- AC6 -> item interaction behavior remains intact after toggle cycles. Proof: TODO.
- AC7 -> any persisted list-group state is isolated and restored safely. Proof: TODO.
- AC8 -> harness coverage locks the new collapse/expand behavior. Proof: TODO.

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
