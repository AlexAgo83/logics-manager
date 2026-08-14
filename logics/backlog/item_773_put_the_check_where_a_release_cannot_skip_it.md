## item_773_put_the_check_where_a_release_cannot_skip_it - Put the check where a release cannot skip it
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Release hygiene
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 11:37:12

# AI Context
- Summary: A check that runs somewhere optional protects nothing, and one that makes a release slower than the team tolerates gets skipped -- the same outcome by another route.
- Keywords: release hook, ci-check, measured cost, deliberate placement
- Use when: Choosing where the artifact check runs.
- Skip when: Restructuring the existing release pipeline.

# Problem
- A check that runs somewhere optional protects nothing, and one that makes a release slower than the team will tolerate gets skipped -- which is the same outcome by another route.

# Scope
- In:
  - Choose the hook deliberately, and state the cost that made it the right one.
  - Measure that cost rather than estimating it.
- Out:
  - Restructuring the existing release pipeline.

# Delivery notes
- **Each publishing script inspects the artifact it just produced.** `publish-npm.mjs` checks the npm package immediately before `npm publish`; `package-release.mjs` checks the VSIX immediately after building it. That is the last point at which the artifact exists and the release has not happened. A check in CI protects a pipeline; a check here protects the package.
- Rebuilding an artifact in order to inspect it would inspect a different artifact from the released one, which is the same class of mistake as testing a rebuilt bundle and shipping the original.
- **The cost was measured, not estimated.** Warm on this repository: npm package 0.8s, VS Code extension 1.7s, pip wheel 1.5s -- about four seconds for all three, and the VSIX figure sits on top of a build the release already pays for. Nothing here is expensive enough to justify trading one artifact away for speed, which is the trade the slice warns about; had it been, the choice would have had to be recorded rather than made silently.
- `npm run check:artifacts` runs all three, and `ci:fast` calls it so CI reports the problem early. CI is where it is *convenient* to find out; the publish path is where it *cannot be skipped*.

# Acceptance criteria
# Acceptance criteria
- AC4: The check runs where a release cannot be cut without it, with its cost stated.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: The check runs where a release cannot be cut without it, with its cost stated.

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
