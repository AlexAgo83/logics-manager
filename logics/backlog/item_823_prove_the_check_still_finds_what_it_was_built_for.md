## item_823_prove_the_check_still_finds_what_it_was_built_for - Prove the check still finds what it was built for
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Keeping the signal
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 15:21:34

# AI Context
- Summary: The regression case for the item_784/GH#20 shift shape, and the reason its second criterion was revised rather than met.
- Keywords: item_784, regression, shifted proof, declaration limits
- Use when: Making this check quieter, in any way, and needing the case that proves it still fires.
- Skip when: Broadening what the check looks at.

# Problem
- Both slices above make the check quieter, and the way to make a check quiet by accident is to make it quiet on purpose without a case that proves it still fires.
- The defect item_784 found -- one proof block shifted across criteria that do not share a wave -- is the case that must survive.

# Scope
- In:
  - A test built from the shape item_784/GH#20 actually found, not from a synthetic duplicate.
  - A test that the declaration cannot be used to settle that shape.
- Out:
  - Broadening what the check looks at.

# Acceptance criteria
- AC1: A shifted proof block across unrelated criteria is still reported after both slices.
- AC2: Revised during implementation, and the original is kept here because the reason matters. As scoped it read "the declaration does not silence it", which cannot hold: a shifted proof block and a shared wave are the same bytes, and telling them apart is precisely the human judgement the check exists to ask for -- so no rule can stop a declaration from covering one. What is asserted instead: silencing is never implicit or broad. It takes a line naming those exact criteria, in that document; a declaration naming other criteria, or only part of the group, or nothing parseable, leaves the finding standing.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A shifted proof block across unrelated criteria is still reported after both slices.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_099_an_audit_worth_reading`
- Architecture decision(s): (none yet)
- Request: `req_368_make_the_duplicate_proof_check_say_something_a_reader_can_act_on`
- Primary task(s): `task_379_orchestrate_the_audit_signal_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_379_orchestrate_the_audit_signal_work` was finished via `logics-manager flow finish task` on 2026-08-15.
