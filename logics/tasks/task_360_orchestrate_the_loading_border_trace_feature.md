## task_360_orchestrate_the_loading_border_trace_feature - Orchestrate the loading border trace feature
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: orchestrate, loading, border, trace, feature
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Port the prototype's CSS ring mechanism into the viewer's shared stylesheet(s) (backlog item 1): opaque inner cover + absolutely-positioned glow/sweep, square sweep box, opacity fade, reduced-motion media query.
- [ ] 2. Decide and document the neutral colour for untyped screens (backlog item 1).
- [ ] 3. Wire `data-loading`/`--loading-color` into the real document screens via their existing loading signals (backlog item 2).
- [ ] 4. Wire the same into the untyped screens (Settings, CI, Release, Workshop, CDX) (backlog item 2).
- [ ] 5. Manually verify against the real toolbar's actual width/aspect ratio -- the prototype's known corner-speed trade-off may need a tuned ring thickness or rotation speed at real proportions.
- [ ] 6. Validate the full chain with flow validate, lint, and a manual pass confirming existing loading text is unchanged.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`
- `item_789_wire_the_loading_ring_into_the_real_viewer_screens`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`. Proof deferred to slice closeout.
- request-AC2 -> `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`. Proof deferred to slice closeout.
- request-AC3 -> `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`. Proof deferred to slice closeout.
- request-AC4 -> `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`. Proof deferred to slice closeout.
- request-AC5 -> `item_789_wire_the_loading_ring_into_the_real_viewer_screens`. Proof deferred to slice closeout.
- request-AC6 -> `item_789_wire_the_loading_ring_into_the_real_viewer_screens`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_360_loading_border_trace_an_animated_ring_on_the_header_while_a_screen_loads`
- Product brief(s): `prod_094_loading_border_trace`
- Architecture decision(s): (none yet)
