## item_037_enable_horizontal_scrolling_for_board_columns - Enable horizontal scrolling for board columns
> From version: 1.10.1
> Status: Done
> Understanding: 100%
> Confidence: 99%
> Progress: 100%
> Complexity: Low
> Theme: Board navigation and overflow ergonomics
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
When several board columns are present at once, the total width can exceed the available plugin viewport. Without reliable horizontal scrolling, users lose access to off-screen columns or the board is forced into an overly compressed layout.

The board should behave like a horizontally scrollable column rail: columns keep a readable width, overflow is allowed when needed, and users can scroll to reach hidden columns without breaking the rest of the layout.

# Scope
- In:
  - Enable horizontal scrolling for the board column area when columns overflow.
  - Preserve readable column sizing while allowing overflow.
  - Keep details-panel and toolbar behavior stable while the board scrolls.
  - Add regression coverage for intended overflow behavior.
- Out:
  - Replacing board mode with list mode.
  - Redesigning the board navigation model.
  - Adding drag-and-drop or other advanced board interactions.
  - Changing filters or detail-panel structure.

# Acceptance criteria
- AC1: When total column width exceeds the available board viewport, the board becomes horizontally scrollable.
- AC2: Users can reach off-screen columns through horizontal scrolling without breaking vertical scrolling inside board content.
- AC3: Columns keep a readable width and are not forced into overly narrow compression just to avoid overflow.
- AC4: Horizontal scrolling works with primary-flow and companion-doc columns together.
- AC5: The board header and details panel continue to behave correctly while the board content scrolls horizontally.
- AC6: Existing responsive mode switches such as stacked layout and forced list mode do not regress.
- AC7: Webview tests are updated where practical to lock the intended overflow behavior.

# AC Traceability
- AC1/AC2 -> board container overflow handling is applied at the correct level. Proof: `media/css/board.css`.
- AC3 -> column sizing rules preserve readable width under overflow. Proof: `media/css/board.css`.
- AC4 -> overflow behavior is validated with mixed primary and companion columns. Proof: `media/css/board.css`, existing mixed-stage rendering in `media/renderBoard.js`.
- AC5 -> toolbar/details remain outside the horizontal scroll path. Proof: `media/css/board.css`, `media/css/layout.css`.
- AC6 -> responsive layout and forced-list breakpoints keep current behavior. Proof: `media/css/board.css`, `media/main.js`, `tests/webview.layout-collapse.test.ts`.
- AC7 -> tests cover overflow-related rendering expectations. Proof: `tests/webview.layout-collapse.test.ts`.

# Priority
- Impact:
  - Medium-High: restores practical access to columns in narrower board layouts.
- Urgency:
  - Medium: important UX fix for board-mode usability with low to moderate implementation risk.

# Notes
- Derived from `logics/request/req_032_enable_horizontal_scrolling_for_board_columns.md`.
- The preferred first implementation is native horizontal overflow on the board rail with stable minimum readable column widths.
- Related architecture decision: `logics/architecture/adr_005_define_responsive_layout_scroll_and_sizing_rules_for_plugin_views.md`.

# Tasks
- `logics/tasks/task_031_enable_horizontal_scrolling_for_board_columns.md`
