## req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option - Fleet and Runbooks: dead-end screen, unpersisted preference, dead UI option
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 01:08:44

# AI Context
- Summary: Three unrelated operator-reported findings bundled in one request: (1) the Fleet discover/home screen permanently traps the operator once shown, because a "root screen" latch is set once and never cleared; (2) the Runbooks "Show hidden" checkbox is in-memory only and defaults to off, losing the choice every reload; (3) the Runbooks "View graph" button is a dead feature that should be hidden from the UI.
- Keywords: fleet home stuck, rootScreenTitle latch, viewer-project-switcher, show hidden runbooks, viewerPreferences, runbook graph button, workshop.js
- Use when: Fixing the Fleet home dead-end, adding persistence to the Runbooks "Show hidden" toggle, or removing the Runbooks "View graph" button.
- Skip when: Anything about the fleet project switcher's native-tooltip clash — that's req_361, unrelated. Anything about the Fleet home screen's layout/content redesign or the Runbooks-should-move-under-Corpus/selection-switch-in-header findings — those are req_359, unrelated.

# Needs
- As an operator who lands on the Fleet discover screen (favorites + Open/Add root), I need a way back out once I've already picked a project, instead of being stuck with no Close/Minimize button.
- As an operator who turns on "Show hidden" in Runbooks, I need that choice remembered across reloads, and I need it on by default rather than having to turn it on every session.
- As an operator, I need the Runbooks "View graph" button removed, since it serves no purpose today.

# Context
- **Fleet home dead end** (reported directly by the operator with a screenshot: reaching the Fleet discover screen leaves them stuck, no way to leave). Root cause confirmed in `clients/viewer/src/browser-host/index.js:2694-2698`: `postToApp()` sets the module-level latch `rootScreenTitle = "Fleet"` when `payload.fleetHome` is true, but there is no `else` branch resetting it back to `""` once `payload.fleetHome` becomes false (i.e. once a fleet root exists and a project is active). `isRootScreen()` (`index.js:2416-2418`) reads that latch, and `updateScreenActions()` (`index.js:2214-2237`) hides/disables the document panel's Close and Minimize buttons whenever `isRootScreen()` is true — by design, for the one true first-boot case where there is genuinely nothing behind the screen. Because the latch is never cleared, every later reopening of "Fleet home" from the nav (`index.js:4313-4318`) — even deep into a session, with a real project active behind it — still hides Close/Minimize. The document panel has no Escape or backdrop-click dismiss route either (only the project-switcher dropdown has those, at `index.js:3959-3966` and `index.js:4284-4291`), so Close/Minimize being suppressed leaves genuinely no way out except picking a project row again.
- **"Show hidden" not persisted, wrong default** (reported directly by the operator). Confirmed in `clients/viewer/src/browser-host/workshop.js:396`: `const workshopRunbookState = { payload: null, showingGraph: false, includeHidden: false };` — purely in-memory, defaults to `false`, and `setWorkshopRunbooksIncludeHidden()` (`workshop.js:473-476`) only mutates this object, never persists anything. The codebase already has an established per-operator preference mechanism to mirror: `viewerPreferences`, used by the near-identical `workshopUseSystemTerminal` checkbox (read at `workshop.js:46-48`, written on `change` at `workshop.js:58-68`), backed by `host.updateViewerPreferences()`/localStorage cache (`index.js:550-568`) and a server-side `GET`/`POST /api/preferences` route (`logics_manager/viewer.py:2799-2800`, `:2885-2896`) storing operator-scoped fields in `logics_manager/viewer_preferences.py` (`OPERATOR_FIELDS`, lines 29-36).
- **"View graph" is a dead option** (reported directly by the operator). Located at `clients/viewer/src/browser-host/workshop.js:194` (button markup, `data-viewer-workshop-runbook-graph`) and wired via `clients/viewer/src/browser-host/index.js:4310`/`4636-4640`, calling `showWorkshopRunbookGraph()` (`workshop.js:478-500`), which renders a Mermaid chain graph via `clients/viewer/src/browser-host/graph.js` from `GET /api/runbook-graph` (`logics_manager/viewer.py:2545`, `2838`). Nothing else in the viewer links to this button or its handler (no nav entry, no shortcut, no deep link), so hiding just the UI entry point is safe and sufficient; the graph renderer and the server endpoint can stay in place unused. One test asserts on this button and must be updated alongside the removal: `tests/viewer.browser-host.test.ts:3277-3284` (dispatches a click on `[data-viewer-workshop-runbook-graph]` and asserts on the rendered graph).

# Acceptance criteria
- AC1: Once a fleet root/project is active, reopening the Fleet home screen from the nav shows its normal Close and Minimize controls; the operator can always leave the screen. The true first-boot case (no project active anywhere) keeps today's behavior of guiding the operator to pick or add a root rather than offering a Close that leads nowhere.
- AC2: The Runbooks "Show hidden" choice survives a reload/restart of the viewer, using the existing `viewerPreferences` mechanism (mirroring `workshopUseSystemTerminal`).
- AC3: The Runbooks "Show hidden" checkbox defaults to checked (on) for an operator with no prior recorded preference.
- AC4: The Runbooks "View graph" button is no longer visible in the UI. The underlying graph-rendering code and `/api/runbook-graph` endpoint may remain in place unused; the affected browser-host test is updated so the suite still passes.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/index.js
- clients/viewer/src/browser-host/workshop.js
- logics_manager/viewer_preferences.py

# Backlog
- `item_800_fleet_home_clear_the_root_screen_latch_once_a_project_is_active`
- `item_801_runbooks_persist_show_hidden_and_default_it_to_on`
- `item_802_runbooks_remove_the_dead_view_graph_button`
