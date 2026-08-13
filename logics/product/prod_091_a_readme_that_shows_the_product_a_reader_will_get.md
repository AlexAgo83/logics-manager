## prod_091_a_readme_that_shows_the_product_a_reader_will_get - A README that shows the product a reader will get
> Date: 2026-08-13
> Status: Proposed
> Related request: `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`
> Related backlog: `item_778_retake_the_readme_captures_against_the_delivered_screens`, `item_779_correct_the_prose_and_alt_text_that_describe_the_old_screens`, `item_780_write_down_how_a_documentation_capture_is_produced`
> Related task: `task_352_refresh_the_published_captures_once_the_screens_are_final`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
The README is where someone decides whether to install this. It should show the screens they will actually see, in the state a released build puts them in, described in the words the product now uses. A capture that is a release behind is not a small inaccuracy: it is a promise the product does not keep.

# Goals
- What a reader sees in the README is what they get when they run it.
- Documentation captures have a recorded provenance, so staleness is noticeable rather than silent.

# Non-goals
- The redesigns themselves.
- Automating capture generation in CI, unless the provenance work shows it is the cheaper answer.

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
- Product back-reference: `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`
- Task back-reference: `task_352_refresh_the_published_captures_once_the_screens_are_final`
