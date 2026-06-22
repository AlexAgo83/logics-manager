## req_274_surface_ci_events_in_the_recent_activity_feed - Surface CI events in the Recent activity feed
> From version: 2.12.8
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer activity
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The Recent activity feed lists recent CI runs alongside workflow-doc activity, sorted into the same time buckets, so a user sees pipeline results without opening the CI badge.
- CI events shown are the recent runs of all GitHub Actions / GitLab workflows on the current branch, each with its pass/fail/running state and a link to the run.
- The feature reuses the runs already fetched by ci_status_payload and the existing activity-feed rendering, adding no new network call, panel, or dependency.

# Context
- ci_status_payload in _ci.py already fetches the full runs list for the current branch but discards everything except the single run selected for the badge.
- The board already serves a `ci` endpoint via _request_handler_1.py, so the client already has a path to CI data.
- The Recent activity panel in webviewChrome.js renders heterogeneous entries keyed by activityKind, with per-kind CSS classes, time bucketing (formatActivityTimeBucket), and a selectable:false flag for non-clickable rows — it does not assume entries are workflow docs.
- Scope is all workflows on the current branch (CI, release, others), matching the branch-scoped runs list already in memory, not a single named workflow.
- The CI fetch is already timeout-gated and error-handled in _ci.py, so no new trust boundary or failure mode is introduced.

# Acceptance criteria
- AC1: ci_status_payload returns a bounded recentRuns array (all workflows on the current branch, newest first, capped) built from the runs it already fetches, with no extra network call.
- AC2: Each recentRuns entry carries id, badgeState, updatedAt, run url, and headSha; no new runtime dependency is added.
- AC3: getActivityEntries merges recentRuns into the activity entries as activityKind:'ci', mapped to the existing {id, updatedAt, marker, activityKind, selectable} shape so time bucketing and grouping work unchanged.
- AC4: CI activity rows are visually distinguishable (per-kind CSS class and marker) and open the run url; rows are non-clickable where no url exists.
- AC5: When CI is unavailable, errored, or returns no runs, the activity feed renders exactly as today with no CI rows and no error noise.
- AC6: The full pytest and vitest suites pass, with a check covering recentRuns assembly and the CI-entry mapping.
- AC7: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_027_ci_events_in_recent_activity`
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer_parts/_ci.py` (ci_status_payload already fetches the full runs list, keeps only one for the badge)
- `logics_manager/viewer_parts/_request_handler_1.py` (board `ci` endpoint)
- `clients/shared-web/media/webviewChrome.js` (Recent activity panel rendering, heterogeneous activityKind entries)
- `clients/shared-web/src/main-app/parts/_01.js`, `_02.js` (getActivityEntries source)

# AI Context
- Summary: Surface CI events in the Recent activity feed
- Keywords: request-chain-scaffold, surface ci events in the recent activity feed, development-ready
- Use when: You need to implement or review the scaffolded workflow for Surface CI events in the Recent activity feed.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_486_expose_recent_ci_runs_from_ci_status_payload`
- `item_487_merge_ci_runs_into_the_recent_activity_feed`
