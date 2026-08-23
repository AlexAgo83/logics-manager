## task_396_orchestrate_the_review_and_explorer_repair - Orchestrate the Review and Explorer repair
> From version: 2.22.4
> Schema version: 1.0
> Status: In progress
> Understanding: 92%
> Confidence: 88%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex
> Indicators reviewed: 2026-08-23 14:51:20

# AI Context
- Summary: Sequences the five repair slices, ending with the campaign once the surfaces are stable.
- Keywords: orchestrate, review, explorer, repair
- Use when: starting or sequencing the implementation of req_384.
- Skip when: reopening the closed req_381 and req_383 tasks.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Slice A first: unify the surface state. Decide and record the owner before moving any call site, then move `mainApp.js`, `mainCore.js`, `mainInteractions.js`, `webviewChrome.js`, and the browser-host helpers onto it, and leave `#activity-toggle` with one behavior.
- [ ] 2. Slice B: reshape the Review bursts payload to counts-only, add the per-burst file fetch, wire Review into the existing viewer refresh path, wrap the Git calls, and fix the rename stats. Record the measured subprocess count and duration before and after.
- [ ] 3. Slice C: fix the keyboard navigation so repeated presses work and movement follows focus.
- [ ] 4. Slice D: finish the Explorer markdown switch and pane sizing, and clear the cached payloads wherever the Explorer re-renders.
- [ ] 5. Slice E last, once the surfaces are stable: add the Review case and extend the Explorer case in the visual campaign, and name the seven pre-existing failures.
- [ ] 6. Closeout: run and record `npm run bundle:viewer-host`, `npm run check:viewer-host`, the targeted vitest and pytest checks, `npm run test:viewer-smoke`, `npm run lint`, and `logics-manager lint --require-status`. Close each acceptance criterion with a proof naming what exercised it; a shared paragraph repeated across criteria is not a proof.
- [ ] 7. This chain repairs `req_381` and `req_383`, whose tasks are already closed. Do not reopen them; record the repair against this request.
- [ ] 8. ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] 9. Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] 10. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_866_unify_the_viewer_surface_state_across_the_shared_web_client`
- `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`
- `item_868_fix_review_timeline_keyboard_navigation`
- `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`
- `item_870_cover_review_and_the_reworked_explorer_in_the_visual_campaign`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_866_unify_the_viewer_surface_state_across_the_shared_web_client`. Proof deferred to slice closeout.
- request-AC2 -> `item_866_unify_the_viewer_surface_state_across_the_shared_web_client`. Proof deferred to slice closeout.
- request-AC3 -> `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`. Proof deferred to slice closeout.
- request-AC4 -> `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`. Proof deferred to slice closeout.
- request-AC5 -> `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`. Proof deferred to slice closeout.
- request-AC6 -> `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`. Proof deferred to slice closeout.
- request-AC7 -> `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`. Proof deferred to slice closeout.
- request-AC8 -> `item_868_fix_review_timeline_keyboard_navigation`. Proof deferred to slice closeout.
- request-AC9 -> `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`. Proof deferred to slice closeout.
- request-AC10 -> `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`. Proof deferred to slice closeout.
- request-AC11 -> `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`. Proof deferred to slice closeout.
- request-AC12 -> `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`. Proof deferred to slice closeout.
- request-AC13 -> `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`. Proof deferred to slice closeout.
- request-AC14 -> `item_870_cover_review_and_the_reworked_explorer_in_the_visual_campaign`. Proof deferred to slice closeout.
- request-AC15 -> `item_866_unify_the_viewer_surface_state_across_the_shared_web_client`. Proof deferred to slice closeout.
- request-AC15 -> `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`. Proof deferred to slice closeout.
- request-AC15 -> `item_868_fix_review_timeline_keyboard_navigation`. Proof deferred to slice closeout.
- request-AC15 -> `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`. Proof deferred to slice closeout.
- request-AC15 -> `item_870_cover_review_and_the_reworked_explorer_in_the_visual_campaign`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_384_repair_the_review_slot_and_explorer_delivery_against_the_acceptance_criteria_they_closed_on`
- Product brief(s): `prod_113_one_viewer_surface_state_and_a_review_timeline_that_can_refresh`
- Architecture decision(s): (none yet)
