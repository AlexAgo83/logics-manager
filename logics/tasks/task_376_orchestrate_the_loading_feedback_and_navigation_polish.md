## task_376_orchestrate_the_loading_feedback_and_navigation_polish - Orchestrate the loading feedback and navigation polish
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
- [ ] 1. Build the shared pieces first: the threshold and the loading colour are read by every affordance here, and building them per affordance is how three of them come to disagree.
- [ ] 2. Add the status-line spinner and the header sheen, which is the case with no signal at all today.
- [ ] 3. Change the ring to one lap and a resting outline.
- [ ] 4. Give roadmap and runbook their accents, and collapse the duplicated stage list if the two surfaces can read one.
- [ ] 5. Replace the phone header's button grid with one menu button.
- [ ] 6. Verify each animation against `prefers-reduced-motion: reduce` by emulating it, not by reading the rule.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_809_show_a_load_that_has_no_screen_to_draw_on`
- `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`
- `item_811_give_every_stage_with_a_colour_token_its_accent`
- `item_812_one_menu_button_on_the_phone_header`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_809_show_a_load_that_has_no_screen_to_draw_on`. Proof deferred to slice closeout.
- request-AC6 -> `item_809_show_a_load_that_has_no_screen_to_draw_on`. Proof deferred to slice closeout.
- request-AC2 -> `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`. Proof deferred to slice closeout.
- request-AC3 -> `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`. Proof deferred to slice closeout.
- request-AC6 -> `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`. Proof deferred to slice closeout.
- request-AC4 -> `item_811_give_every_stage_with_a_colour_token_its_accent`. Proof deferred to slice closeout.
- request-AC5 -> `item_812_one_menu_button_on_the_phone_header`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_365_say_the_viewer_is_working_wherever_the_operator_is_looking`
- Product brief(s): `prod_096_a_viewer_that_says_what_it_is_doing`
- Architecture decision(s): (none yet)
