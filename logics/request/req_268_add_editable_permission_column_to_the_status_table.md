## req_268_add_editable_permission_column_to_the_status_table - Add editable Permission column to the status table
> From version: 2.12.6
> Schema version: 1.0
> Status: Ready
> Understanding: 85
> Confidence: 80
> Complexity: Medium
> Theme: CDX status table
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Add a new Permission column to the CDX status table.

- Make the Permission column visible by default.
- Include Permission in the existing status column visibility menu.
- Display the current permission value for each CDX status/session row.
- Let the user click the permission cell to open a selection menu.
- Update the selected permission value and refresh the displayed value after selection.
- Keep the column visually consistent with the existing table layout, spacing, hover states, and dark theme styling.

# Context
- The status table currently shows session/provider status information such as SESSION, PROV., STATUS, AUTH, OK, 5H, WEEK, RESET 5H, and RESET WEEK.
- Permissions are part of the operational state and should be directly visible from this table instead of being hidden elsewhere. The user should also be able to update them quickly from the table without opening a separate screen.
- The existing column visibility dropdown already allows enabling or disabling columns. The new Permission column should be integrated into that same mechanism and enabled by default.

# Authoring note
- This request was created directly by the user from the viewer.
- If an assistant reads this request, it may reformat it, translate it to English, and improve clarity while preserving the user's intent.

# Acceptance Criteria
- AC1: The CDX status table includes a Permission column that is visible by default.
- AC2: The existing status column visibility menu includes Permission and can hide or show it like other columns.
- AC3: Each session row displays its current permission value, with a clear fallback when the runtime does not report one.
- AC4: Activating a permission cell opens a selection menu with supported permission values and updates the row after a value is chosen.
- AC5: The implementation uses the existing CDX status/session update path when available, or adds a narrowly scoped viewer API endpoint if needed.
- AC6: Existing status table behavior, including layout, dark theme styling, provider filtering, and other column visibility preferences, remains unchanged.
- AC7: Viewer tests cover default visibility, persisted column visibility, menu rendering, and a permission edit flow.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries are explicit: CDX status table permission display/editing is in scope; unrelated table redesign is out of scope.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# References
- `clients/viewer/browser-host.js`
- `clients/viewer/viewer.css`
- `tests/viewer.browser-host.test.ts`

# Risks and dependencies
- Risk: the current CDX status payload or API may not expose a direct permission update path; mitigate by reusing existing CDX permission values and adding only a narrow viewer endpoint if needed.
- Risk: adding an editable table cell can disturb compact table layout; mitigate with targeted DOM/CSS tests around status table columns.

# Backlog
- `item_473_add_editable_permission_column_to_the_status_table`
