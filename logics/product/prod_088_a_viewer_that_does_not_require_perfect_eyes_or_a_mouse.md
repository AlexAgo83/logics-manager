## prod_088_a_viewer_that_does_not_require_perfect_eyes_or_a_mouse - A viewer that does not require perfect eyes or a mouse
> Date: 2026-08-13
> Status: Proposed
> Related request: `req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse`
> Related backlog: `item_767_give_every_colour_carried_state_a_second_channel`, `item_768_make_the_new_controls_reachable_without_a_mouse`, `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`
> Related task: `task_349_deliver_the_colour_and_keyboard_conditions_for_the_redesigns`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
The viewer redesigns bought their density by moving meaning onto colour and onto controls that appear under a pointer. Both are good decisions and both have a cost that has to be paid once, deliberately, rather than discovered by whoever cannot use the result. The product already carries sixty-seven accessibility attributes and checks its heading structure on every campaign run; the new work should not be the part that stops doing that.

```mermaid
flowchart TB
    D[A redesign carries state by colour] --> Q{Legible without colour?}
    Q -- no --> Add[Add a second channel the layout already has]
    Add --> Dense{Still as dense as the mockup?}
    Dense -- no --> Rethink[Reuse, do not add a marker per row]
    Dense -- yes --> Ok[Condition met]
    C[A redesign adds a control] --> K{Reachable without a pointer?}
    K -- no --> Fix[Keyboard reach, focus in and out, visible focus]
    Camp[Viewer UI campaign] --> Enforce[Fails on colour-only state and unreachable controls]
    Enforce -.- Memo[Otherwise the condition is only a memo]
```

# Goals
- State carried by colour is also carried by something else.
- Every new control is reachable without a pointer.
- The conditions are enforced by a check, not by memory.

# Non-goals
- A full accessibility audit of the existing viewer.
- Screens the nine active chains do not touch, and the Workshop Terminals tab.
- Undoing the density the redesigns were for.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse`
- Task back-reference: `task_349_deliver_the_colour_and_keyboard_conditions_for_the_redesigns`
