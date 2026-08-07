## task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals - Orchestrate viewer parity with the CLI workflow signals
> From version: 2.19.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Fix the age-cache invalidation first: every display slice would otherwise freeze on it.
- [ ] 2. Unify the age and staleness derivation across the viewer and the editor panel.
- [ ] 3. Serve the workflow health report to the viewer and show its signals.
- [ ] 4. Show per-project state in the switcher and consolidate corpus detection.
- [ ] 5. Add the resolved install details to the viewer's update state and validate end to end.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_598_invalidate_the_document_age_cache_when_the_repository_moves`
- `item_599_derive_document_age_and_staleness_from_one_implementation`
- `item_600_serve_the_workflow_health_report_to_the_viewer`
- `item_601_show_per_project_state_in_the_project_switcher`
- `item_602_report_the_resolved_install_in_the_viewer_s_update_state`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_598_invalidate_the_document_age_cache_when_the_repository_moves`. Proof deferred to slice closeout.
- request-AC2, request-AC3, request-AC8 -> `item_599_derive_document_age_and_staleness_from_one_implementation`. Proof deferred to slice closeout.
- request-AC4, request-AC8 -> `item_600_serve_the_workflow_health_report_to_the_viewer`. Proof deferred to slice closeout.
- request-AC5, request-AC6, request-AC8 -> `item_601_show_per_project_state_in_the_project_switcher`. Proof deferred to slice closeout.
- request-AC7, request-AC8 -> `item_602_report_the_resolved_install_in_the_viewer_s_update_state`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate viewer parity with the CLI workflow signals
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_305_give_the_viewer_surfaces_the_same_workflow_signals_the_cli_reports`
- Product brief(s): `prod_053_one_workflow_signal_every_logics_surface`
- Architecture decision(s): (none yet)
