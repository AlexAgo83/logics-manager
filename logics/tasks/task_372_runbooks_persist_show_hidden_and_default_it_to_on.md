## task_372_runbooks_persist_show_hidden_and_default_it_to_on - Runbooks: persist "Show hidden" and default it to on
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
- Summary: Persist the Runbooks "Show hidden" checkbox via `viewerPreferences` (mirroring `workshopUseSystemTerminal`, `clients/viewer/src/browser-host/workshop.js:46-68`), register the new operator-scoped field in `logics_manager/viewer_preferences.py`'s `OPERATOR_FIELDS`, and default it to on when unset.
- Keywords: includeHidden, workshopRunbookState, viewerPreferences, OPERATOR_FIELDS
- Use when: Implementing this task.
- Skip when: Anything about the Fleet home dead-end latch (task_371) or the "View graph" button removal (task_373) — unrelated code paths.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_801_runbooks_persist_show_hidden_and_default_it_to_on`

# Acceptance criteria
- AC1: The Runbooks "Show hidden" choice survives a reload/restart of the viewer, using the existing `viewerPreferences` mechanism (mirroring `workshopUseSystemTerminal`).
- AC2: The Runbooks "Show hidden" checkbox defaults to checked (on) for an operator with no prior recorded preference.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_372_runbooks_persist_show_hidden_and_default_it_to_on.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_372_runbooks_persist_show_hidden_and_default_it_to_on.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_362_fleet_and_runbooks_dead_end_screen_unpersisted_preference_dead_ui_option`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
