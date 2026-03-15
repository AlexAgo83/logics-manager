## req_037_add_sorting_and_grouping_options_to_the_plugin - Add sorting and grouping options to the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Complexity: Medium
> Theme: Information ordering and workspace navigation
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Add richer ways to order and group items beyond the current stage-based defaults.
- Improve navigation when users need to inspect work by recency, priority, progress, or other useful lenses.
- Make list mode especially more powerful for operational review.

# Context
The plugin currently organizes items primarily by workflow stage.
That is useful as a default, but users also need alternative ways to inspect the same dataset depending on the question they are asking, for example:
- what changed most recently;
- what is stalled;
- what is closest to completion;
- what is most urgent.

The current structure is good for baseline orchestration, but it is not yet flexible enough for richer review workflows.
Adding sort/group controls would turn the plugin from a fixed visual board into a more useful operational navigator.

# Acceptance criteria
- AC1: The plugin exposes at least one explicit sort control and one grouping mode beyond the current default behavior.
- AC2: Sorting works predictably in list mode, and in board mode where applicable.
- AC3: Grouping options do not destroy the ability to understand the workflow structure of items.
- AC4: Sorting/grouping composes coherently with existing filters.
- AC5: The active sort/group state is visible enough for users to understand what they are looking at.
- AC6: Clearing or changing sort/group options restores a coherent default presentation.
- AC7: Tests cover at least the main ordering/grouping paths where practical.

# Scope
- In:
  - Add sort and/or grouping controls.
  - Apply the selected ordering/grouping in the visible views.
  - Preserve compatibility with existing filters and rendering logic.
  - Add regression coverage for the new ordering behavior.
- Out:
  - A full analytics dashboard.
  - Advanced saved views.
  - Replacing the existing stage model entirely.

# Dependencies and risks
- Dependency: current item metadata must provide stable fields suitable for ordering/grouping.
- Dependency: board and list rendering paths may need different supported options.
- Risk: too many ordering options can clutter the UI if not scoped carefully.
- Risk: grouping that fights the workflow model can make the plugin harder, not easier, to understand.
- Risk: sorting by weak or sparse metadata can produce confusing results.

# Clarifications
- The request is to introduce practical alternative lenses, not unlimited configurability.
- List mode is the most likely place to benefit first from richer sorting/grouping.
- The default workflow-stage view should remain available and understandable.
- The chosen options should be explicit and useful rather than speculative.
- The recommended baseline is:
  - sorting applies within the active grouping boundaries by default, rather than flattening the whole dataset into one mixed order;
  - only one grouping mode should be active at a time;
  - list mode should receive the richer grouping behavior first, while board mode can stay more constrained.
- The recommended first sort fields are `updatedAt`, progress/completion, and key workflow status indicators before adding weaker or sparsely populated fields.
- The workflow-stage structure should remain the default backbone even when richer sorting becomes available.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_042_add_sorting_and_grouping_options_to_the_plugin.md`
