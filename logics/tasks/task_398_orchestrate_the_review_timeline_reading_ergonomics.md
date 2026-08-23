## task_398_orchestrate_the_review_timeline_reading_ergonomics - Orchestrate the Review timeline reading ergonomics
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 94%
> Confidence: 90%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Sequences the rail rebuild, the file rows and the shared split-pane factoring.
- Keywords: orchestrate, review, timeline, reading, ergonomics
- Use when: starting or sequencing req_386.
- Skip when: reopening the closed req_381, req_383, req_384 or req_385.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Slice A first, because it changes the payload: carry author and timestamp separately, then rebuild the rail as an anchored row with dense tiles, reversed order, ghost tiles and the centred initial scroll.
- [ ] 2. Slice A: record in `req_381` that its AC2 is superseded by this request's AC6, so the ordering is not restored later as a correction.
- [ ] 3. Slice B: rebuild the file row as name-first with the directory beneath, and pin the kind and count badges to the row's corners with the space reserved for them.
- [ ] 4. Slice C last: factor the list-and-detail rules into one definition, put Review's list and diff pane on it, and move the Explorer onto the same definition.
- [ ] 5. Closeout: regenerate the bundle, then run and record `npm run check:viewer-host`, the targeted vitest and pytest checks, `npm run test:viewer-smoke`, `npm run lint` and `logics-manager lint --require-status`. Close each criterion with a proof naming what exercised it; a shared paragraph repeated across criteria is not a proof.
- [ ] 6. Run the campaign against a viewer started from this repository. A `logics-manager view` left running from an installed package serves its own assets, and `npm run view` reuses it silently -- the run then judges a build that does not contain the change.
- [ ] 7. ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] 8. Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] 9. GATE: do not close until lint, audit, and scaffold validation pass.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`
- `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`
- `item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC2 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC3 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC4 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC5 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC6 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC7 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC8 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC9 -> `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`. Proof deferred to slice closeout.
- request-AC10 -> `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`. Proof deferred to slice closeout.
- request-AC11 -> `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`. Proof deferred to slice closeout.
- request-AC12 -> `item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it`. Proof deferred to slice closeout.
- request-AC13 -> `item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it`. Proof deferred to slice closeout.
- request-AC14 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC14 -> `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`. Proof deferred to slice closeout.
- request-AC14 -> `item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it`. Proof deferred to slice closeout.
- request-AC15 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC15 -> `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`. Proof deferred to slice closeout.
- request-AC15 -> `item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it`. Proof deferred to slice closeout.
- request-AC16 -> `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`. Proof deferred to slice closeout.
- request-AC16 -> `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`. Proof deferred to slice closeout.
- request-AC16 -> `item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_386_make_the_review_timeline_readable_an_anchored_rail_denser_tiles_and_the_shared_split_pane`
- Product brief(s): `prod_115_a_review_timeline_that_reads_like_a_timeline`
- Architecture decision(s): (none yet)
