## req_028_add_reset_action_for_filter_defaults - Add reset action to restore default filter options
> From version: 1.9.2
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Complexity: Low
> Theme: Filter ergonomics and recoverability
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Add a dedicated `Reset` action to the filter panel so users can restore the intended default filter configuration in one click.
- Place this `Reset` action in the last position of the filter panel so it reads as a utility/fallback control, not as a primary filter.
- Reduce friction after exploratory toggling by giving users a fast way to get back to the default filtered view.

# Context
The filter panel now exposes several toggles whose default state represents the preferred orchestration view:
- `Hide processed requests`
- `Hide completed`
- `Hide SPEC`
- `Show companion docs`
- `Hide empty columns`

This default combination is useful, but once users start toggling filters there is currently no quick way to restore it.
That forces manual re-selection of every checkbox and increases the chance of ending up in a partially-reset state.

The missing interaction is not a new filter.
It is a recovery action:
- quick to understand;
- quick to apply;
- and visually secondary to the actual filter toggles.

# Acceptance criteria
- AC1: The filter panel includes a `Reset` control placed after the existing filter toggles, in the last position of the panel.
- AC2: Activating `Reset` restores all filter options to their intended defaults:
  - `Hide processed requests` = enabled
  - `Hide completed` = enabled
  - `Hide SPEC` = enabled
  - `Show companion docs` = enabled
  - `Hide empty columns` = enabled
- AC3: `Reset` updates both UI state and rendered content immediately without requiring panel close/reopen or manual refresh.
- AC4: The reset state is persisted exactly like manual filter changes, so reloading the webview keeps the restored defaults.
- AC5: Resetting filters does not affect unrelated UI state such as selected item, details collapse state, split ratio, or board/list mode.
- AC6: Webview harness coverage includes the reset behavior and verifies that the filter state and rendered stages/cards return to the expected default configuration.

# Scope
- In:
  - Add a `Reset` action to the filter panel UI.
  - Restore the defined default values for all filter toggles.
  - Persist the restored state and rerender immediately.
  - Add regression tests for reset behavior.
- Out:
  - Changing the default filter set itself.
  - Resetting non-filter preferences such as view mode or details collapse state.
  - Broader redesign of the filter panel layout.

# Dependencies and risks
- Dependency: current default filter values remain the source of truth and should be centralized or reused rather than duplicated inconsistently.
- Dependency: harness tests should cover both state restoration and rendered-result restoration.
- Risk: a naive reset implementation could accidentally reset non-filter UI state if it reuses a broader "full UI reset" path.
- Risk: duplicating default values in multiple places could create drift later if defaults change again.

# Clarifications
- `Reset` should be visually read as a utility action, not as another checkbox-style filter.
- The expected placement is at the end of the filter panel, after the toggle list.
- The purpose is "restore defaults", not "clear all filters".
- The defaults to restore are the current product defaults listed in this request, not "all unchecked".
- `Reset` should only affect filter toggles and must not reset board/list mode, collapse state, search state, or other unrelated UI preferences.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_034_add_reset_action_for_filter_defaults.md`
