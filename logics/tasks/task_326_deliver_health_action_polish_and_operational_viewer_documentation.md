## task_326_deliver_health_action_polish_and_operational_viewer_documentation - Deliver Health action polish and operational viewer documentation
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
- Summary: Deliver Health action polish and operational viewer documentation
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Style and test Apply fixes using existing viewer button conventions.
- [ ] 2. Generate Health and Insights captures from a safe fixture, crop and inspect them.
- [ ] 3. Update README, run viewer checks and Logics validation, then record visual evidence at closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_685_style_the_viewer_health_apply_fixes_action`
- `item_686_add_health_and_insights_screenshots_to_the_readme`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-Apply fixes is visibly styled as a viewer action in normal, hover, focus, disabled, and busy states without reducing accessibility. -> `item_685_style_the_viewer_health_apply_fixes_action`. Proof deferred to slice closeout.
- request-The published images are generated from the real viewer, visually inspected, and their README alt text explains the capability shown. -> `item_685_style_the_viewer_health_apply_fixes_action`. Proof deferred to slice closeout.
- request-The README includes a cropped Health screenshot that demonstrates findings and the repair action without exposing private project content. -> `item_686_add_health_and_insights_screenshots_to_the_readme`. Proof deferred to slice closeout.
- request-The README includes a cropped Insights screenshot that demonstrates workflow shape and attention signals without duplicating the board or document screenshots. -> `item_686_add_health_and_insights_screenshots_to_the_readme`. Proof deferred to slice closeout.
- request-The published images are generated from the real viewer, visually inspected, and their README alt text explains the capability shown. -> `item_686_add_health_and_insights_screenshots_to_the_readme`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_329_polish_viewer_health_actions_and_document_operational_views`
- Product brief(s): `prod_073_visible_viewer_operational_health`
- Architecture decision(s): (none yet)
