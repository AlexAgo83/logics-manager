## item_001_add_column_add_button - Add “+” action in column headers
> From version: 0.0.0
> Understanding: 80%
> Confidence: 85%
> Progress: 0%

# Problem
Add an in-column “+” action to create new Logics items directly from the board, and simplify the top header actions accordingly.

# Scope
- In:
  - Add a “+” button to each column header, positioned to the left of the eye toggle.
  - Provide a popover menu under “+” with: New Request, New Backlog item, New Task (same options in every column).
  - Create files with a minimal template (title + From version/Understanding/Confidence + sections: Needs/Context/Clarifications/Backlog).
  - Auto-increment filenames per folder with 3-digit padding (req_001, item_001, task_001).
  - Auto-create target folders if missing.
  - After creation: open in Edit and select the new card.
  - Remove the “New Request” button from the top header once the “+” action is available.
  - Rename the “Open” action in the details panel to “Edit” (label only).
- Out:
  - Creating Specs directly from the “+” action (unless added later).
  - Advanced templates or metadata editors beyond the initial file stub.
  - Removing the command palette entry for “New Request”.

# Acceptance criteria
- Each column header shows a “+” icon to the left of the eye toggle.
- Clicking “+” opens a small menu with Request / Backlog item / Task.
- New files follow the minimal template and naming scheme with 3-digit padding.
- After completion, the top header no longer shows “New Request”.
- The details action label reads “Edit” instead of “Open”.

# Priority
- Impact:
- Medium — faster creation flow inside the board.
- Urgency:
- Medium — aligns with current usability needs.

# Notes
- Derived from `logics/request/req_001_add_column_add_button.md`.
