## task_305_orchestrate_the_honest_outcome_corrections - Orchestrate the honest-outcome corrections
> From version: 2.20.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-08

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Separate terminal from delivered in the audit, and stop asking abandoned requests for a backlog by either route.
- [ ] 2. Derive each help screen's flag section from the declared flags, closing the nine missing flags at once, and pin it with a test covering every subcommand.
- [x] 3. Report a closed task as closed, with the post-close check result carried alongside rather than folded into it.
- [x] 4. Make a same-day second re-baseline clear the indicator gate, without weakening the gate.
- [ ] 5. Derive the plugin's tested runtime bound from its own version, so a released pairing never warns.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_611_stop_asking_abandoned_requests_for_an_implementation_chain`
- `item_612_make_the_indicator_update_help_list_the_flags_the_command_accepts`
- `item_613_report_a_closed_task_as_closed_even_when_a_post_close_check_fails`
- `item_614_let_a_same_day_re_baseline_actually_clear_the_indicator_gate`
- `item_618_derive_the_tested_runtime_bound_from_the_plugin_version`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC2, request-AC3, request-AC7 -> `item_611_stop_asking_abandoned_requests_for_an_implementation_chain`. Proof deferred to slice closeout.
- request-AC4, request-AC7 -> `item_612_make_the_indicator_update_help_list_the_flags_the_command_accepts`. Proof deferred to slice closeout.
- request-AC5, request-AC6, request-AC7 -> `item_613_report_a_closed_task_as_closed_even_when_a_post_close_check_fails`. Proof deferred to slice closeout.
- request-AC8, request-AC7 -> `item_614_let_a_same_day_re_baseline_actually_clear_the_indicator_gate`. Proof deferred to slice closeout.
- request-AC9, request-AC7 -> `item_618_derive_the_tested_runtime_bound_from_the_plugin_version`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate the honest-outcome corrections
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_308_report_workflow_outcomes_honestly_across_audit_help_and_closeout`
- Product brief(s): `prod_056_say_what_actually_happened`
- Architecture decision(s): (none yet)
