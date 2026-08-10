## task_325_deliver_compact_viewer_logo_identity - Deliver compact viewer logo identity
> From version: 2.21.3
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-10 12:48:46
> Owner: codex

# AI Context
- Summary: Deliver compact viewer logo identity
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Inspect the existing identity row and reuse the packaged viewer icon.
- [x] 2. Replace the visible title with an accessible logo and preserve compact-height styling.
- [x] 3. Run focused viewer tests, capture and inspect the rendered header, regenerate or confirm the affected README and documentation screenshots, then run lint, audit, and closeout validation.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-The visible Logics Viewer text is replaced by the packaged Logics icon before the project selector. -> `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`. Proof deferred to slice closeout.
- request-The logo is discreet, preserves the existing topbar height, and does not cause layout overflow at compact widths. -> `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`. Proof deferred to slice closeout.
- request-The identity remains accessible through suitable semantic text or an aria-label and a viewer test covers the new header markup. -> `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)
- command: `npm run test:viewer-smoke; npm exec vitest run tests/viewer.browser-host.test.ts tests/chainGraphScreen.test.ts; npm run lint:ts` | result: passed | date: 2026-08-10
- Finish workflow executed on 2026-08-10.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-10.
- Linked backlog item(s): `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`
- Related request(s): `req_328_replace_the_viewer_title_with_a_compact_logics_logo`

# Links
- Request: `req_328_replace_the_viewer_title_with_a_compact_logics_logo`
- Product brief(s): `prod_072_compact_logics_viewer_identity`
- Architecture decision(s): (none yet)
