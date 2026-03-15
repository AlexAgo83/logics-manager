## item_036_remove_column_eye_toggle_from_board - Remove the eye toggle from board columns
> From version: 1.9.3
> Status: Done
> Understanding: 99%
> Confidence: 98%
> Progress: 100%
> Complexity: Low
> Theme: Board UI simplification and control hygiene
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The board column headers currently include an eye toggle that adds visual noise and keeps alive a per-column hide/show interaction that is no longer desirable in the product direction.

This control increases header density across every column and competes with higher-value actions. If the intent is to simplify the board and rely on global visibility behavior instead, the eye toggle should be removed as both a UI affordance and a behavior path.

# Scope
- In:
  - Remove the eye toggle button from board column headers.
  - Remove or neutralize the per-column hide/show interaction tied to that control.
  - Keep remaining header actions functional and aligned.
  - Update tests and UI expectations accordingly.
- Out:
  - Redesigning the entire board header.
  - Changing filter behavior.
  - Changing list mode or responsive mode semantics.
  - Reworking unrelated detail-panel collapse interactions.

# Acceptance criteria
- AC1: The eye toggle button is no longer rendered in board column headers.
- AC2: The board no longer exposes the per-column hide/show interaction previously triggered by that control.
- AC3: Removing the eye toggle does not break remaining header actions, including add actions where applicable.
- AC4: Column headers remain aligned and visually stable after the control is removed.
- AC5: Board rendering continues to work in normal and responsive layouts after removal.
- AC6: Persisted state previously used only for the eye-toggle behavior is safely ignored or cleaned up.
- AC7: Webview tests are updated so the removed control and old interaction path do not regress back in.

# AC Traceability
- AC1/AC2 -> board header rendering and old toggle interaction path are removed together. Proof: `media/renderBoard.js`.
- AC3/AC4 -> header action layout remains valid after the control disappears. Proof: `media/renderBoard.js`, `media/css/board.css`.
- AC5 -> board rendering remains stable in current layout modes. Proof: `media/renderBoard.js`, `tests/webview.layout-collapse.test.ts`.
- AC6 -> legacy collapsed-stage persisted state is safely ignored after control removal. Proof: `media/main.js`.
- AC7 -> harness/layout tests updated to reflect the new header behavior. Proof: `tests/webview.harness-a11y.test.ts`.

# Priority
- Impact:
  - Medium: reduces board-header noise and removes an unnecessary control.
- Urgency:
  - Medium: straightforward UX simplification with low implementation risk.

# Notes
- Derived from `logics/request/req_031_remove_column_eye_toggle_from_board.md`.

# Tasks
- `logics/tasks/task_030_remove_column_eye_toggle_from_board.md`
