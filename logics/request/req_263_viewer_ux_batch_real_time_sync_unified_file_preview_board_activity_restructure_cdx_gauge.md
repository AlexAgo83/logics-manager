## req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge - Viewer UX batch: real-time sync, unified file preview, board/activity restructure, CDX gauge
> From version: 2.12.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 88%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Operators reported a batch of viewer (browser `cdx view`) pain points; this request bounds them so each can be sliced and shipped independently.
- (1) Sync feels neither real-time nor efficient: the viewer polls a full refresh every X seconds, recomputes even when nothing changed, and the badges fall out of sync — the CI badge never updates until its screen is opened.
- (2) File preview surfaces (Explorer, git preview, CDX logs) silently truncate at a byte limit with no way to force a full load, no line count, no syntax highlighting, and no line numbers.
- (3) The Recent Activity screen shows opaque single-letter pills (P, A, ...) that an operator cannot decode, and the cell as a whole is hard to read.
- (4) The board chrome needs restructuring: a clear Activity vs Project split, left-hand controls that appear per screen, and the board/list toggle relocated next to the search bar (with a mobile layout).
- (5) The CDX status readiness column should reuse the session usage gauge already shown in the terminal view.
- (6) The Settings button has no icon.

# Context
- Sync — the auto-refresh timer calls `autoRefreshItems()` -> `refreshViewer("POST", {silent})` (`clients/viewer/browser-host.js:2609,2547`). When no screen is open it only calls `refreshGitBadgeCounters()`; the unified `/api/status` poll `refreshBadgeCounters()` (which carries git+ci+cdx, `:1910`) is NOT on the recurring timer, so the CI/CDX badges only refresh when their screen is opened. The server already exposes SSE (`text/event-stream`) for Workshop terminals (`logics_manager/viewer.py:3284,3334`) and composes `/api/status` from `_status_component(...)` (`:3594`). Direction: add an `/api/events` SSE channel fed by a server-side file/git watcher (debounced) for near-real-time push, add an ETag/`If-None-Match` short-circuit so an unchanged `/api/status` returns 304, keep polling as a stretched fallback, and put the unified badge refresh on the background tick so CI/CDX stop lagging.
- File preview — limits are hard-coded in `logics_manager/viewer.py:191-197` (`FILE_PREVIEW_MAX_BYTES=300000`, `WORKSPACE_PREVIEW_MAX_BYTES=30000`, `GIT_FILE_PREVIEW_MAX_BYTES=30000`). Payloads already return `truncated: true` (`:801,846`) and the client renders truncation placeholders (`browser-host.js:3445,3462,6268`). No force-load, line count, highlighting, or line numbers exist. Direction: a shared preview component used by Explorer + git preview + CDX logs, with a "load anyway" control (bounded by a hard cap), a discreet line count, local highlight.js, and per-line numbers.
- Activity/badges — the single-letter pills come from `getDocumentPrefix()` in `clients/shared-web/media/renderBoardApp.js:826` (R=request, I=backlog, T=task, P=product, A=architecture, S=spec) + a zero-padded number. That renderer is shared by the VS Code webview and the browser viewer, so a readability fix improves both. Recent Activity history is stored client-side (`browser-host.js:900-921`).
- Board chrome — topbar controls live in `clients/viewer/index.html` (`.toolbar__filters`, search `#search-input`, view-mode toggle `data-action="toggle-view-mode"`, Settings `#viewer-refresh-menu-button`); the filter panel is `#filter-panel`. The primary slider is Activity/Project; Board/List remains the Project display-mode selection.
- CDX gauge — `renderCdxUsageGauge(usage, sessionName)` already exists (`browser-host.js:3957`) and is used by the terminal list; the CDX status table renders the readiness/OK column in `renderCdxStatus` (badges `:5047`). Reuse the gauge there.
- Settings icon — button `#viewer-refresh-menu-button` (`index.html:77`) is text-only.
- Out of scope: a full visual redesign/theme of the viewer; non-viewer surfaces; changing the Logics corpus model.

# Acceptance criteria
- AC1: The viewer reflects corpus/git/CI/CDX changes in near real-time through a server push channel (SSE) with a polling fallback, avoids recompute/transfer when nothing changed (conditional `/api/status`), and the CI and CDX badges update in the background without opening their screens.
- AC2: Every file/preview surface (Explorer, git preview, CDX logs) shows a discreet line count, offers a "load anyway" action wherever content is truncated (bounded by a hard safety cap), and renders known code files with syntax highlighting and per-line numbers.
- AC3: Recent Activity cells and the document classification badges are self-explanatory for an operator who does not know the internal stage codes (no opaque single-letter-only pills).
- AC4: The topbar exposes distinct Activity and Project entry points through the primary slider, left-hand controls appear/hide per active screen, and Board/List remains the selected Project display mode with a defined mobile layout (search bar full-width on its own line, Activity/Project slider right-anchored on the controls line).
- AC5: The CDX status readiness/OK column reuses the shared session usage gauge component from the terminal view.
- AC6: The Settings button carries an icon.
- AC7: No regression — existing viewer/python tests pass and the dual-copy `logics_manager/viewer_assets/viewer/` stays byte-identical with `clients/viewer/`.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/viewer/browser-host.js` (refresh `:2547,2609`, badge poll `:1910`, CDX gauge `:3957`, CDX status `:5047`, truncation placeholders `:3445,3462,6268`)
- `clients/viewer/index.html` (topbar/search/settings `:77,110,134`)
- `clients/shared-web/media/renderBoardApp.js` (`getDocumentPrefix` `:826`)
- `logics_manager/viewer.py` (limits `:191-197`, SSE `:3284,3334`, `/api/status` `:3594`, preview payloads `:793,841`)
- `tests/viewer.browser-host.test.ts`, `tests/python/test_viewer_cli.py`

# AC Traceability
- AC1 -> `item_462_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges`, `task_255_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges`. Proof: the quick badge-refresh fix is implemented and tested; the larger SSE/ETag watcher remains tracked in the task DoD.
- AC2 -> `item_463_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers`, `task_256_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers`. Proof: Explorer, Git diff/file preview, and CDX raw logs share `renderCodeViewer` with line count, non-selectable gutter, syntax highlighting, truncation flags, and force-load where supported.
- AC3 -> `item_464_readable_recent_activity_cells_and_document_classification_badges`, `task_257_readable_recent_activity_cells_and_document_classification_badges`. Proof: activity cells and badges are tracked in the linked slice.
- AC4 -> `item_465_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider`, `task_258_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider`. Proof: the primary topbar slider now switches Activity/Project, Project preserves Board/List selection through the separate display-mode control, and tests cover markup, chrome state, conditional controls, and mobile CSS.
- AC5 -> `item_466_cdx_status_ok_column_uses_the_shared_session_usage_gauge`, `task_259_cdx_status_ok_column_uses_the_shared_session_usage_gauge`. Proof: CDX gauge reuse is tracked in the linked slice.
- AC6 -> `item_467_add_an_icon_to_the_settings_button`. Proof: the Settings icon slice is tracked as its own backlog item.
- AC7 -> `task_255_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges`, `task_256_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers`, `task_258_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider`. Proof: targeted viewer/browser and Python tests pass for the touched surfaces, and `npm run check:viewer-assets` confirms synced packaged viewer assets.

# AI Context
- Summary: Bound six viewer UX needs — real-time sync + badge fix, unified file preview, readable activity/badges, board topbar restructure, CDX readiness gauge, and a Settings icon — to be sliced and shipped independently.
- Keywords: viewer, SSE, real-time, conditional polling, file preview, syntax highlighting, line numbers, recent activity, board, slider, cdx gauge, settings icon
- Use when: Improving the browser viewer's sync, file preview, board chrome, or status surfaces.
- Skip when: A broader viewer visual redesign is already in progress or would conflict.

# Backlog
- `item_462_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges`
- `item_463_unified_file_preview_with_force_load_line_count_syntax_highlighting_and_line_numbers`
- `item_464_readable_recent_activity_cells_and_document_classification_badges`
- `item_465_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider`
- `item_466_cdx_status_ok_column_uses_the_shared_session_usage_gauge`
- `item_467_add_an_icon_to_the_settings_button`
