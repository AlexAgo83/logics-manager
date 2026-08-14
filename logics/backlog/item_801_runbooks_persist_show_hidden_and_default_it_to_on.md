## item_801_runbooks_persist_show_hidden_and_default_it_to_on - Runbooks: persist "Show hidden" and default it to on
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 01:08:19

# AI Context
- Summary: The Runbooks "Show hidden" checkbox is in-memory only (`workshopRunbookState.includeHidden`, defaults to `false`) and resets on every reload. Persist it via the existing `viewerPreferences` mechanism (same pattern as `workshopUseSystemTerminal`) and default it to on.
- Keywords: includeHidden, workshopRunbookState, viewerPreferences, workshopUseSystemTerminal pattern, show hidden runbooks
- Use when: Implementing the "Show hidden" persistence/default fix.
- Skip when: Anything about the Fleet home dead-end latch (item_800) or the Runbooks "View graph" button removal (item_802) — separate root causes, unrelated code paths.

# Problem
Reported directly by the operator. Confirmed in `clients/viewer/src/browser-host/workshop.js:396`: `const workshopRunbookState = { payload: null, showingGraph: false, includeHidden: false };` — purely in-memory, defaults to `false`, and `setWorkshopRunbooksIncludeHidden()` (`workshop.js:473-476`) only mutates this object, never persists anything. The codebase already has an established per-operator preference mechanism to mirror: `viewerPreferences`, used by the near-identical `workshopUseSystemTerminal` checkbox (read at `workshop.js:46-48`, written on `change` at `workshop.js:58-68`), backed by `host.updateViewerPreferences()`/localStorage cache (`index.js:550-568`) and a server-side `GET`/`POST /api/preferences` route (`logics_manager/viewer.py:2799-2800`, `:2885-2896`) storing operator-scoped fields in `logics_manager/viewer_preferences.py` (`OPERATOR_FIELDS`, lines 29-36).

# Scope
- In:
  - Register a new operator-scoped preference field (e.g. `workshopRunbookShowHidden`) in `logics_manager/viewer_preferences.py`'s `OPERATOR_FIELDS`.
  - In `workshop.js`, read the initial `includeHidden` value from `host.shared.viewerPreferences.workshopRunbookShowHidden`, defaulting to `true` when unset (mirroring `workshopUsesSystemTerminal`, `workshop.js:46-48`).
  - On checkbox change, call `host.updateViewerPreferences({ workshopRunbookShowHidden: checked })` alongside the existing `setWorkshopRunbooksIncludeHidden()` call (mirroring `workshop.js:58-68`), and sync the checkbox's `checked` attribute on initial render from the same preference.
- Out:
  - Any other Runbooks preference or filter — scope this to "Show hidden" only.
  - Repo-scoped storage — this is a per-operator display preference, same bucket as `workshopUseSystemTerminal`.

# Acceptance criteria
- AC1: The Runbooks "Show hidden" choice survives a reload/restart of the viewer, using the existing `viewerPreferences` mechanism (mirroring `workshopUseSystemTerminal`).
- AC2: The Runbooks "Show hidden" checkbox defaults to checked (on) for an operator with no prior recorded preference.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: Implemented via `workshopRunbookShowHidden` registered in `OPERATOR_FIELDS` (`logics_manager/viewer_preferences.py`) and persisted through `updateViewerPreferences()` on checkbox change (`clients/viewer/src/browser-host/index.js`); verified by the new test "defaults Runbooks 'Show hidden' to on and persists a toggle to viewer preferences (task_372)" in `tests/viewer.browser-host.test.ts`, asserting the toggled value round-trips through `logics.localViewer.preferences.v1`.
- request-AC3 -> This backlog slice. Proof: `workshopRunbookShowsHidden()` (`clients/viewer/src/browser-host/workshop.js`) treats anything but an explicit `false` preference as on; the same task_372 test asserts the checkbox is checked and the initial load requests `/api/runbooks?includeHidden=1` with no prior preference recorded.

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
- Primary task(s): `task_372_runbooks_persist_show_hidden_and_default_it_to_on`

# Priority
- Priority: Low
- Rationale: Quality-of-life fix, established pattern to mirror, no ambiguity.

# Notes
- Hybrid rationale: Derived from request `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option` and kept bounded to one coherent delivery slice (the "Show hidden" preference only).
- Source file: `logics/request/req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option.md`.
- req_359/item_792 plans to move Runbooks' navigation placement (Workshop → Corpus). If that slice relocates the rendering code out of `workshop.js` before this one ships, re-verify the `workshop.js:396`/`:473-476` citations still hold before implementing.
- Task `task_372_runbooks_persist_show_hidden_and_default_it_to_on` was finished via `logics-manager flow finish task` on 2026-08-15.

# Tasks
- `task_372_runbooks_persist_show_hidden_and_default_it_to_on`
