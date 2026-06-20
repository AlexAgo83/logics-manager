## task_257_readable_recent_activity_cells_and_document_classification_badges - Readable Recent Activity cells and document classification badges
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] In the shared renderer (`clients/shared-web/media/renderBoardApp.js`, `getDocumentPrefix` `:826`), make the classification badge self-explanatory: keep the compact prefix but add a readable label and/or icon plus an accessible `aria-label`/title (e.g. "Architecture · A003").
- [ ] Redesign the Recent Activity cell so it clearly shows the document, the change kind (created/updated/status-change), the status transition (from → to) when applicable, and a human-friendly time (activity source `clients/viewer/browser-host.js:900-921`).
- [ ] Ensure the change applies through the shared renderer so the VS Code webview and the browser viewer stay consistent.
- [ ] Tests cover the badge labelling/`aria-label` and the activity cell rendering; `viewer_assets/` synced.

# Backlog
- `item_464_readable_recent_activity_cells_and_document_classification_badges`

# Acceptance criteria
- AC1: The classification badge conveys meaning without prior knowledge of the letter codes (label/icon + accessible tooltip), staying compact.
- AC2: The activity cell communicates document, change kind, status transition (when applicable), and a readable timestamp.
- AC3: The change is in the shared renderer; webview and browser viewer stay consistent.
- AC4: No regression; tests cover badge labelling and activity cell; `viewer_assets/` synced.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run` (board/activity + viewer tests).
- Run `python3 -m logics_manager flow finish task task_257_readable_recent_activity_cells_and_document_classification_badges.md` after implementation.

# Report
- Pending implementation.

# AI Context
- Summary: Make the P/A/... pills and the Recent Activity cell self-explanatory in the shared renderer.
- Keywords: recent activity, classification badge, getDocumentPrefix, readability, aria-label, shared renderer
- Use when: You need the bounded implementation task for activity/badge readability.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
