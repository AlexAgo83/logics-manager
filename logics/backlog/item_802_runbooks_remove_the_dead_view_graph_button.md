## item_802_runbooks_remove_the_dead_view_graph_button - Runbooks: remove the dead "View graph" button
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:40:30

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
- request-AC4 -> This backlog slice. Proof: AC4: The Runbooks "View graph" button is no longer visible in the UI. The underlying graph-rendering code and `/api/runbook-graph` endpoint may remain in place unused; the affected browser-host test is updated so the suite still passes.

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
- Request: `logics/request/req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option.md`
- Primary task(s): (none yet)

# Priority
- Priority: Low
- Rationale: Pure cleanup, no ambiguity, no downstream risk beyond the one test.

# Notes
- Hybrid rationale: Derived from request `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option` and kept bounded to one coherent delivery slice (the "View graph" button only).
- Source file: `logics/request/req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option.md`.

# Tasks
- `task_373_runbooks_remove_the_dead_view_graph_button`
