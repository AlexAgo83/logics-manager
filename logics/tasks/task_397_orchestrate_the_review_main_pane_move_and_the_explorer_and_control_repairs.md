## task_397_orchestrate_the_review_main_pane_move_and_the_explorer_and_control_repairs - Orchestrate the Review main-pane move and the Explorer and control repairs
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 93%
> Confidence: 90%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Sequences the Review container move and the two styling repairs.
- Keywords: orchestrate, review, main, pane, move, explorer, control, repairs
- Use when: starting or sequencing req_385.
- Skip when: reopening the closed req_381, req_383 or req_384.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Slice A: add the `#review-panel` region, render Review into it, drop the `setDocument` call, and drive the three regions from the body classes in CSS so the shared-web renders cannot undo it.
- [ ] 2. Slice A: verify screens still open from Review and return to it, then cover the container and the re-render survival in tests and the campaign.
- [ ] 3. Slice B: replace the selected-row cue with an inset shadow, keep the row on one line, and give the detail pane vertical-only scrolling with horizontal scrolling inside the code and markdown blocks.
- [ ] 4. Slice C: rebuild the surface buttons as one segmented control and move it from `aria-pressed` to `role="tablist"` with `aria-selected`.
- [ ] 5. Closeout: regenerate the bundle, then run and record `npm run check:viewer-host`, the targeted vitest checks, `npm run test:viewer-smoke`, `npm run lint` and `logics-manager lint --require-status`. Close each criterion with a proof naming what exercised it.
- [ ] 6. ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] 7. Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_871_move_review_from_the_screen_overlay_into_the_main_pane`
- `item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling`
- `item_873_turn_the_surface_buttons_into_one_segmented_control`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_871_move_review_from_the_screen_overlay_into_the_main_pane`. Proof deferred to slice closeout.
- request-AC2 -> `item_871_move_review_from_the_screen_overlay_into_the_main_pane`. Proof deferred to slice closeout.
- request-AC3 -> `item_871_move_review_from_the_screen_overlay_into_the_main_pane`. Proof deferred to slice closeout.
- request-AC4 -> `item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling`. Proof deferred to slice closeout.
- request-AC5 -> `item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling`. Proof deferred to slice closeout.
- request-AC6 -> `item_873_turn_the_surface_buttons_into_one_segmented_control`. Proof deferred to slice closeout.
- request-AC7 -> `item_873_turn_the_surface_buttons_into_one_segmented_control`. Proof deferred to slice closeout.
- request-AC8 -> `item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling`. Proof deferred to slice closeout.
- request-AC8 -> `item_873_turn_the_surface_buttons_into_one_segmented_control`. Proof deferred to slice closeout.
- request-AC9 -> `item_871_move_review_from_the_screen_overlay_into_the_main_pane`. Proof deferred to slice closeout.
- request-AC9 -> `item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling`. Proof deferred to slice closeout.
- request-AC9 -> `item_873_turn_the_surface_buttons_into_one_segmented_control`. Proof deferred to slice closeout.
- request-AC10 -> `item_871_move_review_from_the_screen_overlay_into_the_main_pane`. Proof deferred to slice closeout.
- request-AC11 -> `item_871_move_review_from_the_screen_overlay_into_the_main_pane`. Proof deferred to slice closeout.
- request-AC11 -> `item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling`. Proof deferred to slice closeout.
- request-AC11 -> `item_873_turn_the_surface_buttons_into_one_segmented_control`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_385_render_review_in_the_main_pane_and_repair_the_explorer_detail_pane_and_surface_control`
- Product brief(s): `prod_114_review_as_a_real_viewer_surface`
- Architecture decision(s): (none yet)
