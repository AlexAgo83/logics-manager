## task_281_orchestrate_the_recent_activity_feed_legibility_polish - Orchestrate the Recent Activity feed legibility polish
> From version: 2.14.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 25
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: digital

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Land the marker colour/glyph/accent slice first: propagate badgeState, set the marker dataset and glyph in renderActivityPanel, and add the toolbar.css rules. (getActivityEntries passes badgeState through; renderActivityPanel sets a kind glyph + data-badge-state on the marker; toolbar.css tints CI markers by state and adds per-kind left accent stripes.)
- [ ] 2. Then recompose the git/CI meta lines: expose branch/SHA on the host events and append relative time via the existing helper.
- [ ] 3. Add activity-panel render coverage for the state-coloured marker, glyphs, and recomposed lines.
- [ ] 4. Run vitest and logics-manager lint/audit; keep linked docs in sync. (Mirror sync retired by req_285 — clients/shared-web/media is the single edited source.)
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_516_colour_and_glyph_activity_markers_by_kind_and_ci_state`
- `item_517_recompose_git_and_ci_activity_lines_into_human_summaries`

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
- Summary: Orchestrate the Recent Activity feed legibility polish
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_284_make_the_recent_activity_feed_legible_for_git_and_ci_events`
- Product brief(s): `prod_033_recent_activity_feed_legibility`
- Architecture decision(s): (none yet)
