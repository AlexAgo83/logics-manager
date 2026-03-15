## task_036_add_sorting_and_grouping_options_to_the_plugin - Add sorting and grouping options to the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Progress: 0%
> Complexity: Medium
> Theme: Information ordering and workspace navigation
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_042_add_sorting_and_grouping_options_to_the_plugin`.
- Source file: `logics/backlog/item_042_add_sorting_and_grouping_options_to_the_plugin.md`.
- Related request(s): `req_037_add_sorting_and_grouping_options_to_the_plugin`.

# Plan
- [ ] 1. Choose the first practical sort and grouping options worth exposing, prioritizing `updatedAt`, progress/completion, and key workflow status indicators.
- [ ] 2. Add UI controls for the selected ordering/grouping modes.
- [ ] 3. Apply ordering/grouping coherently in the relevant rendering paths, with sorting staying inside the active grouping boundaries by default.
- [ ] 4. Keep the active mode visible and understandable in the UI.
- [ ] 5. Ensure composition with existing filters and default presentation.
- [ ] 6. Add/adjust regression tests for the main ordering/grouping paths.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1/AC2 -> Steps 1, 2, and 3.
- AC3 -> Step 3.
- AC4/AC6 -> Steps 4 and 5.
- AC5 -> Step 4.
- AC7 -> Step 6.

# Links
- Backlog item: `item_042_add_sorting_and_grouping_options_to_the_plugin`
- Request(s): `req_037_add_sorting_and_grouping_options_to_the_plugin`

# Validation
- `npm run compile`
- `npm test`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.
