## task_305_orchestrate_the_honest_outcome_corrections - Orchestrate the honest-outcome corrections
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-08 16:24:24

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Separate terminal from delivered in the audit, and stop asking abandoned requests for a backlog by either route.
- [x] 2. Derive each help screen's flag section from the declared flags, closing the nine missing flags at once, and pin it with a test covering every subcommand.
- [x] 3. Report a closed task as closed, with the post-close check result carried alongside rather than folded into it.
- [x] 4. Make a same-day second re-baseline clear the indicator gate, without weakening the gate.
- [x] 5. Derive the plugin's tested runtime bound from its own version, so a released pairing never warns.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_611_stop_asking_abandoned_requests_for_an_implementation_chain`
- `item_612_make_the_indicator_update_help_list_the_flags_the_command_accepts`
- `item_613_report_a_closed_task_as_closed_even_when_a_post_close_check_fails`
- `item_614_let_a_same_day_re_baseline_actually_clear_the_indicator_gate`
- `item_618_derive_the_tested_runtime_bound_from_the_plugin_version`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_611_stop_asking_abandoned_requests_for_an_implementation_chain`. Proof: `test_an_abandoned_request_is_not_asked_for_a_backlog` in `tests/python/test_honest_outcomes.py`, covering Obsolete, Archived and Superseded under both `request_done_without_backlog` and `ac_no_linked_backlog`.
- request-AC2 -> `item_611_stop_asking_abandoned_requests_for_an_implementation_chain`. Proof: `test_a_delivered_request_still_requires_its_backlog` in `tests/python/test_honest_outcomes.py`.
- request-AC3 -> `item_611_stop_asking_abandoned_requests_for_an_implementation_chain`. Proof: the 1073-test Python suite passes unchanged; `_is_done` still serves chain propagation and the active-work filter, and only the delivered-request checks moved to `_is_delivered`.
- request-AC4 -> `item_612_make_the_indicator_update_help_list_the_flags_the_command_accepts`. Proof: `test_help_lists_every_flag_the_command_declares` in `tests/python/test_cli_help_contract.py`, parametrized over every discovered subcommand; it reports 9 commands against the previous implementation.
- request-AC5 -> `item_613_report_a_closed_task_as_closed_even_when_a_post_close_check_fails`. Proof: `test_a_closeout_blocked_only_by_an_unrelated_audit_finding_reports_the_task_closed` in `tests/python/test_honest_outcomes.py`.
- request-AC6 -> `item_613_report_a_closed_task_as_closed_even_when_a_post_close_check_fails`. Proof: `test_the_printed_outcome_of_such_a_closeout_does_not_read_as_a_failure_to_close` in `tests/python/test_honest_outcomes.py`.
- request-AC7 -> every slice. Proof: `tests/python/test_honest_outcomes.py` (9 tests), the parametrized help contract in `tests/python/test_cli_help_contract.py`, and the rewritten `tests/logicsKitVersionSupport.test.ts`; each was run against the previous implementation and failed there.
- request-AC8 -> `item_614_let_a_same_day_re_baseline_actually_clear_the_indicator_gate`. Proof: `test_a_second_reviewed_edit_on_the_same_day_clears_the_indicator_gate` in `tests/python/test_honest_outcomes.py`.
- request-AC9 -> `item_618_derive_the_tested_runtime_bound_from_the_plugin_version`. Proof: `says nothing about a runtime released with this plugin` in `tests/logicsKitVersionSupport.test.ts`.

# Validation
- (no validation recorded yet)
- command: `python -m pytest tests/python -q && npx vitest run` | result: passed | date: 2026-08-08 | note: 1073 python + 763 vitest passed
- Finish workflow executed on 2026-08-08.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-08.
- Linked backlog item(s): `item_611_stop_asking_abandoned_requests_for_an_implementation_chain`, `item_612_make_the_indicator_update_help_list_the_flags_the_command_accepts`, `item_613_report_a_closed_task_as_closed_even_when_a_post_close_check_fails`, `item_614_let_a_same_day_re_baseline_actually_clear_the_indicator_gate`, `item_618_derive_the_tested_runtime_bound_from_the_plugin_version`
- Related request(s): `req_308_report_workflow_outcomes_honestly_across_audit_help_and_closeout`

# AI Context
- Summary: Orchestrate the honest-outcome corrections
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_308_report_workflow_outcomes_honestly_across_audit_help_and_closeout`
- Product brief(s): `prod_056_say_what_actually_happened`
- Architecture decision(s): (none yet)
