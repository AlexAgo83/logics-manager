## item_473_add_editable_permission_column_to_the_status_table - Add editable Permission column to the status table
> From version: 2.12.6
> Schema version: 1.0
> Status: Ready
> Understanding: 85
> Confidence: 80
> Progress: 0%
> Complexity: Medium
> Theme: CDX status table
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The CDX status table shows session/provider operational state, but permission state is not visible or editable from the table. Operators need to inspect and adjust a session's permission directly in the status table using the same column visibility and styling patterns already used by the table.

# Scope
- In:
  - Add a default-visible Permission column to `cdxStatusColumns`.
  - Include Permission in the existing status column visibility menu and persistence behavior.
  - Render each row's current permission value with a clear fallback when absent.
  - Add an inline permission selection menu or equivalent table-cell editor.
  - Persist/update the selected permission through the existing CDX state/update path, or add a narrowly scoped viewer API endpoint if no such path exists.
  - Add tests for default visibility, persisted visibility, display fallback, and edit behavior.
- Out:
  - Redesigning the CDX status table.
  - Changing unrelated CDX mission permission behavior.
  - Adding unsupported permission values beyond the runtime's accepted set.
  - Changing provider filtering, run/history columns, or unrelated status columns.

# Acceptance criteria
- AC1: The CDX status table renders a Permission column by default.
- AC2: The status column visibility menu can hide/show Permission and restores the saved preference.
- AC3: Each session row shows its current permission value, or a clear fallback such as `-` when unavailable.
- AC4: Clicking or activating a permission cell opens a supported-value selector.
- AC5: Selecting a value updates the displayed row and persists/applies the new permission through the available CDX update path.
- AC6: Existing status table layout, dark theme styling, provider filters, and other columns remain unchanged.
- AC7: Viewer tests cover the new column and edit flow.

# AC Traceability
- request-AC1 -> AC1. Proof: The backlog requires a default-visible Permission column.
- request-AC2 -> AC2. Proof: The backlog integrates Permission with existing column visibility preferences.
- request-AC3 -> AC3. Proof: The backlog requires rendering current row permission with fallback.
- request-AC4 -> AC4 and AC5. Proof: The backlog requires an inline selector and row update.
- request-AC5 -> AC5. Proof: The backlog calls out the CDX update path or narrow viewer endpoint.
- request-AC6 -> AC6 and AC7. Proof: The backlog preserves existing table behavior and requires targeted tests.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_268_add_editable_permission_column_to_the_status_table.md`
- Primary task(s): `logics/tasks/task_266_add_editable_permission_column_to_the_status_table.md`

# AI Context
- Summary: Add a default-visible editable Permission column to the CDX status table with visibility-menu integration.
- Keywords: CDX, status table, permission column, editable cell, column visibility, viewer
- Use when: Implementing or reviewing the CDX status table Permission column slice.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
  - Medium: exposes an important operational control in the table where operators already inspect CDX sessions.
- Urgency:
  - Medium: useful workflow improvement with moderate backend/API uncertainty.

# Notes
- Hybrid rationale: Derived from request `req_268_add_editable_permission_column_to_the_status_table` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_268_add_editable_permission_column_to_the_status_table.md`.
- Generated locally by logics-manager.
- Likely implementation surface: `clients/viewer/browser-host.js` around `cdxStatusColumns`, status table rendering, column preference handling, and CDX API calls; `clients/viewer/viewer.css` for editor styling; `tests/viewer.browser-host.test.ts` around status table and column visibility tests.
- Supported values should come from the same runtime contract used for CDX mission permission selection when possible.

# Tasks
- `task_266_add_editable_permission_column_to_the_status_table`
