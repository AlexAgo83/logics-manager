## item_802_runbooks_remove_the_dead_view_graph_button - Runbooks: remove the dead "View graph" button
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 01:08:45

# AI Context
- Summary: The Runbooks "View graph" button (`data-viewer-workshop-runbook-graph`) renders a Mermaid chain graph nobody uses; remove the button and its click-handler branch, keep the underlying `showWorkshopRunbookGraph`/`graph.js`/`/api/runbook-graph` code in place unused, and update the one test that asserts on the button.
- Keywords: data-viewer-workshop-runbook-graph, showWorkshopRunbookGraph, runbook graph button removal
- Use when: Implementing the "View graph" button removal.
- Skip when: Anything about the Fleet home dead-end latch (item_800) or the "Show hidden" persistence/default (item_801) — separate root causes, unrelated code paths.

# Problem
Reported directly by the operator: the Runbooks "View graph" button serves no purpose today. Located at `clients/viewer/src/browser-host/workshop.js:194` (button markup) and wired via `clients/viewer/src/browser-host/index.js:4310`/`4636-4640`, calling `showWorkshopRunbookGraph()` (`workshop.js:478-500`), which renders a Mermaid chain graph via `clients/viewer/src/browser-host/graph.js` from `GET /api/runbook-graph` (`logics_manager/viewer.py:2545`, `:2838`). Nothing else in the viewer links to this button or its handler (no nav entry, no shortcut, no deep link), so hiding just the UI entry point is safe and sufficient. One test asserts on it and must be updated: `tests/viewer.browser-host.test.ts:3277-3284`.

# Scope
- In:
  - Remove the "View graph" button markup and its click-handler branch from the Runbooks panel.
  - Update `tests/viewer.browser-host.test.ts:3277-3284` so the suite still passes.
- Out:
  - Removing `showWorkshopRunbookGraph`, `graph.js`, or the `/api/runbook-graph` endpoint — they can stay in place unused; only the UI entry point goes.

# Acceptance criteria
- AC1: The Runbooks "View graph" button is no longer visible in the UI.
- AC2: The underlying graph-rendering code and `/api/runbook-graph` endpoint remain in place unused; the affected browser-host test is updated so the suite still passes.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: Button markup and its click-handler branch removed from `clients/viewer/src/browser-host/workshop.js`/`index.js`; `showWorkshopRunbookGraph`, `graph.js`, and `/api/runbook-graph` left in place unused. `tests/viewer.browser-host.test.ts`'s old graph assertions were replaced with "no longer shows the dead 'View graph' button in Runbooks (task_373)"; full suite (`npx vitest run tests/viewer.browser-host.test.ts`) passes, 209/209.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option`
- Primary task(s): `task_373_runbooks_remove_the_dead_view_graph_button`

# Priority
- Priority: Low
- Rationale: Pure cleanup, no ambiguity, no downstream risk beyond the one test.

# Notes
- Hybrid rationale: Derived from request `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option` and kept bounded to one coherent delivery slice (the "View graph" button only).
- Source file: `logics/request/req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option.md`.
- req_359/item_792 plans to move Runbooks' navigation placement (Workshop → Corpus). If that slice relocates the rendering code out of `workshop.js` before this one ships, re-verify the `workshop.js:194`/`index.js:4310,4636-4640` citations still hold before implementing.
- Task `task_373_runbooks_remove_the_dead_view_graph_button` was finished via `logics-manager flow finish task` on 2026-08-15.

# Tasks
- `task_373_runbooks_remove_the_dead_view_graph_button`
