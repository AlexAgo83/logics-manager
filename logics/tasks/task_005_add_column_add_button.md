## task_005_add_column_add_button - Add “+” action in column headers
> From version: 0.0.0
> Understanding: 80%
> Confidence: 80%
> Progress: 0%

# Context
Derived from `logics/backlog/item_001_add_column_add_button.md`.
Add a “+” action in each column header to create new Logics items, and tidy related UI actions.

# Plan
- [ ] 1. Update the column header UI to include a “+” button left of the eye toggle and remove the top header “New Request” button.
- [ ] 2. Add a popover menu under “+” with: New Request, New Backlog item, New Task.
- [ ] 3. Wire create actions to the extension: compute next filename (3-digit padding), create folder if missing, write minimal template, refresh index, select new card, and open in Edit.
- [ ] 4. Rename the details action label from “Open” to “Edit” (label only).
- [ ] FINAL: Manual verification of UI placement, menu behavior, and file creation.

# Validation
- Manual: “+” appears in all column headers and menu opens with the 3 options.
- Manual: each option creates the right file in the right folder with the minimal template and naming.
- Manual: created item opens in Edit and is selected in the board.
- Manual: top header no longer shows “New Request”; details action shows “Edit”.

# Report

# Notes
