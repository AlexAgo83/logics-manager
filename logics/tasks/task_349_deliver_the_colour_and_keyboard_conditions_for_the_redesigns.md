## task_349_deliver_the_colour_and_keyboard_conditions_for_the_redesigns - Deliver the colour and keyboard conditions for the redesigns
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
- Summary: Decide the second channel first as a decision the other chains inherit, add the two campaign checks before the redesigns start satisfying them, then the keyboard and focus work as chains land.
- Keywords: second channel decision, campaign checks first, keyboard focus, no screens of its own, cross-chain verification
- Use when: Implementing the colour and keyboard conditions for the viewer redesigns.
- Skip when: The other viewer tasks' own screens, and the Terminals tab.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Decide the second channel first and record it as a decision the other chains inherit, since eight of them will draw against it.
- [ ] 2. Add the two campaign checks next, so the condition is enforceable before the redesigns start satisfying it rather than after.
- [ ] 3. Then the keyboard and focus work, against whatever controls have landed by then, and again as the remaining chains land.
- [ ] 4. This request owns no screen: verify it by running the campaign against the chains that do.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_767_give_every_colour_carried_state_a_second_channel`
- `item_768_make_the_new_controls_reachable_without_a_mouse`
- `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_767_give_every_colour_carried_state_a_second_channel`. Proof deferred to slice closeout.
- request-AC2 -> `item_767_give_every_colour_carried_state_a_second_channel`. Proof deferred to slice closeout.
- request-AC3 -> `item_768_make_the_new_controls_reachable_without_a_mouse`. Proof deferred to slice closeout.
- request-AC4 -> `item_768_make_the_new_controls_reachable_without_a_mouse`. Proof deferred to slice closeout.
- request-AC5 -> `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`. Proof deferred to slice closeout.
- request-AC6 -> `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`. Proof deferred to slice closeout.
- request-AC7 -> `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse`
- Product brief(s): `prod_088_a_viewer_that_does_not_require_perfect_eyes_or_a_mouse`
- Architecture decision(s): (none yet)
