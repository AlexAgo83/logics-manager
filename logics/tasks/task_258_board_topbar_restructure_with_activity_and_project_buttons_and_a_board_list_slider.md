## task_258_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider - Board topbar restructure with Activity and Project slider plus project display mode
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 96%
> Confidence: 88%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] Correct the topbar slider to mean Activity/Project, not Board/List: Activity opens Recent Activity; Project returns to the selected project view.
- [x] Keep Board/List as a separate project display-mode control (`data-action="toggle-view-mode"`) so Project respects whichever display mode is selected.
- [x] Responsive CSS (`clients/viewer/viewer.css`, `@media (max-width: 640px)`): mobile → search bar on its own full-width line, Activity/Project slider right-anchored on the controls line; desktop → single line.
- [x] Gate project controls while Activity is selected: search, filter, attention, and Board/List controls are hidden; clear-activity remains available. Hide clear-activity while Project is selected.
- [x] Tests cover Activity/Project slider placement, shared chrome state, conditional controls CSS, and the mobile reflow CSS; `viewer_assets/` synced.
- [ ] Follow-up: extend conditional left-control gating to non-corpus remote/workshop screens if the floating document surface stops covering the board toolbar.

# Backlog
- `item_465_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider`

# Acceptance criteria
- AC1: Distinct Activity and Project controls; Activity opens Recent Activity, Project opens board/list.
- AC2: Left-hand controls appear only on applicable screens, hidden otherwise.
- AC3: The Activity/Project toggle is a slider to the right of the search docs bar; Board/List remains a project display-mode control and is not the main slider.
- AC4: Mobile → search bar full-width on its own line, slider right-anchored on the controls line; desktop → one line.
- AC5: No regression in nav/search/filter; tests + `viewer_assets/` sync pass.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run`; manually verify desktop and mobile-width layouts.
- Run `python3 -m logics_manager flow finish task task_258_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider.md` after implementation.

# Report
- Implemented correction: the `.toolbar__view` slider now controls Activity/Project. Activity opens the Recent Activity panel; Project shows the board/list project surface according to the existing selected display mode. The Board/List control moved back to a compact project display button using the shared `data-action="toggle-view-mode"` handler instead of masquerading as the main slider.
- Conditional controls: `webviewChrome.js` writes `data-current-mode="activity|project"` and body classes (`viewer-screen-activity`/`viewer-screen-project`); CSS hides project search/filter/attention/display controls while Activity is selected and hides clear-activity while Project is selected.
- Validation: viewer suite (117) covers Activity/Project markup, shared chrome state, conditional controls CSS, mobile reflow, and no regression in the project display-mode control. `viewer_assets/` synced, including packaged `webviewChrome.js`.

# AI Context
- Summary: Split Activity/Project into the main slider, keep Board/List as the Project display mode, and gate controls by selected section.
- Keywords: topbar, Activity, Project, board, list, slider, search bar, responsive, conditional controls
- Use when: You need the bounded implementation task for the board topbar restructure.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC2 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC3 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC4 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC5 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC6 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC7 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
