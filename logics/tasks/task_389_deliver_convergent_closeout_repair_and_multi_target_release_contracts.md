## task_389_deliver_convergent_closeout_repair_and_multi_target_release_contracts - Deliver convergent closeout repair and multi-target release contracts
> From version: 2.22.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: deliver, convergent, closeout, repair, multi, target, release, contracts
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. 1. Reproduce the deferred-proof failure and implement the smallest safe repair promotion with regression coverage.
- [ ] 2. 2. Make proofless audit and MCP autofix preserve deferred state and report the required evidence boundary.
- [ ] 3. 3. Define the v2 target contract and normalize v1 contracts to one implicit target.
- [ ] 4. 4. Scope release state, evidence, CLI selection, and reset behavior by target, then validate with v1 and two-target fixtures.
- [ ] 5. 5. Run focused tests, full release contract checks, workflow validation, lint, audit, and record closeout evidence.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_854_make_generated_ac_traceability_promotable_at_closeout`
- `item_855_add_target_scoped_release_contracts_and_evidence`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_854_make_generated_ac_traceability_promotable_at_closeout`. Proof deferred to slice closeout.
- request-AC2 -> `item_854_make_generated_ac_traceability_promotable_at_closeout`. Proof deferred to slice closeout.
- request-AC3 -> `item_854_make_generated_ac_traceability_promotable_at_closeout`. Proof deferred to slice closeout.
- request-AC4 -> `item_855_add_target_scoped_release_contracts_and_evidence`. Proof deferred to slice closeout.
- request-AC5 -> `item_855_add_target_scoped_release_contracts_and_evidence`. Proof deferred to slice closeout.
- request-AC6 -> `item_855_add_target_scoped_release_contracts_and_evidence`. Proof deferred to slice closeout.
- request-AC7 -> `item_855_add_target_scoped_release_contracts_and_evidence`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_379_make_release_and_closeout_workflow_contracts_convergent_across_targets`
- Product brief(s): `prod_109_trustworthy_closeout_and_release_contracts`
- Architecture decision(s): (none yet)
