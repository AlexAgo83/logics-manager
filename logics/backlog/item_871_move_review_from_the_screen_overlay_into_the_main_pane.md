## item_871_move_review_from_the_screen_overlay_into_the_main_pane - Move Review from the screen overlay into the main pane
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 93%
> Confidence: 90%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Gives Review its own region in layout__main and stops rendering it through the screen overlay.
- Keywords: move, review, screen, overlay, main, pane
- Use when: moving a surface between the screen container and the main pane.
- Skip when: working on the Explorer or the surface control.

# Problem
- `showReviewTimeline` renders through `host.setDocument("Review", ...)`, which fills `.viewer-document`, a fixed overlay with Refresh, Minimize and Close chrome. Review appears as a window over the viewer instead of as a surface in it.
- Activity and Project are regions inside `<main class="layout__main">`, switched by a body class. Review has no region there.

# Scope
- In:
  - Add a `#review-panel` region to `<main class="layout__main">` beside `#board` and `#activity-panel`.
  - Render the Review timeline into that region and stop calling `setDocument` for Review.
  - Drive the three regions' visibility from the `viewer-screen-*` body classes in CSS, so it survives the shared-web renders that re-assert `board.hidden` and `activityPanel.hidden`.
  - Keep the Review meta line, refresh path, burst and file selection, and keyboard binding working against the new container.
  - Keep screens reachable from Review: opening Workshop or Git from the Review surface and closing it must return to Review.
  - Cover the container, the switching, and the re-render survival in browser-host tests, and assert in the visual campaign that Review renders with no visible `.viewer-document`.
- Out:
  - The Review timeline's own rendering, payload and keyboard behavior.
  - Changing how Workshop, Git, CDX or Insights use the screen container.
  - The Explorer and the surface control, which are sibling slices.

# Acceptance criteria
- AC1: Selecting Review renders into `#review-panel` inside `layout__main`, and `.viewer-document` stays hidden throughout.
- AC2: Exactly one of board, activity panel and review panel is visible per surface, and a shared-web re-render does not change that.
- AC3: Opening a screen from Review and closing it returns to the Review surface.
- AC4: The Review meta line, refresh, burst and file selection, and keyboard navigation work in the new container.
- AC5: Browser-host tests cover the container, the switching and the re-render survival.
- AC6: The campaign asserts Review renders in the main pane with no visible screen overlay.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Selecting Review renders into `#review-panel` inside `layout__main`, and `.viewer-document` stays hidden throughout.
- request-AC2 -> This backlog slice. Proof: AC2: Exactly one of board, activity panel and review panel is visible per surface, and a shared-web re-render does not change that.
- request-AC3 -> This backlog slice. Proof: AC3: Opening a screen from Review and closing it returns to the Review surface.
- request-AC9 -> This backlog slice. Proof: AC5: Browser-host tests cover the container, the switching and the re-render survival.
- request-AC10 -> This backlog slice. Proof: AC6: The campaign asserts Review renders in the main pane with no visible screen overlay.
- request-AC11 -> This backlog slice. Proof: AC4: The Review meta line, refresh, burst and file selection, and keyboard navigation work in the new container.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_114_review_as_a_real_viewer_surface`
- Architecture decision(s): (none yet)
- Request: `req_385_render_review_in_the_main_pane_and_repair_the_explorer_detail_pane_and_surface_control`
- Primary task(s): `task_397_orchestrate_the_review_main_pane_move_and_the_explorer_and_control_repairs`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
