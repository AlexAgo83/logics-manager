## task_303_orchestrate_the_repository_review_remediation - Orchestrate the repository review remediation
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
- [ ] 1. Cache the project switcher scan: a shipped regression, and the smallest change here.
- [ ] 2. Make the coverage signals report the truth, or stop implying a measurement is taken.
- [ ] 3. Add the Python linter and the function-length ceiling, before any large move.
- [ ] 4. Add the model-divergence detector, so a merge stays unnecessary.
- [ ] 5. Extract the session cockpit and workshop routes last, under the guardrails the earlier slices put in place.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_603_cache_the_project_switcher_s_per_project_scan`
- `item_604_make_the_coverage_signals_report_the_truth`
- `item_605_add_a_python_linter_and_a_function_length_ceiling`
- `item_606_detect_divergence_between_the_document_models`
- `item_607_move_the_session_cockpit_and_workshop_routes_out_of_the_viewer_module`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC8 -> `item_603_cache_the_project_switcher_s_per_project_scan`. Proof deferred to slice closeout.
- request-AC2, request-AC3, request-AC8 -> `item_604_make_the_coverage_signals_report_the_truth`. Proof deferred to slice closeout.
- request-AC4, request-AC5, request-AC8 -> `item_605_add_a_python_linter_and_a_function_length_ceiling`. Proof deferred to slice closeout.
- request-AC6, request-AC8 -> `item_606_detect_divergence_between_the_document_models`. Proof deferred to slice closeout.
- request-AC7, request-AC8 -> `item_607_move_the_session_cockpit_and_workshop_routes_out_of_the_viewer_module`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate the repository review remediation
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_306_act_on_the_repository_review_measurement_honesty_guardrails_and_the_viewer_module_split`
- Product brief(s): `prod_054_guardrails_proportionate_to_the_codebase`
- Architecture decision(s): (none yet)
