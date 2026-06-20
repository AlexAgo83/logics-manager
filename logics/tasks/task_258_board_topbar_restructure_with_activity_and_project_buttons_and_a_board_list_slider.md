## task_258_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider - Board topbar restructure with Activity and Project buttons and a board-list slider
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 88%
> Confidence: 78%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] Add Activity and Project topbar entry points (`clients/viewer/index.html`): Activity opens the Recent Activity screen (currently `#activity-toggle` `:124`), Project opens the corpus board/list view.
- [ ] Gate the left-hand controls (`.toolbar__filters` `:110`, `#filter-panel` `:138`) by active screen (corpus controls on Project; hidden otherwise).
- [ ] Move the board/list view-mode toggle (`data-action="toggle-view-mode"` `:116`) to a slider rendered to the right of the search docs bar (`#search-input` `:134`).
- [ ] Responsive CSS (`clients/shared-web/media/css/toolbar.css`): mobile → search bar on its own full-width line, slider right-anchored on the controls-buttons line; desktop → single line.
- [ ] Tests cover Activity/Project routing, conditional controls per screen, and slider placement; `viewer_assets/` synced.

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
- Pending implementation.

# AI Context
- Summary: Split Activity/Project, gate left controls per screen, move board/list toggle to a slider beside search with a mobile layout.
- Keywords: topbar, Activity, Project, board, list, slider, search bar, responsive, conditional controls
- Use when: You need the bounded implementation task for the board topbar restructure.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
