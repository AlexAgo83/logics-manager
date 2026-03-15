## req_032_enable_horizontal_scrolling_for_board_columns - Enable horizontal scrolling for board columns
> From version: 1.9.3
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Complexity: Low
> Theme: Board navigation and overflow ergonomics
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Make the board columns horizontally scrollable when the total column width exceeds the available viewport.
- Preserve access to all columns without forcing them to shrink unnaturally.
- Keep the board usable in narrower plugin widths where several stages or companion-doc columns coexist.

# Context
The board layout is column-based and works well when there is enough horizontal room.
But once several columns are present at the same time, the board can exceed the available width of the plugin pane.

In that situation, users should be able to navigate horizontally across the board rather than:
- losing access to off-screen columns;
- compressing columns too aggressively;
- or switching interaction mode just to inspect hidden content.

This request is not about changing the board into a different layout model.
It is about restoring a natural overflow behavior for a Kanban-style surface:
- columns keep a usable width;
- the board overflows horizontally when needed;
- users can scroll to reach the hidden columns.

# Acceptance criteria
- AC1: When the total width of rendered board columns exceeds the available board viewport, the board becomes horizontally scrollable.
- AC2: Users can reach off-screen columns through horizontal scrolling without breaking vertical scrolling inside the board content.
- AC3: Columns keep a readable width and are not forced into overly narrow compression just to avoid overflow.
- AC4: Horizontal scrolling works with primary-flow and companion-doc columns together.
- AC5: The board header and the details panel continue to behave correctly while the board content scrolls horizontally.
- AC6: The behavior does not regress existing responsive mode switches such as stacked layout or forced list mode below narrower breakpoints.
- AC7: Webview tests are updated where practical to lock the intended overflow and scrolling behavior.

# Scope
- In:
  - Enable horizontal overflow handling for the board column area.
  - Preserve readable column sizing while allowing overflow.
  - Keep interaction compatibility with existing details panel and responsive layout behavior.
  - Add regression coverage for the intended board overflow behavior.
- Out:
  - Redesigning the board into a different navigation model.
  - Replacing board mode with list mode.
  - Changing filter semantics or detail-panel structure.
  - Adding drag-and-drop or other advanced board interactions.

# Dependencies and risks
- Dependency: current board container remains the source of truth for column layout and scrolling.
- Dependency: responsive layout rules around stacked mode and forced list mode must remain compatible with the new overflow behavior.
- Risk: enabling horizontal scrolling incorrectly can interfere with vertical scroll behavior or make the board feel “stuck”.
- Risk: if overflow is handled at the wrong container level, the details panel or toolbar may scroll unexpectedly with the board.
- Risk: too much width flexibility on columns could create unstable card wrapping or inconsistent board density.

# Clarifications
- The goal is not to remove responsive behavior, but to make board mode usable when board mode is active and columns overflow horizontally.
- The preferred outcome is a board area that behaves like a real horizontally scrollable column rail.
- The board should keep readable column widths instead of collapsing columns purely to fit the viewport.
- This request concerns board mode specifically; list mode remains a separate fallback/navigation mode.
- The preferred first implementation is native horizontal overflow on the board rail with stable minimum readable column widths, not a heavier assisted scrolling model.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_037_enable_horizontal_scrolling_for_board_columns.md`
