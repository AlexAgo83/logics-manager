## task_343_deliver_the_fleet_root_recovery_visible_failures_and_an_honest_fleet_flag - Deliver the fleet root recovery, visible failures and an honest fleet flag
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
- Summary: Settle what `--fleet` means first, then the picker recovery, then make failed actions visible, then the path validation -- verifying each test fails when its defect is reintroduced.
- Keywords: fleet flag decision, picker recovery, visible failures, path validation, codeql 54, browser host rebuild
- Use when: Implementing any part of the fleet root and viewer-failure work.
- Skip when: Working on the fleet home design (task_341) or the project view (task_342).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Take the fleet flag decision first: it is the only open product question here, and both the menu entry and the landing view wait on it.
- [ ] 2. Then the picker recovery, since it is small, it unblocks the operator, and it is the defect that was actually reported.
- [ ] 3. Then the visible-failure work, which is the widest of the four: every primary action fails through that path.
- [ ] 4. Then the path validation, and confirm the alert closes as fixed rather than dismissed.
- [ ] 5. Add each test beside the change it covers, and verify each fails when its defect is reintroduced rather than assuming it would.
- [ ] 6. Rebuild the browser host and confirm both surfaces before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_726_let_the_fleet_root_picker_recover_the_way_the_project_picker_already_does`
- `item_727_put_a_failed_viewer_action_where_the_operator_will_see_it`
- `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`
- `item_729_validate_the_fleet_root_path_the_way_its_sibling_handler_already_does`
- `item_730_cover_the_three_failure_paths_this_request_found`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_726_let_the_fleet_root_picker_recover_the_way_the_project_picker_already_does`. Proof deferred to slice closeout.
- request-AC2 -> `item_726_let_the_fleet_root_picker_recover_the_way_the_project_picker_already_does`. Proof deferred to slice closeout.
- request-AC3 -> `item_727_put_a_failed_viewer_action_where_the_operator_will_see_it`. Proof deferred to slice closeout.
- request-AC4 -> `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`. Proof deferred to slice closeout.
- request-AC5 -> `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`. Proof deferred to slice closeout.
- request-AC6 -> `item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer`. Proof deferred to slice closeout.
- request-AC7 -> `item_729_validate_the_fleet_root_path_the_way_its_sibling_handler_already_does`. Proof deferred to slice closeout.
- request-AC8 -> `item_729_validate_the_fleet_root_path_the_way_its_sibling_handler_already_does`. Proof deferred to slice closeout.
- request-AC8 -> `item_730_cover_the_three_failure_paths_this_request_found`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing`
- Product brief(s): `prod_082_a_viewer_that_recovers_and_says_what_happened`
- Architecture decision(s): (none yet)
