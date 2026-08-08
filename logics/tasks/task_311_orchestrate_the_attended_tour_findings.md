## task_311_orchestrate_the_attended_tour_findings - Orchestrate the attended tour findings
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 00:47:55

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Stop answering an ordinary project with a client error. The menu-entry half was withdrawn after measurement: both entries are hidden, and the tour had clicked hidden controls.
- [x] 2. Recompute the count for the search box, and teach the campaign to type.
- [x] 3. Report completion on every screen, clear a status that is over, let the PATH warning be dismissed for the session, and close the document panel on Escape.
- [x] 4. Group the board by status when that mode is chosen, and drop Theme, which is implemented nowhere.
- [x] 5. Give every screen a heading structure, keeping the visual design as it is.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_633_say_what_is_unavailable_before_it_is_chosen`
- `item_634_make_the_count_follow_the_search_box_too`
- `item_635_report_when_a_screen_is_done_and_stop_reporting_what_is_over`
- `item_637_give_every_screen_a_heading_structure`
- `item_636_make_group_by_do_what_it_offers_and_stop_offering_what_it_does_not`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_633_say_what_is_unavailable_before_it_is_chosen`. Proof: withdrawn after measurement -- both entries are hidden on a project without the convention, and the tour had dispatched clicks on hidden controls. The slice records what was claimed and what refutes it.
- request-AC2 -> `item_633_say_what_is_unavailable_before_it_is_chosen`. Proof: `test_the_route_reports_it_as_a_result_not_a_client_error` in `tests/python/test_viewer_preferences.py`, which drives a real server and asserts 200.
- request-AC3 -> `item_634_make_the_count_follow_the_search_box_too`. Proof: `the count follows the search box` in `tests/helpers/viewer-filter-checks.mjs`; against the previous implementation it reports the count stuck at 1360.
- request-AC4 -> `item_635_report_when_a_screen_is_done_and_stop_reporting_what_is_over`. Proof: `every screen reports when it is done`, which blanks the status before each click so it cannot read the previous screen's.
- request-AC5 -> `item_635_report_when_a_screen_is_done_and_stop_reporting_what_is_over`. Proof: the banner carries a Dismiss control, kept in session storage keyed on what the warning says.
- request-AC6 -> every slice. Proof: four new campaign checks -- completion, the search count, regrouping, and the heading structure -- each verified to fail against the previous implementation.
- request-AC7 -> every slice. Proof: `tests/viewer.filter-checks.test.ts` (7), `tests/viewer.layout-checks.test.ts` (11), and the two Python tests for the status code.
- request-AC8 -> `item_636_make_group_by_do_what_it_offers_and_stop_offering_what_it_does_not`. Proof: `a control that regroups the board changes what it shows`; against the previous implementation it reports `stage, status, theme leave the board grouped identically`.
- request-AC9 -> `item_637_give_every_screen_a_heading_structure`. Proof: `the screen exposes a heading structure`, reporting `8 heading(s), levels h1, h2` where the audit previously found none.

# Validation
- (no validation recorded yet)
- command: `node scripts/ci-check.mjs` | result: passed | date: 2026-08-09 | note: 816 vitest + 1127 python + campaign green
- Finish workflow executed on 2026-08-09.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-09.
- Linked backlog item(s): `item_633_say_what_is_unavailable_before_it_is_chosen`, `item_634_make_the_count_follow_the_search_box_too`, `item_635_report_when_a_screen_is_done_and_stop_reporting_what_is_over`, `item_636_make_group_by_do_what_it_offers_and_stop_offering_what_it_does_not`, `item_637_give_every_screen_a_heading_structure`
- Related request(s): `req_314_close_what_the_attended_tour_found_say_what_is_unavailable_count_what_is_shown_report_when_a_screen_is_done`

# AI Context
- Summary: Orchestrate the attended tour findings
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_314_close_what_the_attended_tour_found_say_what_is_unavailable_count_what_is_shown_report_when_a_screen_is_done`
- Product brief(s): `prod_062_say_what_just_happened`
- Architecture decision(s): (none yet)
