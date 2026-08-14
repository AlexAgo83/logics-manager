## task_372_runbooks_persist_show_hidden_and_default_it_to_on - Runbooks: persist "Show hidden" and default it to on
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 01:09:06
> Owner: assistant

# AI Context
- Summary: Persist the Runbooks "Show hidden" checkbox via `viewerPreferences` (mirroring `workshopUseSystemTerminal`, `clients/viewer/src/browser-host/workshop.js:46-68`), register the new operator-scoped field in `logics_manager/viewer_preferences.py`'s `OPERATOR_FIELDS`, and default it to on when unset.
- Keywords: includeHidden, workshopRunbookState, viewerPreferences, OPERATOR_FIELDS
- Use when: Implementing this task.
- Skip when: Anything about the Fleet home dead-end latch (task_371) or the "View graph" button removal (task_373) — unrelated code paths.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_801_runbooks_persist_show_hidden_and_default_it_to_on`

# Acceptance criteria
- AC1: The Runbooks "Show hidden" choice survives a reload/restart of the viewer, using the existing `viewerPreferences` mechanism (mirroring `workshopUseSystemTerminal`).
- AC2: The Runbooks "Show hidden" checkbox defaults to checked (on) for an operator with no prior recorded preference.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_372_runbooks_persist_show_hidden_and_default_it_to_on.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_372_runbooks_persist_show_hidden_and_default_it_to_on.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts`: 209/209 passed, including the new regression test "defaults Runbooks 'Show hidden' to on and persists a toggle to viewer preferences (task_372)".
- `python3 -m pytest tests/python/test_viewer_preferences.py -q`: 16/16 passed.
- npx vitest run tests/viewer.browser-host.test.ts passed 209/209; python3 -m pytest tests/python/test_viewer_preferences.py -q passed 16/16
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Registered `workshopRunbookShowHidden` in `OPERATOR_FIELDS` (`logics_manager/viewer_preferences.py`). Added `workshopRunbookShowsHidden()` getter (mirroring `workshopUsesSystemTerminal()`) in `clients/viewer/src/browser-host/workshop.js`, used it to seed the checkbox's `checked` attribute and `workshopRunbookState.includeHidden`'s initial/resynced value. Wired `updateViewerPreferences({ workshopRunbookShowHidden })` into the checkbox's click handler in `index.js`. Rebuilt `clients/viewer/browser-host.js`.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_801_runbooks_persist_show_hidden_and_default_it_to_on`
- Related request(s): `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option`

# Links
- Request: `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC2 -> This task. Proof: `updateViewerPreferences({ workshopRunbookShowHidden: checked })` persists on checkbox change (`index.js`); verified by the new task_372 test asserting the value round-trips through `logics.localViewer.preferences.v1`.
- request-AC3 -> This task. Proof: `workshopRunbookShowsHidden()` (`workshop.js`) defaults to `true` unless the preference is explicitly `false`; the same test asserts the checkbox starts checked and the initial fetch is `/api/runbooks?includeHidden=1` with no prior preference recorded.
