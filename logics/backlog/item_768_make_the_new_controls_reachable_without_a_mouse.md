## item_768_make_the_new_controls_reachable_without_a_mouse - Make the new controls reachable without a mouse
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: One item scopes keyboard navigation out and none picks it up, while the redesigns add folds, segmented controls, selectable rows, hover-revealed actions and a card tied to a panel.
- Keywords: keyboard reach, focus order, focus return, visible focus, hover-only action, fold, segmented control
- Use when: Making a redesigned control operable without a pointer, or deciding where focus goes.
- Skip when: Keyboard shortcuts and a command palette, and controls the chains do not change.

# Problem
- One item scopes keyboard navigation out, correctly, and no other item picks it up -- while the redesigns add folds, segmented controls, selectable rows, hover-revealed actions and a selected card tied to a panel. The reachable surface is growing and nothing owns it.

# Scope
- In:
  - Make every control the redesigns introduce reachable and operable from the keyboard.
  - Decide where focus goes when a panel opens, where it returns when one closes, and make a focused control visibly focused.
- Out:
  - Keyboard shortcuts and a command palette, which are a feature rather than a condition.
  - Existing controls the nine chains do not change.

# Acceptance criteria
- AC3: Every new control is keyboard-reachable and operable.
- AC4: Focus moves in, returns out, and is visible.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: Every new control is keyboard-reachable and operable.
- request-AC4 -> This backlog slice. Proof: AC4: Focus moves in, returns out, and is visible.

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
