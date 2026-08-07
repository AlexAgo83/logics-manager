## task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery - Orchestrate the multi-repository and embedder contract delivery
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Land explicit repository targeting first, since the fleet command and every embedder path depend on it.
- [ ] 2. Bound the served MCP tool surface by profile and by allow and deny lists.
- [ ] 3. Make the mutation preview contract uniform across every mutating tool and command.
- [ ] 4. Fix self-update manager resolution, shadow refusal, and machine-readable reporting.
- [ ] 5. Add document age and the stale-document health signal.
- [ ] 6. Add quoting-free argument input and normalize the machine-readable envelope and exit codes.
- [ ] 7. Add the fleet reporting command on top of explicit repository targeting.
- [ ] 8. Bundle the delegation skills and validate the whole surface end to end.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_588_accept_an_explicit_repository_root_on_every_command`
- `item_589_bound_the_served_mcp_tool_surface_by_profile_and_by_allow_and_deny_lists`
- `item_590_give_every_mutating_operation_a_uniform_dry_run_preview`
- `item_591_make_self_update_manager_accurate_shadow_safe_and_machine_readable`
- `item_592_expose_document_age_and_a_stale_document_health_signal`
- `item_593_provide_quoting_free_tool_arguments_and_a_consistent_output_envelope`
- `item_594_report_status_and_health_across_every_repository_under_a_root`
- `item_595_bundle_the_agent_delegation_skills_for_distribution`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC9 -> `item_588_accept_an_explicit_repository_root_on_every_command`. Proof deferred to slice closeout.
- request-AC2, request-AC9 -> `item_589_bound_the_served_mcp_tool_surface_by_profile_and_by_allow_and_deny_lists`. Proof deferred to slice closeout.
- request-AC3, request-AC9 -> `item_590_give_every_mutating_operation_a_uniform_dry_run_preview`. Proof deferred to slice closeout.
- request-AC4 -> `item_591_make_self_update_manager_accurate_shadow_safe_and_machine_readable`. Proof deferred to slice closeout.
- request-AC5 -> `item_592_expose_document_age_and_a_stale_document_health_signal`. Proof deferred to slice closeout.
- request-AC6, request-AC9 -> `item_593_provide_quoting_free_tool_arguments_and_a_consistent_output_envelope`. Proof deferred to slice closeout.
- request-AC7 -> `item_594_report_status_and_health_across_every_repository_under_a_root`. Proof deferred to slice closeout.
- request-AC8 -> `item_595_bundle_the_agent_delegation_skills_for_distribution`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate the multi-repository and embedder contract delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories`
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)
