## task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens - Move Runbooks under Corpus, add the header switch to Corpus screens
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 01:42:32
> Owner: assistant

# AI Context
- Summary: Runbooks is currently under Workshop; it belongs under Corpus. Corpus screens are also missing the header selection switch every other top-level screen already carries.
- Keywords: navigation restructure, runbooks placement, corpus header switch, viewer toolbar
- Use when: Implementing this task.
- Skip when: Any specific screen's internal content — this is navigation placement only.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_792_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens`

# Acceptance criteria
- AC1: Runbooks is reachable from the Corpus navigation group, not the Workshop one.
- AC2: Every Corpus screen carries the same header selection switch present on other top-level screens (e.g. Activity/Project).

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts tests/webview.selectors.test.ts`: 229/229 passed, including 3 updated/new regression tests for the Runbooks move.

# Report
- AC1 done: removed `runbooks` from `workshopTabs` (`clients/viewer/src/browser-host/constants.js`) so it drops out of the Workshop tab bar and nav menu automatically; added a `corpus:runbooks` entry to the Corpus nav group (`clients/viewer/index.html`) and a matching dispatcher branch (`clients/viewer/src/browser-host/index.js`). Added `showCorpusRunbooks()` (`clients/viewer/src/browser-host/workshop.js`), reusing `renderWorkshopPanel("runbooks")`/`loadWorkshopRunbooks` unchanged -- only the Workshop tab-bar wrapper is skipped.
- AC2 (header selection switch on Corpus screens) not yet implemented: investigation found the Activity/Project switch (`#activity-toggle`) lives in the board's own toolbar row, which sits *behind* any open document panel (Settings, Getting Started, Insights, Health, and now Runbooks) at a lower z-index -- so it isn't that Corpus screens lack their own switch, it's that the one switch that exists is visually covered whenever any document panel is open, Corpus or not. Building a per-screen instance is a real design decision (what does toggling it do from inside Insights/Health/Runbooks?), not a mechanical copy -- flagged for the operator rather than guessed at.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC4 -> This task. Proof (AC1 half only): Runbooks reachable via `corpus:runbooks`, no longer via `workshop:runbooks`; verified by the regression tests "opens Runbooks from the Corpus menu as its own screen (task_363)", "no longer shows Runbooks in the Workshop tab bar (task_363)", and "opens Runbooks from Corpus and searches" in `tests/viewer.browser-host.test.ts`. AC2 (header switch) proof pending a design decision -- see Report.
