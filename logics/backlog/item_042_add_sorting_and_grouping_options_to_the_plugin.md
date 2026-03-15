## item_042_add_sorting_and_grouping_options_to_the_plugin - Add sorting and grouping options to the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Progress: 0%
> Complexity: Medium
> Theme: Information ordering and workspace navigation
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin currently presents items mainly through the workflow-stage structure. That is useful as a default, but it is not flexible enough for review workflows where users need alternative lenses such as recency, priority, or progress.

Without richer sort/group options, users are forced into one interpretation of the workspace even when another would answer their question faster.

# Scope
- In:
  - Add practical sort and grouping controls.
  - Apply ordering/grouping coherently in the visible views.
  - Compose the behavior with existing filters.
  - Keep the default workflow view understandable and available.
  - Add regression coverage for the new behavior.
- Out:
  - An analytics dashboard.
  - Unlimited saved custom views.
  - Replacing the stage model entirely.

# Acceptance criteria
- AC1: The plugin exposes at least one explicit sort control and one grouping mode beyond the current default behavior.
- AC2: Sorting works predictably in list mode, and in board mode where applicable.
- AC3: Grouping options do not destroy the ability to understand workflow structure.
- AC4: Sorting/grouping composes coherently with existing filters.
- AC5: Active sort/group state is visible enough to understand the current view.
- AC6: Clearing or changing sort/group options restores a coherent default presentation.
- AC7: Tests cover the main ordering/grouping paths where practical.

# AC Traceability
- AC1/AC2 -> UI controls and rendering paths support practical ordering/grouping modes. Proof: TODO.
- AC3 -> selected grouping modes preserve readable workflow semantics. Proof: TODO.
- AC4/AC6 -> ordering/grouping integrates cleanly with current filter/default state. Proof: TODO.
- AC5 -> current active sort/group choice is visible in UI state. Proof: TODO.
- AC7 -> regression tests cover core sort/group paths. Proof: TODO.

# Priority
- Impact:
  - Medium-High: strong leverage for review workflows, especially in list mode.
- Urgency:
  - Medium: useful capability expansion with moderate complexity.

# Notes
- Derived from `logics/request/req_037_add_sorting_and_grouping_options_to_the_plugin.md`.
- Recommended baseline:
  - sorting applies within the active grouping boundaries by default;
  - only one grouping mode is active at a time;
  - the first useful sort fields are `updatedAt`, progress/completion, and key workflow status indicators.

# Tasks
- `logics/tasks/task_036_add_sorting_and_grouping_options_to_the_plugin.md`
