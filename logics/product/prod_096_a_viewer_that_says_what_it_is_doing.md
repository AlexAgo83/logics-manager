## prod_096_a_viewer_that_says_what_it_is_doing - A viewer that says what it is doing
> Date: 2026-08-15
> Status: Proposed
> Related request: `req_365_say_the_viewer_is_working_wherever_the_operator_is_looking`
> Related backlog: `item_809_show_a_load_that_has_no_screen_to_draw_on`, `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`, `item_811_give_every_stage_with_a_colour_token_its_accent`, `item_812_one_menu_button_on_the_phone_header`
> Related task: `task_376_orchestrate_the_loading_feedback_and_navigation_polish`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Make the viewer's own state legible without reading it: whether it is working, on which screen, and for how long -- through motion that marks events rather than motion that runs while nothing is known.

# Goals
- A visible answer to 'is it working' wherever the operator is looking.
- Motion that marks a start, and a resting state that carries the wait.
- Nothing shown for a load too short to be worth reporting.
- One colour language across stages, accents and loading.

# Non-goals
- A progress bar or a percentage: nothing in these loads knows a proportion, and a bar that fills at a made-up rate is a claim the operator will calibrate against and be wrong.
- A second navigation system for phones -- the menu button opens the navigation that already exists.
- Changing what any loading text says: this is about the signals beside it.
- Re-opening req_360's neutral colour decision.

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
- Product back-reference: `req_365_say_the_viewer_is_working_wherever_the_operator_is_looking`
- Task back-reference: `task_376_orchestrate_the_loading_feedback_and_navigation_polish`
