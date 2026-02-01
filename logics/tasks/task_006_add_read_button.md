## task_006_add_read_button - Add Read button for rendered Markdown
> From version: 0.0.0
> Understanding: 75%
> Confidence: 80%
> Progress: 0%

# Context
Derived from `logics/backlog/item_002_add_read_button.md`.
Add a Read action to open a rendered Markdown preview of the selected item.

# Plan
- [ ] 1. Add a “Read” button next to “Edit” in the details actions and keep it disabled with no selection.
- [ ] 2. Wire the Read action to open the native Markdown preview in the main editor (normal tab).
- [ ] 3. Handle preview errors with a toast and fall back to opening the file in Edit.
- [ ] FINAL: Manual verification of Read behavior and fallback.

# Validation
- Manual: “Read” appears next to “Edit” and is disabled when nothing is selected.
- Manual: clicking Read opens a rendered Markdown preview in the main editor.
- Manual: failures show an error toast and fall back to Edit.

# Report

# Notes
