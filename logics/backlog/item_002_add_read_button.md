## item_002_add_read_button - Add Read button for rendered Markdown
> From version: 0.0.0
> Understanding: 75%
> Confidence: 85%
> Progress: 0%

# Problem
Provide a read-only, rendered Markdown view for the selected Logics item directly from the details panel.

# Scope
- In:
  - Add a “Read” button next to “Edit” in the details actions.
  - Use VS Code’s native Markdown preview to render content (not raw text).
  - Open the rendered view in the main editor as a normal tab (not ephemeral preview).
  - On preview failure, show a toast and fall back to Edit.
  - Disable “Read” when no item is selected.
- Out:
  - In-panel Markdown rendering (unless needed later).
  - Full editing from the rendered view (this remains read-only).

# Acceptance criteria
- A “Read” button appears next to “Edit” in the details panel.
- Clicking “Read” opens a rendered Markdown view for the selected item in the main editor area (normal tab).
- If preview fails, the user sees an error toast and the file opens in Edit.
- The action is disabled when no item is selected.

# Priority
- Impact:
- Medium — improves readability and quick review flow.
- Urgency:
- Medium — can ship after the “+” action if needed.

# Notes
- Derived from `logics/request/req_002_add_read_button.md`.
- Related task:
  - `logics/tasks/task_006_add_read_button.md`
