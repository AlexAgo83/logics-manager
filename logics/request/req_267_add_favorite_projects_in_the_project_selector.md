## req_267_add_favorite_projects_in_the_project_selector - Add favorite projects in the project selector
> From version: 2.12.6
> Schema version: 1.0
> Status: Ready
> Understanding: 95
> Confidence: 90
> Complexity: Medium
> Theme: Viewer project switching
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Add a favorite toggle to each project row in the viewer project selector.
- Show a filled star when a project is marked as favorite.
- Show an empty star when a project is not favorite, but only while the row is hovered or focused.
- Keep filled stars visible at rest so favorite state is obvious.
- Sort favorite projects above non-favorite projects while preserving the existing relative order inside each group.
- Toggle favorite state directly from the row star without opening another menu or asking for confirmation.
- Persist favorites so they survive closing and reopening the viewer.

# Context
- The project selector currently lists all available Logics projects in a flat order. As the number of projects grows, switching to frequently used projects becomes slower.
- Adding favorites will make the selector more efficient by letting users pin their most-used projects at the top while keeping the interface clean. The interaction should stay lightweight: no extra menu, no confirmation step, just a direct star toggle inside each project row.
- This request only concerns the project selector UI and the project ordering logic. It should not change how projects are detected, opened, or validated.

# Authoring note
- This request was created directly by the user from the viewer.
- If an assistant reads this request, it may reformat it, translate it to English, and improve clarity while preserving the user's intent.

# Acceptance Criteria
- AC1: Each project row in the topbar project selector exposes a star toggle that can mark or unmark the project as favorite.
- AC2: Favorite rows show a filled star at rest; non-favorite rows show an empty star only on hover or keyboard focus.
- AC3: Favorite projects render before non-favorite projects in the selector, without changing project discovery, selection, validation, or picker behavior.
- AC4: Favorite state is persisted locally and restored after the viewer is closed and reopened.
- AC5: Keyboard and pointer interactions remain usable: toggling the star must not accidentally switch projects unless the user activates the row itself.
- AC6: Existing project selector tests are updated or extended to cover ordering, toggle behavior, and persistence.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries are explicit: project selector favorites are in scope; project discovery/opening/validation changes are out of scope.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# References
- `clients/viewer/browser-host.js`
- `clients/viewer/viewer.css`
- `tests/viewer.browser-host.test.ts`

# Risks and dependencies
- Risk: adding a star inside a project row can accidentally trigger project switching; mitigate by separating star activation from row activation in tests.
- Risk: persisted favorites can drift if project IDs change; prefer the existing stable project identity and document the fallback behavior in implementation.

# Backlog
- `item_471_add_favorite_projects_in_the_project_selector`
