## task_399_deliver_the_repository_review_fixes_and_viewer_followups - Deliver the repository review fixes and viewer followups
> From version: 2.23.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:06:05

# AI Context
- Summary: Deliver eight bounded review slices in priority order; preserve uncertainty for unconfirmed findings and attach real validation before closeout.
- Keywords: req_387, literal paths, repair, cache, fleet, review refresh, picker
- Use when: Starting the authorized development corpus.
- Skip when: Preparing a release or unrelated repository changes.

# Context
- This task coordinates and delivers the linked slices; creating their documents does not complete this task.
- Start this task with flow start and an owner only when implementation begins. Work sequentially through the waves below.
- The request contains reproductions for F1-F3, operator reports for F4-F5, an explicitly uncertain F6, screenshot-backed UX feedback for F7 and screenshot-backed overflow feedback for F8.
- Reuse existing mechanisms and read every affected caller; no broad rewrite is planned.
- Baseline tests passed during review, but ci:check stopped at npm audit. Rerun relevant checks against the implementation and record any remaining external gate separately.

# Plan
- [ ] 1. Start task ownership, recheck repository state and reproduce the targeted failures in isolated fixtures; preserve operator preferences.
- [ ] 2. Wave 1 (High): implement item_877 literal Git selection and item_878 fail-closed repair input; assert actual commit content and unchanged invalid-input documents. Aggregate AC4 regression evidence across every later wave.
- [ ] 3. Wave 2 (Medium): implement item_879 update-cache recovery and investigate/fix item_881 root restoration; distinguish persisted roots from startup/discovery behavior and confirm favorites survive.
- [ ] 4. Wave 3 (Medium): reproduce/fix item_880 tab synchronization and investigate item_882 Review refresh. Record a confirmed fix or measured refutation for F6; do not build speculative polling. Reproduce and fix item_884 grouped Activity overflow by measuring row and ancestor widths; prove collapsed and expanded layouts fit.
- [ ] 5. Wave 4 (Medium): implement item_883 Fleet root and project-folder picker usability, checking the i18n contract and validating selection/cancel/keyboard behavior against the restored-root contract and individual project selection semantics.
- [ ] 6. At each wave, run focused regressions, capture required browser proof and update affected code/product docs plus Logics evidence under ADR 009.
- [ ] 7. Run final checks, record AC1-AC9 delivery evidence and any unresolved gate, validate closeout and settle the linked product brief through the CLI only after actual delivery.

# Backlog
- `item_877_commit_only_literal_selected_git_paths`
- `item_878_reject_malformed_repair_requests_before_writing`
- `item_879_recover_safely_from_invalid_update_caches`
- `item_880_synchronize_the_surface_selector_after_adding_a_project`
- `item_881_restore_fleet_discovery_roots_and_existing_favorites_on_reopen`
- `item_882_investigate_review_refresh_while_the_surface_stays_open`
- `item_883_clarify_the_fleet_root_selection_experience`
- `item_884_contain_grouped_recent_activity_within_the_viewport`

# Definition of Done (DoD)
- [ ] All eight slices have delivered their acceptance criteria or the explicit evidence-based investigation outcome permitted for F6.
- [ ] AC1-AC9 have implementation or investigation evidence; no scaffold statement is used as delivery proof.
- [ ] Focused regressions pass, including real Git selection, invalid-request immutability and invalid-cache recovery.
- [ ] Required browser evidence covers tabs, Fleet reopen/restart, Review refresh, grouped Activity width and picker usability/accessibility.
- [ ] Relevant product/CLI docs and Logics docs reflect the delivered behavior.
- [ ] npm run lint, npm test, python3 -m pytest tests/python/ -q and relevant visual smoke checks have recorded results.
- [ ] npm run ci:check has a recorded result; any remaining audit blocker is explicit and prevents claiming a clean CI/release.
- [ ] Logics lint/audit and flow validate-closeout pass before closure, and the product brief is settled through the CLI.

# AC Traceability
- request-AC1 -> Planned coverage in this task; implementation/investigation proof deferred until the corresponding slice is delivered.
- request-AC2 -> Planned coverage in this task; implementation/investigation proof deferred until the corresponding slice is delivered.
- request-AC3 -> Planned coverage in this task; implementation/investigation proof deferred until the corresponding slice is delivered.
- request-AC4 -> Planned coverage in this task; implementation/investigation proof deferred until the corresponding slice is delivered.
- request-AC5 -> Planned coverage in this task; implementation/investigation proof deferred until the corresponding slice is delivered.
- request-AC6 -> Planned coverage in this task; implementation/investigation proof deferred until the corresponding slice is delivered.
- request-AC7 -> Planned coverage in this task; implementation/investigation proof deferred until the corresponding slice is delivered.
- request-AC8 -> Planned coverage in this task; implementation/investigation proof deferred until the corresponding slice is delivered.

- request-AC9 -> Planned coverage through item_884; browser and width-measurement proof deferred until delivery.

# Validation
- Corpus preparation only: no implementation validation is claimed.
- Per-slice checks are specified in backlog Notes; use existing Python and browser-host suites.
- At delivery run npm run lint, npm test, python3 -m pytest tests/python/ -q, required browser scenarios and npm run ci:check.
- Run logics-manager lint --require-status, audit --group-by-doc and flow validate-closeout on this task before marking it done.

# Report
- Not started.

# Links
- Request: `req_387_review_findings_literal_git_paths_repair_input_validation_and_update_cache_resilience`
- Product brief(s): `prod_116_trustworthy_viewer_actions_and_persistent_project_navigation`
- Architecture decision(s): (none yet)
