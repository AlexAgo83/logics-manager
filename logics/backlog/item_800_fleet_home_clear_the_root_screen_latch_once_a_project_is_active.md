## item_800_fleet_home_clear_the_root_screen_latch_once_a_project_is_active - Fleet home: clear the root-screen latch once a project is active
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:40:29

# AI Context
- Summary: The Fleet home/discover screen permanently traps the operator once shown, because `postToApp()` sets a module-level `rootScreenTitle = "Fleet"` latch that is never reset back to `""` once a fleet root/project is active, so Close/Minimize stay hidden even on later reopenings of Fleet home from the nav.
- Keywords: rootScreenTitle latch, isRootScreen, updateScreenActions, postToApp, fleetHome, document panel Close/Minimize
- Use when: Implementing the Fleet home dead-end fix.
- Skip when: Anything about the Runbooks "Show hidden" persistence/default (item_801) or the Runbooks "View graph" button removal (item_802) — separate root causes, unrelated code paths.

# Problem
Reported directly by the operator with a screenshot: reaching the Fleet discover screen (favorites list + Open/Add root buttons) leaves them stuck with no way to leave. Root cause confirmed in `clients/viewer/src/browser-host/index.js:2694-2698`: `postToApp()` sets `rootScreenTitle = "Fleet"` inside `if (payload.fleetHome) {...}` with no `else` branch clearing it back to `""` when `payload.fleetHome` later becomes false. `isRootScreen()` (`index.js:2416-2418`) reads this latch, and `updateScreenActions()` (`index.js:2214-2237`) hides/disables the document panel's Close and Minimize buttons whenever it's true — by design, for the one true first-boot case where nothing exists behind the screen. Because the latch never clears, every later reopening of Fleet home from the nav (`index.js:4313-4318`), even with a real project active behind it, still hides Close/Minimize. The document panel has no Escape or backdrop-click dismiss route either (only the project-switcher dropdown has those), so the only way out becomes picking a project row again (`switchViewerProject`, `index.js:1251-1284`).

# Scope
- In:
  - Reset `rootScreenTitle` back to `""` in `postToApp()` once `payload.fleetHome` is false, so `isRootScreen()`/`updateScreenActions()` correctly restore Close/Minimize once a project is active.
  - Preserve today's behavior for the true first-boot case (no project active anywhere): Close/Minimize stay hidden, operator is guided to pick or add a root.
- Out:
  - Adding Escape/backdrop-click dismissal to the document panel generally — not needed to fix the reported symptom, the bug is the stale latch, not a missing dismiss route.
  - Fleet home's layout/content redesign — separate request (req_359/item_791).

# Acceptance criteria
- AC1: Once a fleet root/project is active, reopening the Fleet home screen from the nav shows its normal Close and Minimize controls; the operator can always leave the screen.
- AC2: The true first-boot case (no project active anywhere) keeps today's behavior of guiding the operator to pick or add a root rather than offering a Close that leads nowhere.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Once a fleet root/project is active, reopening the Fleet home screen from the nav shows its normal Close and Minimize controls; the operator can always leave the screen. The true first-boot case (no project active anywhere) keeps today's behavior of guiding the operator to pick or add a root rather than offering a Close that leads nowhere.

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
- Priority: High
- Rationale: Genuine dead end blocking the operator with no workaround except restarting navigation via a project pick.

# Notes
- Hybrid rationale: Derived from request `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option` and kept bounded to one coherent delivery slice (the Fleet home latch only).
- Source file: `logics/request/req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option.md`.

# Tasks
- `task_371_fleet_home_clear_the_root_screen_latch_once_a_project_is_active`
