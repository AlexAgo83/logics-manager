## task_264_add_favorite_projects_in_the_project_selector - Add favorite projects in the project selector
> From version: 2.12.6
> Schema version: 1.0
> Status: Ready
> Understanding: 95
> Confidence: 90
> Progress: 0%
> Complexity: Medium
> Theme: Viewer project switching
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] `clients/viewer/browser-host.js` renders a star toggle for every `#viewer-project-menu` project row.
- [ ] Favorite state is stored in viewer-local preferences and restored when the viewer reloads.
- [ ] Favorite projects sort before non-favorites with stable ordering inside each group.
- [ ] Filled favorite stars are visible at rest; empty non-favorite stars appear only on hover/focus.
- [ ] Star activation toggles favorite state without triggering `switchViewerProject` unless the row itself is activated.
- [ ] `clients/viewer/viewer.css` keeps the selector compact and keyboard-focusable.
- [ ] `tests/viewer.browser-host.test.ts` covers favorite ordering, star toggle behavior, persisted restore, and existing project switching behavior.

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

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run tests/viewer.browser-host.test.ts`.
- Run the viewer asset sync/check command if `viewer_assets/` changes.
- Run `python3 -m logics_manager flow finish task task_264_add_favorite_projects_in_the_project_selector.md` after implementation.

# Report
- Pending implementation.

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
