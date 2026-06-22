## task_263_move_top_segmented_navigation_buttons_below_window_controls - Move top segmented navigation buttons below window controls
> From version: 2.12.3
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

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
- `rtk npm test -- tests/viewer.browser-host.test.ts` passed: 1 test file, 140 tests.
- `rtk npm run check:viewer-assets` passed.
- rtk npm test -- tests/viewer.browser-host.test.ts passed (140 tests); rtk npm run check:viewer-assets passed; rtk logics-manager lint --require-status passed; rtk logics-manager audit passed
- Finish workflow executed on 2026-06-22.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-22.
- Linked backlog item(s): `item_470_move_top_segmented_navigation_buttons_below_window_controls`
- Related request(s): `req_266_move_top_segmented_navigation_buttons_below_window_controls`

# AI Context
- Summary: Implement move top segmented navigation buttons below window controls.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_266_move_top_segmented_navigation_buttons_below_window_controls`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: `clients/viewer/index.html` adds `#viewer-document-nav` inside `.viewer-document__header`, below the Close/Refresh action row; `clients/viewer/browser-host.js` moves Workshop/CDX/Remote screen tablists into that header nav after rendering.
- request-AC2 -> This task. Proof: the original topbar `viewer-nav-menu__panel` menus remain in place, while each rendered screen has its tablist moved into the single document-header nav zone instead of duplicating competing segments in content and chrome.
- request-AC3 -> This task. Proof: the moved tablists keep the same DOM buttons (`data-viewer-workshop-tab`, `data-viewer-cdx-mode`, `data-viewer-ci-mode`), so delegated click handlers and `is-active` selected-state styling continue to work.
- request-AC4 -> This task. Proof: project selector, Settings, search bar, and Activity/Project slider remain untouched; the new `.viewer-document__nav` is scoped to the open screen header and does not alter the global toolbar layout.
- request-AC5 -> This task. Proof: `.viewer-document__nav` wraps the existing mode/tab controls inside the document header, right-aligned on desktop and left-aligned at narrow widths without absolute positioning over header actions.
- request-AC6 -> This task. Proof: `rtk npm test -- tests/viewer.browser-host.test.ts` covers intact topbar menus, document-header nav placement, and preserved Remote/CDX navigation paths; `rtk npm run check:viewer-assets` confirms packaged viewer assets match.
