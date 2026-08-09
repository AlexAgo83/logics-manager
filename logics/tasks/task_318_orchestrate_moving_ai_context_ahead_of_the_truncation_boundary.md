## task_318_orchestrate_moving_ai_context_ahead_of_the_truncation_boundary - Orchestrate moving AI Context ahead of the truncation boundary
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
- [ ] 1. Fix the doc templates first, so no newly created doc reintroduces the problem while the repair path is being built.
- [ ] 2. Extend `_autofix_structure()` to reposition an existing doc's AI Context section, reusing its existing section-bounds primitives.
- [ ] 3. Prove idempotency and the motivating truncation case with tests.
- [ ] 4. Confirm both existing surfaces (`flow validate --apply-fixes`, `audit --autofix-structure`) reach the new repair without any new command.
- [ ] 5. Validate and index. Leave running the repair across the existing corpus as an operator-triggered, on-demand action - not part of this delivery.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_662_move_ai_context_ahead_of_the_truncation_boundary_in_doc_templates`
- `item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_662_move_ai_context_ahead_of_the_truncation_boundary_in_doc_templates`. Proof deferred to slice closeout.
- request-AC2 -> `item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs`. Proof deferred to slice closeout.
- request-AC3 -> `item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs`. Proof deferred to slice closeout.
- request-AC4 -> `item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs`. Proof deferred to slice closeout.
- request-AC5 -> `item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate moving AI Context ahead of the truncation boundary
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`
- Product brief(s): `prod_069_ai_context_that_a_bounded_read_actually_reaches`
- Architecture decision(s): (none yet)
