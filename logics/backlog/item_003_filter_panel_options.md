## item_003_filter_panel_options - Regroup options into filter panel
> From version: 0.0.0
> Understanding: 85%
> Confidence: 85%
> Progress: 0%

# Problem
Move toolbar options into a dedicated panel opened by a filter-like icon to reduce header clutter.

# Scope
- In:
  - Add a filter icon button on the same row as the action buttons, placed to the far left of the buttons group and aligned with it.
  - Clicking the filter icon toggles a small anchored popover panel under the button.
  - Panel contains the current options: Hide used requests, Hide completed (same labels).
  - Preserve existing option behaviors and state persistence.
  - Close the panel on outside click or Esc.
  - Show an active state on the filter icon when any option is enabled.
- Out:
  - Adding new filter options beyond the current two.
  - Persisting panel open/closed state between reloads.

# Acceptance criteria
- A filter icon button appears on the toolbar row, aligned with the action buttons and placed to their left.
- Clicking the icon opens/closes an anchored options popover under the button.
- The panel contains the existing toggles (Hide used requests, Hide completed) and they work as before.
- The panel closes on outside click or Esc.
- The filter icon shows an active state when at least one option is enabled.

# Priority
- Impact:
- Medium — cleaner header while keeping access to options.
- Urgency:
- Medium — aligns with UI polish work.

# Notes
- Derived from `logics/request/req_003_filter_panel_options.md`.
- Related task:
  - `logics/tasks/task_007_filter_panel_options.md`
