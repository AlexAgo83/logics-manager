## task_340_deliver_the_release_safe_demo_gate_and_its_per_artifact_proof - Deliver the release-safe demo gate and its per-artifact proof
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-13 13:03:35

# AI Context
- Summary: Decide the gate's shape first, change it, confirm the dev checkout still offers the demo, then add the per-artifact regression and verify it fails when the old probe is restored.
- Keywords: demo gate, release artifact, npm, vsix, wheel, dev checkout, regression proof
- Use when: Implementing the release-safe demo gate or its coverage.
- Skip when: Working on the fleet home's design, which is task_341.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Decide the gate's shape first -- release stamp or explicit opt-in -- since the regression's assertions depend on which signal exists.
- [ ] 2. Change the gate, then confirm the dev checkout still offers the demo before touching packaging.
- [ ] 3. Add the per-artifact regression last, and verify it fails when the old probe is restored, so the proof is known to be load-bearing rather than assumed.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry`
- `item_710_prove_the_demo_is_absent_from_each_built_artifact`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry`. Proof deferred to slice closeout.
- request-AC2 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry`. Proof deferred to slice closeout.
- request-AC3 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry`. Proof deferred to slice closeout.
- request-AC4 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry`. Proof deferred to slice closeout.
- request-AC5 -> `item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry`. Proof deferred to slice closeout.
- request-AC6 -> `item_710_prove_the_demo_is_absent_from_each_built_artifact`. Proof deferred to slice closeout.
- request-AC7 -> `item_710_prove_the_demo_is_absent_from_each_built_artifact`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact`
- Product brief(s): `prod_079_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)
