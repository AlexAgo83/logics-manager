## task_281_orchestrate_the_recent_activity_feed_legibility_polish - Orchestrate the Recent Activity feed legibility polish
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: digital

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Land the marker colour/glyph/accent slice first: propagate badgeState, set the marker dataset and glyph in renderActivityPanel, and add the toolbar.css rules. (getActivityEntries passes badgeState through; renderActivityPanel sets a kind glyph + data-badge-state on the marker; toolbar.css tints CI markers by state and adds per-kind left accent stripes.)
- [x] 2. Then recompose the git/CI meta lines: expose branch/SHA on the host events and append relative time via the existing helper. (browser-host exposes branch/sha on git events and workflow/outcome/badgeState on CI runs; renderActivityPanel recomposes "workflow · outcome · Nm ago" / "action · branch @ sha · Nm ago" reusing formatActivityTimeBucket's relative part, degrading gracefully and keeping git-action message lines untouched.)
- [x] 3. Add activity-panel render coverage for the state-coloured marker, glyphs, and recomposed lines. (tests/webview.chrome.test.ts: 2 new cases asserting CI marker colour/glyph + git glyph + recomposed git/CI summaries and graceful degradation; full vitest 702/702.)
- [x] 4. Run vitest and logics-manager lint/audit; keep linked docs in sync. (Mirror sync retired by req_285 — clients/shared-web/media is the single edited source; browser-host.js rebundled + check:viewer-host green.)
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_516_colour_and_glyph_activity_markers_by_kind_and_ci_state`
- `item_517_recompose_git_and_ci_activity_lines_into_human_summaries`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: delivered via item_516 (Done) — getActivityEntries propagates badgeState; toolbar.css tints the marker green/red/amber/grey by data-badge-state (covered by tests/webview.chrome.test.ts).
- request-AC2 -> This task. Proof: delivered via item_516 (Done) — activityMarkerGlyph renders ⎇ for git and ✓/✗/• for CI by state; marker title + aria-label still name the kind and id (asserted in tests/webview.chrome.test.ts).
- request-AC3 -> This task. Proof: delivered via item_516 (Done) — toolbar.css adds `.activity-panel__entry--git/--ci` left accent stripes.
- request-AC4 -> This task. Proof: delivered via item_517 (Done) — recomposeActivityMeta builds "workflow · outcome · Nm ago" and "action · branch @ sha · Nm ago", reusing formatActivityTimeBucket's relative part.
- request-AC5 -> This task. Proof: delivered across the chain — only unicode glyphs, toolbar.css, and the existing toolsPanelLayout.formatActivityTimeBucket are used; no dependency added (package.json unchanged).
- request-AC6 -> This task. Proof: shared-web is the only edited webview source; per req_285 viewer_assets is generated (not committed) so the old sync-check is retired — browser-host.js rebundled and `npm run check:viewer-host` is green.
- request-AC7 -> This task. Proof: delivered via item_517 (Done) — tests/webview.chrome.test.ts covers the coloured CI marker, kind glyphs, and recomposed git/CI lines; full vitest 702/702.
- request-AC8 -> This task. Proof: `logics-manager lint` OK and `audit` clean (only deferred warnings on the unstarted req_286 chain).

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- vitest 702/702 (incl. new activity-panel marker/glyph/recompose cases); npm run lint OK; logics-manager lint/audit clean; browser-host.js rebundled, check:viewer-host green
- Finish workflow executed on 2026-06-27.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-27.
- Linked backlog item(s): `item_516_colour_and_glyph_activity_markers_by_kind_and_ci_state`, `item_517_recompose_git_and_ci_activity_lines_into_human_summaries`
- Related request(s): `req_284_make_the_recent_activity_feed_legible_for_git_and_ci_events`

# AI Context
- Summary: Orchestrate the Recent Activity feed legibility polish
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_284_make_the_recent_activity_feed_legible_for_git_and_ci_events`
- Product brief(s): `prod_033_recent_activity_feed_legibility`
- Architecture decision(s): (none yet)
