## item_858_build_the_review_slot_timeline_ui - Build the Review slot timeline UI
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-22 17:28:38

# AI Context
- Summary: Builds the Review viewer slot with a horizontal burst rail, vertical file list, diff pane, and arrow-key navigation.
- Keywords: build, review, slot, timeline
- Use when: implementing the browser-host Review screen, navigation entry, layout, selection, or frontend tests.
- Skip when: changing only backend Git payload construction before the Review route consumes it.

# Problem
- Project and Activity answer what exists and what happened, but neither gives a focused review path through the actual changed files.
- The Git cockpit groups data by Git operation, while the requested workflow is a spatial review: bursts over time horizontally, files vertically, diff as the reading surface.

# Scope
- In:
  - Add a `Review` primary navigation slot and route it through the existing browser-host screen system.
  - Render a horizontal burst rail with stable selected state, concise metadata, and badges for file/change counts.
  - Render a vertical file list for the selected burst with path, change kind, and additions/deletions where available.
  - Render the selected file's diff in the main pane, reusing the existing diff/code viewer classes and load-more behavior where applicable.
  - Support left/right burst navigation and up/down file navigation without trapping focus or requiring a mouse.
  - Select the first useful burst and file on initial load, with clean/empty states when there is nothing to review.
  - Refresh Review from the existing viewer refresh path so changed Git status updates the screen without a separate live watcher.
  - Add only the CSS needed for the three-pane Review layout and reuse existing tokens, buttons, badges, and code viewer styles.
- Out:
  - A new design system for Review.
  - A full-screen editor or inline file editing.
  - Drag, timeline zoom, branch graph, or animated playback.
  - Changing the existing Git cockpit's actions or commit workflow.

# Acceptance criteria
- AC1: `Review` appears as a primary viewer slot and existing slots remain reachable.
- AC2: The burst rail shows the working tree first when dirty and then recent commits in reverse chronological order.
- AC3: Selecting a burst updates the vertical file list without a page navigation.
- AC4: Selecting a dirty working-tree file loads the existing working-tree/staged diff or file preview.
- AC5: Selecting a committed file loads that file's commit diff, not the entire commit patch.
- AC6: Arrow-key navigation works across bursts and files, and selected/focused states are visible and labelled.
- AC7: Clean, empty, unavailable, error, and truncated states are readable and do not throw uncaught browser errors.
- AC8: Review refreshes through the existing viewer refresh path and does not add another interval timer.
- AC9: The layout has no overlap, clipped labels, or horizontal page scroll at 1440x900, 820x1180, and 390x844.
- AC10: Browser-host tests cover rendering, selection, keyboard movement, diff loading, and unavailable states.
- AC11: The viewer bundle is regenerated and the standard viewer checks pass.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `Review` appears as a primary viewer slot and existing slots remain reachable.
- request-AC2 -> This backlog slice. Proof: AC2: The burst rail shows the working tree first when dirty and then recent commits in reverse chronological order.
- request-AC3 -> This backlog slice. Proof: AC3: Selecting a burst updates the vertical file list without a page navigation.
- request-AC4 -> This backlog slice. Proof: AC4: Selecting a dirty working-tree file loads the existing working-tree/staged diff or file preview.
- request-AC5 -> This backlog slice. Proof: AC5: Selecting a committed file loads that file's commit diff, not the entire commit patch.
- request-AC6 -> This backlog slice. Proof: AC6: Arrow-key navigation works across bursts and files, and selected/focused states are visible and labelled.
- request-AC7 -> This backlog slice. Proof: AC7: Clean, empty, unavailable, error, and truncated states are readable and do not throw uncaught browser errors.
- request-AC8 -> This backlog slice. Proof: AC8: Review refreshes through the existing viewer refresh path and does not add another interval timer.
- request-AC9 -> This backlog slice. Proof: AC9: The layout has no overlap, clipped labels, or horizontal page scroll at 1440x900, 820x1180, and 390x844.
- request-AC10 -> This backlog slice. Proof: AC10: Browser-host tests cover rendering, selection, keyboard movement, diff loading, and unavailable states.
- request-AC11 -> This backlog slice. Proof: AC11: The viewer bundle is regenerated and the standard viewer checks pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_110_a_review_slot_for_project_change_timelines`
- Architecture decision(s): (none yet)
- Request: `req_381_add_a_review_slot_for_project_change_timelines`
- Primary task(s): `task_393_orchestrate_the_review_slot_change_timeline`

# Priority
- Priority: High
- Rationale: This is the user-visible delivery slice for the new Review slot and depends on the Git burst payload.
