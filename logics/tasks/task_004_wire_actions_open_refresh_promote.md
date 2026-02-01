## task_004_wire_actions_open_refresh_promote - Wire actions: open, refresh, promote
> From version: 0.0.0
> Understanding: 80%
> Confidence: 75%
> Progress: 100%

# Context
Connect UI actions to VS Code commands: open file, refresh/reindex, and (optional)
promote via the Logics flow script.

# Plan
- [x] 1. Implement "Open" command from selected card.
- [x] 2. Implement "Refresh" to re-run the indexer and update the UI.
- [x] 3. Implement "Promote" using the flow manager script with error handling.
- [x] FINAL: Confirm non-destructive behavior in documentation.

# Validation
- Manual: open, refresh, and promote actions work; errors are surfaced in the UI.

# Report
Wired open/refresh/promote actions from the webview to extension commands. Promote uses the existing flow manager script for request/backlog items and surfaces errors in VS Code.

# Notes
