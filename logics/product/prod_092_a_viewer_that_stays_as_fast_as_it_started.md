## prod_092_a_viewer_that_stays_as_fast_as_it_started - A viewer that stays as fast as it started
> Date: 2026-08-14
> Status: Settled
> Related request: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
> Related backlog: `item_781_serve_an_unchanged_corpus_without_rebuilding_it`, `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`, `item_783_fail_when_the_work_is_repeated_or_a_change_is_missed`
> Related task: `task_356_keep_the_viewer_as_fast_as_it_started`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.
> Indicators reviewed: 2026-08-14 19:07:51

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
- Time-to-payload is a property of the corpus, not of uptime. Measured: the items endpoint went from **6.1s fresh / 38.0s after 2h30** to **0.15s**, with 0.325s on the same server after half an hour idle.
- Asking whether a rebuild is needed costs a fraction of doing one: a 16ms stat-walk against 3.7s of parsing, so the check can run on every request.
- A cache that is fast and wrong is worse than none. A new document appears, a deleted one disappears, and an edit that keeps the byte count appears -- each with its own regression.
- The refresh cadence follows what a refresh costs, on both sides: a refresh may never occupy more than a tenth of the interval between refreshes. On today's corpus the configured interval always wins, which is the point.
- Idle costs nothing measurable, and what it costs is written down: **0.04s CPU over 240s wall with zero clients**, 0.017% of a core.
- A measurement is quoted with what was connected when it was taken. The 85% CPU figure that raised this work was recorded as a correction once 124 leftover headless browsers were found holding event streams open.

# References
- Product back-reference: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
- Task back-reference: `task_356_keep_the_viewer_as_fast_as_it_started`
