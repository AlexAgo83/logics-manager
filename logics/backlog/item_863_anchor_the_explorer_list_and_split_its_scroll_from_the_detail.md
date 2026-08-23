## item_863_anchor_the_explorer_list_and_split_its_scroll_from_the_detail - Anchor the Explorer list and split its scroll from the detail
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 88%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer explorer
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 14:05:36

# AI Context
- Summary: Splits the Explorer render path so a file click touches only the detail pane, and gives each pane its own scroll.
- Keywords: anchor, explorer, list, split, scroll, detail
- Use when: fixing the list jumping, refetching, or scrolling away while a file is read.
- Skip when: working on the markdown switch, which is the sibling slice.

# Problem
- Every file click rebuilds the whole Explorer through `container.innerHTML = renderWorkspace(tree, preview)`, so the list jumps to the top, loses focus, flickers, and refetches a directory listing that has not changed.
- The only scroll container is the Explorer panel itself, so a long file scrolls the file list off the screen and the operator loses their place in the directory.

# Scope
- In:
  - Split `openWorkspacePreview()` so a file selection renders only the detail region and leaves the list DOM in place.
  - Skip the directory refetch when the selected file's parent directory matches the listing already rendered.
  - Move the selection state by toggling the row class and `aria-current` on the existing rows instead of re-rendering the list.
  - Move `overflow-y` from the Explorer panel onto the two panes, with `overscroll-behavior: contain`, and derive their height from the Workshop panel rather than the viewport.
  - Flatten the list chrome: sticky breadcrumb and parent row as the list header, rows flush against the left edge, no card inside the panel card.
  - Reset the detail pane scroll to the top on file change without moving focus, and announce the change through the existing live region.
  - Keep directory navigation re-rendering the list, with the list scroll starting at the top for the new directory.
  - Collapse the list into an expandable header above the detail at the phone breakpoint, keeping one scroll axis.
  - Cover the behavior in browser-host tests and add the Explorer to the local viewer visual smoke run if it is not already exercised there.
- Out:
  - The markdown raw/preview switch (sibling slice).
  - Nested tree expansion, keyboard traversal, virtualisation, and a draggable splitter.
  - Any change to the workspace tree or preview payload contracts.

# Acceptance criteria
- AC1: Selecting a file mutates only the detail region; a test asserts the list's rendered nodes and scroll offset survive the selection.
- AC2: No directory listing request is issued when the newly selected file shares the currently listed directory.
- AC3: The list and detail each scroll on their own, and scrolling the detail to its end does not scroll the panel or the page behind it.
- AC4: The selected row carries `aria-current` and a non-colour cue, applied without re-rendering the list.
- AC5: On file change the detail scroll resets to the top and `document.activeElement` is unchanged.
- AC6: Directory navigation still re-renders the list, resets its scroll, and keeps breadcrumb and parent-row behavior.
- AC7: The layout holds at 1440x900, 820x1180, and 390x844, with a single scroll axis and a collapsible list at the phone width.
- AC8: Browser-host tests cover the preserved list state, the skipped refetch, the independent scrollers, the scroll reset without focus theft, and directory navigation.
- AC9: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks, and `npm run test:viewer-smoke` pass for this slice.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Selecting a file mutates only the detail region; a test asserts the list's rendered nodes and scroll offset survive the selection.
- request-AC2 -> This backlog slice. Proof: AC2: No directory listing request is issued when the newly selected file shares the currently listed directory.
- request-AC3 -> This backlog slice. Proof: AC3: The list and detail each scroll on their own, and scrolling the detail to its end does not scroll the panel or the page behind it.
- request-AC4 -> This backlog slice. Proof: AC4: The selected row carries `aria-current` and a non-colour cue, applied without re-rendering the list.
- request-AC5 -> This backlog slice. Proof: AC5: On file change the detail scroll resets to the top and `document.activeElement` is unchanged.
- request-AC6 -> This backlog slice. Proof: AC6: Directory navigation still re-renders the list, resets its scroll, and keeps breadcrumb and parent-row behavior.
- request-AC10 -> This backlog slice. Proof: AC7: The layout holds at 1440x900, 820x1180, and 390x844, with a single scroll axis and a collapsible list at the phone width.
- request-AC11 -> This backlog slice. Proof: AC8: Browser-host tests cover the preserved list state, the skipped refetch, the independent scrollers, the scroll reset without focus theft, and directory navigation.
- request-AC12 -> This backlog slice. Proof: AC9: The bundle is regenerated and `npm run check:viewer-host`, the targeted vitest checks, and `npm run test:viewer-smoke` pass for this slice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_112_an_anchored_explorer_with_a_readable_detail_pane`
- Architecture decision(s): (none yet)
- Request: `req_383_rework_the_explorer_screen_into_an_anchored_file_list_with_an_independent_detail_pane`
- Primary task(s): `task_395_orchestrate_the_explorer_layout_and_markdown_preview_rework`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_395_orchestrate_the_explorer_layout_and_markdown_preview_rework`

# Notes
- Task `task_395_orchestrate_the_explorer_layout_and_markdown_preview_rework` was finished via `logics-manager flow finish task` on 2026-08-23.
