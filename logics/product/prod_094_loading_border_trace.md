## prod_094_loading_border_trace - Loading border trace
> Date: 2026-08-15
> Status: Proposed
> Related request: `req_360_loading_border_trace_an_animated_ring_on_the_header_while_a_screen_loads`
> Related backlog: `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`, `item_789_wire_the_loading_ring_into_the_real_viewer_screens`
> Related task: `task_360_orchestrate_the_loading_border_trace_feature`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
An ambient, stage-coloured animated ring on the viewer header that signals a screen is loading, reusing the app's existing colour tokens and respecting reduced-motion.

# Goals
- A slow screen load (10-20s against a large corpus) reads as active, not stuck.
- Zero new colour palette -- the ring's colours come from tokens the board already uses.

# Non-goals
- Redesigning the existing textual loading indicators.
- Any change to how long a screen actually takes to load -- this is feedback, not a performance fix.

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
- Product back-reference: `req_360_loading_border_trace_an_animated_ring_on_the_header_while_a_screen_loads`
- Task back-reference: `task_360_orchestrate_the_loading_border_trace_feature`
