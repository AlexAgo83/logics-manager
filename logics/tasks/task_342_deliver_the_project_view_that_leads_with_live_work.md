## task_342_deliver_the_project_view_that_leads_with_live_work - Deliver the project view that leads with live work
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 30%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Settle the payload question, take a campaign baseline, then board structure, card face, selection, panel, and the activity chronology -- checking each against the mockup in `logics/external/mockup/`.
- Keywords: project view redesign, delivery order, campaign baseline, board structure, card face, selection, details panel, activity chronology
- Use when: Implementing any part of the project-view redesign.
- Skip when: Working on the fleet home, which is task_341.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Settle the payload question first: whether activity events carry their operation and chain, and whether a lifeline has per-beat dates. Two items are designed on the answer, and the rest of the request does not depend on it.
- [ ] 2. Extend the campaign next and record what it reports about today's four surfaces; that baseline is what proves the later items changed anything.
- [ ] 3. Then the board's structure -- flow versus library, and live work first -- since both decide the surface everything else is drawn inside.
- [ ] 4. Then the card face, then selection, then the panel, checking each against `logics/external/mockup/board_activity_redesign.html`. Selection must land after the card face and before the panel: it is the seam between them.
- [ ] 5. Then the activity chronology, and the chain thread only if the first item found the data to support it.
- [ ] 6. Rebuild the shared sources and confirm the standalone viewer and the extension host before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines`
- `item_717_split_the_board_into_a_flow_queue_and_a_companion_library`
- `item_718_open_the_board_on_the_work_that_is_live`
- `item_719_reallocate_the_card_face_to_the_facts_that_vary`
- `item_720_make_selecting_a_card_one_mechanism`
- `item_721_lead_the_details_panel_with_what_the_document_says`
- `item_722_give_a_document_a_lifeline_in_the_details_panel`
- `item_723_draw_the_activity_feed_as_a_chronology`
- `item_724_tell_one_chain_s_story_in_the_activity_feed`
- `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC9 -> `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines`. Proof deferred to slice closeout.
- request-AC12 -> `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines`. Proof deferred to slice closeout.
- request-AC1 -> `item_717_split_the_board_into_a_flow_queue_and_a_companion_library`. Proof deferred to slice closeout.
- request-AC2 -> `item_718_open_the_board_on_the_work_that_is_live`. Proof deferred to slice closeout.
- request-AC3 -> `item_718_open_the_board_on_the_work_that_is_live`. Proof deferred to slice closeout.
- request-AC4 -> `item_719_reallocate_the_card_face_to_the_facts_that_vary`. Proof deferred to slice closeout.
- request-AC5 -> `item_719_reallocate_the_card_face_to_the_facts_that_vary`. Proof deferred to slice closeout.
- request-AC6 -> `item_719_reallocate_the_card_face_to_the_facts_that_vary`. Proof deferred to slice closeout.
- request-AC7 -> `item_720_make_selecting_a_card_one_mechanism`. Proof deferred to slice closeout.
- request-AC8 -> `item_721_lead_the_details_panel_with_what_the_document_says`. Proof deferred to slice closeout.
- request-AC10 -> `item_721_lead_the_details_panel_with_what_the_document_says`. Proof deferred to slice closeout.
- request-AC9 -> `item_722_give_a_document_a_lifeline_in_the_details_panel`. Proof deferred to slice closeout.
- request-AC11 -> `item_723_draw_the_activity_feed_as_a_chronology`. Proof deferred to slice closeout.
- request-AC13 -> `item_723_draw_the_activity_feed_as_a_chronology`. Proof deferred to slice closeout.
- request-AC12 -> `item_724_tell_one_chain_s_story_in_the_activity_feed`. Proof deferred to slice closeout.
- request-AC14 -> `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign`. Proof deferred to slice closeout.
- request-AC15 -> `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
