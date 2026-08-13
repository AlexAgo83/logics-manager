## item_710_prove_the_demo_is_absent_from_each_built_artifact - Prove the demo is absent from each built artifact
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Release hygiene
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: prove, demo, absent, each, built, artifact
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

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
