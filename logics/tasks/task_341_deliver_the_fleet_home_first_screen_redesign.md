## task_341_deliver_the_fleet_home_first_screen_redesign - Deliver the fleet home first-screen redesign
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Extend the campaign to the fleet home first to get a baseline, then reframe it as the root view, then redraw the rows, filtering and states against the mockup in `logics/external/mockup/`.
- Keywords: fleet home redesign, root view, row layout, filter and sort, degraded states, campaign baseline, browser host rebuild
- Use when: Implementing any part of the fleet home first-screen redesign.
- Skip when: Working on the demo project's visibility, which is task_340.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Extend the campaign to the fleet home first, and record what it reports about today's screen -- that baseline is what proves the later items changed anything.
- [ ] 2. Do the root-view framing next: it decides the container everything else is drawn inside, and the row work would have to be redone if it landed after.
- [ ] 3. Then the row redraw, then filtering and the states, checking each against the mockup in `logics/external/mockup/`.
- [ ] 4. Rebuild the browser host and confirm both surfaces, standalone and extension host, before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_711_present_the_fleet_home_as_the_root_view_in_fleet_mode`
- `item_712_redraw_the_fleet_list_as_rows_with_state_carried_by_form`
- `item_713_keep_the_fleet_home_usable_past_a_dozen_projects`
- `item_714_give_the_fleet_home_s_empty_and_degraded_states_something_to_say`
- `item_715_bring_the_fleet_home_inside_the_viewer_ui_campaign`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_711_present_the_fleet_home_as_the_root_view_in_fleet_mode`. Proof deferred to slice closeout.
- request-AC2 -> `item_711_present_the_fleet_home_as_the_root_view_in_fleet_mode`. Proof deferred to slice closeout.
- request-AC10 -> `item_711_present_the_fleet_home_as_the_root_view_in_fleet_mode`. Proof deferred to slice closeout.
- request-AC3 -> `item_712_redraw_the_fleet_list_as_rows_with_state_carried_by_form`. Proof deferred to slice closeout.
- request-AC4 -> `item_712_redraw_the_fleet_list_as_rows_with_state_carried_by_form`. Proof deferred to slice closeout.
- request-AC5 -> `item_712_redraw_the_fleet_list_as_rows_with_state_carried_by_form`. Proof deferred to slice closeout.
- request-AC6 -> `item_713_keep_the_fleet_home_usable_past_a_dozen_projects`. Proof deferred to slice closeout.
- request-AC7 -> `item_714_give_the_fleet_home_s_empty_and_degraded_states_something_to_say`. Proof deferred to slice closeout.
- request-AC8 -> `item_715_bring_the_fleet_home_inside_the_viewer_ui_campaign`. Proof deferred to slice closeout.
- request-AC9 -> `item_715_bring_the_fleet_home_inside_the_viewer_ui_campaign`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_344_make_the_fleet_home_read_as_the_product_s_first_screen`
- Product brief(s): `prod_080_a_fleet_home_an_operator_can_triage_from`
- Architecture decision(s): (none yet)
