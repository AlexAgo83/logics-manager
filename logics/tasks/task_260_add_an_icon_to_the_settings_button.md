## task_260_add_an_icon_to_the_settings_button - Add an icon to the Settings button
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 92%
> Progress: 0%
> Complexity: Low
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] Add a gear icon to the Settings button (`#viewer-refresh-menu-button`, `clients/viewer/index.html:77`), consistent with the existing topbar icon style.
- [ ] Preserve the accessible name (visible label and/or `aria-label`/title) and keep the menu behavior unchanged.
- [ ] `viewer_assets/` synced; existing viewer tests pass.

# Backlog
- `item_467_add_an_icon_to_the_settings_button`

# Acceptance criteria
- AC1: The Settings button shows a gear icon consistent with the topbar icon style.
- AC2: The button keeps its accessible name and unchanged behavior.
- AC3: `viewer_assets/` synced; viewer tests pass.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run` (viewer tests).
- Run `python3 -m logics_manager flow finish task task_260_add_an_icon_to_the_settings_button.md` after implementation.

# Report
- Pending implementation.

# AI Context
- Summary: Add a gear icon to the text-only Settings button while preserving accessibility and behavior.
- Keywords: settings button, icon, gear, topbar, accessibility
- Use when: You need the bounded implementation task for the Settings icon.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
