## req_053_preserve_readable_board_columns_by_preventing_column_compression - Preserve readable board columns by preventing column compression
> From version: 1.10.1
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Complexity: Medium
> Theme: Board readability and width budgeting
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Keep board columns readable when board mode shares horizontal space with the `Details` panel.
- Prevent width pressure from being solved by squeezing columns into unusable narrow cards.
- Prefer horizontal overflow over destructive board compression while board mode is active.

# Context
Board mode already supports horizontal overflow, but a remaining regression still made the surface hard to use in practice.
When several workflow and companion-doc columns coexist beside the `Details` panel, the board could still collapse into very narrow columns.

That technically preserves visibility, but it destroys readability:
- card titles wrap into tall unreadable stacks,
- metadata becomes fragmented,
- and board mode stops acting like a useful planning surface.

The corrective rule is simple:
- columns keep a stable readable width,
- the board rail overflows horizontally when necessary,
- and width pressure is not resolved by shrinking columns below a usable threshold.

# Acceptance criteria
- AC1: Board columns keep a stable readable width instead of shrinking under horizontal pressure.
- AC2: When horizontal space is insufficient, the board rail remains horizontally scrollable.
- AC3: The `Details` panel can stay visible without forcing unreadable board columns.
- AC4: Mixed primary-flow and companion-doc columns follow the same width rule.
- AC5: Stacked layout and forced list mode do not regress.
- AC6: Regression coverage is updated for the board-width contract.

# Scope
- In:
  - Enforce a non-compressing readable width for board columns.
  - Keep horizontal overflow as the board-mode fallback.
  - Preserve compatibility with the current `Details` panel and responsive layout rules.
  - Add regression coverage for the width contract.
- Out:
  - Redesigning cards or board content density.
  - Changing list-mode semantics.
  - Revisiting unrelated vertical layout concerns.

# Dependencies and risks
- Dependency: horizontal overflow must remain owned by the board rail, not by the whole page.
- Dependency: the `Details` panel width budget must remain bounded.
- Risk: if the chosen width is too large, board mode will require horizontal scrolling earlier.
- Risk: if the width contract drifts later, the same readability regression can reappear silently.

# Clarifications
- The goal is not to keep every column visible without scrolling.
- The goal is to keep columns readable while board mode is active.
- Horizontal overflow is preferred over unreadable narrowing.
- This request complements `req_032_enable_horizontal_scrolling_for_board_columns` by making readable width an explicit contract.
- This request follows `logics/architecture/adr_005_define_responsive_layout_scroll_and_sizing_rules_for_plugin_views.md`.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_062_preserve_readable_board_columns_by_preventing_column_compression.md`
