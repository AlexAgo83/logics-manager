## item_040_add_full_keyboard_navigation_to_the_plugin - Add full keyboard navigation to the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Progress: 100%
> Complexity: Medium
> Theme: Accessibility and operator productivity
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin is still largely mouse-first. That creates unnecessary friction for power users and leaves accessibility value on the table, especially when navigating many items, controls, and detail actions repeatedly.

The missing piece is not just basic tab reachability. The plugin needs a coherent keyboard navigation model that makes board mode, list mode, toolbar actions, and detail actions all operational without the mouse.

# Scope
- In:
  - Add keyboard navigation across visible items in board and list modes.
  - Support keyboard opening/activation of the selected item.
  - Improve keyboard reachability for toolbar and detail actions.
  - Keep focus state visible and understandable.
  - Add regression coverage for core keyboard flows.
- Out:
  - A full internal command palette.
  - Replacing existing mouse interactions.
  - Broad visual redesign of the plugin.

# Acceptance criteria
- AC1: Users can move between visible items in board and list modes using keyboard navigation.
- AC2: Users can open the selected item from the keyboard, with action mappings kept coherent and explicit.
- AC3: Users can reach and operate main toolbar controls from the keyboard without breaking focus flow.
- AC4: Users can reach and operate detail-panel actions from the keyboard.
- AC5: Focus state remains visible and understandable throughout navigation.
- AC6: Keyboard behavior remains coherent across board mode, list mode, and responsive layouts.
- AC7: Existing mouse interactions continue to work unchanged.
- AC8: Automated tests cover core keyboard navigation and action-trigger paths where practical.

# AC Traceability
- AC1/AC2 -> board and list cards now support directional arrow navigation plus `Enter`, `Shift+Enter`, and `Cmd/Ctrl+Enter` action mappings. Proof: `media/renderBoard.js`.
- AC3/AC4 -> toolbar and detail actions continue to use native buttons, while keyboard selection now reaches them without breaking the selection model. Proof: `media/main.js`, existing action button wiring.
- AC5 -> cards and list-group headers now expose explicit `:focus-visible` treatment during keyboard navigation. Proof: `media/css/board.css`.
- AC6 -> board/list keyboard behavior is handled through mode-aware navigation in the renderer, including collapsed list groups. Proof: `media/renderBoard.js`.
- AC7 -> mouse click and double-click behavior on cards remains unchanged. Proof: `media/renderBoard.js`.
- AC8 -> harness coverage verifies directional movement, keyboard activation, and list-group collapse/expand flows. Proof: `tests/webview.harness-a11y.test.ts`.

# Priority
- Impact:
  - High: meaningful accessibility and productivity improvement.
- Urgency:
  - Medium: high-value enhancement with moderate implementation complexity.

# Notes
- Derived from `logics/request/req_035_add_full_keyboard_navigation_to_the_plugin.md`.
- Recommended movement model:
  - board mode: `Up` and `Down` within a column, `Left` and `Right` across columns;
  - list mode: `Up` and `Down` within a group, `Left` collapses, `Right` expands.
- Recommended action model:
  - `Enter` keeps the normal selection/details flow;
  - `Shift+Enter` opens `Read`;
  - `Cmd/Ctrl+Enter` opens the source document.

# Tasks
- `logics/tasks/task_034_add_full_keyboard_navigation_to_the_plugin.md`
