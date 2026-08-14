## prod_091_a_readme_that_shows_the_product_a_reader_will_get - A README that shows the product a reader will get
> Date: 2026-08-13
> Status: Settled
> Related request: `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`
> Related backlog: `item_778_retake_the_readme_captures_against_the_delivered_screens`, `item_779_correct_the_prose_and_alt_text_that_describe_the_old_screens`, `item_780_write_down_how_a_documentation_capture_is_produced`
> Related task: `task_352_refresh_the_published_captures_once_the_screens_are_final`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-14 19:07:50

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
- What the README shows is what a reader gets when they run it. All four captures retaken against this repository's own corpus at 1621 documents, after the redesigns landed.
- No capture or caption shows the synthetic demo corpus, which a released build does not have.
- The prose beside each capture describes the screen that exists: the board's flow columns and reference index, not the companion stages as columns.
- Alt text is useful to someone who will never see the image -- it names what is in the frame rather than labelling the picture.
- Staleness is noticeable rather than silent: `scripts/dev/capture-readme-media.mjs` produces the captures and `docs/media/PROVENANCE.md` records the framing, so retaking them is one command.
- The producer reuses the viewer-driving that already existed rather than being a third way of pointing a browser at this viewer.

# References
- Product back-reference: `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`
- Task back-reference: `task_352_refresh_the_published_captures_once_the_screens_are_final`
