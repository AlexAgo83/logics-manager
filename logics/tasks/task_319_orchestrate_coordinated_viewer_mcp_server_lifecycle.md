## task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle - Orchestrate coordinated viewer/MCP server lifecycle
> From version: 2.21.1
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
- [ ] 1. Fix collision handling and deconflict default ports first - a shipped-defect-tier fix, and the registry work in the next slice needs a clean collision story to build on.
- [ ] 2. Add the per-repo registry and wire both the CLI viewer and VS Code's ViewerServerManager to consult it before spawning.
- [ ] 3. Harden VS Code's deactivate() and reconcile prod_020's wording with the now-actual behavior.
- [ ] 4. Validate and index.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_665_turn_port_collisions_into_clear_errors_and_deconflict_the_viewer_mcp_default_ports`
- `item_666_add_a_per_repo_viewer_registry_so_any_surface_reuses_a_live_instance`
- `item_667_harden_vs_code_deactivation_and_reconcile_prod_020_s_port_selection_claim`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_665_turn_port_collisions_into_clear_errors_and_deconflict_the_viewer_mcp_default_ports`. Proof deferred to slice closeout.
- request-AC2 -> `item_665_turn_port_collisions_into_clear_errors_and_deconflict_the_viewer_mcp_default_ports`. Proof deferred to slice closeout.
- request-AC3 -> `item_666_add_a_per_repo_viewer_registry_so_any_surface_reuses_a_live_instance`. Proof deferred to slice closeout.
- request-AC4 -> `item_666_add_a_per_repo_viewer_registry_so_any_surface_reuses_a_live_instance`. Proof deferred to slice closeout.
- request-AC5 -> `item_666_add_a_per_repo_viewer_registry_so_any_surface_reuses_a_live_instance`. Proof deferred to slice closeout.
- request-AC6 -> `item_667_harden_vs_code_deactivation_and_reconcile_prod_020_s_port_selection_claim`. Proof deferred to slice closeout.
- request-AC7 -> `item_667_harden_vs_code_deactivation_and_reconcile_prod_020_s_port_selection_claim`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate coordinated viewer/MCP server lifecycle
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Product brief(s): `prod_070_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Architecture decision(s): (none yet)
