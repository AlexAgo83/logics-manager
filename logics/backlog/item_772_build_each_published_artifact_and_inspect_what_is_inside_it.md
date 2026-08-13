## item_772_build_each_published_artifact_and_inspect_what_is_inside_it - Build each published artifact and inspect what is inside it
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
- Summary: package.json and .vscodeignore were each individually correct the day the demo board shipped -- the defect was their combination with a probe, so only a check that inspects what was built would have caught it.
- Keywords: npm pack, vsce package, python build, artifact inspection, load-bearing proof, named failure
- Use when: Building or inspecting a published artifact against the dev-only definition.
- Skip when: Changing what any channel ships.

# Problem
- `package.json` and `.vscodeignore` were each individually correct on the day the demo board shipped; the defect was their combination with a probe. A check that reads the manifests would have passed. Only one that inspects what was built would have caught it.

# Scope
- In:
  - Build the npm package, the VS Code extension and the pip wheel, and inspect each against the definition.
  - Fail naming the file and why it was judged dev-only.
  - Prove the check load-bearing by reintroducing a dev-only file into an artifact.
- Out:
  - Changing what any channel ships.

# Acceptance criteria
- AC2: All three artifacts are built and inspected.
- AC3: A failure names the file and the reason.
- AC5: The check is proven load-bearing rather than assumed.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: All three artifacts are built and inspected.
- request-AC3 -> This backlog slice. Proof: AC3: A failure names the file and the reason.
- request-AC5 -> This backlog slice. Proof: AC5: The check is proven load-bearing rather than assumed.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_089_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)
- Request: `req_353_prove_a_published_artifact_contains_only_the_product`
- Primary task(s): `task_350_deliver_the_released_artifact_content_check`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
