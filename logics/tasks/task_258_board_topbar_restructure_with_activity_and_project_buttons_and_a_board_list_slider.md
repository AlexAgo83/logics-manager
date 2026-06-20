## task_258_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider - Board topbar restructure with Activity and Project buttons and a board-list slider
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 80%
> Progress: 50%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] Move the board/list view-mode toggle to a slider rendered to the right of the search docs bar (`.toolbar__view` after `.toolbar__search` in `clients/viewer/index.html`), keeping `data-action="toggle-view-mode"` so the shared handler still flips it; styled via CSS keyed on `data-current-mode` (no shared-JS change, webview unaffected).
- [x] Responsive CSS (`clients/viewer/viewer.css`, `@media (max-width: 640px)`): mobile → search bar on its own full-width line, slider right-anchored on the controls line; desktop → single line.
- [x] Tests cover slider placement (after search, removed from filters) and the mobile reflow CSS; `viewer_assets/` synced.
- [ ] Follow-up: add explicit Activity and Project topbar entry points (Activity → Recent Activity panel, Project → board/list) — needs coordination with the shared activity-panel state in `mainApp.js`/`webviewChrome.js`.
- [ ] Follow-up: gate the left-hand controls (`.toolbar__filters`/`#filter-panel`) by active screen (corpus controls on Project; hidden on CDX/Workshop/Git screens).

# Backlog
- `item_465_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider`

# Acceptance criteria
- AC1: Distinct Activity and Project controls; Activity opens Recent Activity, Project opens board/list.
- AC2: Left-hand controls appear only on applicable screens, hidden otherwise.
- AC3: The board/list toggle is a slider to the right of the search docs bar.
- AC4: Mobile → search bar full-width on its own line, slider right-anchored on the controls line; desktop → one line.
- AC5: No regression in nav/search/filter; tests + `viewer_assets/` sync pass.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run`; manually verify desktop and mobile-width layouts.
- Run `python3 -m logics_manager flow finish task task_258_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider.md` after implementation.

# Report
- Implemented (AC3 + AC4): the board/list toggle is now a slider in a `.toolbar__view` group placed to the right of the search bar; the shared `toggle-view-mode` handler still drives it and `viewer.css` renders the slider from `data-current-mode` (knob slides on "list"). Mobile reflow (`@media max-width: 640px`) drops the search bar to a full-width line and right-anchors the slider on the controls line. Two structural tests added; suite green (115). `viewer_assets/` synced.
- Remaining (AC1 + AC2): explicit Activity/Project entry points and per-screen conditional left controls are deferred — they require coordinating with the shared activity-panel state (`mainApp.js`/`webviewChrome.js`) and are tracked as the open DoD items.

# AI Context
- Summary: Split Activity/Project, gate left controls per screen, move board/list toggle to a slider beside search with a mobile layout.
- Keywords: topbar, Activity, Project, board, list, slider, search bar, responsive, conditional controls
- Use when: You need the bounded implementation task for the board topbar restructure.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
