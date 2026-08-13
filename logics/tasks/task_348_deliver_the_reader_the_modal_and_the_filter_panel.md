## task_348_deliver_the_reader_the_modal_and_the_filter_panel - Deliver the reader, the modal and the filter panel
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
- Summary: Settle document identity with the details panel's request first, baseline the campaign, then the reader, then the filter panel, then the modal -- last, so its three small changes do not acquire others.
- Keywords: document identity, campaign baseline, reader, filter panel, new request modal, delivery order
- Use when: Implementing the reader, modal or filter panel work.
- Skip when: The Terminals tab, and the other viewer tasks (task_341 to task_347).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Settle the document-identity question first, with the details panel's request, since both screens need one answer and the reader is where that panel's primary action lands.
- [ ] 2. Extend the campaign next and record the baseline for all three surfaces.
- [ ] 3. Then the reader, which is the largest of the three and the one an operator reaches most.
- [ ] 4. Then the filter panel, then the modal -- the modal last because it is three small changes and must not acquire others.
- [ ] 5. Check each against `logics/external/mockup/reader_modal_filters_redesign.html`, and inherit the panel framing rather than re-deciding it.
- [ ] 6. Rebuild the browser host and confirm both surfaces before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_761_stop_the_reader_leading_with_a_path_in_capitals`
- `item_762_make_the_reader_a_place_to_read`
- `item_763_finish_the_new_request_modal_without_redesigning_it`
- `item_764_make_each_filter_say_what_it_would_narrow`
- `item_765_make_the_panel_and_the_board_agree_on_what_is_shown`
- `item_766_cover_the_reader_the_modal_and_the_filter_panel`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_761_stop_the_reader_leading_with_a_path_in_capitals`. Proof deferred to slice closeout.
- request-AC5 -> `item_761_stop_the_reader_leading_with_a_path_in_capitals`. Proof deferred to slice closeout.
- request-AC2 -> `item_762_make_the_reader_a_place_to_read`. Proof deferred to slice closeout.
- request-AC3 -> `item_762_make_the_reader_a_place_to_read`. Proof deferred to slice closeout.
- request-AC4 -> `item_762_make_the_reader_a_place_to_read`. Proof deferred to slice closeout.
- request-AC6 -> `item_763_finish_the_new_request_modal_without_redesigning_it`. Proof deferred to slice closeout.
- request-AC7 -> `item_763_finish_the_new_request_modal_without_redesigning_it`. Proof deferred to slice closeout.
- request-AC8 -> `item_763_finish_the_new_request_modal_without_redesigning_it`. Proof deferred to slice closeout.
- request-AC9 -> `item_763_finish_the_new_request_modal_without_redesigning_it`. Proof deferred to slice closeout.
- request-AC10 -> `item_764_make_each_filter_say_what_it_would_narrow`. Proof deferred to slice closeout.
- request-AC12 -> `item_764_make_each_filter_say_what_it_would_narrow`. Proof deferred to slice closeout.
- request-AC13 -> `item_764_make_each_filter_say_what_it_would_narrow`. Proof deferred to slice closeout.
- request-AC11 -> `item_765_make_the_panel_and_the_board_agree_on_what_is_shown`. Proof deferred to slice closeout.
- request-AC14 -> `item_766_cover_the_reader_the_modal_and_the_filter_panel`. Proof deferred to slice closeout.
- request-AC15 -> `item_766_cover_the_reader_the_modal_and_the_filter_panel`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_351_make_the_reader_readable_and_the_filter_panel_say_something`
- Product brief(s): `prod_087_surfaces_that_read_like_they_were_finished`
- Architecture decision(s): (none yet)
