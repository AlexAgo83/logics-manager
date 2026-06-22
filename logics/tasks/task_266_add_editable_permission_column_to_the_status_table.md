## task_266_add_editable_permission_column_to_the_status_table - Add editable Permission column to the status table
> From version: 2.12.6
> Schema version: 1.0
> Status: Done
> Understanding: 85
> Confidence: 80
> Progress: 100%
> Complexity: Medium
> Theme: CDX status table
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] `cdxStatusColumns` includes a default-visible Permission column.
- [x] The existing status column visibility menu includes Permission and persists hide/show preferences.
- [x] Status rows render the current permission value or a clear fallback when absent.
- [x] Permission cells open a supported-value selector and update the row after selection.
- [x] The update path uses existing CDX status/session APIs where available, or a narrow viewer API endpoint if needed.
- [x] Existing status table layout, provider filtering, and unrelated columns remain unchanged.
- [x] `tests/viewer.browser-host.test.ts` covers default visibility, persisted visibility, display fallback, and edit behavior.

# Backlog
- `item_473_add_editable_permission_column_to_the_status_table`

# Acceptance criteria
- AC1: The CDX status table renders a Permission column by default.
- AC2: The status column visibility menu can hide/show Permission and restores the saved preference.
- AC3: Each session row shows its current permission value, or a clear fallback such as `-` when unavailable.
- AC4: Clicking or activating a permission cell opens a supported-value selector.
- AC5: Selecting a value updates the displayed row and persists/applies the new permission through the available CDX update path.
- AC6: Existing status table layout, dark theme styling, provider filters, and other columns remain unchanged.
- AC7: Viewer tests cover the new column and edit flow.

# AC Traceability
- request-AC1 -> This task. Proof: `cdxStatusColumns` includes default-visible `permission`/`PERM.` and the viewer test asserts the header renders by default.
- request-AC2 -> This task. Proof: the existing status column menu renders Permission, persists `permission: false`, and restores it hidden in `tests/viewer.browser-host.test.ts`.
- request-AC3 -> This task. Proof: status rows render `permission`, `permission_mode`, or `permissionMode`, falling back to `-`; the viewer test asserts both `review` and `-`.
- request-AC4 -> This task. Proof: permission cells render `data-viewer-cdx-permission` buttons that open a supported-value selector with `review`, `default`, `auto`, and `full`.
- request-AC5 -> This task. Proof: selecting a value posts `/api/cdx-permission`, optimistically updates the row, refreshes CDX status, and backend `cdx_permission_payload` calls `cdx set <session> --permission <value> --json`.
- request-AC6 -> This task. Proof: the table keeps existing provider filtering and column visibility behavior; targeted viewer tests for status layout/filter-adjacent behavior continue to pass.
- request-AC7 -> This task. Proof: `npx vitest run tests/viewer.browser-host.test.ts` covers default visibility, persisted visibility, fallback display, and edit flow; `python3 -m pytest tests/python/test_viewer_cli.py -q` covers the backend permission command.
- backlog-AC1..AC7 -> This task. Proof: implemented the editable Permission status-table slice in `clients/viewer/browser-host.js`, `clients/viewer/viewer.css`, `logics_manager/viewer.py`, synced `viewer_assets/viewer/`, and added targeted viewer/Python tests.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run tests/viewer.browser-host.test.ts`.
- Run the viewer asset sync/check command if `viewer_assets/` changes.
- Run `python3 -m logics_manager flow finish task task_266_add_editable_permission_column_to_the_status_table.md` after implementation.
- Finish workflow executed on 2026-06-22.
- Linked backlog/request close verification passed.

# Report
- Implemented a default-visible editable Permission column in the CDX status table.
- Added supported-value selection for `review`, `default`, `auto`, and `full`, with optimistic row updates and `/api/cdx-permission` backed by `cdx set`.
- Extended viewer and Python tests for visibility persistence, fallback display, edit behavior, and backend command construction.
- Finished on 2026-06-22.
- Linked backlog item(s): `item_473_add_editable_permission_column_to_the_status_table`
- Related request(s): `req_268_add_editable_permission_column_to_the_status_table`

# AI Context
- Summary: Implement a default-visible editable Permission column in the CDX status table.
- Keywords: CDX, status table, permission, editable cell, column visibility, browser-host, tests
- Use when: You need the bounded implementation task for the CDX status Permission column.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_268_add_editable_permission_column_to_the_status_table`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# Implementation notes
- Start at `clients/viewer/browser-host.js` around `cdxStatusColumns`, status table row rendering, column visibility persistence, and CDX status API calls.
- Use the same supported permission values as the CDX mission launch/configuration path when possible.
- Keep the selector compact enough not to disturb table spacing on narrow screens.
- Extend existing tests near "persists CDX status column visibility" and "restores persisted CDX status column visibility".
