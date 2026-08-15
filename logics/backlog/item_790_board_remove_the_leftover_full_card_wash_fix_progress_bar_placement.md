## item_790_board_remove_the_leftover_full_card_wash_fix_progress_bar_placement - Board: remove the leftover full-card wash, fix progress bar placement
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 02:13:53

# AI Context
- Summary: `.card--used` still washes a promoted request card's whole body yellow, and the progress bar sits behind the footer row instead of under the title — both against the approved board mockup.
- Keywords: card--used, board.css, renderBoardApp.js, progress bar placement, full-card wash
- Use when: Implementing this backlog item.
- Skip when: Any other screen — this is board cards only.

# Problem
`.card--used` (`clients/shared-web/media/css/board.css:496`, applied by `renderBoardApp.js:1025` to any request already promoted to backlog/task) still applies a full-card yellow wash (`rgba(234, 179, 8, 0.18)`) — the same full-body-tint pattern removed for stage colours today (commit `8d027abd`) was never applied to this rule. Separately, the progress bar (`.card--progress-bar::after`) is positioned `bottom: 4px`, the very bottom edge of the card, behind/under the item-count-and-date footer row, instead of directly under the title as the approved mockup (`board_activity_redesign.html`, "Proposed — one mechanism" section) shows it.

Reported directly by the operator, suspected but not confirmed: in list mode specifically, the progress bar may visually overlap the "today"/age column rather than merely sitting near it. Corroborating evidence in the CSS: `.list-row.card--progress-bar::before`/`::after` (`board.css:222-227`) position the bar with `right: 96px`, an absolute offset from the row's right edge that doesn't visibly derive from `.list-row`'s own 5-column grid (`minmax(0, 1fr) auto 140px 100px 80px`, `board.css:762`) or its dedicated `.list-row__cell--age` column — so whether it lands clear of that column or under it depends on rendered widths this review didn't measure.

# Scope
- In:
  - Remove or replace `.card--used`'s full-card background wash with the same left-accent-only treatment the stage-tint cleanup already established.
  - Reposition `.card--progress-bar::after` (and its `::before` track) to sit directly under the card title, above the footer row, instead of at the card's bottom edge.
  - Verify, at real rendered widths, whether the list-row progress bar overlaps the age/"today" column; if it does, reposition it clear of that column (not just visually near it).
  - Follow-up reported directly by the operator during review, explicitly confirmed: the complexity/age metric badge, the card's left accent, and the progress bar fill should all carry the card's stage colour (the same `--stage-color-*` tokens the id prefix already uses), replacing the metric badge's flat grey, the left accent's status-only colour, and the progress fill's flat teal.
- Out:
  - Any change to the `card__priority-meter`/`card__priority-bar` bar-chart icon — that's priority, not progress, and the mockup doesn't address it.
  - Re-litigating the already-fixed stage-tint removal (commit `8d027abd`).
  - The age segment's own colouring (including its stale-amber override) — a distinct, valuable signal, deliberately left alone.
  - The left accent's border-style/width variation by status (solid/dashed/dotted/double, thickness) — kept as the status signal now that colour on the accent has moved to stage.

# Acceptance criteria
- AC1: A request card that has been promoted to backlog/task (`isRequestProcessed` true) shows no full-card background wash; its "used" state, if still communicated, does not colour the whole card body.
- AC2: The progress bar renders as a distinct element directly under the card title, visually separate from and above the item-count/date footer row, on both card and list-row layouts.
- AC3: In list mode, the progress bar does not visually overlap the age/"today" column at common desktop widths — confirmed by rendering, not inferred from CSS alone.
- AC4: The complexity/date metric badge's text is coloured by the card's stage (the same tokens as the id prefix), not a flat grey, on both card and list-row layouts. The age text itself keeps its own colouring (including stale-amber).
- AC5: The card's left accent is coloured by stage rather than status; status remains distinguishable via the accent's existing border-style/width variation.
- AC6: The progress bar's fill is coloured by stage rather than a flat teal.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `.card--used`'s background wash removed from `clients/shared-web/media/css/board.css` (no other rule reads the class); verified no wash remains via screenshot of a promoted request card in board mode.
- request-AC2 -> This backlog slice. Proof: Progress bar re-anchored to `.card__title` in both card and list-row modes; verified via headless-Chrome screenshot that the bar sits directly under (card mode) or beside (list mode) the title, separated from the badge/footer row, not at the card's bottom edge.

Local AC3 (list-mode age-column overlap, no request-level AC of its own -- corroborating context for AC2) is now also resolved: the bar is right-aligned within the title's own flexible grid column (`minmax(0, 1fr)`), which structurally cannot reach the fixed-width Status/linked/date columns after it. Confirmed by screenshot of the board in list mode: the bar for a Done item sits fully clear of its "Done" status text and the date column to its right.

Local AC4/AC5/AC6 (no request-level AC of their own -- reported directly by the operator during review, each explicitly confirmed): AC4 -- `.card__badge-metric-value`/`--complexity`/`-prefix`/`-separator` now carry per-stage colour via `data-stage` selectors (`clients/shared-web/media/renderBoardApp.js` sets `data-stage` on the card/list-row root); `.card__badge-age` deliberately excluded and untouched. AC5 -- `.card--status-*` rules keep only border-style/width; colour now comes from `.card[data-stage="..."]`. AC6 -- the progress fill uses `color-mix(in srgb, var(--card-progress-color) 85%, transparent)`, with `--card-progress-color` set per stage on `.card__title`. All three verified via headless-Chrome computed-style checks (`getComputedStyle` on a request card's badge/accent and a backlog card's progress fill, matching `--stage-color-request`/`--stage-color-backlog` exactly) and screenshots.

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
