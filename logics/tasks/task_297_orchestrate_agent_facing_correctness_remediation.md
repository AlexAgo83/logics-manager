## task_297_orchestrate_agent_facing_correctness_remediation - Orchestrate agent-facing correctness remediation
> From version: 2.19.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Land the two silent-risk slices first: truthful command output, then roadmap heading reporting. Both are cheap and both fail invisibly today.
- [x] 2. Land the scaffolded task content slice, the highest-value change in the lot, deriving traceability from the scaffold input and reporting unclaimed request criteria.
- [x] 3. Land the closeout evidence detector fix with a non-regression test pinning the exact string rejected in the field.
- [x] 4. Land the indicator mutation slice, unifying the per-kind declaration with the mutation path and adding an honest re-baseline exit.
- [x] 5. Land the reference extraction fix, then settle the repair scope question and implement the reference resolution slice on top of it.
- [x] 6. Land the companion template slice and the discoverability slice.
- [x] 7. Verify the whole lot against the field report by reproducing each finding's invocation and confirming the corrected behaviour.
- [x] 8. Record whether the deferred `doctor` request is still warranted once these corrections have landed.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_573_make_dry_run_and_command_output_report_what_actually_happened`
- `item_574_report_roadmap_headings_that_are_not_parsed_as_milestones`
- `item_575_stop_scaffolded_tasks_asserting_work_that_has_not_happened`
- `item_576_accept_precise_validation_evidence_at_closeout`
- `item_577_make_indicator_updates_kind_aware_and_honestly_exitable`
- `item_578_stop_resolving_references_inside_code`
- `item_579_make_repair_commands_accept_the_references_they_name_and_fix_the_findings_that_name_them`
- `item_580_make_companion_documents_lint_clean_and_free_of_foreign_content`
- `item_581_make_vocabularies_discoverable_without_failing_first`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
All proofs are automated tests in `tests/python/test_agent_facing_correctness.py`,
passing on 2026-08-01 as part of a 610-test suite.

- request-AC1 -> `item_573`. Proof: `test_companion_dry_run_makes_no_creation_claim_and_writes_nothing` and `test_roadmap_propose_dry_run_makes_no_creation_claim_and_writes_nothing` assert the conditional form and an unchanged filesystem.
- request-AC16 -> `item_573`. Proof: `test_index_distinguishes_a_write_from_a_no_op`, `test_flow_start_names_every_document_it_modified` and `test_flow_progress_states_the_resulting_value`.
- request-AC2 -> `item_574`. Proof: `test_roadmap_validate_names_every_heading_it_did_not_parse` and `test_roadmap_milestone_count_and_warnings_account_for_every_heading`, using the field's verbatim `0.9.S` heading.
- request-AC3 -> `item_575`. Proof: `test_scaffolded_task_makes_no_completion_claim`.
- request-AC4 -> `item_575`. Proof: `test_scaffolded_traceability_is_derived_from_request_acs`.
- request-AC5 -> `item_575`. Proof: `test_scaffold_reports_request_acs_claimed_by_no_backlog_item` and `test_scaffold_json_payload_lists_unclaimed_request_acs`.
- request-AC6 -> `item_575`. Proof: `test_scaffolded_validation_section_is_rejected_by_the_closeout_gate`, plus `test_scaffolded_chain_defers_every_request_ac_with_none_suppressed` for the check the old boilerplate silenced.
- request-AC7 -> `item_576`. Proof: `test_validation_evidence_accepts_precision_and_rejects_weakness`, parameterised over the field's verbatim rejected string and eight weak forms.
- request-AC10 -> `item_577`. Proof: `test_indicator_not_declared_by_the_kind_is_rejected_naming_the_accepted_set`.
- request-AC11 -> `item_577`. Proof: `test_touch_re_baselines_without_changing_any_value` and `test_touch_is_offered_by_the_gate_and_the_remedy_only_names_accepted_flags`.
- request-AC12 -> `item_577`. Proof: `test_indicator_write_preserves_the_template_percent_form`.
- request-AC13 -> `item_578`. Proof: `test_references_inside_any_fence_are_not_links_but_inline_spans_are` and `test_lint_audit_and_repair_agree_on_a_documents_references`.
- request-AC14 -> `item_579`. Proof: `test_a_bare_ref_of_the_wrong_kind_is_not_reported_as_missing` and `test_a_companion_reference_resolves_instead_of_reporting_not_found`.
- request-AC15 -> `item_579`. Proof: `test_repair_mermaid_explains_why_it_skipped_instead_of_reporting_zero`. Verified against the live corpus that the ac-traceability repair reaches linked tasks and that `companion_doc_missing_mermaid` names no repair command.
- request-AC8 -> `item_580`. Proof: `test_generated_companion_passes_lint_immediately`, parameterised over both companion kinds.
- request-AC9 -> `item_580`. Proof: `test_generated_companion_body_carries_no_foreign_product_content` and `test_every_generated_placeholder_is_recognisable_as_one`.
- request-AC17 -> `item_581`. Proof: `test_status_vocabulary_is_reachable_without_failing_first` and `test_scaffold_schema_documents_the_enums_and_the_accepted_keys`.
- request-AC18 -> `item_581`. Proof: `test_flow_list_lists_in_its_documented_default_form`.

# Validation
- `python3 -m pytest tests/python` passed on 2026-08-01: 610 tests, 0 failures, up from 562 at baseline.
- `logics-manager lint` passed on 2026-08-01 and `logics-manager audit` reported 0 blocking issues across 1160 workflow docs.
- Finish workflow executed on 2026-08-01.
- Linked backlog/request close verification passed.

# Report
- All nine slices landed. Two scope corrections recorded on their items: item_578 AC2 withdrawn as incompatible with the corpus link notation, and item_579 narrowed once the live corpus showed the ac-traceability repair already reaches linked tasks while companion_doc_missing_mermaid names no repair.
- Finished on 2026-08-01.
- Linked backlog item(s): `item_573_make_dry_run_and_command_output_report_what_actually_happened`, `item_574_report_roadmap_headings_that_are_not_parsed_as_milestones`, `item_575_stop_scaffolded_tasks_asserting_work_that_has_not_happened`, `item_576_accept_precise_validation_evidence_at_closeout`, `item_577_make_indicator_updates_kind_aware_and_honestly_exitable`, `item_578_stop_resolving_references_inside_code`, `item_579_make_repair_commands_accept_the_references_they_name_and_fix_the_findings_that_name_them`, `item_580_make_companion_documents_lint_clean_and_free_of_foreign_content`, `item_581_make_vocabularies_discoverable_without_failing_first`
- Related request(s): `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`

# AI Context
- Summary: Orchestrate agent-facing correctness remediation
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
