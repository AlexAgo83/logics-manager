## item_771_define_dev_only_as_a_property_rather_than_a_list - Define dev-only as a property rather than a list
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
- Summary: No definition of dev-only exists anywhere in the repository; without one a check can only look for what somebody remembered, which is the weakness that let the demo board ship.
- Keywords: dev-only property, classification rule, not an enumeration, checkout unaffected
- Use when: Before writing any check that decides whether a file belongs in a release.
- Skip when: Building or inspecting artifacts, which depends on this answer.

# Problem
- No definition of dev-only exists anywhere in the repository. Without one, a check can only look for what somebody remembered -- the same weakness as the test that monkeypatched the gate's answer and so could not report what the gate actually said.

# Scope
- In:
  - Establish what makes a file dev-only as something evaluable against any file: where it lives, how it is produced, what it is for.
  - Record it where the check and a future contributor can both read it.
  - Confirm a development checkout is unaffected -- the definition classifies, it does not remove.
- Out:
  - Building or inspecting artifacts, which depends on this answer.

# Acceptance criteria
- AC1: Dev-only is a property that can be evaluated against any file.
- AC6: A development checkout is unaffected.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Dev-only is a property that can be evaluated against any file.
- request-AC6 -> This backlog slice. Proof: AC6: A development checkout is unaffected.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_089_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)
- Request: `req_353_prove_a_published_artifact_contains_only_the_product`
- Primary task(s): `task_350_deliver_the_released_artifact_content_check`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
