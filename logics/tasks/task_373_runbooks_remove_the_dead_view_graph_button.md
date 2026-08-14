## task_373_runbooks_remove_the_dead_view_graph_button - Runbooks: remove the dead "View graph" button
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
- Summary: Remove the Runbooks "View graph" button (`data-viewer-workshop-runbook-graph`, `clients/viewer/src/browser-host/workshop.js:194`) and its click-handler branch (`clients/viewer/src/browser-host/index.js:4310`/`4636-4640`); leave `showWorkshopRunbookGraph`/`graph.js`/`/api/runbook-graph` in place unused; update the one assertion in `tests/viewer.browser-host.test.ts:3277-3284`.
- Keywords: data-viewer-workshop-runbook-graph, showWorkshopRunbookGraph, dead button removal
- Use when: Implementing this task.
- Skip when: Anything about the Fleet home dead-end latch (task_371) or Runbooks' "Show hidden" persistence (task_372) — unrelated code paths.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_802_runbooks_remove_the_dead_view_graph_button`

# Acceptance criteria
- AC1: The Runbooks "View graph" button is no longer visible in the UI.
- AC2: The underlying graph-rendering code and `/api/runbook-graph` endpoint remain in place unused; the affected browser-host test is updated so the suite still passes.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_373_runbooks_remove_the_dead_view_graph_button.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_373_runbooks_remove_the_dead_view_graph_button.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts`: 209/209 passed, including the new regression test "no longer shows the dead 'View graph' button in Runbooks (task_373)".
- npx vitest run tests/viewer.browser-host.test.ts passed 209/209
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Removed the "View graph" button markup (`workshop.js`) and its click-handler branch (`index.js`), including the now-unused `workshopRunbookGraphTarget` lookup and the `showWorkshopRunbookGraph` destructure. Left `showWorkshopRunbookGraph`, `graph.js`, and the `/api/runbook-graph` endpoint in place, unused. Replaced the old test's graph assertions with a dedicated regression test. Rebuilt `clients/viewer/browser-host.js`.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_802_runbooks_remove_the_dead_view_graph_button`
- Related request(s): `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option`

# Links
- Request: `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC4 -> This task. Proof: Button and click-handler branch removed; `tests/viewer.browser-host.test.ts` asserts `[data-viewer-workshop-runbook-graph]` is null after opening Runbooks, and the full suite (209/209) still passes.
