## item_034_add_reset_action_for_filter_defaults - Add reset action to restore default filter options
> From version: 1.9.2
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Progress: 0%
> Complexity: Low
> Theme: Filter ergonomics and recoverability
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The filter panel now has a meaningful default configuration, but users currently have no one-click way to restore it after exploring different combinations. That forces manual re-selection of every checkbox and makes the panel unnecessarily cumbersome to recover.

This is not a missing filter option. It is a missing recovery action. Without a dedicated `Reset` control, users can easily end up in a partially modified state and spend time reconstructing the intended default view by hand.

# Scope
- In:
  - Add a `Reset` action to the filter panel.
  - Place `Reset` after the existing filter toggles, in the last position.
  - Restore all filter values to the intended defaults.
  - Persist the restored state immediately.
  - Re-render the board/list view immediately after reset.
  - Add regression coverage for reset behavior.
- Out:
  - Changing the default filter set itself.
  - Resetting non-filter UI state such as details collapse, split ratio, or display mode.
  - Redesigning the whole filter panel.

# Acceptance criteria
- AC1: The filter panel includes a `Reset` control in the last position.
- AC2: Activating `Reset` restores all filter options to these defaults:
  - `Hide processed requests` = enabled
  - `Hide completed` = enabled
  - `Hide SPEC` = enabled
  - `Show companion docs` = enabled
  - `Hide empty columns` = enabled
- AC3: Reset updates the UI state and rendered content immediately.
- AC4: Reset persists the restored values like any manual filter change.
- AC5: Reset does not affect unrelated UI state such as selected item, details collapse state, split ratio, or board/list mode.
- AC6: Webview tests verify that reset restores both the filter values and the rendered default view.

# AC Traceability
- AC1 -> filter panel markup and control placement in the webview shell. Proof: TODO.
- AC2 -> centralized default-filter values or equivalent reset source of truth. Proof: TODO.
- AC3/AC4 -> reset handler updates state, persists state, and triggers rerender immediately. Proof: TODO.
- AC5 -> reset path stays scoped to filter state only. Proof: TODO.
- AC6 -> harness tests cover restored checkbox state and restored visible sections/cards/columns. Proof: TODO.

# Priority
- Impact:
  - Medium: improves recoverability and removes repetitive manual filter cleanup.
- Urgency:
  - Medium: low-risk UX improvement that becomes more valuable as the default filter set grows.

# Notes
- Derived from `logics/request/req_028_add_reset_action_for_filter_defaults.md`.

# Tasks
- `logics/tasks/task_027_add_reset_action_for_filter_defaults.md`
