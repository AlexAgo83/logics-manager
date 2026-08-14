## task_351_deliver_the_superseded_render_guard - Deliver the superseded-render guard
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 11:29:19

# AI Context
- Summary: Establish why the existing guard misses this path, then fix and prove it by removing the guard, then take the campaign's workaround out -- which is also the proof the product no longer needs it.
- Keywords: guard root cause, superseded render fix, workaround removal, reuse investigation
- Use when: Implementing the superseded-render guard.
- Skip when: The screen redesigns and their own tasks.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Establish why the existing guard misses this path first: extending something that is already there beats adding a second mechanism beside it.
- [x] 2. Then the fix and its regression, verified by removing the guard rather than assumed.
- [x] 3. Then take the campaign's workaround out, which is also the proof that the product no longer needs it.
- [x] 4. The reuse observation is independent and can be investigated at any point; close it as not-reproducible if that is the answer.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_774_establish_why_the_pending_view_guard_does_not_cover_a_late_screen_render`
- `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`
- `item_776_take_the_workaround_back_out_of_the_campaign`
- `item_777_find_out_whether_a_relaunch_can_reuse_a_server_that_is_gone`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC2 -> `item_774_establish_why_the_pending_view_guard_does_not_cover_a_late_screen_render`. Proof: established and recorded in `item_774`: the guard is not broken, it was never asked. `isViewStale` needs a view token and those three screens never took one. The fleet home carried a second version of the same mistake -- `options.renderFleetHome || isFleetHomeOpen()`, where the flag was captured before the await and short-circuited the correct test. The fix extends the existing mechanism rather than adding one beside it.
- request-AC1 -> `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`. Proof: the three screens that fetched without a view token -- `showFleetHome`, `showSettings`, `showChatgptMcp` -- now take one and check it before committing, so a superseded render is dropped. Covered by a regression that holds Settings' fetch open, moves the operator to Getting Started, then releases it.
- request-AC3 -> `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`. Proof: all three tokenless screens were found by auditing every `async function show*` for `beginView`, not by fixing the one the defect surfaced on. `showCorpusInsights` and `showHealth` already took tokens and were left alone.
- request-AC6 -> `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`. Proof: the regression drives Settings rather than the fleet home, and the item says why: the fleet home's late render does not reproduce under jsdom, so a test written against it asserts an outcome that is also true when nothing happens -- I wrote that version first and watched it pass against the original code. The Settings version fails when its guard is removed, and asserts the screen really was mid-flight so a change that stops the fetch cannot make it pass by accident.
- request-AC4 -> `item_776_take_the_workaround_back_out_of_the_campaign`. Proof: the settle-and-reopen is out of `visitScreen`, which now fails and names the screen it was showing instead of opening it again. Five consecutive full campaign runs at three viewports after the removal: 322 checks each, no findings, where the same run failed roughly one time in three before.
- request-AC5 -> `item_777_find_out_whether_a_relaunch_can_reuse_a_server_that_is_gone`. Proof: answered in `item_777` and recorded as not reproducible: driven directly against a controlled registry, a dead port is never reused however old or fresh its entry. The observed connection-refused followed a kill between the probe and the browser navigating -- which is what this session was doing repeatedly -- not a stale entry. One cost recorded rather than fixed: a relaunch within two seconds of a dead recent claim waits the full 1.9s startup grace.

# Validation
- `npx vitest run`: 889 passed. The late-render regression was proven load-bearing by removing the guard and watching Settings come back over Getting Started.
- Viewer UI campaign, five consecutive full runs at 1440x900, 820x1180 and 390x844 after the harness workaround was removed: 322 checks each, no findings.
- `item_777` answered by driving `claim_or_reuse` against a controlled registry through the override the module already provides.
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_774_establish_why_the_pending_view_guard_does_not_cover_a_late_screen_render`, `item_775_drop_a_screen_s_late_render_when_the_operator_has_moved_on`, `item_776_take_the_workaround_back_out_of_the_campaign`, `item_777_find_out_whether_a_relaunch_can_reuse_a_server_that_is_gone`
- Related request(s): `req_354_stop_a_slow_screen_from_rendering_over_the_one_the_operator_moved_to`

# Links
- Request: `req_354_stop_a_slow_screen_from_rendering_over_the_one_the_operator_moved_to`
- Product brief(s): `prod_090_a_viewer_that_knows_which_screen_you_are_on`
- Architecture decision(s): (none yet)
