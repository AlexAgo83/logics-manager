## task_035_add_instant_local_search_to_the_plugin - Add instant local search to the plugin
> From version: 1.9.3
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: Medium
> Theme: Navigation speed and findability
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_041_add_instant_local_search_to_the_plugin`.
- Source file: `logics/backlog/item_041_add_instant_local_search_to_the_plugin.md`.
- Related request(s): `req_036_add_instant_local_search_to_the_plugin`.

# Plan
- [ ] 1. Define the first searchable fields and place one global search control in the UI.
- [ ] 2. Add the local search input to the plugin UI.
- [ ] 3. Integrate simple case-insensitive containment search with existing filter and rendering logic.
- [ ] 4. Ensure search works coherently in board mode and list mode.
- [ ] 5. Verify filters apply first, search narrows the visible subset, and clearing search restores the expected filtered view.
- [ ] 6. Add/adjust regression tests for the main search flows.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1/AC2 -> Steps 2 and 3.
- AC3/AC4 -> Step 4.
- AC5/AC6 -> Steps 3 and 5.
- AC7 -> Step 4 and step 6 realistic coverage.
- AC8 -> Step 6.

# Links
- Backlog item: `item_041_add_instant_local_search_to_the_plugin`
- Request(s): `req_036_add_instant_local_search_to_the_plugin`

# Validation
- `npm run compile`
- `npm test`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.
