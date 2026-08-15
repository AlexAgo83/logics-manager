## task_360_orchestrate_the_loading_border_trace_feature - Orchestrate the loading border trace feature
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 06:28:14

# AI Context
- Summary: Orchestrates item_788 (CSS ring mechanism + neutral colour decision) and item_789 (wiring into real screens) in that order.
- Keywords: orchestration, loading ring, viewer feedback
- Use when: Sequencing or tracking overall progress across item_788 and item_789.
- Skip when: Implementation detail of either backlog item — see them directly.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Port the prototype's CSS ring mechanism into the viewer's shared stylesheet(s) (backlog item 1): opaque inner cover + absolutely-positioned glow/sweep, square sweep box, opacity fade, reduced-motion media query.
- [x] 2. Decide and document the neutral colour for untyped screens (backlog item 1).
- [x] 3. Wire `data-loading`/`--loading-color` into the real document screens via their existing loading signals (backlog item 2).
- [x] 4. Wire the same into the untyped screens (Settings, CI, Release, Workshop, CDX) (backlog item 2).
- [x] 5. Manually verify against the real toolbar's actual width/aspect ratio -- the prototype's known corner-speed trade-off may need a tuned ring thickness or rotation speed at real proportions.
- [x] 6. Validate the full chain with flow validate, lint, and a manual pass confirming existing loading text is unchanged.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`
- `item_789_wire_the_loading_ring_into_the_real_viewer_screens`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task, via `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`. Proof: one rule set in `clients/viewer/viewer.css` driven by `data-loading` and `--loading-color` on `.viewer-document__header`, with the reveal done as a punch-through -- `.viewer-document__ring` clips the sweep, its `::after` covers all but a 2px rim -- and no `mask-composite` anywhere near it.
- request-AC2 -> This task, via item_788 and `item_789_wire_the_loading_ring_into_the_real_viewer_screens`. Proof: measured live, Settings and Validation health read `var(--viewer-loading-neutral)` and refreshing an open request reads `var(--stage-color-request)`. The neutral is declared once as the palette's description grey, chosen because it is the only neutral no stage claims.
- request-AC3 -> This task, via item_788. Proof: `transition: opacity 0.45s ease`, sampled mid-fade at opacity 0.145 and 0.22 against a running viewer rather than inferred from the rule.
- request-AC4 -> This task, via item_788. Proof: with `prefers-reduced-motion: reduce` emulated through the debugging protocol, the sweep computes `animation-name: none` with no gradient and the ring animates `viewer-loading-ring-breathe` at opacity 0.3 -- a pulse, no rotation, from a media query rather than a toggle.
- request-AC5 -> This task, via item_789. Proof: `setMeta` and `showScreenLoading` are unmodified in this wave; the ring is drawn on the header beside the text they already write.
- request-AC6 -> This task, via item_789. Proof: wired into `setPrimaryActionBusy`, the signal every screen's load already passes through, so no parallel loading tracker exists. Verified live on an untyped screen (Settings), on a screen change (Validation health) and on a document refresh.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts tests/webview.selectors.test.ts tests/viewer.reader.test.ts tests/webview.layout-collapse.test.ts`: 270/270 passed. `python3 -m pytest tests/python`: 1386/1386 passed.
- Driven live against a running viewer. Untyped screen (Settings): `data-loading` set, `--loading-color: var(--viewer-loading-neutral)`, ring opacity 1, `transition-duration: 0.45s`, sweep animating `viewer-loading-ring-spin`; cleared to opacity 0 once settled. Screen change (Validation health) reads the neutral. Refreshing an open request reads `var(--stage-color-request)`.
- AC3 caught mid-fade rather than inferred: ring opacity sampled at 0.145 and 0.22 during the transition.
- AC4 under `prefers-reduced-motion: reduce` emulated through the debugging protocol: sweep `animation-name: none` with no gradient, ring animating `viewer-loading-ring-breathe` at opacity 0.3.
- AC5: `setMeta` and `showScreenLoading` are unmodified in this wave.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Both slices are implemented. Step 5 of the plan -- checking the ring at the real header's proportions rather than the prototype's -- is what the square oversized sweep box answers; measured on the real header, the sweep animates without the corner-speed artefact the prototype warned about, because its gradient box never takes the header's aspect ratio.
- Two things the prototype could not have known, both found by building against the real header: `overflow: hidden` cannot go on the header (it holds the Git actions menu and would clip it open), and the stage colour is not knowable at the moment a load begins.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`, `item_789_wire_the_loading_ring_into_the_real_viewer_screens`
- Related request(s): `req_360_loading_border_trace_an_animated_ring_on_the_header_while_a_screen_loads`


# Links
- Request: `req_360_loading_border_trace_an_animated_ring_on_the_header_while_a_screen_loads`
- Product brief(s): `prod_094_loading_border_trace`
- Architecture decision(s): (none yet)
