## task_351_deliver_the_superseded_render_guard - Deliver the superseded-render guard
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Establish why the existing guard misses this path, then fix and prove it by removing the guard, then take the campaign's workaround out -- which is also the proof the product no longer needs it.
- Keywords: guard root cause, superseded render fix, workaround removal, reuse investigation
- Use when: Implementing the superseded-render guard.
- Skip when: The screen redesigns and their own tasks.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Establish why the existing guard misses this path first: extending something that is already there beats adding a second mechanism beside it.
- [ ] 2. Then the fix and its regression, verified by removing the guard rather than assumed.
- [ ] 3. Then take the campaign's workaround out, which is also the proof that the product no longer needs it.
- [ ] 4. The reuse observation is independent and can be investigated at any point; close it as not-reproducible if that is the answer.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_774_establish_why_the_pending_view_guard_does_not_cover_a_late_screen_render`
- `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`
- `item_776_take_the_workaround_back_out_of_the_campaign`
- `item_777_find_out_whether_a_relaunch_can_reuse_a_server_that_is_gone`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC2 -> `item_774_establish_why_the_pending_view_guard_does_not_cover_a_late_screen_render`. Proof deferred to slice closeout.
- request-AC1 -> `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`. Proof deferred to slice closeout.
- request-AC3 -> `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`. Proof deferred to slice closeout.
- request-AC6 -> `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`. Proof deferred to slice closeout.
- request-AC4 -> `item_776_take_the_workaround_back_out_of_the_campaign`. Proof deferred to slice closeout.
- request-AC5 -> `item_777_find_out_whether_a_relaunch_can_reuse_a_server_that_is_gone`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_354_stop_a_slow_screen_from_rendering_over_the_one_the_operator_moved_to`
- Product brief(s): `prod_090_a_viewer_that_knows_which_screen_you_are_on`
- Architecture decision(s): (none yet)
