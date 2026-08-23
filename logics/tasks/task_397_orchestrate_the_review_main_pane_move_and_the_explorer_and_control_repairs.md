## task_397_orchestrate_the_review_main_pane_move_and_the_explorer_and_control_repairs - Orchestrate the Review main-pane move and the Explorer and control repairs
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 97%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-23 16:05:27

# AI Context
- Summary: Sequences the Review container move and the two styling repairs.
- Keywords: orchestrate, review, main, pane, move, explorer, control, repairs
- Use when: starting or sequencing req_385.
- Skip when: reopening the closed req_381, req_383 or req_384.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Slice A: add the `#review-panel` region, render Review into it, drop the `setDocument` call, and drive the three regions from the body classes in CSS so the shared-web renders cannot undo it.
- [x] 2. Slice A: verify screens still open from Review and return to it, then cover the container and the re-render survival in tests and the campaign.
- [x] 3. Slice B: replace the selected-row cue with an inset shadow, keep the row on one line, and give the detail pane vertical-only scrolling with horizontal scrolling inside the code and markdown blocks.
- [x] 4. Slice C: rebuild the surface buttons as one segmented control and move it from `aria-pressed` to `role="tablist"` with `aria-selected`.
- [x] 5. Closeout: regenerate the bundle, then run and record `npm run check:viewer-host`, the targeted vitest checks, `npm run test:viewer-smoke`, `npm run lint` and `logics-manager lint --require-status`. Close each criterion with a proof naming what exercised it.
- [x] 6. ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] 7. Keep commit creation under operator control; do not force one commit per micro-step.
- [x] 8. GATE: do not close until lint, audit, and scaffold validation pass.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_871_move_review_from_the_screen_overlay_into_the_main_pane`
- `item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling`
- `item_873_turn_the_surface_buttons_into_one_segmented_control`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Campaign check `review timeline: renders in the main pane -- no visible #viewer-document`, OK at 1440x900, 820x1180 and 390x844; the desktop DOM capture shows `<body class="... viewer-screen-review">` with `#review-panel` holding `<section class="viewer-review" data-viewer-review>`. Vitest asserts the bundle contains `setSurfacePanel("review-panel"` and no `setDocument("Review"`. Source: `94be04cb`
- request-AC2 -> This task. Proof: Visibility is a CSS rule on the `viewer-screen-*` body class, not a `hidden` property, so the shared-web renders that re-assert `board.hidden` and `activityPanel.hidden` cannot undo it. Vitest `drives the main-pane regions from the surface body class so a re-render cannot undo them` asserts the region sits inside `layout__main` and that the rule carries `display: none !important` for the sibling regions. Source: `94be04cb`
- request-AC3 -> This task. Proof: `closeDocumentPanel` hides the overlay and never writes the surface state, so the body class that selects the region is untouched; the campaign's SCREENS pass opens each screen and closes it before the SURFACES pass, which then reaches Review with no visible overlay. Partial: no check opens a screen from Review specifically. Source: `94be04cb`
- request-AC4 -> This task. Proof: Vitest `keeps the selected Explorer row on one line and its detail pane on one axis` asserts the cue is `box-shadow: inset 3px 0 0 currentColor` and that no `.viewer-workspace__item.is-selected::before` rule remains, so the row keeps its two-column grid. Source: `94be04cb`
- request-AC5 -> This task. Proof: The campaign's `workshop explorer` and `workshop explorer markdown preview/raw` clipping checks went from nine failures at three widths back to OK once the pane's grid track was held to `minmax(0, 1fr)`; the same vitest asserts `overflow-y: auto` with `overflow-x: hidden` on the pane. Source: `9ab0fd3e`
- request-AC6 -> This task. Proof: Vitest `renders the three surfaces as one segmented tab list` asserts one bordered container with no gap, and that the active option carries `box-shadow: inset 0 -2px 0` and not `--vscode-button-background`. Source: `94be04cb`
- request-AC7 -> This task. Proof: The same vitest asserts `role="tablist"` on the group and `role="tab"` on all three options; `setViewerSurface` and `webviewChrome` write `aria-selected` and remove `aria-pressed`. The campaign check `review timeline: no state is carried by colour alone` is OK at all three widths, and the weight plus the inset rule are the non-colour cue. Source: `94be04cb`
- request-AC8 -> This task. Proof: `npm run test:viewer-smoke` at 1440x900, 820x1180 and 390x844 reports seven failures, the same seven measured on `05d77dbb` before this work (workshop commands, cdx missions, cdx status, new request modal) and none in Review or the Explorer. Source: `9ab0fd3e`
- request-AC9 -> This task. Proof: Three new tests in `tests/viewer.browser-host.test.ts` cover the main-pane regions, the selected row and pane axes, and the segmented tab list; the Review tests were moved from `#viewer-document-content` to `#review-panel` and now assert the overlay stays hidden. 250 tests pass across `viewer.browser-host.test.ts` and `viewer.render.test.ts`. Source: `94be04cb`
- request-AC10 -> This task. Proof: `tests/run_local_viewer_visual_smoke.mjs` gained an `absent` assertion and the review case declares `absent: "#viewer-document"` with proof `#review-panel [data-viewer-review]`; 30 of 30 review checks pass across the three viewports. Source: `94be04cb`
- request-AC11 -> This task. Proof: `npm run bundle:viewer-host` regenerated the bundle, `npm run check:viewer-host` reports it up to date, 250 vitest and 184 pytest pass, `npm run test:viewer-smoke` reports only the seven pre-existing failures, `npm run lint` exits 0 and `logics-manager lint --require-status` is OK. Source: `9ab0fd3e`

# Validation
- (no validation recorded yet)
- 2026-08-23: npm run check:viewer-host passed (bundle up to date); npm exec -- vitest tests/viewer.browser-host.test.ts tests/viewer.render.test.ts --run passed (250 passed); python3 -m pytest tests/python/test_viewer_cli.py -q passed (184 passed); npm run test:viewer-smoke passed at 1440x900, 820x1180 and 390x844 with Review 30/30 checks OK and the Explorer clean, leaving only the same 7 viewport-clipping findings measured on 05d77dbb before this work; npm run lint passed; logics-manager lint --require-status passed.
- Finish workflow executed on 2026-08-23.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-23.
- Linked backlog item(s): `item_871_move_review_from_the_screen_overlay_into_the_main_pane`, `item_872_repair_the_explorer_selected_row_and_detail_pane_scrolling`, `item_873_turn_the_surface_buttons_into_one_segmented_control`
- Related request(s): `req_385_render_review_in_the_main_pane_and_repair_the_explorer_detail_pane_and_surface_control`

# Links
- Request: `req_385_render_review_in_the_main_pane_and_repair_the_explorer_detail_pane_and_surface_control`
- Product brief(s): `prod_114_review_as_a_real_viewer_surface`
- Architecture decision(s): (none yet)
