## task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery - Orchestrate multi-channel request intake and GitHub Issues bridge delivery
> From version: 2.19.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Establish the canonical request provenance contract and controlled creation paths.
- [x] 2. Deliver the GitHub forms and reviewable inbound triage bridge.
- [x] 3. Add guarded lifecycle notifications after inbound flow validation.
- [x] 4. Expose provenance and linked issue state in viewers.
- [x] 5. Harden agent approval, security, diagnostics, and end-to-end validation.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_582_define_canonical_multi_channel_request_intake_and_provenance`
- `item_583_add_github_issue_forms_and_guarded_inbound_triage`
- `item_584_add_explicit_github_lifecycle_notifications`
- `item_585_show_request_provenance_and_linked_issue_state_in_logics_viewers`
- `item_586_harden_ai_submission_approval_and_operational_observability`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC2, request-AC7 -> `item_582_define_canonical_multi_channel_request_intake_and_provenance`. Proof deferred to slice closeout.
- request-AC3, request-AC4, request-AC7 -> `item_583_add_github_issue_forms_and_guarded_inbound_triage`. Proof deferred to slice closeout.
- request-AC4, request-AC6, request-AC7 -> `item_584_add_explicit_github_lifecycle_notifications`. Proof deferred to slice closeout.
- request-AC2, request-AC5 -> `item_585_show_request_provenance_and_linked_issue_state_in_logics_viewers`. Proof deferred to slice closeout.
- request-AC1, request-AC2, request-AC4, request-AC6 -> `item_586_harden_ai_submission_approval_and_operational_observability`. Proof deferred to slice closeout.
- request-AC1 -> This task. Proof: MCP provenance fields record human, agent, or GitHub origin with an optional external reference.
- request-AC2 -> This task. Proof: `create_request` remains the existing controlled MCP entry point and the viewer exposes provenance.
- request-AC3 -> This task. Proof: GitHub bug/request forms and the label-triggered PR workflow create linked requests.
- request-AC4 -> This task. Proof: GitHub input is recorded as untrusted context, uses scoped workflow permissions, and requires review before promotion.
- request-AC5 -> This task. Proof: viewer items expose provenance and include it in request summaries.
- request-AC6 -> This task. Proof: the manual lifecycle workflow posts one label and comment without mirroring discussion.
- request-AC7 -> This task. Proof: all GitHub behavior is opt-in repository configuration; existing Logics creation remains unchanged.

# Validation
- pytest -q tests/python/test_logics_manager_mcp.py tests/python/test_viewer_cli.py -k provenance passed; compileall, docs check, Logics lint, and audit passed.
- Targeted Python tests, compileall, docs check, Logics lint, and audit passed.
- Finish workflow executed on 2026-08-04.
- Linked backlog/request close verification passed.

# Report
- Delivered canonical MCP provenance, guarded GitHub issue intake, manual lifecycle feedback, and operator runbook.
- Finished on 2026-08-04.
- Linked backlog item(s): `item_582_define_canonical_multi_channel_request_intake_and_provenance`, `item_583_add_github_issue_forms_and_guarded_inbound_triage`, `item_584_add_explicit_github_lifecycle_notifications`, `item_585_show_request_provenance_and_linked_issue_state_in_logics_viewers`, `item_586_harden_ai_submission_approval_and_operational_observability`
- Related request(s): `req_301_create_a_multi_channel_request_intake_and_github_issues_bridge`

# AI Context
- Summary: Orchestrate multi-channel request intake and GitHub Issues bridge delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_301_create_a_multi_channel_request_intake_and_github_issues_bridge`
- Product brief(s): `prod_050_multi_channel_request_intake_and_github_issues_bridge`
- Architecture decision(s): (none yet)
