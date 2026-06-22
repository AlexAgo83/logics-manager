## task_263_move_top_segmented_navigation_buttons_below_window_controls - Move top segmented navigation buttons below window controls
> From version: 2.12.3
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_470_move_top_segmented_navigation_buttons_below_window_controls`

# Acceptance criteria
- AC1: The segmented navigation groups for CDX (`Sessions / Missions / Reports / History`) and Workshop (`Terminals / Commands / Explorer`) render below the top window-control/header area instead of floating in the same row as the main topbar actions.
- AC2: Every repeated instance of the CDX segmented group follows the same placement rule, so the viewer does not show duplicate or competing segmented controls in different top chrome areas.
- AC3: Existing navigation behavior is preserved: clicking each segmented control still opens the same subview and keeps the current selected-state styling.
- AC4: Desktop layout keeps the project selector, Settings, search bar, Activity/Project slider, and segmented groups aligned without overlap or horizontal jitter when switching main viewer screens.
- AC5: Narrow layouts wrap or stack the segmented groups predictably without clipping labels or covering the window controls/topbar content.
- AC6: Tests cover the new chrome structure and at least one preserved navigation path for each affected group.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_263_move_top_segmented_navigation_buttons_below_window_controls.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement move top segmented navigation buttons below window controls.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_266_move_top_segmented_navigation_buttons_below_window_controls`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
