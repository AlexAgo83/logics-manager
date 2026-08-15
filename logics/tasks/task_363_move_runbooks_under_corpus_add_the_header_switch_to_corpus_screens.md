## task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens - Move Runbooks under Corpus, add the header switch to Corpus screens
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 02:16:03
> Owner: assistant

# AI Context
- Summary: Runbooks is currently under Workshop; it belongs under Corpus. Corpus screens are also missing the header selection switch every other top-level screen already carries.
- Keywords: navigation restructure, runbooks placement, corpus header switch, viewer toolbar
- Use when: Implementing this task.
- Skip when: Any specific screen's internal content — this is navigation placement only.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_792_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens`

# Acceptance criteria
- AC1: Runbooks is reachable from the Corpus navigation group, not the Workshop one.
- AC2: Every Corpus screen carries the same header selection switch present on other top-level screens (e.g. Activity/Project).

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts tests/webview.selectors.test.ts`: 230/230 passed, including 4 updated/new regression tests for the Runbooks move and the Corpus mode switcher.
- Visual confirmation via headless Chrome: the switcher renders at the top of Getting Started (and, by the same code path, Insights/Health/Runbooks), styled identically to the Git/CI/Release and CDX switchers, active tab highlighted.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- AC1: removed `runbooks` from `workshopTabs` (`clients/viewer/src/browser-host/constants.js`) so it drops out of the Workshop tab bar and nav menu automatically; added a `corpus:runbooks` entry to the Corpus nav group (`clients/viewer/index.html`) and a matching dispatcher branch (`clients/viewer/src/browser-host/index.js`). Added `showCorpusRunbooks()` (`clients/viewer/src/browser-host/workshop.js`), reusing `renderWorkshopPanel("runbooks")`/`loadWorkshopRunbooks` unchanged -- only the Workshop tab-bar wrapper is skipped.
- AC2: clarified directly by the operator -- the switch isn't the Activity/Project toggle, it's the same segmented mode-switcher pattern already used by Git/CI/Release (`renderCiModeSwitcher`) and CDX (`renderCdxModeSwitcher`), letting an operator move between a screen family's own sibling screens. Added `renderCorpusModeSwitcher(active)` (`clients/viewer/src/browser-host/util.js`), inserted at the top of each of the 4 Corpus screens' own markup (`buildCorpusInsights`/`renderHealthSummary`/`renderViewerOnboarding` in `index.js`/`render.js`, `showCorpusRunbooks` in `workshop.js`), and wired via a `data-viewer-corpus-mode` delegated click handler in `index.js`, mirroring `data-viewer-ci-mode`/`data-viewer-cdx-mode` exactly.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_792_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens`
- Related request(s): `req_359_viewer_redesign_mockups_gap_review_across_all_screens`

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC4 -> This task. Proof: Runbooks reachable via `corpus:runbooks`, no longer via `workshop:runbooks` (regression tests "opens Runbooks from the Corpus menu as its own screen (task_363)", "no longer shows Runbooks in the Workshop tab bar (task_363)", "opens Runbooks from Corpus and searches"). The Corpus mode switcher lets an operator move between all 4 screens from any one of them (regression test "moves between Corpus screens via their shared header switch (task_363)"), mirroring the existing Git/CI/Release and CDX switcher pattern -- confirmed live via headless-Chrome screenshot.
