## item_714_give_the_fleet_home_s_empty_and_degraded_states_something_to_say - Give the fleet home's empty and degraded states something to say
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: A bootstrappable project, an unreadable one and an unconfigured fleet all render as the same grey sentence; separate them and give each its next action.
- Keywords: hasLogics false, bootstrappable, unreadable project, empty state, fleet root explanation, viewer-fleet__empty
- Use when: Changing what the fleet home shows when a project has no corpus, cannot be read, or no root is configured.
- Skip when: Changing the bootstrap flow itself or the root picker dialog.

# Problem
- A project with no corpus, a project that cannot be read, and an unconfigured fleet all render as one grey sentence -- on what is by definition a new user's first screen.

# Scope
- In:
  - Distinguish a bootstrappable project from an unreadable one in both wording and form.
  - An empty state that says what a fleet root is and offers the picker.
- Out:
  - The bootstrap flow itself, and the root picker dialog.

# Acceptance criteria
- AC7: Bootstrappable, unreadable and unconfigured are distinct and each carries its next action.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC7: Bootstrappable, unreadable and unconfigured are distinct and each carries its next action.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_080_a_fleet_home_an_operator_can_triage_from`
- Architecture decision(s): (none yet)
- Request: `req_344_make_the_fleet_home_read_as_the_product_s_first_screen`
- Primary task(s): `task_341_deliver_the_fleet_home_first_screen_redesign`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
