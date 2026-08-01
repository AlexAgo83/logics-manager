## task_297_orchestrate_agent_facing_correctness_remediation - Orchestrate agent-facing correctness remediation
> From version: 2.19.5
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
- [ ] 1. Land the two silent-risk slices first: truthful command output, then roadmap heading reporting. Both are cheap and both fail invisibly today.
- [ ] 2. Land the scaffolded task content slice, the highest-value change in the lot, deriving traceability from the scaffold input and reporting unclaimed request criteria.
- [ ] 3. Land the closeout evidence detector fix with a non-regression test pinning the exact string rejected in the field.
- [ ] 4. Land the indicator mutation slice, unifying the per-kind declaration with the mutation path and adding an honest re-baseline exit.
- [ ] 5. Land the reference extraction fix, then settle the repair scope question and implement the reference resolution slice on top of it.
- [ ] 6. Land the companion template slice and the discoverability slice.
- [ ] 7. Verify the whole lot against the field report by reproducing each finding's invocation and confirming the corrected behaviour.
- [ ] 8. Record whether the deferred `doctor` request is still warranted once these corrections have landed.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

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
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC16 -> `item_573`. Proof deferred to slice closeout.
- request-AC2 -> `item_574`. Proof deferred to slice closeout.
- request-AC3, request-AC4, request-AC5, request-AC6 -> `item_575`. Proof deferred to slice closeout.
- request-AC7 -> `item_576`. Proof deferred to slice closeout.
- request-AC10, request-AC11, request-AC12 -> `item_577`. Proof deferred to slice closeout.
- request-AC13 -> `item_578`. Proof deferred to slice closeout.
- request-AC14, request-AC15 -> `item_579`. Proof deferred to slice closeout.
- request-AC8, request-AC9 -> `item_580`. Proof deferred to slice closeout.
- request-AC17, request-AC18 -> `item_581`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate agent-facing correctness remediation
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
