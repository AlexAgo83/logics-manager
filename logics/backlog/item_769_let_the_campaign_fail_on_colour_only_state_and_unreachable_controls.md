## item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls - Let the campaign fail on colour-only state and unreachable controls
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: A condition living only in a request is a memo; the campaign already asserts heading structure and disabled-control reasons, and its layout checks read their targets from the interface so later screens are covered without editing a check.
- Keywords: campaign enforcement, colour only check, keyboard reach check, layout checks, targets read from interface
- Use when: Making an accessibility condition enforceable rather than remembered.
- Skip when: Auditing the whole product before the redesigns land.

# Problem
- A condition that lives only in a request is a memo. The campaign already asserts a heading structure and that a disabled control explains itself, so it is the place these conditions become enforceable -- and the layout checks read their targets from the interface, so a screen added later is covered without editing a check.

# Scope
- In:
  - A check that fails when a screen carries state by colour alone.
  - A check that fails when a control the redesigns introduce cannot be reached from the keyboard.
  - Record the conditions where the other chains will meet them, not only here.
- Out:
  - Auditing the whole product against these checks before the redesigns land; the checks apply to what the chains change.

# Acceptance criteria
- AC5: The campaign fails on colour-only state.
- AC6: The campaign fails on an unreachable new control.
- AC7: The conditions are recorded where the other chains meet them.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: The campaign fails on colour-only state.
- request-AC6 -> This backlog slice. Proof: AC6: The campaign fails on an unreachable new control.
- request-AC7 -> This backlog slice. Proof: AC7: The conditions are recorded where the other chains meet them.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_088_a_viewer_that_does_not_require_perfect_eyes_or_a_mouse`
- Architecture decision(s): (none yet)
- Request: `req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse`
- Primary task(s): `task_349_deliver_the_colour_and_keyboard_conditions_for_the_redesigns`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
