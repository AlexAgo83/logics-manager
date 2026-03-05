## item_017_hide_spec_stage_by_default_filter_option - Add Hide SPEC filter option with default hidden behavior
> From version: 1.6.0
> Status: Done
> Understanding: 100%
> Confidence: 98%
> Progress: 100%
> Complexity: Medium
> Theme: Filtering and board/list density control
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
SPEC entries are useful but can add noise to daily execution views. Users need a direct filter to fully hide SPEC in both board and list modes, with hidden-by-default behavior for focus.

# Scope
- In:
  - Add a filter-panel checkbox `Hide SPEC`.
  - Apply SPEC filtering consistently in board and list render paths.
  - Default to `Hide SPEC` enabled on first load.
  - Persist the new filter state across reload.
  - Add regression coverage for default and toggle behavior.
- Out:
  - Stage-model changes.
  - Promotion workflow changes.
  - New visual redesign of the filter panel.

# Acceptance criteria
- Filter panel includes `Hide SPEC`.
- `Hide SPEC` is enabled by default.
- In board mode, SPEC column is absent when filter is enabled.
- In list mode, SPEC section is absent when filter is enabled.
- Disabling filter restores SPEC in both modes.
- Filter state persistence includes this option.

# AC Traceability
- AC1/AC2 -> `media/main.js` filter state (`hideSpec`) + `src/extension.ts` / `debug/webview/index.html` checkbox markup. Proof: TODO.
- AC3/AC4/AC5 -> `media/main.js` `isVisible()` and visible-stage rendering (`renderBoardColumns` / `renderListView`). Proof: TODO.
- AC6 -> `persistState()` + previous-state restore in `media/main.js`. Proof: TODO.

# Priority
- Impact:
  - Medium-High: improves navigation focus on request/backlog/task flows.
- Urgency:
  - Medium: quality-of-life improvement with low implementation risk.

# Notes
- Derived from `logics/request/req_017_filter_option_hide_spec_stage_by_default.md`.

# Tasks
- `logics/tasks/task_018_orchestration_delivery_for_req_017_hide_spec_filter_default.md`
