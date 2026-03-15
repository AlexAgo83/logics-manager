## item_060_move_refresh_from_the_toolbar_to_the_tools_menu - Move Refresh from the toolbar to the Tools menu
> From version: 1.10.0
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
> Complexity: Low
> Theme: Toolbar prioritization and tools-menu cleanup
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
`Refresh` still occupies permanent space in the primary toolbar even though it behaves more like a workspace utility action than a top-level browsing control.

That keeps avoidable pressure on the toolbar and weakens the information hierarchy of the top row, especially in narrower widths.

# Scope
- In:
  - Remove the standalone `Refresh` button from the toolbar.
  - Add `Refresh` to the `Tools` menu.
  - Place it under `Use workspace` in the menu ordering.
  - Preserve the current refresh behavior and add regression coverage where needed.
- Out:
  - Changing the semantics of refresh.
  - Broad redesign of the `Tools` menu.
  - Reworking unrelated toolbar actions.

# Acceptance criteria
- AC1: The primary toolbar no longer renders `Refresh` as a standalone button.
- AC2: The `Tools` menu exposes `Refresh`.
- AC3: `Refresh` appears under `Use workspace` in the `Tools` menu.
- AC4: Invoking the menu action preserves the current refresh behavior.
- AC5: The move does not regress keyboard, accessibility, or narrow-width usability.

# Priority
- Impact:
  - Medium: this improves toolbar hierarchy and frees space in a crowded surface.
- Urgency:
  - Medium: worthwhile while the toolbar information architecture is still being refined.

# AC Traceability
- AC1/AC2/AC3 -> `Refresh` now lives in the `Tools` menu under `Use Workspace Root` and is no longer rendered in the toolbar buttons row. Proof: `src/extension.ts`.
- AC4 -> the menu action reuses the existing refresh action wiring. Proof: `media/main.js`.
- AC5 -> harness coverage keeps the tools menu structure visible to tests while the full webview suite remains green. Proof: `tests/webview.harness-a11y.test.ts`, `tests/webview.layout-collapse.test.ts`.

# Notes
- Derived from `logics/request/req_051_move_refresh_from_the_toolbar_to_the_tools_menu.md`.
- `Refresh` should remain available, but as a utility action in `Tools`, not as a persistent toolbar button.

# Tasks
- `logics/tasks/task_065_move_refresh_from_the_toolbar_to_the_tools_menu.md`
