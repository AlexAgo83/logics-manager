## task_378_orchestrate_the_board_arrival_and_runbook_document_work - Orchestrate the board arrival and runbook document work
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 13:13:45

# AI Context
- Summary: Sequences four slices: retire the Runbooks screen first so the board is taught about a document kind rather than a kind and a screen, then the board's loading state, the collapsible reference categories, and Getting Started's counts.
- Keywords: orchestration, board loading, runbook documents, reference index, getting started
- Use when: Implementing this task.
- Skip when: Anything about how long a screen takes to load -- that is req_366.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Retire the Runbooks screen first: it is mostly deletion, and doing it before the board work means the board is only taught about a document kind rather than about a kind and a screen.
- [ ] 2. Give the board its loading state, distinguishing 'no payload yet' from 'a payload that is empty'.
- [ ] 3. Make the reference categories collapse on their own.
- [ ] 4. Decide what Getting Started's counts assert, then say it.
- [ ] 5. Verify each on a running viewer, including the reduced-motion fallback, and confirm the bounded runbook lookup is untouched.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_816_say_the_board_is_loading_instead_of_saying_the_project_is_empty`
- `item_817_let_a_runbook_be_a_document_and_retire_its_screen`
- `item_818_collapse_a_reference_category_on_its_own`
- `item_819_make_getting_started_s_stage_list_say_something`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_816_say_the_board_is_loading_instead_of_saying_the_project_is_empty`. Proof deferred to slice closeout.
- request-AC2 -> `item_816_say_the_board_is_loading_instead_of_saying_the_project_is_empty`. Proof deferred to slice closeout.
- request-AC3 -> `item_817_let_a_runbook_be_a_document_and_retire_its_screen`. Proof deferred to slice closeout.
- request-AC4 -> `item_817_let_a_runbook_be_a_document_and_retire_its_screen`. Proof deferred to slice closeout.
- request-AC5 -> `item_818_collapse_a_reference_category_on_its_own`. Proof deferred to slice closeout.
- request-AC6 -> `item_819_make_getting_started_s_stage_list_say_something`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents`
- Product brief(s): `prod_098_a_board_that_tells_the_truth_while_it_is_still_loading`
- Architecture decision(s): (none yet)
