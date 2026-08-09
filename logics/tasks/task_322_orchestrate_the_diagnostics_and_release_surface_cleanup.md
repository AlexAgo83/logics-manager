## task_322_orchestrate_the_diagnostics_and_release_surface_cleanup - Orchestrate the diagnostics and release-surface cleanup
> From version: 2.21.2
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 55%
> Complexity: Medium
> Theme: Diagnostics, CI coverage, and release surface
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-10 01:00:42

# AI Context
- Summary: Implement orchestrate the diagnostics and release-surface cleanup.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Context
- Orchestrate the five delivery slices captured by req_325's review findings and keep them linked.
- Ordering constraint: `item_676` depends on `item_675`. The other three are independent and can land in any order.

# Plan
- [x] 1. `item_674`: compare install roots so the npm wrapper and the Python entry it spawns count as one install.
- [ ] 2. `item_675`: add a repeatable backfill command and run it over the 308 pre-schema docs.
- [ ] 3. `item_676`: add the full `doctor` to CI — only after `item_675`, or the build goes red.
- [ ] 4. `item_677`: suppress or dismiss the nine reviewed code scanning alerts, each with its reason.
- [x] 5. `item_678`: publish `CHANGELOG.md` from the existing release notes and ship it in the package.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, doctor, and the full test suite pass.

# Backlog
- `item_674_stop_doctor_reporting_a_single_npm_install_as_a_duplicate_of_itself`
- `item_675_backfill_schema_version_on_the_pre_schema_workflow_docs`
- `item_676_run_the_full_logics_manager_doctor_in_ci`
- `item_677_resolve_the_standing_code_scanning_alerts_so_a_non_empty_list_means_something`
- `item_678_publish_a_changelog_built_from_the_existing_release_notes`

# Definition of Done (DoD)
- [ ] Code is implemented and reviewed.
- [ ] Validation passes.
- [ ] Linked docs are synchronized.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_674_stop_doctor_reporting_a_single_npm_install_as_a_duplicate_of_itself`. Proof: see that item's AC Traceability.
- request-AC2 -> `item_674_stop_doctor_reporting_a_single_npm_install_as_a_duplicate_of_itself`. Proof: see that item's AC Traceability.
- request-AC3 -> `item_675_backfill_schema_version_on_the_pre_schema_workflow_docs`. Proof: see that item's AC Traceability.
- request-AC4 -> `item_676_run_the_full_logics_manager_doctor_in_ci`. Proof: see that item's AC Traceability.
- request-AC5 -> `item_677_resolve_the_standing_code_scanning_alerts_so_a_non_empty_list_means_something`. Proof: see that item's AC Traceability.
- request-AC6 -> `item_678_publish_a_changelog_built_from_the_existing_release_notes`. Proof: see that item's AC Traceability.

# Validation
- Delivered: `item_674` (install-root comparison, 4 tests), `item_678` (CHANGELOG.md generated from `changelogs/`, shipped in the npm package, checked in CI, runbook updated).
- Partial: `item_677` -- the three JS/TS alerts removed by code change; the six Python alerts need a GitHub dismissal, an outward action left to the repository owner.
- Blocked: `item_675` and `item_676`. The backfill command is delivered and tested, but applying it to the 308 documents surfaced 53 pre-existing placeholder violations (41 unfilled proof placeholders, 12 unmapped ACs) in `Done` docs. Reverted rather than fabricate proofs; see `item_675` Notes for the three ways out.
- ci:check green on 2026-08-10: 1266 pytest, 834 vitest, tsc, eslint, line budget, changelog check.

# Report
- Not started.

# Links
- Request: (none yet)
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
