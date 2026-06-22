## req_266_move_top_segmented_navigation_buttons_below_window_controls - Move top segmented navigation buttons below window controls
> From version: 2.12.3
> Schema version: 1.0
> Status: Ready
> Understanding: 88%
> Confidence: 82%
> Complexity: Medium
> Theme: Viewer navigation
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Move the segmented navigation button groups so they sit directly under the top window-control area instead of competing with the current topbar layout.
- Apply the same placement rule to every repeated segmented navigation group in the local viewer chrome, including:
  - `Sessions / Missions / Reports / History`
  - `Terminals / Commands / Explorer`
  - any other repeated instance of the same segmented group pattern in the top UI area.
- Keep the app chrome clearer and more consistent by grouping these navigation controls in one predictable area while preserving the existing button behavior.

# Context
- The current placement of these segmented buttons makes the window header feel visually cluttered and less coherent. These controls are part of the app-level navigation, so they should sit just below the native window controls and align cleanly with the top chrome layout.
- The implementation should preserve the existing behavior of the buttons. This request is about layout and positioning only, not changing the navigation logic, labels, or selected states.
- The local viewer already has multiple top-level menu groups (`Remote`, `CDX`, `Workshop`) whose submenu buttons expose the segmented groups. This request is about reorganizing those visible segmented controls and their responsive positioning, not adding new navigation destinations.

## In scope
- Viewer chrome layout changes for the top segmented navigation groups.
- Consistent desktop placement beneath the window-control/header area.
- Responsive behavior for narrow widths so the groups wrap or stack without overlapping the title, project selector, settings, search, or Activity/Project slider.
- Regression coverage for DOM structure/CSS behavior and existing click behavior.

## Out of scope
- Renaming navigation labels.
- Changing selected-state semantics, subview routing, or data loading.
- Redesigning the full topbar, settings menu, project selector, or Activity/Project toolbar.
- Native OS window-control integration beyond aligning the viewer chrome beneath that area.

# Acceptance criteria
- AC1: The segmented navigation groups for CDX (`Sessions / Missions / Reports / History`) and Workshop (`Terminals / Commands / Explorer`) render below the top window-control/header area instead of floating in the same row as the main topbar actions.
- AC2: Every repeated instance of the CDX segmented group follows the same placement rule, so the viewer does not show duplicate or competing segmented controls in different top chrome areas.
- AC3: Existing navigation behavior is preserved: clicking each segmented control still opens the same subview and keeps the current selected-state styling.
- AC4: Desktop layout keeps the project selector, Settings, search bar, Activity/Project slider, and segmented groups aligned without overlap or horizontal jitter when switching main viewer screens.
- AC5: Narrow layouts wrap or stack the segmented groups predictably without clipping labels or covering the window controls/topbar content.
- AC6: Tests cover the new chrome structure and at least one preserved navigation path for each affected group.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/viewer/index.html`
- `clients/viewer/viewer.css`
- `clients/viewer/browser-host.js`
- `clients/shared-web/media/toolsPanelLayout.js`
- `tests/viewer.browser-host.test.ts`
- `tests/run_local_viewer_visual_smoke.mjs`

# AI Context
- Summary: Move repeated top segmented navigation controls below the window-control/header area while preserving navigation behavior and responsive viewer chrome.
- Keywords: viewer-chrome, segmented-navigation, cdx-tabs, workshop-tabs, topbar-layout, responsive, window-controls
- Use when: Planning or implementing the viewer chrome layout change for top segmented navigation groups.
- Skip when: The work changes navigation labels, routing semantics, or unrelated toolbar surfaces.

# Risks and dependencies
- Risk: moving segmented controls can break click delegation or selected-state styling; mitigate with browser-host tests that click one CDX and one Workshop segmented control after the layout move.
- Risk: desktop alignment can regress the recently stabilized search/Activity/Project toolbar; mitigate with CSS tests and visual smoke coverage.
- Depends on: current local viewer topbar/menu structure and existing subview navigation handlers.

# Authoring note
- This request was created directly by the user from the viewer.
- If an assistant reads this request, it may reformat it, translate it to English, and improve clarity while preserving the user's intent.

# Backlog
- `item_470_move_top_segmented_navigation_buttons_below_window_controls`
