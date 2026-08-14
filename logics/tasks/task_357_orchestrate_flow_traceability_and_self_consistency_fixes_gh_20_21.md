## task_357_orchestrate_flow_traceability_and_self_consistency_fixes_gh_20_21 - Orchestrate flow traceability and self-consistency fixes (GH #20, #21)
> From version: 2.21.9
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
- Keywords: orchestrate, flow, traceability, self, consistency, fixes
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Implement the duplicate-proof-text check (backlog AC1) — highest yield, no tuning, ship first.
- [ ] 2. Implement the proof-must-match-a-real-AC check (backlog AC2), strict/exact matching.
- [ ] 3. Implement the orphaned-slice-AC warning (backlog AC3).
- [ ] 4. Point runtime-drift at a logics-manager-recorded version and silence it otherwise (backlog AC4).
- [ ] 5. Make flow start/repair/closeout re-baseline indicators on every document they write (backlog AC5).
- [ ] 6. Update the companion_doc_missing_mermaid finding text for product documents (backlog AC6).
- [ ] 7. Validate the full chain with flow validate, lint --require-status, and a manual replay of the two issues' repro steps.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`
- `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof deferred to slice closeout.
- request-AC2 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof deferred to slice closeout.
- request-AC3 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof deferred to slice closeout.
- request-AC4 -> `item_784_validate_traceability_proof_content_and_fix_the_runtime_drift_false_positive`. Proof deferred to slice closeout.
- request-AC5 -> `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`. Proof deferred to slice closeout.
- request-AC6 -> `item_785_stop_flow_s_own_writes_from_tripping_its_own_checks`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_357_make_flow_s_traceability_checks_and_self_authored_writes_trustworthy`
- Product brief(s): `prod_093_trustworthy_flow_checks`
- Architecture decision(s): (none yet)
