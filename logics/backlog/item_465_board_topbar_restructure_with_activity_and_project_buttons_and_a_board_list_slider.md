## item_465_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider - Board topbar restructure with Activity and Project slider plus project display mode
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 96%
> Confidence: 88%
> Progress: 90%
> Complexity: Medium
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The board chrome mixes navigation and view controls. Recent Activity is a toolbar toggle (`#activity-toggle`) rather than a first-class destination, there is no explicit "Project" (corpus board/list) entry point, and the left-hand view controls show regardless of the active screen. The main topbar slider must switch between Activity and Project; Board/List is only the selected Project display mode and must not be represented as the primary slider.

# Scope
- In:
  - Add two clear topbar entry points: Activity (opens the Recent Activity screen) and Project (opens the corpus board/list view).
  - Show/hide the left-hand controls (`.toolbar__filters`, `#filter-panel`) depending on the active screen (e.g. corpus controls only on Project).
  - Add an Activity/Project slider placed to the right of the search docs bar.
  - Keep Board/List as a separate Project display-mode control using the existing `data-action="toggle-view-mode"` handler.
  - Responsive layout: on mobile the search docs bar moves to its own full-width line; the Activity/Project slider stays right-anchored on the same line as the left-hand buttons.
- Out:
  - Changing what the board/list views render (data/cards unchanged).
  - The Recent Activity cell content redesign (covered by item_464).
  - A broader visual theme change.

# Acceptance criteria
- AC1: The topbar exposes distinct Activity and Project controls; Activity opens the Recent Activity screen and Project opens the corpus board/list view.
- AC2: Left-hand view controls appear only on the screens where they apply (e.g. corpus controls on Project) and are hidden otherwise.
- AC3: The Activity/Project toggle is rendered as the slider positioned to the right of the search docs bar; Board/List remains a Project display-mode control.
- AC4: On a mobile-width viewport the search docs bar occupies its own full-width line and the slider remains right-anchored on the controls-buttons line; on desktop they share one line.
- AC5: No regression in navigation/search/filter behavior; tests cover the Activity/Project routing, the conditional controls, and the slider placement, and the dual-copy `viewer_assets/` stays in sync.

# AC Traceability
- request-AC4 -> This backlog slice delivers the Activity/Project split, conditional controls, a Project display-mode control for Board/List, and the Activity/Project slider with a mobile layout. Proof: AC1, AC2, AC3, AC4.
- request-AC7 -> No regression. Proof: AC5 (tests pass; dual-copy synced).
- request-AC6 -> This backlog slice. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`
- Primary task(s): `task_258_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider`

# AI Context
- Summary: Split Activity vs Project in the topbar, gate left controls per section, and keep Board/List as the Project display mode.
- Keywords: topbar, Activity, Project, board, list, view-mode toggle, slider, search bar, responsive, mobile, conditional controls
- Use when: Implementing or reviewing the board topbar/layout.
- Skip when: The change is unrelated to topbar/layout chrome.

# Priority
- Impact: Medium — clarifies navigation and view controls.
- Urgency: Low.

# Notes
- Hybrid rationale: Derived from request `req_263_...` and kept bounded to the topbar/layout slice.
- Source file: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`.

# Tasks
- `task_258_board_topbar_restructure_with_activity_and_project_buttons_and_a_board_list_slider`
