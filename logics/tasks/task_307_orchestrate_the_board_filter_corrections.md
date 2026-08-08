## task_307_orchestrate_the_board_filter_corrections - Orchestrate the board filter corrections
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-08 17:47:31

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Give the viewer one filtering authority, and stop re-arming the inherited toggles.
- [x] 2. Produce the count from the predicate the board uses.
- [x] 3. Select Done by status, and say what each status option would return.
- [x] 4. Add the campaign checks that fail when a filter lies, and record them in the runbook.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_619_give_the_viewer_one_filtering_authority`
- `item_620_make_the_count_above_the_board_describe_the_board`
- `item_621_say_what_a_status_option_selects_and_what_it_would_return`
- `item_622_let_the_campaign_catch_a_filter_that_lies`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_619_give_the_viewer_one_filtering_authority`. Proof: `does not let an inherited toggle undo a panel selection` in `tests/webview.filter-authority.test.ts`.
- request-AC2 -> `item_620_make_the_count_above_the_board_describe_the_board`. Proof: `agrees with the board for every panel selection, including one that allows nothing` in the same file; the count is produced by `window.__CDX_LOGICS_VISIBLE_COUNT__`, which filters through the board's own `isVisible`.
- request-AC3 -> `item_619_give_the_viewer_one_filtering_authority`. Proof: measured against the running viewer, type workflow went from 1238 announced above 0 rendered cards to the documents it names; `does not let an inherited toggle undo a panel selection` pins it on a corpus of finished documents.
- request-AC4 -> `item_621_say_what_a_status_option_selects_and_what_it_would_return`. Proof: `selects Done by status rather than by being closed` in `tests/viewer.browser-host.test.ts`.
- request-AC5 -> `item_621_say_what_a_status_option_selects_and_what_it_would_return`. Proof: `says on each filter option what it would return` and `never disables the option currently chosen` in the same file.
- request-AC6 -> `item_619_give_the_viewer_one_filtering_authority`. Proof: `keeps the inherited toggles authoritative where there is no panel`, plus the 184 browser-host tests passing.
- request-AC7 -> `item_622_let_the_campaign_catch_a_filter_that_lies`. Proof: run against the pre-fix viewer the campaign reports `type=request announced 310 above an empty board` and exits non-zero.
- request-AC8 -> every slice. Proof: `tests/webview.filter-authority.test.ts` (6), the four new tests in `tests/viewer.browser-host.test.ts`, and `tests/viewer.filter-checks.test.ts` (5); each was run against the previous implementation and failed there.

# Validation
- (no validation recorded yet)
- command: `npx vitest run && node tests/run_local_viewer_visual_smoke.mjs` | result: passed | date: 2026-08-08 | note: 788 vitest passed; campaign green including the new filter checks
- Finish workflow executed on 2026-08-08.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-08.
- Linked backlog item(s): `item_619_give_the_viewer_one_filtering_authority`, `item_620_make_the_count_above_the_board_describe_the_board`, `item_621_say_what_a_status_option_selects_and_what_it_would_return`, `item_622_let_the_campaign_catch_a_filter_that_lies`
- Related request(s): `req_310_make_the_board_filters_answer_with_what_the_board_actually_shows`

# AI Context
- Summary: Orchestrate the board filter corrections
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_310_make_the_board_filters_answer_with_what_the_board_actually_shows`
- Product brief(s): `prod_058_a_filter_that_means_the_board`
- Architecture decision(s): (none yet)
