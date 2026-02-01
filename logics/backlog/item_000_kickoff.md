## item_000_kickoff - Kickoff
> From version: 0.0.0
> Understanding: 85%
> Confidence: 80%
> Progress: 80%

# Problem
Create a VS Code extension that provides a visual workspace to orchestrate the Logics flow
(requests → backlog → tasks → specs) using the existing Markdown files as the source of truth.

# Scope
- In:
  - Index `logics/*` folders and render a flow board with columns (Requests, Backlog, Tasks, Specs).
  - Detail panel for the selected item (file path, stage, status).
  - Open file from UI and refresh/reindex command.
  - Optional promote action that triggers the Logics flow script.
- Out:
  - Cross-repo sync, cloud storage, or multi-user collaboration.
  - Full in-app editing of Markdown content (beyond opening the file).
  - External connectors (Jira/Linear/Figma/Confluence) for v1.

# Acceptance criteria
- A VS Code view titled "Logics" shows a board with the four columns and items from `logics/*`.
- Selecting a card shows a details panel and allows opening the file in the editor.
- A "Refresh" command reindexes files and updates the board.
- If promote is enabled, it uses the existing Logics script and surfaces errors gracefully.
- Empty states are clear when no Logics files exist.
- No file changes occur unless the user triggers an explicit action.

# Priority
- Impact:
- High — reduces friction and keeps the Logics workflow inside the editor.
- Urgency:
- Medium — can iterate after an MVP.

# Notes
- Reference mockup: `logics/external/mockup/logics-orchestrator-vscode.png`.
- Related tasks:
  - `logics/tasks/task_000_define_ux_and_ia_for_logics_orchestrator.md`
  - `logics/tasks/task_001_implement_logics_indexer_and_data_model.md`
  - `logics/tasks/task_002_scaffold_vs_code_extension_and_view_containers.md`
  - `logics/tasks/task_003_build_flow_board_ui_and_details_panel.md`
  - `logics/tasks/task_004_wire_actions_open_refresh_promote.md`
- Implementation scaffolded in `src/` + `media/` with commands and webview; needs manual validation in VS Code.
- Dev setup: `npm install`, `npm run compile`, then launch Extension Host (F5).
