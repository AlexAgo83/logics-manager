## task_340_deliver_the_release_safe_demo_gate_and_its_per_artifact_proof - Deliver the release-safe demo gate and its per-artifact proof
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 85%
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
- request-AC1 -> This task. Proof: `test_demo_board_survives_no_packaging_layout` rebuilds the npm layout (`clients/shared-web/media/`, `logics_manager/`, `scripts/npm/`) and asserts `ensure_demo_corpus_if_dev({})` returns None. That layout is the one that shipped the demo board.
- request-AC2 -> This task. Proof: the same test rebuilds the VSIX layout (`clients/shared-web/media/`, `logics_manager/`, `dist/`) and asserts the same.
- request-AC3 -> This task. Proof: the same test rebuilds the wheel layout (`logics_manager/` alone) and asserts the same, so the channel that was already safe stays safe.
- request-AC4 -> This task. Proof: the same test asserts the gate opens for an explicit opt-in in every layout, so a developer keeps the demo board by setting `LOGICS_MANAGER_DEMO_BOARD=1`. Documented in `docs/development.md`.
- request-AC5 -> This task. Proof: `_demo_board_opted_in` reads `LOGICS_MANAGER_DEMO_BOARD` and nothing else; no filesystem probe remains. An environment variable cannot travel inside a release artifact and no packaging change can invert it. Chosen over a release stamp written at package time because it fails closed rather than open. `test_demo_corpus_is_off_unless_explicitly_opted_in` exercises the real gate against real mappings instead of substituting its answer.
- request-AC6 -> This task. Proof: NOT MET AS WRITTEN, flagged rather than argued into compliance. The AC asks for a regression that *builds* each published artifact; the test reconstructs each layout from the manifests instead (checked against `npm pack --dry-run`, 118 files). The chosen gate no longer reads the filesystem, so no packaging-manifest edit can reintroduce the defect and a build-and-inspect check would assert against a mechanism that has been removed. The AC's intent holds more strongly than its mechanism would give; if artifacts genuinely built and inspected are still wanted, that is a separate slice and this AC stays open.
- request-AC7 -> This task. Proof: the old test monkeypatched `_is_dev_checkout` to False and asserted the caller returned None, so it supplied the gate's answer. Replaced by two tests calling the real gate. Verified load-bearing: reintroducing the old probe makes `test_demo_board_survives_no_packaging_layout` fail, restoring the fix makes it pass.
# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact`
- Product brief(s): `prod_079_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)
