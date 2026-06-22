## task_266_add_editable_permission_column_to_the_status_table - Add editable Permission column to the status table
> From version: 2.12.6
> Schema version: 1.0
> Status: Ready
> Understanding: 85
> Confidence: 80
> Progress: 0%
> Complexity: Medium
> Theme: CDX status table
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] `cdxStatusColumns` includes a default-visible Permission column.
- [ ] The existing status column visibility menu includes Permission and persists hide/show preferences.
- [ ] Status rows render the current permission value or a clear fallback when absent.
- [ ] Permission cells open a supported-value selector and update the row after selection.
- [ ] The update path uses existing CDX status/session APIs where available, or a narrow viewer API endpoint if needed.
- [ ] Existing status table layout, provider filtering, and unrelated columns remain unchanged.
- [ ] `tests/viewer.browser-host.test.ts` covers default visibility, persisted visibility, display fallback, and edit behavior.

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

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run tests/viewer.browser-host.test.ts`.
- Run the viewer asset sync/check command if `viewer_assets/` changes.
- Run `python3 -m logics_manager flow finish task task_266_add_editable_permission_column_to_the_status_table.md` after implementation.

# Report
- Pending implementation.

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
