## task_275_orchestrate_the_audit_remediation - Orchestrate the audit remediation
> From version: 2.12.12
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
- [ ] 1. Land the low-risk, high-value correctness work first: the viewer Content-Length helper, the correctness one-liners, and the workshop terminal lock fixes; all are well covered by tests.
- [ ] 2. Add the null guards to the public CdxLogicsModel API and re-sync the webview media mirror.
- [ ] 3. Unify workflow statuses behind a single source of truth, add Obsolete, validate transitions, and wire the CI divergence guard.
- [ ] 4. Address the local-only security findings as one defense-in-depth pass.
- [ ] 5. Consolidate the duplicated Python helpers into a shared module, then the viewer SSE/status/render boilerplate.
- [ ] 6. Delete the dead MCP annotations, convert call_tool to a dispatch table, drop the CLI validators, and clean up the dead/duplicated client JS/TS code.
- [ ] 7. After each slice run lint, audit, pytest, and vitest, and keep all linked docs in sync before closeout.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_496_harden_viewer_server_against_malformed_content_length`
- `item_497_make_the_public_cdxlogicsmodel_api_null_safe`
- `item_498_unify_and_guard_workflow_statuses_across_python_and_typescript`
- `item_499_fix_confirmed_correctness_one_liners`
- `item_500_delete_dead_and_over_engineered_mcp_and_cli_code`
- `item_501_remove_workshop_terminal_race_conditions`
- `item_502_consolidate_duplicated_python_parsing_helpers`
- `item_503_address_local_only_security_findings_as_defense_in_depth`
- `item_504_consolidate_duplicated_viewer_boilerplate`
- `item_505_clean_up_duplicated_and_dead_client_js_ts_code`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.

# Report
- Implementation complete.

# AI Context
- Summary: Orchestrate the audit remediation
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
