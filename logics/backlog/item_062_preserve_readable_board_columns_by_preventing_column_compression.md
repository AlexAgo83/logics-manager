## item_062_preserve_readable_board_columns_by_preventing_column_compression - Preserve readable board columns by preventing column compression
> From version: 1.10.1
> Status: Done
> Schema version: 1.0
> Understanding: 99%
> Confidence: 99%
> Progress: 100%
> Complexity: Medium
> Theme: Board readability and width budgeting
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.
> Indicators reviewed: 2026-08-10 09:06:15

# Problem
Board mode can remain technically scrollable while still becoming visually broken.
When the `Details` panel stays visible and many columns are rendered, board columns can collapse into unreadable narrow stacks.

That is the wrong fallback.
Board mode should keep columns readable and overflow horizontally instead of solving pressure through destructive squeezing.

# Scope
- In:
  - Enforce a stable readable width for board columns.
  - Keep horizontal scrolling as the fallback when total board width exceeds available width.
  - Preserve compatibility with current detail-panel and responsive layout rules.
  - Add regression coverage for the width contract.
- Out:
  - Redesigning cards.
  - Changing list mode.
  - Revisiting unrelated vertical layout issues.

# Acceptance criteria
- AC1: Board columns keep a stable readable width under width pressure.
- AC2: The board rail remains horizontally scrollable when total width exceeds the available viewport.
- AC3: The `Details` panel can remain visible without forcing unreadable board columns.
- AC4: Mixed primary-flow and companion-doc columns follow the same width rule.
- AC5: Stacked layout and forced list mode do not regress.
- AC6: Tests cover the width and overflow contract.

# Priority
- Impact:
  - High: crushed columns make board mode ineffective.
- Urgency:
  - High: the regression is obvious in normal use.

# Notes
- Derived from `logics/request/req_053_preserve_readable_board_columns_by_preventing_column_compression.md`.
- Related architecture decision: `logics/architecture/adr_005_define_responsive_layout_scroll_and_sizing_rules_for_plugin_views.md`.
- This item complements the earlier overflow work by making readable width explicit, not implicit.

# Tasks
- `logics/tasks/task_067_preserve_readable_board_columns_by_preventing_column_compression.md`

# AC Traceability
- AC1 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC2 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC3 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC4 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC5 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC6 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
