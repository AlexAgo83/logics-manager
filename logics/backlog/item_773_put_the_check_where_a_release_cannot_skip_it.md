## item_773_put_the_check_where_a_release_cannot_skip_it - Put the check where a release cannot skip it
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Release hygiene
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

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
