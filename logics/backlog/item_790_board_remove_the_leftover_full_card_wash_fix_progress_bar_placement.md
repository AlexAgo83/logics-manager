## item_790_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement - Board: remove the leftover full-card wash, fix progress bar placement
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:19:55

# AI Context
- Summary: `.card--used` still washes a promoted request card's whole body yellow, and the progress bar sits behind the footer row instead of under the title — both against the approved board mockup.
- Keywords: card--used, board.css, renderBoardApp.js, progress bar placement, full-card wash
- Use when: Implementing this backlog item.
- Skip when: Any other screen — this is board cards only.

# Problem
`.card--used` (`clients/shared-web/media/css/board.css:496`, applied by `renderBoardApp.js:1025` to any request already promoted to backlog/task) still applies a full-card yellow wash (`rgba(234, 179, 8, 0.18)`) — the same full-body-tint pattern removed for stage colours today (commit `8d027abd`) was never applied to this rule. Separately, the progress bar (`.card--progress-bar::after`) is positioned `bottom: 4px`, the very bottom edge of the card, behind/under the item-count-and-date footer row, instead of directly under the title as the approved mockup (`board_activity_redesign.html`, "Proposed — one mechanism" section) shows it.

# Scope
- In:
  - Remove or replace `.card--used`'s full-card background wash with the same left-accent-only treatment the stage-tint cleanup already established.
  - Reposition `.card--progress-bar::after` (and its `::before` track) to sit directly under the card title, above the footer row, instead of at the card's bottom edge.
- Out:
  - Any change to the `card__priority-meter`/`card__priority-bar` bar-chart icon — that's priority, not progress, and the mockup doesn't address it.
  - Re-litigating the already-fixed stage-tint removal (commit `8d027abd`).

# Acceptance criteria
- AC1: A request card that has been promoted to backlog/task (`isRequestProcessed` true) shows no full-card background wash; its "used" state, if still communicated, does not colour the whole card body.
- AC2: The progress bar renders as a distinct element directly under the card title, visually separate from and above the item-count/date footer row, on both card and list-row layouts.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Board cards carry no full-card background wash for any state, including a promoted/"used" request; state is conveyed only by the left accent (colour + shape) and the fixed-length progress bar, matching the approved mockup.
- request-AC2 -> This backlog slice. Proof: AC2: The board's progress bar renders directly under the card title, not behind the footer row.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Small, contained CSS fix; the board is the highest-traffic screen in the viewer.

# Tasks
- `task_361_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement`
