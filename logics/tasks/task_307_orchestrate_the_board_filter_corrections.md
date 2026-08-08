## task_307_orchestrate_the_board_filter_corrections - Orchestrate the board filter corrections
> From version: 2.20.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 75%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Give the viewer one filtering authority, and stop re-arming the inherited toggles.
- [x] 2. Produce the count from the predicate the board uses.
- [x] 3. Select Done by status, and say what each status option would return.
- [ ] 4. Add the campaign checks that fail when a filter lies, and record them in the runbook.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_619_give_the_viewer_one_filtering_authority`
- `item_620_make_the_count_above_the_board_describe_the_board`
- `item_621_say_what_a_status_option_selects_and_what_it_would_return`
- `item_622_let_the_campaign_catch_a_filter_that_lies`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC3, request-AC6, request-AC8 -> `item_619_give_the_viewer_one_filtering_authority`. Proof deferred to slice closeout.
- request-AC2, request-AC7, request-AC8 -> `item_620_make_the_count_above_the_board_describe_the_board`. Proof deferred to slice closeout.
- request-AC4, request-AC5, request-AC8 -> `item_621_say_what_a_status_option_selects_and_what_it_would_return`. Proof deferred to slice closeout.
- request-AC7, request-AC8 -> `item_622_let_the_campaign_catch_a_filter_that_lies`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate the board filter corrections
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_310_make_the_board_filters_answer_with_what_the_board_actually_shows`
- Product brief(s): `prod_058_a_filter_that_means_the_board`
- Architecture decision(s): (none yet)
