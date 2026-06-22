## item_486_expose_recent_ci_runs_from_ci_status_payload - Expose recent CI runs from ci_status_payload
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer backend
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- ci_status_payload fetches the full branch runs list but returns only the single badge run, so the client cannot show CI history.

# Scope
- In:
  - Add a recentRuns array to the ci payload built from the runs already fetched (all workflows, current branch, newest first, capped to a small N)
  - Each entry exposes id, badgeState (reusing _ci_badge_state / _gitlab_ci_badge_state), updatedAt, run url, headSha
  - Preserve the unavailable/timeout/error/no-runs payloads so they carry an empty recentRuns
- Out:
  - Any client rendering (sibling slice)
  - New network calls or providers

# Acceptance criteria
- AC1: ci_status_payload returns recentRuns for both GitHub and GitLab paths with no extra fetch.
- AC2: Error/timeout/unavailable/no-runs payloads include an empty recentRuns and render as today.
- AC3: A pytest check covers recentRuns assembly and ordering.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: ci_status_payload returns recentRuns for both GitHub and GitLab paths with no extra fetch.
- request-AC2 -> This backlog slice. Proof: AC2: Error/timeout/unavailable/no-runs payloads include an empty recentRuns and render as today.
- request-AC5 -> This backlog slice. Proof: AC3: A pytest check covers recentRuns assembly and ordering.
- request-AC4 -> This backlog slice. Proof: CI activity rows are visually distinguishable (per-kind CSS class and marker) and open the run url; rows are non-clickable where no url exists.
- request-AC6 -> This backlog slice. Proof: The full pytest and vitest suites pass, with a check covering recentRuns assembly and the CI-entry mapping.
- request-AC7 -> This backlog slice. Proof: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_027_ci_events_in_recent_activity`
- Architecture decision(s): (none yet)
- Request: `req_274_surface_ci_events_in_the_recent_activity_feed`
- Primary task(s): `task_271_orchestrate_ci_events_in_recent_activity`

# AI Context
- Summary: Expose recent CI runs from ci_status_payload
- Keywords: scaffolded-backlog, expose recent ci runs from ci_status_payload, implementation-ready
- Use when: Implementing the scaffolded slice for Expose recent CI runs from ci_status_payload.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Done: ci_status_payload returns recentRuns (all workflows, current branch, newest first, capped at CI_RECENT_RUNS_LIMIT=8) via _recent_ci_runs, built from the runs already fetched; error/timeout/unavailable/no-runs payloads carry an empty recentRuns. tests/python/test_ci_recent_runs.py covers mapping, cap, empty, failure state.
- Task `task_271_orchestrate_ci_events_in_recent_activity` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_271_orchestrate_ci_events_in_recent_activity`
