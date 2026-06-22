## item_470_move_top_segmented_navigation_buttons_below_window_controls - Move top segmented navigation buttons below window controls
> From version: 2.12.3
> Schema version: 1.0
> Status: Done
> Understanding: 88%
> Confidence: 82%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer navigation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Move the segmented navigation button groups so they sit directly under the top window-control area instead of competing with the current topbar layout.
Apply the same placement rule to every repeated segmented navigation group in the local viewer chrome, including:
`Sessions / Missions / Reports / History`
`Terminals / Commands / Explorer`
any other repeated instance of the same segmented group pattern in the top UI area.
Keep the app chrome clearer and more consistent by grouping these navigation controls in one predictable area while preserving the existing button behavior.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: The segmented navigation groups for CDX (`Sessions / Missions / Reports / History`) and Workshop (`Terminals / Commands / Explorer`) render below the top window-control/header area instead of floating in the same row as the main topbar actions.
- AC2: Every repeated instance of the CDX segmented group follows the same placement rule, so the viewer does not show duplicate or competing segmented controls in different top chrome areas.
- AC3: Existing navigation behavior is preserved: clicking each segmented control still opens the same subview and keeps the current selected-state styling.
- AC4: Desktop layout keeps the project selector, Settings, search bar, Activity/Project slider, and segmented groups aligned without overlap or horizontal jitter when switching main viewer screens.
- AC5: Narrow layouts wrap or stack the segmented groups predictably without clipping labels or covering the window controls/topbar content.
- AC6: Tests cover the new chrome structure and at least one preserved navigation path for each affected group.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The segmented navigation groups for CDX (`Sessions / Missions / Reports / History`) and Workshop (`Terminals / Commands / Explorer`) render below the top window-control/header area instead of floating in the same row as the main topbar actions.
- request-AC2 -> This backlog slice. Proof: AC2: Every repeated instance of the CDX segmented group follows the same placement rule, so the viewer does not show duplicate or competing segmented controls in different top chrome areas.
- request-AC3 -> This backlog slice. Proof: AC3: Existing navigation behavior is preserved: clicking each segmented control still opens the same subview and keeps the current selected-state styling.
- request-AC4 -> This backlog slice. Proof: AC4: Desktop layout keeps the project selector, Settings, search bar, Activity/Project slider, and segmented groups aligned without overlap or horizontal jitter when switching main viewer screens.
- request-AC5 -> This backlog slice. Proof: AC5: Narrow layouts wrap or stack the segmented groups predictably without clipping labels or covering the window controls/topbar content.
- request-AC6 -> This backlog slice. Proof: AC6: Tests cover the new chrome structure and at least one preserved navigation path for each affected group.

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
- Request: `req_266_move_top_segmented_navigation_buttons_below_window_controls`
- Primary task(s): `task_263_move_top_segmented_navigation_buttons_below_window_controls`

# AI Context
- Summary: Move top segmented navigation buttons below window controls
- Keywords: backlog-groom, request, move top segmented navigation buttons below window controls, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Move top segmented navigation buttons below window controls.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_266_move_top_segmented_navigation_buttons_below_window_controls` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_266_move_top_segmented_navigation_buttons_below_window_controls.md`.
- Generated locally by logics-manager.
- Task `task_263_move_top_segmented_navigation_buttons_below_window_controls` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_263_move_top_segmented_navigation_buttons_below_window_controls`
