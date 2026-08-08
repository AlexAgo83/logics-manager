## task_313_orchestrate_making_the_closeout_gate_satisfiable - Orchestrate making the closeout gate satisfiable
> From version: 2.20.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. State the proof format in the finding, make the repair produce a passing line, and make the scaffold's output satisfy the gate.
- [x] 2. Derive the proof verdict once and have the three commands agree.
- [ ] 3. Judge the working tree rather than the last commit, name only the missing indicators, and say what catches a commit made without them.
- [ ] 4. Skip criteria that already carry a proof instead of appending a second one.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_642_say_what_a_proof_looks_like_and_produce_one_that_passes`
- `item_643_derive_the_proof_verdict_once`
- `item_644_let_the_indicator_gate_be_cleared_by_doing_what_it_says`
- `item_645_repair_without_overwriting_what_was_written_by_hand`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC2, request-AC3, request-AC8 -> `item_642_say_what_a_proof_looks_like_and_produce_one_that_passes`. Proof deferred to slice closeout.
- request-AC4, request-AC8 -> `item_643_derive_the_proof_verdict_once`. Proof deferred to slice closeout.
- request-AC5, request-AC6, request-AC8 -> `item_644_let_the_indicator_gate_be_cleared_by_doing_what_it_says`. Proof deferred to slice closeout.
- request-AC7, request-AC8 -> `item_645_repair_without_overwriting_what_was_written_by_hand`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate making the closeout gate satisfiable
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_316_make_the_closeout_gate_teachable_self_consistent_and_non_destructive`
- Product brief(s): `prod_064_a_gate_you_can_satisfy`
- Architecture decision(s): (none yet)
