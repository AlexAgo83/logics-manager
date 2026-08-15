## task_378_orchestrate_the_board_arrival_and_runbook_document_work - Orchestrate the board arrival and runbook document work
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 13:32:41

# AI Context
- Summary: Sequences four slices: retire the Runbooks screen first so the board is taught about a document kind rather than a kind and a screen, then the board's loading state, the collapsible reference categories, and Getting Started's counts.
- Keywords: orchestration, board loading, runbook documents, reference index, getting started
- Use when: Implementing this task.
- Skip when: Anything about how long a screen takes to load -- that is req_366.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Retire the Runbooks screen first: it is mostly deletion, and doing it before the board work means the board is only taught about a document kind rather than about a kind and a screen.
- [x] 2. Give the board its loading state, distinguishing 'no payload yet' from 'a payload that is empty'.
- [x] 3. Make the reference categories collapse on their own.
- [x] 4. Decide what Getting Started's counts assert, then say it.
- [x] 5. Verify each on a running viewer, including the reduced-motion fallback, and confirm the bounded runbook lookup is untouched.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_816_say_the_board_is_loading_instead_of_saying_the_project_is_empty`
- `item_817_let_a_runbook_be_a_document_and_retire_its_screen`
- `item_818_collapse_a_reference_category_on_its_own`
- `item_819_make_getting_started_s_stage_list_say_something`
- `item_820_retire_the_corpus_menu_into_a_settings_section`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task, via `item_816_say_the_board_is_loading_instead_of_saying_the_project_is_empty`. Proof: the board now reads a payload-arrived flag set in `setState`. Measured on a running viewer with `/api/items` blocked: the board drew a `role="status"` skeleton of 3 columns and 12 cards and no empty-state message; with the payload allowed, the empty state is what appears. Both branches covered in `tests/webview.board-renderer.test.ts`.
- request-AC2 -> This task, via `item_816_say_the_board_is_loading_instead_of_saying_the_project_is_empty`. Proof: the skeleton is drawn at the board's own geometry -- 260px columns, 12px gap, measured 1557x756 filling the board with 238px cards -- so the payload replaces it in place. Reduced motion removes the sweep rather than slowing it.
- request-AC3 -> This task, via `item_817_let_a_runbook_be_a_document_and_retire_its_screen`. Proof: `getStageHeading` gained a `runbook` case and `isCompanionStage` accepts it, so runbooks group under their own heading on the board and in the list with the `--stage-color-runbook` accent.
- request-AC4 -> This task, via `item_817_let_a_runbook_be_a_document_and_retire_its_screen`. Proof: the Runbooks screen, its navigation entry and its Corpus-switcher entry are gone with their rendering code; `/api/runbooks` and the `match_runbooks` MCP tool are untouched and their tests pass unchanged.
- request-AC5 -> This task, via `item_818_collapse_a_reference_category_on_its_own`. Proof: each category heading carries the index header's own control. Measured live: collapsing Product briefs (99) hid its list and left Architecture decisions expanded, `aria-expanded` false, `aria-controls` pointing at the group. Covered in `tests/webview.harness-details-and-filters.test.ts`.
- request-AC6 -> This task, via `item_819_make_getting_started_s_stage_list_say_something`. Proof: measured live on this corpus the entries read "473 documents: requests, product briefs and roadmaps", "820 documents: backlog items", "372 documents: tasks", "30 documents: architecture decisions and specs", under a legend stating what the counts measure; an empty stage reads "no backlog items yet - start here".
- request-AC7 -> This task, via `item_820_retire_the_corpus_menu_into_a_settings_section`. Proof: the Corpus menu is gone from the app bar and its three screens are reached from a Settings section; the corpus mode switcher still carries them between one another.

# Validation
- Targeted suites for the touched surfaces pass: `tests/webview.board-renderer.test.ts` (41), `tests/webview.harness-details-and-filters.test.ts` (29), and the Getting Started case in `tests/viewer.browser-host.test.ts`.
- Each slice verified on a running viewer over CDP rather than by reading the rule.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- All five slices shipped: the board says it is loading rather than that the project is empty, a runbook is a document and its screen is gone, reference categories collapse on their own, Getting Started's counts say what they measure, and the Corpus menu is a Settings section.
- The board skeleton needed the payload to be blocked to be seen at all on this machine: locally the payload lands fast enough that the state it replaces was never the point -- it is a large corpus on a cold start where the false "empty" was being read.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_816_say_the_board_is_loading_instead_of_saying_the_project_is_empty`, `item_817_let_a_runbook_be_a_document_and_retire_its_screen`, `item_818_collapse_a_reference_category_on_its_own`, `item_819_make_getting_started_s_stage_list_say_something`, `item_820_retire_the_corpus_menu_into_a_settings_section`
- Related request(s): `req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents`

# Links
- Request: `req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents`
- Product brief(s): `prod_098_a_board_that_tells_the_truth_while_it_is_still_loading`
- Architecture decision(s): (none yet)
