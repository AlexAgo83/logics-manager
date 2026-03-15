## task_065_move_refresh_from_the_toolbar_to_the_tools_menu - Move Refresh from the toolbar to the Tools menu
> From version: 1.10.0
> Status: Proposed
> Understanding: 98%
> Confidence: 97%
> Progress: 0%
> Complexity: Low
> Theme: Toolbar prioritization and tools-menu cleanup
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_060_move_refresh_from_the_toolbar_to_the_tools_menu`.
- Source file: `logics/backlog/item_060_move_refresh_from_the_toolbar_to_the_tools_menu.md`.
- Related request(s): `req_051_move_refresh_from_the_toolbar_to_the_tools_menu`.

# Plan
- [ ] 1. Remove the standalone `Refresh` button from the primary toolbar.
- [ ] 2. Add `Refresh` to the `Tools` menu under `Use workspace`.
- [ ] 3. Reuse the existing refresh action wiring so behavior does not drift.
- [ ] 4. Update tests and docs affected by the new entrypoint.
- [ ] FINAL: Update related Logics docs

# Links
- Backlog item: `item_060_move_refresh_from_the_toolbar_to_the_tools_menu`
- Request(s): `req_051_move_refresh_from_the_toolbar_to_the_tools_menu`

# Validation
- `npm run compile`
- `npm test`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status and progress updated.
