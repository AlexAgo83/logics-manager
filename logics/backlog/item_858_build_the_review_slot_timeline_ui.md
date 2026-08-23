## item_858_build_the_review_slot_timeline_ui - Build the Review slot timeline UI
> From version: 2.22.4
> Schema version: 1.0
> Status: In progress
> Understanding: 94%
> Confidence: 88%
> Progress: 35%
> Complexity: High
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 13:40:03

# AI Context
- Summary: Builds the Review viewer slot with a horizontal burst rail, vertical file list, diff pane, and arrow-key navigation.
- Keywords: build, review, slot, timeline
- Use when: implementing the browser-host Review screen, navigation entry, layout, selection, or frontend tests.
- Skip when: changing only backend Git payload construction before the Review route consumes it.

# Problem
- Project and Activity answer what exists and what happened, but neither gives a focused review path through the actual changed files.
- The Git cockpit groups data by Git operation, while the requested workflow is a spatial review: bursts over time horizontally, files vertically, diff as the reading surface.
- The existing viewer already has a compact Activity/Project surface switcher and a visual campaign that catches layout failures. Review needs to join both, otherwise it will be reachable but not integrated into the viewer's actual operating surface.

# Scope
- In:
  - Add `Review` as the third choice of the segmented surface control `item_865` delivers, and route Review through the existing browser-host screen system.
  - Render a horizontal burst rail with stable selected state, concise metadata, and badges for file/change counts.
  - Render a vertical file list for the selected burst with path, change kind, and additions/deletions where available.
  - Render the selected file's diff in the main pane, reusing the existing diff/code viewer classes and load-more behavior where applicable.
  - Use a desktop layout with burst rail on top, file list on the left, and diff pane as the dominant region; adapt tablet and phone to one page scroll axis with internal horizontal scrolling only for the burst rail.
  - Keep row heights and controls stable across loading, hover, active, and truncated states.
  - Add non-colour selected/focus cues and `aria-current` or equivalent state for both the active burst and active file.
  - Support left/right burst navigation and up/down file navigation without trapping focus or requiring a mouse, scoped so the four existing document-level keydown handlers and open modals keep their keys.
  - Select the first useful burst and file on initial load, with clean/empty states when there is nothing to review.
  - Refresh Review from the existing viewer refresh path so changed Git status updates the screen without a separate live watcher.
  - Add only the CSS needed for the three-pane Review layout and reuse existing tokens, buttons, badges, and code viewer styles.
  - Add Review to the existing local viewer visual campaign or equivalent layout harness.
- Out:
  - Replacing the surface control and migrating the boolean surface state: `item_865` does that first.
  - A new design system for Review.
  - A full-screen editor or inline file editing.
  - Drag, timeline zoom, branch graph, or animated playback.
  - Changing the existing Git cockpit's actions or commit workflow.

# Acceptance criteria
- AC1: `Review` is the third choice of the segmented surface control, reachable at every breakpoint, and existing topbar/menu slots remain reachable.
- AC2: The burst rail shows the working tree first when dirty and then recent commits in reverse chronological order.
- AC3: Selecting a burst updates the vertical file list without a page navigation.
- AC4: Selecting a dirty working-tree file loads the existing working-tree/staged diff or file preview.
- AC5: Selecting a committed file loads that file's commit diff, not the entire commit patch.
- AC6: Arrow-key navigation works across bursts and files, and selected/focused states are visible and labelled.
- AC7: Clean, empty, unavailable, error, and truncated states are readable and do not throw uncaught browser errors.
- AC8: Review refreshes through the existing viewer refresh path and does not add another interval timer.
- AC9: The layout has no overlap, clipped labels, or horizontal page scroll at 1440x900, 820x1180, and 390x844.
- AC10: The visual campaign or equivalent layout harness exercises Review and covers blank surfaces, sibling-control overlap, viewport clipping, horizontal page scroll, heading structure, disabled reasons, and colour-only state.
- AC11: Browser-host tests cover rendering, selection, keyboard movement, diff loading, and unavailable states.
- AC12: The viewer bundle is regenerated and the standard viewer checks pass.
- AC13: The Review key handler ignores keys while a modal is open or a text field has focus, and the other document-level keydown handlers in the browser host still receive their keys.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The Activity/Project control becomes Activity/Project/Review and existing topbar/menu slots remain reachable.
- request-AC2 -> This backlog slice. Proof: AC2: The burst rail shows the working tree first when dirty and then recent commits in reverse chronological order.
- request-AC3 -> This backlog slice. Proof: AC3: Selecting a burst updates the vertical file list without a page navigation.
- request-AC4 -> This backlog slice. Proof: AC4: Selecting a dirty working-tree file loads the existing working-tree/staged diff or file preview.
- request-AC5 -> This backlog slice. Proof: AC5: Selecting a committed file loads that file's commit diff, not the entire commit patch.
- request-AC6 -> This backlog slice. Proof: AC6: Arrow-key navigation works across bursts and files, and selected/focused states are visible and labelled.
- request-AC7 -> This backlog slice. Proof: AC7: Clean, empty, unavailable, error, and truncated states are readable and do not throw uncaught browser errors.
- request-AC8 -> This backlog slice. Proof: AC8: Review refreshes through the existing viewer refresh path and does not add another interval timer.
- request-AC9 -> This backlog slice. Proof: AC9: The layout has no overlap, clipped labels, or horizontal page scroll at 1440x900, 820x1180, and 390x844.
- request-AC10 -> This backlog slice. Proof: AC10: The visual campaign or equivalent layout harness exercises Review and covers blank surfaces, sibling-control overlap, viewport clipping, horizontal page scroll, heading structure, disabled reasons, and colour-only state.
- request-AC11 -> This backlog slice. Proof: AC11: Browser-host tests cover rendering, selection, keyboard movement, diff loading, and unavailable states.
- request-AC12 -> This backlog slice. Proof: AC12: The viewer bundle is regenerated and the standard viewer checks pass.
- request-AC13 -> This backlog slice. Proof: AC13: The Review key handler ignores keys while a modal is open or a text field has focus, and the other document-level keydown handlers in the browser host still receive their keys.

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
- Rationale: This is the user-visible delivery slice for the new Review slot. It depends on the Git burst payload from `item_857` and on the tri-state surface control from `item_865`.
