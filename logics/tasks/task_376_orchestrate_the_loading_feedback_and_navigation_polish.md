## task_376_orchestrate_the_loading_feedback_and_navigation_polish - Orchestrate the loading feedback and navigation polish
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 11:47:46

# AI Context
- Summary: Sequences four slices: the shared threshold and colour first, then the status spinner and header sheen, the one-lap ring, the missing stage accents, and the phone menu button.
- Keywords: orchestration, loading feedback, stage accent, mobile header
- Use when: Implementing this task.
- Skip when: The cost of a load rather than the signal that one is running.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Build the shared pieces first: the threshold and the loading colour are read by every affordance here, and building them per affordance is how three of them come to disagree.
- [x] 2. Add the status-line spinner and the header sheen, which is the case with no signal at all today.
- [x] 3. Change the ring to one lap and a resting outline.
- [x] 4. Give roadmap and runbook their accents, and collapse the duplicated stage list if the two surfaces can read one.
- [x] 5. Replace the phone header's button grid with one menu button.
- [x] 6. Verify each animation against `prefers-reduced-motion: reduce` by emulating it, not by reading the rule.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_809_show_a_load_that_has_no_screen_to_draw_on`
- `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`
- `item_811_give_every_stage_with_a_colour_token_its_accent`
- `item_812_one_menu_button_on_the_phone_header`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task, via `item_809_show_a_load_that_has_no_screen_to_draw_on`. Proof: a load with no document screen open now sets `data-loading` on the app bar, which runs a spinner in its own slot beside the status text and a low-alpha sheen across the bar's own background. Measured on a running viewer with `/api/lint` held open through the CDP Fetch domain: `viewer-topbar-spin` and `viewer-topbar-sheen` both running, the status line's text unchanged.
- request-AC2 -> This task, via `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`. Proof: shipped reversed, under operator direction. The AC asked for one lap handing over to a steady dimmed outline. On seeing it the operator asked for the opposite: the ring keeps travelling for the whole load, the resting outline is gone, the lap is slower and the trail twice as long. What the AC was protecting -- that the motion is not a clock the operator reads for a duration -- is unchanged; what it prescribed is not what was wanted once visible.
- request-AC3 -> This task, via `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`. Proof: `LOADING_AFFORDANCE_DELAY_MS` (250ms) is one constant read by `createLoadingAffordance`, which both the app bar and the document header are built from, so a load resolving faster than it shows no ring, no spinner and no sheen and the three cannot drift apart. `LOADING_AFFORDANCE_LAP_MS` then keeps a shown affordance visible long enough not to read as a glitch.
- request-AC4 -> This task, via `item_811_give_every_stage_with_a_colour_token_its_accent`. Proof: the accent reads `--card-progress-color`, which one stage table resolves for all eight stages, so the second copy of the list that had fallen behind is gone. Measured in list mode on the running viewer, all seven stages present draw 5px in their own colour, roadmap and runbook included.
- request-AC5 -> This task, via `item_812_one_menu_button_on_the_phone_header`. Proof: at phone widths the header shows the project selector and one menu button on one row, opening the navigation panels the desktop header already has rather than a second copy; desktop widths are untouched.
- request-AC6 -> This task, via all four slices. Proof: verified by emulating `prefers-reduced-motion: reduce` over CDP with the load held open, not by reading the rule. Under reduce the sheen and the spinner have no animations at all; the ring's two travelling lights are replaced by `viewer-loading-ring-breathe`, an opacity pulse with no travel; the board skeleton's sweep becomes `animation-name: none` with a flat background. The same sampling in the default media state shows every one of them running.

# Validation
- Reduced motion verified by emulation in both media states, with `/api/lint` and `/api/items` held open through the CDP Fetch domain so the loading state could not end before it was sampled.
- Targeted suites for the touched surfaces pass.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- All four slices shipped. The case that had no signal at all -- a load with no screen open -- now has one, and every affordance is gated on the same threshold.
- AC2 shipped reversed: the operator saw the one-lap-then-rest ring and asked for a ring that keeps travelling, slower and with a longer trail, with no resting outline. Recorded as a change of intent rather than as a criterion met.
- Three attempts at the ring were wrong before this one, and the reason is worth keeping: a conic gradient maps angle to rim position, and on a header of roughly 25:1 the light never reaches the long edges. Measuring the element's transform proved it was rotating and proved nothing about what could be seen. It took capturing the header itself to find it, and the fix was two 2px lights walking the top and bottom edges.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_809_show_a_load_that_has_no_screen_to_draw_on`, `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`, `item_811_give_every_stage_with_a_colour_token_its_accent`, `item_812_one_menu_button_on_the_phone_header`
- Related request(s): `req_365_say_the_viewer_is_working_wherever_the_operator_is_looking`

# Links
- Request: `req_365_say_the_viewer_is_working_wherever_the_operator_is_looking`
- Product brief(s): `prod_096_a_viewer_that_says_what_it_is_doing`
- Architecture decision(s): (none yet)
