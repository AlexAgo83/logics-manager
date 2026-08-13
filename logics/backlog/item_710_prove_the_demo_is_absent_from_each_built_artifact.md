## item_710_prove_the_demo_is_absent_from_each_built_artifact - Prove the demo is absent from each built artifact
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Release hygiene
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 13:03:35

# AI Context
- Summary: Add a regression that builds each published artifact and asserts the demo is absent from the registry it produces, since both existing tests supply the gate's answer instead of exercising it.
- Keywords: regression coverage, built artifact, npm pack, vsix, wheel, project registry, monkeypatch
- Use when: Adding or changing coverage for the demo gate, or wiring a check that must hold for a built artifact.
- Skip when: Changing the gate itself (that is item_709), or unrelated viewer coverage.

# Problem
- The two existing tests both supply the gate's answer -- one monkeypatches `_is_dev_checkout` to `False`, the other builds the corpus directly -- so neither would have reported that the gate returns `True` inside a packaged layout.

# Scope
- In:
  - A regression that builds each published artifact and asserts the demo project is absent from the registry that artifact produces.
  - Keep the dev-checkout case covered, and add one test that exercises the real gate instead of substituting its answer.
  - Wire it where a packaging change cannot skip it.
- Out:
  - Rewriting the existing viewer test module, and any coverage unrelated to the demo gate.

# Acceptance criteria
- AC6: Each published artifact is built and asserted demo-free; reintroducing the marker fails the build.
- AC7: The real gate is exercised at least once without monkeypatching, and existing dev-checkout coverage still passes.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: Each published artifact is built and asserted demo-free; reintroducing the marker fails the build.
- request-AC7 -> This backlog slice. Proof: AC7: The real gate is exercised at least once without monkeypatching, and existing dev-checkout coverage still passes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_079_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)
- Request: `req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact`
- Primary task(s): `task_340_deliver_the_release_safe_demo_gate_and_its_per_artifact_proof`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_340_deliver_the_release_safe_demo_gate_and_its_per_artifact_proof`

# Notes
- Task `task_340_deliver_the_release_safe_demo_gate_and_its_per_artifact_proof` was finished via `logics-manager flow finish task` on 2026-08-13.
