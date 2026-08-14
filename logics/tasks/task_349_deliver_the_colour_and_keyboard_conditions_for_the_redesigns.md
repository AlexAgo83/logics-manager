## task_349_deliver_the_colour_and_keyboard_conditions_for_the_redesigns - Deliver the colour and keyboard conditions for the redesigns
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:01

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
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_767_give_every_colour_carried_state_a_second_channel`. Proof: The accent's style and width carry state alongside hue, per the decision recorded in `item_767`. Where a component already had a second channel it keeps it -- the CI job list distinguishes its five states by glyph -- because the check tests for *a* second channel, not for one particular one.
- request-AC2 -> `item_767_give_every_colour_carried_state_a_second_channel`. Proof: Nothing per-row was added. The channel is the accent bar the rows already draw, which costs no horizontal space -- explicitly chosen over a glyph per row, which was the noise the card redesign removed.
- request-AC3 -> `item_768_make_the_new_controls_reachable_without_a_mouse`. Proof: Audited rather than assumed: every `[data-action]`, `[role=button]`, `[role=tab]`, `[data-viewer-nav-target]`, `summary` and `[data-viewer-filter-group]` in `clients/viewer/index.html` -- 34 controls, 0 unreachable. The controls the redesigns render at runtime are buttons and anchors by construction. Campaign run: every surface reports its keyboard-reachable count, 0 failures.
- request-AC4 -> `item_768_make_the_new_controls_reachable_without_a_mouse`. Proof: `createThemedModal` records `document.activeElement` before taking focus and `closeThemedModal` hands it back; Tab is confined to the modal while open. A single `:focus-visible` rule at the root of `viewer.css` replaces the twenty per-control rules, so the control added tomorrow has a ring.
- request-AC5 -> `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`. Proof: `no state is carried by colour alone` in `tests/helpers/viewer-layout-checks.mjs`, run against every screen and surface. It found two things on its first live run: a false positive it was corrected for, and an element being compared against itself.
- request-AC6 -> `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`. Proof: `every control can be reached from the keyboard`, which catches both a `div` with no tab stop and a real button opted out of the tab order by hand -- the subtler one, since it looks correct in the markup.
- request-AC7 -> `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`. Proof: Recorded in `item_767`'s decision table, which names the shape vocabulary the other chains draw against, and in `item_769`'s delivery notes, which state how a component opts in.

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_767_give_every_colour_carried_state_a_second_channel`, `item_768_make_the_new_controls_reachable_without_a_mouse`, `item_769_let_the_campaign_fail_on_colour_only_state_and_unreachable_controls`
- Related request(s): `req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse`

# Links
- Request: `req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse`
- Product brief(s): `prod_088_a_viewer_that_does_not_require_perfect_eyes_or_a_mouse`
- Architecture decision(s): (none yet)
