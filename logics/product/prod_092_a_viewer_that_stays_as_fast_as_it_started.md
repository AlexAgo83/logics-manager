## prod_092_a_viewer_that_stays_as_fast_as_it_started - A viewer that stays as fast as it started
> Date: 2026-08-14
> Status: Proposed
> Related request: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
> Related backlog: `item_781_serve_an_unchanged_corpus_without_rebuilding_it`, `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`, `item_783_fail_when_the_work_is_repeated_or_a_change_is_missed`
> Related task: `task_356_keep_the_viewer_as_fast_as_it_started`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
The viewer is the screen an operator leaves open all day. Its cost should follow what changed, not how long it has been open. A tool that is quick in the first ten minutes and unusable in the third hour is a tool people restart instead of trusting.

# Goals
- Time-to-payload is a property of the corpus, not of uptime.
- Idle costs nothing measurable, and what it costs is written down.

# Non-goals
- Changing what the payload contains.
- The board's paging, which is settled.

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
- Product back-reference: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
- Task back-reference: `task_356_keep_the_viewer_as_fast_as_it_started`
