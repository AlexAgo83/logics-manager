## item_772_build_each_published_artifact_and_inspect_what_is_inside_it - Build each published artifact and inspect what is inside it
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Release hygiene
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 11:37:12

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

# Delivery notes
- All three artifacts are built and read back: the npm package via `npm pack --dry-run`, the wheel via `python -m build`, and the VSIX **through the repository's own `packageVsix`** rather than a bare `vsce` call. That last one matters: the npm package name is scoped and `vsce` rejects it outright, so the repository stages a rewritten manifest. Inspecting an artifact built a different way from the released one would prove nothing about the released one -- I tried the bare call first and it failed, which is how I found out.
- Result today: npm 119 files, VSIX 154, wheel 115, nothing dev-only in any of them.
- **A skip is never a pass.** An artifact that cannot be built is reported as not inspected, and the run says so at the end. An artifact nobody could build is an artifact nobody inspected.
- The check names the file *and* why it was judged dev-only. A check that says "this must not be here" without saying why teaches nothing, and the next person has to redo the reasoning to decide whether the check or the artifact is wrong.
- **Proven load-bearing** (AC5) by adding `tests/webviewHarnessTestUtils.ts` and `logics/INDEX.md` to the npm `files` list and running it: both were caught, each with its reason, and the process exited 1. Removed again, it exits 0.

# Acceptance criteria
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

# Tasks
- `task_350_deliver_the_released_artifact_content_check`

# Notes
- Task `task_350_deliver_the_released_artifact_content_check` was finished via `logics-manager flow finish task` on 2026-08-14.
