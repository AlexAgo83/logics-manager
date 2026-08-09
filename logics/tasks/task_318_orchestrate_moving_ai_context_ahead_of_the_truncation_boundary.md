## task_318_orchestrate_moving_ai_context_ahead_of_the_truncation_boundary - Orchestrate moving AI Context ahead of the truncation boundary
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 13:53:32
> Owner: claude

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Fix the doc templates first, so no newly created doc reintroduces the problem while the repair path is being built.
- [x] 2. Extend `_autofix_structure()` to reposition an existing doc's AI Context section, reusing its existing section-bounds primitives.
- [x] 3. Prove idempotency and the motivating truncation case with tests.
- [x] 4. Confirm both existing surfaces (`flow validate --apply-fixes`, `audit --autofix-structure`) reach the new repair without any new command.
- [x] 5. Add the viewer's `/api/apply-fixes` route and health-screen button, calling the same underlying command; verify VS Code parity comes free via the shared viewer architecture (`prod_036`), with no VS Code-specific code.
- [x] 6. Validate and index. Leave running the repair across the existing corpus as an operator-triggered, on-demand action - not part of this delivery.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_662_move_ai_context_ahead_of_the_truncation_boundary_in_doc_templates`
- `item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs`
- `item_664_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: test_reposition_moves_ai_context_to_immediately_after_indicators passed; every doc template writes AI Context right after indicators (tests/python/test_ai_context_repositioning.py).
- request-AC2 -> This task. Proof: test_reposition_is_idempotent passed.
- request-AC3 -> This task. Proof: `_autofix_structure()` extended with `_reposition_ai_context()`; reachable via both `flow validate --apply-fixes` and `audit --autofix-structure` (existing shared code path, no new command).
- request-AC4 -> This task. Proof: test_default_budget_read_excludes_then_includes_ai_context passed - the motivating case, proven directly.
- request-AC5 -> This task. Proof: test_reposition_noop_when_already_in_place passed.
- request-AC6 -> This task. Proof: test_viewer_apply_fixes_endpoint_reuses_the_same_repair_as_cli_and_mcp passed (tests/python/test_viewer_cli.py); VS Code parity via prod_036's shared viewer architecture, no VS Code-specific code added.

# Validation
- (no validation recorded yet)
- pytest full suite (1210 tests) + vitest (827 tests) + tsc --noEmit + npm run check:line-budget all passed on 2026-08-09
- Finish workflow executed on 2026-08-09.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-09.
- Linked backlog item(s): `item_662_move_ai_context_ahead_of_the_truncation_boundary_in_doc_templates`, `item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs`, `item_664_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`
- Related request(s): `req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`

# AI Context
- Summary: Orchestrate moving AI Context ahead of the truncation boundary
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`
- Product brief(s): `prod_069_ai_context_that_a_bounded_read_actually_reaches`
- Architecture decision(s): (none yet)
