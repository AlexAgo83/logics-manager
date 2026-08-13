## task_343_deliver_the_fleet_root_recovery_visible_failures_and_an_honest_fleet_flag - Deliver the fleet root recovery, visible failures and an honest fleet flag
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-13 23:20:08

# AI Context
- Summary: Settle what `--fleet` means first, then the picker recovery, then make failed actions visible, then the path validation -- verifying each test fails when its defect is reintroduced.
- Keywords: fleet flag decision, picker recovery, visible failures, path validation, codeql 54, browser host rebuild
- Use when: Implementing any part of the fleet root and viewer-failure work.
- Skip when: Working on the fleet home design (task_341) or the project view (task_342).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Take the fleet flag decision first: it is the only open product question here, and both the menu entry and the landing view wait on it.
- [x] 2. Then the picker recovery, since it is small, it unblocks the operator, and it is the defect that was actually reported.
- [x] 3. Then the visible-failure work, which is the widest of the four: every primary action fails through that path.
- [x] 4. Then the path validation, and confirm the alert closes as fixed rather than dismissed.
- [x] 5. Add each test beside the change it covers, and verify each fails when its defect is reintroduced rather than assuming it would.
- [x] 6. Rebuild the browser host and confirm both surfaces before closeout.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_726_let_the_fleet_root_picker_recover_the_way_the_project_picker_already_does`
- `item_727_put_a_failed_viewer_action_where_the_operator_will_see_it`
- `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`
- `item_729_validate_the_fleet_root_path_the_way_its_sibling_handler_already_does`
- `item_730_cover_the_three_failure_paths_this_request_found`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_726_let_the_fleet_root_picker_recover_the_way_the_project_picker_already_does`. Proof: `falls back to the folder browser when the native fleet-root picker cannot run` drives the fleet-root control against a server that refuses and asserts the fallback modal opens carrying the server's own reason. Proven load-bearing by dropping the refusal on the floor again, which reproduces exactly what the operator reported: the button did nothing.
- request-AC2 -> `item_726_let_the_fleet_root_picker_recover_the_way_the_project_picker_already_does`. Proof: both pickers call `openFolderPickerModal`, which `openProjectPickerModal` and `openFleetRootPickerModal` are thin wrappers over, so the recovery exists once. A change to it cannot fix one and miss the other because there is nothing to miss.
- request-AC3 -> `item_727_put_a_failed_viewer_action_where_the_operator_will_see_it`. Proof: `shows a failed action's reason to the operator, and lets the next attempt supersede it` drives a refused connector POST and asserts the reason lands in a `role="alert"` banner, named with the action, and that a following attempt clears it. Failures used to go through `setMeta` into the subtitle that `scheduleNextAutoRefresh` rewrites on every tick. Proven by restoring `setMeta` and watching it fail.
- request-AC4 -> `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`. Proof: capability and landing intent are separate fields -- `fleet` and `launch_fleet_home` -- and `test_fleet_capability_and_launch_intent_are_separate` asserts the flag decides the landing view while every server stays fleet-capable, which is what `adr_028` scoped.
- request-AC5 -> `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`. Proof: the switcher offers fleet root management from any launch, which follows from every viewer being fleet-capable. The fleet home entry was added to the switcher in the same slice, after removing the flag's old landing behaviour left the fleet home with no route to it -- a consequence recorded in `item_728` rather than found later.
- request-AC6 -> `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`. Proof: `docs/cli.md` states that `--fleet` decides which screen the viewer opens on and not what the server can do, with a table of launch to landing screen, and notes that it also skips the bootstrap prompt.
- request-AC7 -> `item_729_validate_the_fleet_root_path_the_way_its_sibling_handler_already_does`. Proof: `_handle_select_fleet_root_path_post` takes the sibling project handler's containment shape -- normalize, resolve against the picker base, then `relative_to` to refuse an escape -- and `test_fleet_root_browser_fallback_adds_a_root_and_refuses_an_escape` covers both the accepted and the refused path. **Not verified here: whether CodeQL alert #54 shows as fixed.** That is a state on GitHub which this delivery cannot read; the code shape the alert asked for is in place and the alert should be confirmed on the next scan rather than assumed closed.
- request-AC8 -> `item_729_validate_the_fleet_root_path_the_way_its_sibling_handler_already_does`. Proof: the path validation is covered by `test_fleet_root_browser_fallback_adds_a_root_and_refuses_an_escape`, which asserts an escaping path is refused rather than silently normalized.
- request-AC8 -> `item_730_cover_the_three_failure_paths_this_request_found`. Proof: all three paths are covered by driving the screen rather than by reading the source. The failure-banner path previously had a test that sliced `withPrimaryAction` out of `index.js` and matched a regex against it -- a test asserting the implementation agrees with itself, which cannot notice that the operator sees nothing, and is how these defects shipped past an otherwise thorough suite.

# Validation
- `npx vitest run`: 877 passed across 82 files, including the two behaviour tests added here, each proven load-bearing by reintroducing the defect it covers.
- `npm run lint`: clean.
- The fleet root fallback and the failure banner were both driven through the real click paths an operator uses, not through the functions that implement them.
- Finish workflow executed on 2026-08-13.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-13.
- Linked backlog item(s): `item_726_let_the_fleet_root_picker_recover_the_way_the_project_picker_already_does`, `item_727_put_a_failed_viewer_action_where_the_operator_will_see_it`, `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`, `item_729_validate_the_fleet_root_path_the_way_its_sibling_handler_already_does`, `item_730_cover_the_three_failure_paths_this_request_found`
- Related request(s): `req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing`

# Links
- Request: `req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing`
- Product brief(s): `prod_082_a_viewer_that_recovers_and_says_what_happened`
- Architecture decision(s): (none yet)
