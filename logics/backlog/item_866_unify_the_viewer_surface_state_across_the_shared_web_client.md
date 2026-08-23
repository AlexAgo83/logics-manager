## item_866_unify_the_viewer_surface_state_across_the_shared_web_client - Unify the viewer surface state across the shared web client
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Progress: 100%
> Complexity: High
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 15:14:52

# AI Context
- Summary: Unifies the two competing surface states so the Activity panel stops returning over Review on the next render.
- Keywords: unify, viewer, surface, state, across, shared, web, client
- Use when: changing anything that reads or writes the viewer surface across the browser host and the shared web client.
- Skip when: working on the Review payload, the keyboard, or the Explorer.

# Problem
- The tri-state added for Review lives in `browser-host/index.js` while the authoritative boolean lives in `clients/shared-web/media/mainApp.js`. `setViewerSurface()` never writes the boolean.
- `webviewChrome.js` re-asserts `activityPanel.hidden` from that boolean on every chrome render and `mainCore.js` derives `board.hidden` from it, so the Activity panel returns over Review and the project board stays hidden after any render.
- `#activity-toggle` carries both the original toggle handler and the new surface-selector handler, so the same click is interpreted two ways.

# Scope
- In:
  - Decide one owner for the surface value and record the decision in the doc: either the shared-web state carries a three-valued surface, or the browser host owns it and the shared-web boolean becomes a derived read.
  - Move every reader and writer onto that owner: `mainApp.js`, `mainCore.js`, `mainInteractions.js`, `webviewChrome.js`, and the browser-host `setViewerSurface`, `returnToProjectSurface`, and `viewerSurface` helpers.
  - Leave `#activity-toggle` with exactly one click behavior, and make selecting the already-active surface a no-op rather than a toggle.
  - Keep the `viewer-screen-activity`, `viewer-screen-project`, and `viewer-screen-review` body classes as the rendered projection, so existing CSS and the campaign are unaffected.
  - Remove `viewerSurface()` if the unification leaves it without callers, rather than leaving a second reader in place.
  - Cover the regression directly: select Review, trigger an activity dispatch the way a Git action does, and assert the Activity panel stays closed and the board stays visible.
- Out:
  - Any other shared-web state.
  - Restyling the surface control.
  - The Review payload, the Explorer, and the campaign.

# Acceptance criteria
- AC1: One module owns the surface value; a search for the surface boolean and the surface dataset returns that module plus its rendered projection only.
- AC2: After selecting Review, an activity dispatch leaves the Activity panel closed, the project board visible, and Review still rendered.
- AC3: `#activity-toggle` has one click handler, and clicking the active surface changes nothing.
- AC4: The three body classes still reflect the current surface.
- AC5: Browser-host tests cover the surface transitions and the dispatch regression.
- AC6: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks, and `npm run lint` pass for this slice.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: One module owns the surface value; a search for the surface boolean and the surface dataset returns that module plus its rendered projection only. Also: AC2: After selecting Review, an activity dispatch leaves the Activity panel closed, the project board visible, and Review still rendered.
- request-AC2 -> This backlog slice. Proof: AC3: `#activity-toggle` has one click handler, and clicking the active surface changes nothing.
- request-AC15 -> This backlog slice. Proof: AC6: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks, and `npm run lint` pass for this slice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_113_one_viewer_surface_state_and_a_review_timeline_that_can_refresh`
- Architecture decision(s): (none yet)
- Request: `req_384_repair_the_review_slot_and_explorer_delivery_against_the_acceptance_criteria_they_closed_on`
- Primary task(s): `task_396_orchestrate_the_review_and_explorer_repair`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_396_orchestrate_the_review_and_explorer_repair`

# Notes
- Task `task_396_orchestrate_the_review_and_explorer_repair` was finished via `logics-manager flow finish task` on 2026-08-23.
