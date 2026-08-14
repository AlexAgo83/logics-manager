## item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls - Let the campaign fail on colour-only state and unreachable controls
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 15:13:36

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

# Delivery notes
- Two checks in `tests/helpers/viewer-layout-checks.mjs`, which is the module the campaign serializes into the page -- so a check that passes in its own test is the check that runs there.
- **`no state is carried by colour alone`** groups the visible state classes by the block that owns them and compares each pair's appearance with hue removed. Two states producing the same signature are reported by name.
- **The states themselves are never listed.** The parse is BEM -- the modifier is the last `--` segment, the block is what precedes it -- so a state added later is a new modifier on an existing block and is covered without editing the check. What *is* named is the set of blocks that carry state at all (`status|state|job|gate|badge|finding|signal|health`), so `btn--small` against `btn--large` is not reported as two states that look alike. A block that opts in explicitly can do so with `data-state`.
- Two states from different blocks are never compared: a CI badge and a board card are never on screen as a pair anyone has to tell apart, and requiring them to differ would fail runs over a distinction that does not exist.
- **`every control can be reached from the keyboard`** catches both shapes: a `div` acting as a control with no tab stop, and a real button opted out with `tabindex="-1"` -- the subtler one, since it looks correct in the markup. Disabled controls are skipped: they are not reachable and should not be, and the check that owns them is `a disabled action says why`.
- Both are covered by their own regressions, each introducing the defect and asserting the check reports it, in the same shape `item_616` established for the layout checks.
- AC7 is met by this record and by `item_767`'s decision table, which the other chains draw against.

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
