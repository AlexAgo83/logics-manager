## task_361_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement - Board: remove the leftover full-card wash, fix progress bar placement
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:26:37

# AI Context
- Summary: `.card--used` still washes a promoted request card's whole body yellow, and the progress bar sits behind the footer row instead of under the title — both against the approved board mockup.
- Keywords: card--used, board.css, renderBoardApp.js, progress bar placement, full-card wash
- Use when: Implementing this task.
- Skip when: Any other screen — this is board cards only.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_790_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement`

# Acceptance criteria
- AC1: A request card that has been promoted to backlog/task (`isRequestProcessed` true) shows no full-card background wash; its "used" state, if still communicated, does not colour the whole card body.
- AC2: The progress bar renders as a distinct element directly under the card title, visually separate from and above the item-count/date footer row, on both card and list-row layouts.
- AC3: In list mode, the progress bar does not visually overlap the age/"today" column at common desktop widths — confirmed by rendering, not inferred from CSS alone. Reported directly by the operator, suspected but not confirmed; `.list-row.card--progress-bar::before`/`::after` (`board.css:222-227`) position the bar with `right: 96px`, an absolute offset that doesn't obviously derive from `.list-row`'s own 5-column grid (`board.css:762`) or its `.list-row__cell--age` column.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_361_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_361_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
