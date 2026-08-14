## item_801_runbooks_persist_show_hidden_and_default_it_to_on - Runbooks: persist "Show hidden" and default it to on
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:40:29

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
- request-AC2 -> This backlog slice. Proof: AC2: The Runbooks "Show hidden" choice survives a reload/restart of the viewer, using the existing `viewerPreferences` mechanism (mirroring `workshopUseSystemTerminal`).
- request-AC3 -> This backlog slice. Proof: AC3: The Runbooks "Show hidden" checkbox defaults to checked (on) for an operator with no prior recorded preference.

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
- Rationale: Quality-of-life fix, established pattern to mirror, no ambiguity.

# Notes
- Hybrid rationale: Derived from request `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option` and kept bounded to one coherent delivery slice (the "Show hidden" preference only).
- Source file: `logics/request/req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option.md`.

# Tasks
- `task_372_runbooks_persist_show_hidden_and_default_it_to_on`
