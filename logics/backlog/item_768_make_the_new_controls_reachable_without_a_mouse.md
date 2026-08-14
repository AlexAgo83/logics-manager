## item_768_make_the_new_controls_reachable_without_a_mouse - Make the new controls reachable without a mouse
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:27

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

# Delivery notes
- **Audited rather than assumed.** Every element matching `[data-action]`, `[role=button]`, `[role=tab]`, `[data-viewer-nav-target]`, `summary` and `[data-viewer-filter-group]` in `clients/viewer/index.html` was checked: 34 controls, 0 unreachable. The runtime-rendered ones the redesigns added are buttons and anchors by construction -- the reader's copy-path control, its contents links, the explorer's directory entries, the command filter, the runbook rail.
- **The focus ring is one rule, not twenty.** `viewer.css` had `:focus-visible` styled in twenty places, which means the twenty-first control added has no ring and nothing says so -- the exact shape of gap this redesign kept producing. A bare `:focus-visible` at the top of the file covers everything; the per-control rules below still win where they have a reason to. `:focus-visible` rather than `:focus`, so a pointer click does not draw a ring nobody asked for.
- **Focus returns where it came from.** `createThemedModal` remembers `document.activeElement` before it takes focus and `closeThemedModal` hands it back. Without this it fell to the document body, so an operator who opened the modal from `+New` and cancelled landed at the top of the page and had to tab back -- every time.
- **Tab is confined to an open modal.** The next Tab from the last field used to land on the board behind the backdrop: controls that are visually unreachable and, to a keyboard, exactly the ones that come next.
- Restoring focus checks the opener is still connected, because a re-render between opening and closing can replace it.

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

# Notes
- Task `task_349_deliver_the_colour_and_keyboard_conditions_for_the_redesigns` was finished via `logics-manager flow finish task` on 2026-08-14.
