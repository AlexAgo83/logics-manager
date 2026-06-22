## task_272_orchestrate_the_recent_activity_event_filter - Orchestrate the Recent activity event filter
> From version: 2.12.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 50
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Surface recent git commits as activityKind:'git' events first so the Git toggle has data.
- [x] 2. Add the activity filter button, compact popover, and persisted activityShowGit/activityShowCi toggles reusing the project filter design.
- [ ] 3. Wire the filter into getActivityEntries so it governs only git/ci event entries, leaving doc activity visible.
- [ ] 4. Verify the empty-category and req_274-not-merged fallbacks render gracefully.
- [ ] 5. Run lint, audit, pytest, and vitest and keep all linked docs in sync before closeout.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_488_surface_recent_git_commits_as_activity_events`
- `item_489_add_the_activity_filter_button_menu_and_persisted_toggles`

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
- Summary: Orchestrate the Recent activity event filter
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_275_add_a_git_ci_event_filter_to_the_recent_activity_view`
- Product brief(s): `prod_028_recent_activity_event_filter`
- Architecture decision(s): (none yet)
