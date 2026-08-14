## item_751_say_what_applying_fixes_would_change - Say what applying fixes would change
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 44%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `Apply fixes` is one primary button over 87 findings, with no count of what is fixable and no preview, and it edits documents.
- Keywords: apply fixes, fixable count, preview before apply, document mutation, action scope
- Use when: Changing the Apply fixes action or any viewer action that edits documents in bulk.
- Skip when: Which findings are fixable, decided by the validation layer.

# Problem
- `Apply fixes` is one primary button over 87 findings, with no count of what is fixable and no preview, and it edits documents.

# Scope
- In:
  - State how many findings the action would change.
  - Let the change be inspected before it is applied.
- Out:
  - Which findings are fixable, which the validation layer already decides.

# Acceptance criteria
- AC9: The action states its scope and can be inspected first.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC9: The action states its scope and can be inspected first.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Primary task(s): `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
