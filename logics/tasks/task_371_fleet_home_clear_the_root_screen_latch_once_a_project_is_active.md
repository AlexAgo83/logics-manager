## task_371_fleet_home_clear_the_root_screen_latch_once_a_project_is_active - Fleet home: clear the root-screen latch once a project is active
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
- Summary: Reset the module-level `rootScreenTitle` latch in `postToApp()` (`clients/viewer/src/browser-host/index.js:2694-2698`) back to `""` once `payload.fleetHome` is false, so `isRootScreen()`/`updateScreenActions()` restore the document panel's Close/Minimize buttons once a project is active behind the Fleet home screen.
- Keywords: rootScreenTitle latch, isRootScreen, updateScreenActions, postToApp, fleetHome
- Use when: Implementing this task.
- Skip when: Anything about Runbooks' "Show hidden" persistence (task_372) or the "View graph" button removal (task_373) — unrelated code paths.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_800_fleet_home_clear_the_root_screen_latch_once_a_project_is_active`

# Acceptance criteria
- AC1: Once a fleet root/project is active, reopening the Fleet home screen from the nav shows its normal Close and Minimize controls; the operator can always leave the screen.
- AC2: The true first-boot case (no project active anywhere) keeps today's behavior of guiding the operator to pick or add a root rather than offering a Close that leads nowhere.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_371_fleet_home_clear_the_root_screen_latch_once_a_project_is_active.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_371_fleet_home_clear_the_root_screen_latch_once_a_project_is_active.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts`: 207/207 passed, including the new regression test "restores Close/Minimize when Fleet home is reopened after a project is active (task_371)".
- npx vitest run tests/viewer.browser-host.test.ts passed 207/207
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Added an `else` branch in `postToApp()` (`clients/viewer/src/browser-host/index.js`) clearing `rootScreenTitle` back to `""` whenever `payload.fleetHome` is false, so `isRootScreen()`/`updateScreenActions()` stop suppressing Close/Minimize once a project is active. Rebuilt `clients/viewer/browser-host.js` via `node scripts/build/build-viewer-browser-host.mjs`.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_800_fleet_home_clear_the_root_screen_latch_once_a_project_is_active`
- Related request(s): `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option`

# Links
- Request: `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Fixed via the `else` branch in `postToApp()` (`clients/viewer/src/browser-host/index.js:2694-2704`); verified by the new test "restores Close/Minimize when Fleet home is reopened after a project is active (task_371)" in `tests/viewer.browser-host.test.ts`, which simulates true first-boot, switches project, reopens Fleet home, and asserts Close is no longer hidden/disabled.
- request-AC2 -> This task. Proof: The true-first-boot path (`payload.fleetHome` true) is untouched by this change; the same new test asserts Close IS hidden immediately after boot, before any project switch.
