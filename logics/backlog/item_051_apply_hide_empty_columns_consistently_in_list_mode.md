## item_051_apply_hide_empty_columns_consistently_in_list_mode - Apply hide empty columns consistently in list mode
> From version: 1.10.0
> Status: Ready
> Understanding: 98%
> Confidence: 98%
> Progress: 0%
> Complexity: Low
> Theme: Filter consistency across board and list views
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
`Hide empty columns` currently behaves predictably in board mode, but not in list mode.
When list mode is grouped by stage, empty groups such as `REQUESTS (0)` or `TASKS (0)` can remain visible even though the same filter removes their board-mode equivalents.

That inconsistency makes the option harder to trust and adds unnecessary visual noise in list mode.

# Scope
- In:
  - Apply `Hide empty columns` consistently to stage-grouped list mode.
  - Fully remove empty stage groups when the filter is enabled.
  - Keep current behavior intact when the filter is disabled.
  - Add regression coverage for the list-mode behavior.
- Out:
  - Renaming the filter.
  - Reinterpreting status grouping around the same option.
  - Redesigning broader empty-state UX.

# Acceptance criteria
- AC1: When `Hide empty columns` is enabled, list mode does not render empty stage groups.
- AC2: When `Hide empty columns` is disabled, empty stage groups may render again.
- AC3: The behavior is consistent between board mode and stage-group list mode.
- AC4: Existing visibility rules for `SPEC` and companion-doc stages continue to apply before empty-group filtering.
- AC5: Status grouping remains unchanged unless explicitly scoped later.

# Priority
- Impact:
  - Medium: this removes a visible inconsistency in a default-on filter.
- Urgency:
  - Medium: worth fixing before more list-mode UX accumulates around the current mismatch.

# Notes
- Derived from `logics/request/req_046_apply_hide_empty_columns_consistently_in_list_mode.md`.
- In stage-group list mode, empty groups should be fully removed rather than left as header-only placeholders.
- The first implementation should stay scoped to stage-group list mode; status grouping should not be reinterpreted implicitly.

# Tasks
- `logics/tasks/task_056_apply_hide_empty_columns_consistently_in_list_mode.md`
