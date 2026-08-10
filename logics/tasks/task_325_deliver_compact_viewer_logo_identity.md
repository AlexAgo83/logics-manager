## task_325_deliver_compact_viewer_logo_identity - Deliver compact viewer logo identity
> From version: 2.21.3
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Deliver compact viewer logo identity
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Inspect the existing identity row and reuse the packaged viewer icon.
- [ ] 2. Replace the visible title with an accessible logo and preserve compact-height styling.
- [ ] 3. Run focused viewer tests, lint, audit, and closeout validation.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-The visible Logics Viewer text is replaced by the packaged Logics icon before the project selector. -> `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`. Proof deferred to slice closeout.
- request-The logo is discreet, preserves the existing topbar height, and does not cause layout overflow at compact widths. -> `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`. Proof deferred to slice closeout.
- request-The identity remains accessible through suitable semantic text or an aria-label and a viewer test covers the new header markup. -> `item_684_use_the_logics_icon_as_the_viewer_topbar_identity`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_328_replace_the_viewer_title_with_a_compact_logics_logo`
- Product brief(s): `prod_072_compact_logics_viewer_identity`
- Architecture decision(s): (none yet)
