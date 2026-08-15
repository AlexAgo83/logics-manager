## task_361_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement - Board: remove the leftover full-card wash, fix progress bar placement
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 02:13:51
> Owner: assistant

# AI Context
- Summary: `.card--used` still washes a promoted request card's whole body yellow, and the progress bar sits behind the footer row instead of under the title — both against the approved board mockup.
- Keywords: card--used, board.css, renderBoardApp.js, progress bar placement, full-card wash
- Use when: Implementing this task.
- Skip when: Any other screen — this is board cards only.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_790_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement`

# Acceptance criteria
- AC1: A request card that has been promoted to backlog/task (`isRequestProcessed` true) shows no full-card background wash; its "used" state, if still communicated, does not colour the whole card body.
- AC2: The progress bar renders as a distinct element directly under the card title, visually separate from and above the item-count/date footer row, on both card and list-row layouts.
- AC3: In list mode, the progress bar does not visually overlap the age/"today" column at common desktop widths — confirmed by rendering, not inferred from CSS alone. Reported directly by the operator, suspected but not confirmed; `.list-row.card--progress-bar::before`/`::after` (`board.css:222-227`) position the bar with `right: 96px`, an absolute offset that doesn't obviously derive from `.list-row`'s own 5-column grid (`board.css:762`) or its `.list-row__cell--age` column.
- AC4: The complexity/date metric badge's text is coloured by the card's stage, not a flat grey, on both card and list-row layouts; the age text keeps its own colouring (including stale-amber).
- AC5: The card's left accent is coloured by stage rather than status; status remains distinguishable via the accent's border-style/width.
- AC6: The progress bar's fill is coloured by stage rather than a flat teal.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_361_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_361_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement.md` after implementation.

# Validation
- `npx vitest run tests/webview.selectors.test.ts`: 17/17 passed (unaffected: these tests only assert the `card--progress-bar`/`card--used` classes are applied, not their CSS).
- Visual confirmation via headless Chrome (`--use-mock-keychain`) against a live `--fleet` server: board card mode and list mode both screenshotted after the fix. Card mode: the progress bar renders directly under the card title, clearly separated from the priority/complexity badge row below it. List mode: the bar renders confined to the title's own grid column, well clear of the Status/linked-count/date columns to its right.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- `.card--used`'s full-card yellow wash (`background: rgba(234, 179, 8, 0.18)`) removed from `clients/shared-web/media/css/board.css`, mirroring the stage-tint removal already done for `.card--status-*`.
- Progress bar `::before`/`::after` moved from being positioned on `.card`/`.list-row` itself (`bottom: 4px` / `right: 96px`, both magic offsets) to being positioned on `.card__title` instead: in card mode, directly under the title (`bottom: 0` inside a reserved `padding-bottom: 7px`, so the next flex sibling doesn't render underneath it); in list mode, right-aligned within the title's own flexible grid column (`minmax(0, 1fr)`), which structurally cannot reach the fixed-width Status/linked/date columns regardless of viewport width -- closing the AC3 suspicion without a magic pixel offset to re-derive later.
- Operator caught in review: the bar's width was still the flat 64px from item_740 in both modes, not the full-card-width track the approved mockup shows (`board_activity_redesign.html`'s `.c__bar`/`.c__bar i`). Card mode now uses `width: 100%` / `calc(100% * var(--progress-ratio, 0))`, matching the mockup; list mode keeps the fixed 64px, since a list row's width swings with the window in a way a card's does not -- exactly the distortion item_740's own reasoning was written to avoid. Re-screenshotted both modes to confirm: card mode now shows a full-width track with a proportional teal fill; list mode is unchanged (short, fixed, clear of the Done/date columns).
- Operator flagged in a second pass, explicitly confirmed both times: (1) the complexity/date badge was still a flat grey, (2) the card's left accent and progress fill weren't stage-coloured either. Added `data-stage` to the card/list-row root (`clients/shared-web/media/renderBoardApp.js`) and:
  - Badge: `.card__badge-metric-value`/`--complexity`/`-prefix`/`-separator` now colour by `[data-stage]`, matching the id prefix's tokens. `.card__badge-age` deliberately excluded (its own stale-amber signal stays).
  - Left accent: `.card--status-*` rules now carry border-style/width only (status signal); colour comes from `.card[data-stage="..."]` (stage signal) -- confirmed with the operator this replaces the prior status-colour encoding (item_719/767), trading it for two independent signals (colour = stage, shape = status) instead of one redundant one.
  - Progress fill: `--card-progress-color` custom property set per stage on `.card__title`, fill uses `color-mix(in srgb, var(--card-progress-color) 85%, transparent)` -- confirmed with the operator this replaces the prior "calm teal, avoid orange/red" decision.
- Ran `npm run build:assets` to regenerate `viewer_assets/`.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_790_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement`
- Related request(s): `req_359_viewer_redesign_mockups_gap_review_across_all_screens`

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: `.card--used`'s background rule removed entirely (`clients/shared-web/media/css/board.css`); no other rule in the file references the class, so nothing else colours the card body based on it.
- request-AC2 -> This task. Proof: Progress bar pseudo-elements re-anchored to `.card__title` (card mode: `bottom: 0` inside a reserved `padding-bottom`; list mode: `right: 0` within the title's own grid column). Confirmed by screenshot in both modes -- bar sits directly under/beside the title, clearly separated from the badge/footer row.

Local AC4/AC5/AC6 (no request-level AC of their own, same as item_790's): `getComputedStyle` on a live request card's badge/accent and a backlog card's progress fill both matched their `--stage-color-*` token exactly (e.g. progress fill `color(srgb 0.231 0.510 0.965 / 0.85)` = `#3b82f6` at 85% = `--stage-color-backlog`), confirmed via headless-Chrome CDP against the running dev server.
