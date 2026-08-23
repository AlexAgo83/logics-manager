## item_868_fix_review_timeline_keyboard_navigation - Fix Review timeline keyboard navigation
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 15:14:52

# AI Context
- Summary: Makes Review's arrow keys work past the first press and follow focus rather than selection.
- Keywords: fix, review, timeline, keyboard, navigation
- Use when: fixing the Review timeline's keyboard behavior.
- Skip when: changing what a burst or file selection loads.

# Problem
- `moveReviewButton` calls `next.click()`, which re-renders the timeline and discards the element it had just focused, so burst navigation works once per render before focus falls back to the body and the scoped keydown listener stops receiving keys.
- Its `findIndex` matches the focused node, the active class, and `aria-pressed` in one OR and takes the first hit, so when focus and selection differ the arrow moves relative to the selection.

# Scope
- In:
  - Move relative to the focused element, falling back to the selected one only when nothing in the list has focus.
  - Restore focus to the equivalent element after any re-render the selection triggers, so repeated keypresses keep working.
  - Keep the listener scoped to the Review root, and keep it from firing while a text field has focus.
  - Cover repeated keypresses explicitly: several arrow presses in a row must land on successive bursts and successive files.
- Out:
  - Changing what selecting a burst or a file loads.
  - Adding shortcuts beyond the four arrow keys.
  - Type-ahead or focus trapping.

# Acceptance criteria
- AC1: Three consecutive right-arrow presses land on the third burst after the starting one, not on the second one three times.
- AC2: With focus on one burst and the selection on another, an arrow press moves relative to the focused burst.
- AC3: Focus survives the re-render a selection triggers.
- AC4: The listener stays scoped to the Review root and does not fire while a text field has focus.
- AC5: Browser-host tests cover repeated presses, the focus-versus-selection case, and the scoping.
- AC6: The bundle is regenerated and the targeted vitest checks pass for this slice.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: Three consecutive right-arrow presses land on the third burst after the starting one, not on the second one three times. Also: AC2: With focus on one burst and the selection on another, an arrow press moves relative to the focused burst.
- request-AC15 -> This backlog slice. Proof: AC6: The bundle is regenerated and the targeted vitest checks pass for this slice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_113_one_viewer_surface_state_and_a_review_timeline_that_can_refresh`
- Architecture decision(s): (none yet)
- Request: `req_384_repair_the_review_slot_and_explorer_delivery_against_the_acceptance_criteria_they_closed_on`
- Primary task(s): `task_396_orchestrate_the_review_and_explorer_repair`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_396_orchestrate_the_review_and_explorer_repair`

# Notes
- Task `task_396_orchestrate_the_review_and_explorer_repair` was finished via `logics-manager flow finish task` on 2026-08-23.
