## task_271_orchestrate_ci_events_in_recent_activity - Orchestrate CI events in Recent activity
> From version: 2.12.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Expose recentRuns from ci_status_payload first so the client has data to render.
- [ ] 2. Merge recentRuns into getActivityEntries as activityKind:'ci' with CSS, marker, and url wiring.
- [ ] 3. Verify the empty/unavailable CI fallback leaves the feed identical to today.
- [ ] 4. Run lint, audit, pytest, and vitest and keep all linked docs in sync before closeout.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_486_expose_recent_ci_runs_from_ci_status_payload`
- `item_487_merge_ci_runs_into_the_recent_activity_feed`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.

# Report
- Implementation complete.

# AI Context
- Summary: Orchestrate CI events in Recent activity
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_274_surface_ci_events_in_the_recent_activity_feed`
- Product brief(s): `prod_027_ci_events_in_recent_activity`
- Architecture decision(s): (none yet)
