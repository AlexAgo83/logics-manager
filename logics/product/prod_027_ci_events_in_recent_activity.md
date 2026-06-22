## prod_027_ci_events_in_recent_activity - CI events in Recent activity
> Date: 2026-06-22
> Status: Proposed
> Related request: `req_274_surface_ci_events_in_the_recent_activity_feed`
> Related backlog: `item_486_expose_recent_ci_runs_from_ci_status_payload`, `item_487_merge_ci_runs_into_the_recent_activity_feed`
> Related task: `task_271_orchestrate_ci_events_in_recent_activity`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Fold recent CI runs into the existing Recent activity feed by reusing the runs ci_status_payload already fetches and the feed's heterogeneous-entry rendering.

# Goals
- Give users pipeline visibility inside the activity feed without a separate panel or fetch.
- Reuse existing CI fetching and activity rendering rather than adding new infrastructure.

# Non-goals
- A dedicated CI events panel or tab separate from Recent activity.
- Polling, websockets, or any new live-update mechanism.
- Adding a new CI provider or runtime dependency.

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
- Product back-reference: `req_274_surface_ci_events_in_the_recent_activity_feed`
- Task back-reference: `task_271_orchestrate_ci_events_in_recent_activity`
