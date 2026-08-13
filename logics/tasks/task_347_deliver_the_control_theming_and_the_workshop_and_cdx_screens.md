## task_347_deliver_the_control_theming_and_the_workshop_and_cdx_screens - Deliver the control theming and the Workshop and CDX screens
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 17%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Ship the colour-scheme declaration first and alone, verify it against Terminals immediately, baseline the campaign, then Commands, Runbooks, Explorer, then CDX missions and the propagation of the status shape.
- Keywords: delivery order, colour scheme first, terminals verification, campaign baseline, workshop tabs, cdx shape propagation
- Use when: Implementing the control theming or the Workshop and CDX screen work.
- Skip when: The Workshop Terminals tab, and the other viewer tasks (task_341 to task_346).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Do the colour-scheme declaration first and alone: it is a few lines, it improves every screen including unreviewed ones, and it should not wait behind any redesign.
- [ ] 2. Verify it against the Terminals tab immediately, because this request is not allowed to change that screen and the theming reaches it.
- [ ] 3. Extend the campaign next, with the wait-and-prove behaviour, and record the baseline.
- [ ] 4. Then Commands, then Runbooks, then Explorer -- each self-contained.
- [ ] 5. Then CDX missions, and only then propagate the status screen's shape to the other CDX screens.
- [ ] 6. Check each against `logics/external/mockup/workshop_cdx_redesign.html`, and inherit the panel framing rather than re-deciding it.
- [ ] 7. Rebuild the browser host and confirm both surfaces before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`
- `item_756_make_the_command_list_readable_at_the_size_it_actually_is`
- `item_757_make_the_runbooks_screen_do_what_its_tab_claims`
- `item_758_open_the_explorer_on_something_worth_reading`
- `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`
- `item_760_cover_the_reviewed_workshop_and_cdx_screens`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`. Proof deferred to slice closeout.
- request-AC2 -> `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`. Proof deferred to slice closeout.
- request-AC3 -> `item_755_give_the_viewer_s_native_controls_the_interface_s_own_colour_scheme`. Proof deferred to slice closeout.
- request-AC4 -> `item_756_make_the_command_list_readable_at_the_size_it_actually_is`. Proof deferred to slice closeout.
- request-AC5 -> `item_756_make_the_command_list_readable_at_the_size_it_actually_is`. Proof deferred to slice closeout.
- request-AC6 -> `item_757_make_the_runbooks_screen_do_what_its_tab_claims`. Proof deferred to slice closeout.
- request-AC7 -> `item_757_make_the_runbooks_screen_do_what_its_tab_claims`. Proof deferred to slice closeout.
- request-AC8 -> `item_758_open_the_explorer_on_something_worth_reading`. Proof deferred to slice closeout.
- request-AC9 -> `item_758_open_the_explorer_on_something_worth_reading`. Proof deferred to slice closeout.
- request-AC10 -> `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`. Proof deferred to slice closeout.
- request-AC11 -> `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`. Proof deferred to slice closeout.
- request-AC12 -> `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`. Proof deferred to slice closeout.
- request-AC13 -> `item_759_bring_the_cdx_screens_onto_the_shape_status_already_proves`. Proof deferred to slice closeout.
- request-AC14 -> `item_760_cover_the_reviewed_workshop_and_cdx_screens`. Proof deferred to slice closeout.
- request-AC15 -> `item_760_cover_the_reviewed_workshop_and_cdx_screens`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`
- Product brief(s): `prod_086_a_viewer_that_looks_like_one_product`
- Architecture decision(s): (none yet)
