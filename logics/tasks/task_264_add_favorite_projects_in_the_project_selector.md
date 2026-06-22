## task_264_add_favorite_projects_in_the_project_selector - Add favorite projects in the project selector
> From version: 2.12.6
> Schema version: 1.0
> Status: Done
> Understanding: 95
> Confidence: 90
> Progress: 100%
> Complexity: Medium
> Theme: Viewer project switching
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] `clients/viewer/browser-host.js` renders a star toggle for every `#viewer-project-menu` project row.
- [x] Favorite state is stored in viewer-local preferences and restored when the viewer reloads.
- [x] Favorite projects sort before non-favorites with stable ordering inside each group.
- [x] Filled favorite stars are visible at rest; empty non-favorite stars appear only on hover/focus.
- [x] Star activation toggles favorite state without triggering `switchViewerProject` unless the row itself is activated.
- [x] `clients/viewer/viewer.css` keeps the selector compact and keyboard-focusable.
- [x] `tests/viewer.browser-host.test.ts` covers favorite ordering, star toggle behavior, persisted restore, and existing project switching behavior.

# Backlog
- `item_471_add_favorite_projects_in_the_project_selector`

# Acceptance criteria
- AC1: Each project row in `#viewer-project-menu` exposes a favorite star control.
- AC2: Favorite projects render before non-favorites, with stable ordering inside both groups.
- AC3: Filled stars are always visible for favorites; empty stars appear for non-favorites only on row hover or keyboard focus.
- AC4: Toggling a star persists favorite state and does not switch the active project unless the project row itself is activated.
- AC5: Favorites survive viewer reload/reopen through the existing viewer preferences or equivalent local persistence.
- AC6: Existing project switching, "Choose folder...", and outside-click/Escape menu closing behavior remain unchanged.
- AC7: `tests/viewer.browser-host.test.ts` covers ordering, persistence, and pointer/keyboard-safe toggling.

# AC Traceability
- request-AC1 -> This task. Proof: `clients/viewer/browser-host.js` renders `data-viewer-project-favorite` star buttons for project menu rows and `tests/viewer.browser-host.test.ts` verifies toggling.
- request-AC2 -> This task. Proof: `clients/viewer/viewer.css` keeps favorite stars visible and hides non-favorite stars until row hover or focus.
- request-AC3 -> This task. Proof: `renderProjectMenu` sorts favorite projects first while preserving original ordering inside favorite and non-favorite groups; existing switching and picker tests still pass.
- request-AC4 -> This task. Proof: favorite IDs persist in `logics.localViewer.preferences.v1` and the restore test seeds preferences before rendering.
- request-AC5 -> This task. Proof: the star handler stops propagation and the toggle test asserts no `/api/switch-project` call occurs when activating the star.
- request-AC6 -> This task. Proof: `npx vitest run tests/viewer.browser-host.test.ts` passes with existing project switching, picker, outside-click, and Escape menu coverage.
- backlog-AC1..AC7 -> This task. Proof: implemented the full favorite project selector delivery slice across `clients/viewer/browser-host.js`, `clients/viewer/viewer.css`, synced `viewer_assets/viewer/`, and targeted viewer tests.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run tests/viewer.browser-host.test.ts`.
- Run the viewer asset sync/check command if `viewer_assets/` changes.
- Run `python3 -m logics_manager flow finish task task_264_add_favorite_projects_in_the_project_selector.md` after implementation.
- Finish workflow executed on 2026-06-22.
- Linked backlog/request close verification passed.

# Report
- Implemented persisted project favorites in the topbar project selector.
- Added favorite-first stable ordering, compact star controls, and hover/focus visibility styling.
- Added viewer tests for favorite toggle persistence, ordering, restore behavior, and switch-safety.
- Finished on 2026-06-22.
- Linked backlog item(s): `item_471_add_favorite_projects_in_the_project_selector`
- Related request(s): `req_267_add_favorite_projects_in_the_project_selector`

# AI Context
- Summary: Implement persisted favorite project stars and favorite-first ordering in the viewer project selector.
- Keywords: viewer, project selector, favorites, preferences, browser-host, CSS, tests
- Use when: You need the bounded implementation task for project selector favorites.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_267_add_favorite_projects_in_the_project_selector`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# Implementation notes
- Start at `clients/viewer/browser-host.js` around `renderProjectMenu`, `switchViewerProject`, and the viewer preference helpers.
- Prefer using a stable project identity already present in `latestProjects`; use `project.id` when it is stable, with `project.root` as a fallback only if needed.
- Keep the star button separate from the row activation path and stop propagation on star clicks.
- Extend existing tests near "switches the active project from the topbar project menu" and project menu close behavior.
