## task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle - Orchestrate coordinated viewer/MCP server lifecycle
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 14:26:23
> Owner: claude

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Fix collision handling and deconflict default ports first - a shipped-defect-tier fix, and the registry work in the next slice needs a clean collision story to build on.
- [x] 2. Add the per-repo registry, claimed atomically via `fcntl.flock` (reusing release.py's existing lock primitive, not a new one) to close the two-simultaneous-starts race, and wire both the CLI viewer and VS Code's ViewerServerManager to consult it before spawning.
- [x] 3. Harden VS Code's deactivate() and reconcile prod_020's wording with the now-actual behavior.
- [x] 4. Validate and index.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_665_turn_port_collisions_into_clear_errors_and_deconflict_the_viewer_mcp_default_ports`
- `item_666_add_a_per_repo_viewer_registry_so_any_surface_reuses_a_live_instance`
- `item_667_harden_vs_code_deactivation_and_reconcile_prod_020_s_port_selection_claim`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: test_viewer_bind_collision_raises_a_clear_actionable_error / test_mcp_serve_http_bind_collision_raises_a_clear_actionable_error passed (tests/python/test_server_port_collisions.py).
- request-AC2 -> This task. Proof: test_viewer_and_mcp_http_no_longer_share_a_default_port passed - viewer default 8765, MCP HTTP default 8766.
- request-AC3 -> This task. Proof: test_first_claim_binds_and_registers / test_second_claim_reuses_a_live_first_claim passed (tests/python/test_viewer_registry.py).
- request-AC4 -> This task. Proof: test_stale_entry_is_replaced_not_trusted_blindly passed.
- request-AC5 -> This task. Proof: test_two_real_cli_processes_for_the_same_repo_share_one_server passed - two real `logics-manager view` processes for one repo report the same port.
- request-AC5b -> This task. Proof: test_concurrent_claims_for_the_same_repo_only_one_binds passed - two concurrent claims, bind() called exactly once.
- request-AC6 -> This task. Proof: "deactivate stops tracked viewer servers even without a subscription-disposal pass" passed (tests/extension.test.ts).
- request-AC7 -> This task. Proof: prod_020's port-selection language updated to describe the registry-reuse/clear-collision-error behavior actually delivered.

# Validation
- (no validation recorded yet)
- vitest (827 tests) passed; pytest full suite passed on 2026-08-09; tests/python/test_server_port_collisions.py, test_viewer_registry.py, and tests/extension.test.ts cover AC1-AC7
- Finish workflow executed on 2026-08-09.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-09.
- Linked backlog item(s): `item_665_turn_port_collisions_into_clear_errors_and_deconflict_the_viewer_mcp_default_ports`, `item_666_add_a_per_repo_viewer_registry_so_any_surface_reuses_a_live_instance`, `item_667_harden_vs_code_deactivation_and_reconcile_prod_020_s_port_selection_claim`
- Related request(s): `req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`

# AI Context
- Summary: Orchestrate coordinated viewer/MCP server lifecycle
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Product brief(s): `prod_070_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Architecture decision(s): (none yet)
