## task_371_fleet_home_clear_the_root_screen_latch_once_a_project_is_active - Fleet home: clear the root-screen latch once a project is active
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:40:56

# AI Context
- Summary: Reset the module-level `rootScreenTitle` latch in `postToApp()` (`clients/viewer/src/browser-host/index.js:2694-2698`) back to `""` once `payload.fleetHome` is false, so `isRootScreen()`/`updateScreenActions()` restore the document panel's Close/Minimize buttons once a project is active behind the Fleet home screen.
- Keywords: rootScreenTitle latch, isRootScreen, updateScreenActions, postToApp, fleetHome
- Use when: Implementing this task.
- Skip when: Anything about Runbooks' "Show hidden" persistence (task_372) or the "View graph" button removal (task_373) — unrelated code paths.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_800_fleet_home_clear_the_root_screen_latch_once_a_project_is_active`

# Acceptance criteria
- AC1: Once a fleet root/project is active, reopening the Fleet home screen from the nav shows its normal Close and Minimize controls; the operator can always leave the screen.
- AC2: The true first-boot case (no project active anywhere) keeps today's behavior of guiding the operator to pick or add a root rather than offering a Close that leads nowhere.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_371_fleet_home_clear_the_root_screen_latch_once_a_project_is_active.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_371_fleet_home_clear_the_root_screen_latch_once_a_project_is_active.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
