## task_007_filter_panel_options - Regroup options into filter panel
> From version: 0.0.0
> Understanding: 85%
> Confidence: 85%
> Progress: 0%

# Context
Derived from `logics/backlog/item_003_filter_panel_options.md`.
Move toolbar options into a filter popover opened via a filter icon.

# Plan
- [ ] 1. Add a filter icon button to the toolbar row, positioned to the left of the action buttons.
- [ ] 2. Implement an anchored popover panel under the icon containing the existing toggles.
- [ ] 3. Preserve option behavior and state persistence; add active-state styling on the icon when any option is enabled.
- [ ] 4. Close the popover on outside click or Esc.
- [ ] FINAL: Manual verification of layout, behavior, and accessibility.

# Validation
- Manual: filter icon appears to the left of the action buttons on the toolbar row.
- Manual: clicking the icon opens/closes the options popover; outside click and Esc close it.
- Manual: toggles work as before and remain persisted across refresh.
- Manual: filter icon reflects active state when any option is enabled.

# Report

# Notes
