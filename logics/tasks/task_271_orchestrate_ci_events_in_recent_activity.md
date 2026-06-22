## task_271_orchestrate_ci_events_in_recent_activity - Orchestrate CI events in Recent activity
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Expose recentRuns from ci_status_payload first so the client has data to render.
- [x] 2. Merge recentRuns into getActivityEntries as activityKind:'ci' with CSS, marker, and url wiring.
- [x] 3. Verify the empty/unavailable CI fallback leaves the feed identical to today.
- [x] 4. Run lint, audit, pytest, and vitest and keep all linked docs in sync before closeout.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_486_expose_recent_ci_runs_from_ci_status_payload`
- `item_487_merge_ci_runs_into_the_recent_activity_feed`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Proof: Each recentRuns entry carries id, badgeState, updatedAt, run url, and headSha; no new runtime dependency is added.
- request-AC3 -> This task. Proof: getActivityEntries merges recentRuns into the activity entries as activityKind:'ci', mapped to the existing {id, updatedAt, marker, activityKind, selectable} shape so time bucketing and grouping work unchanged.
- request-AC5 -> This task. Proof: When CI is unavailable, errored, or returns no runs, the activity feed renders exactly as today with no CI rows and no error noise.
- request-AC7 -> This task. Proof: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- lint OK; pytest 409 passed; vitest 686 passed (2026-06-22)
- Finish workflow executed on 2026-06-22.
- Linked backlog/request close verification passed.

# Report
- Implementation complete: ci-status recentRuns surface as kind:'ci' events in the shared feed via `ciActivityEvents()`; `refreshActivityFeedForCi()` re-dispatches while the activity panel is open. Empty/unavailable CI leaves the feed unchanged (runs default to []).
- vitest `tests/viewer.browser-host.test.ts` green (148 passing), including the new "adds CI runs to the activity feed dispatch" case, which drives the real activity-toggle open path. Lint OK; viewer-host bundle and viewer assets verified in sync.
- Finished on 2026-06-22.
- Linked backlog item(s): `item_486_expose_recent_ci_runs_from_ci_status_payload`, `item_487_merge_ci_runs_into_the_recent_activity_feed`
- Related request(s): `req_274_surface_ci_events_in_the_recent_activity_feed`

# AI Context
- Summary: Orchestrate CI events in Recent activity
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_274_surface_ci_events_in_the_recent_activity_feed`
- Product brief(s): `prod_027_ci_events_in_recent_activity`
- Architecture decision(s): (none yet)
