## item_471_add_favorite_projects_in_the_project_selector - Add favorite projects in the project selector
> From version: 2.12.6
> Schema version: 1.0
> Status: Done
> Understanding: 95
> Confidence: 90
> Progress: 100%
> Complexity: Medium
> Theme: Viewer project switching
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The viewer project selector lists known Logics projects in a flat order. Operators who switch between the same projects repeatedly need a lightweight way to pin those projects to the top without changing project discovery, project opening, validation, or the folder picker.

# Scope
- In:
  - Add a star control to rows rendered by the viewer topbar project selector.
  - Persist favorite project IDs or roots in viewer-local preference state.
  - Sort favorite projects before non-favorites while keeping each group's existing relative order.
  - Keep non-favorite stars visually quiet by showing them only on hover or keyboard focus.
  - Extend project selector tests for star visibility, toggle behavior, ordering, and persistence.
- Out:
  - Changing how projects are discovered, selected, opened, or validated.
  - Changing the project folder picker tree behavior.
  - Adding a separate favorites management screen.
  - Syncing favorites across machines or users.

# Acceptance criteria
- AC1: Each project row in `#viewer-project-menu` exposes a favorite star control.
- AC2: Favorite projects render before non-favorites, with stable ordering inside both groups.
- AC3: Filled stars are always visible for favorites; empty stars appear for non-favorites only on row hover or keyboard focus.
- AC4: Toggling a star persists favorite state and does not switch the active project unless the project row itself is activated.
- AC5: Favorites survive viewer reload/reopen through the existing viewer preferences or equivalent local persistence.
- AC6: Existing project switching, "Choose folder...", and outside-click/Escape menu closing behavior remain unchanged.
- AC7: `tests/viewer.browser-host.test.ts` covers ordering, persistence, and pointer/keyboard-safe toggling.

# AC Traceability
- request-AC1 -> AC1. Proof: The backlog requires a star control per project row.
- request-AC2 -> AC3. Proof: The backlog preserves filled/empty star visibility rules.
- request-AC3 -> AC2 and AC6. Proof: The backlog requires favorite-first ordering without changing project selection behavior.
- request-AC4 -> AC5. Proof: The backlog requires local persistence across viewer reload/reopen.
- request-AC5 -> AC4. Proof: The backlog requires star activation to avoid accidental project switching.
- request-AC6 -> AC7. Proof: The backlog requires targeted viewer tests for the full behavior.

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
- Request: `logics/request/req_267_add_favorite_projects_in_the_project_selector.md`
- Primary task(s): `logics/tasks/task_264_add_favorite_projects_in_the_project_selector.md`

# AI Context
- Summary: Add persisted favorite project stars to the viewer topbar project selector and sort favorites first.
- Keywords: viewer, project selector, favorites, topbar, local persistence, browser-host
- Use when: Implementing or reviewing the viewer project selector favorites slice.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
  - Medium: improves repeated project switching for operators with multiple Logics workspaces.
- Urgency:
  - Medium: valuable UX improvement with limited surface area.

# Notes
- Hybrid rationale: Derived from request `req_267_add_favorite_projects_in_the_project_selector` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_267_add_favorite_projects_in_the_project_selector.md`.
- Generated locally by logics-manager.
- Likely implementation surface: `clients/viewer/browser-host.js` around `renderProjectMenu`, `switchViewerProject`, and viewer preference helpers; `clients/viewer/viewer.css` for row/star visibility; `tests/viewer.browser-host.test.ts` for DOM behavior.
- Persistence should prefer an existing viewer preference path if one already covers local UI state.
- Task `task_264_add_favorite_projects_in_the_project_selector` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_264_add_favorite_projects_in_the_project_selector`
