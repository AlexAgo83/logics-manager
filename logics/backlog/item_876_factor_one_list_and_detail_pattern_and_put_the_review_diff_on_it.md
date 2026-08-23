## item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it - Factor one list-and-detail pattern and put the Review diff on it
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 94%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 16:40:37

# AI Context
- Summary: Defines the anchored list-and-detail rules once and puts both Review and the Explorer on them.
- Keywords: factor, list, detail, pattern, put, review, diff
- Use when: changing scroll, column-track or scroll-reset behaviour on either split-pane surface.
- Skip when: changing diff, code viewer or markdown rendering.

# Problem
- The Review body scrolls as one block, so reading a diff means scrolling past the file list and losing it.
- The Explorer already solved this, and its rules were fixed twice in two passes. Copying them into Review would create a third place to fix the same thing.

# Scope
- In:
  - Define the list-and-detail rules once: an anchored list that keeps its scroll offset, a detail pane owning the vertical scroll with a `minmax(0, 1fr)` column track, horizontal scrolling pushed down to the code blocks, and a scroll reset on selection that does not take focus.
  - Apply them to Review's file list and diff pane, and move the Explorer onto the same definition so neither surface keeps a private copy.
  - Keep Review's selection non-destructive the way the Explorer's is: the list's nodes, scroll offset and focused element survive selecting a file.
  - Keep the diff pane's header visible while its body scrolls.
  - Cover the shared behavior for both surfaces in browser-host tests, including that the rules are defined once.
- Out:
  - Changing the diff rendering, the code viewer or the markdown preview.
  - The rail and the file row layout.
  - Renaming the Explorer's own classes beyond what sharing the rules requires.

# Acceptance criteria
- AC1: Selecting a Review file leaves the file list's nodes, scroll offset and focused element untouched.
- AC2: The Review diff pane owns the vertical scroll and resets to the top on selection without taking focus.
- AC3: A wide diff line scrolls inside its own block; the pane does not move sideways.
- AC4: The diff pane's header stays visible while its body scrolls.
- AC5: The overflow, column-track and scroll-reset rules exist in one place and are used by both surfaces.
- AC6: The Explorer's behavior is unchanged by the move.
- AC7: Browser-host tests cover both surfaces against the shared behavior.
- AC8: The bundle is regenerated and the targeted vitest checks, `npm run test:viewer-smoke` and `npm run lint` pass for this slice.
- AC9: Both surfaces hold at 1440x900, 820x1180 and 390x844 with no horizontal page scroll.

# AC Traceability
- request-AC12 -> This backlog slice. Proof: AC1: Selecting a Review file leaves the file list's nodes, scroll offset and focused element untouched. Also: AC2: The Review diff pane owns the vertical scroll and resets to the top on selection without taking focus. Also: AC3: A wide diff line scrolls inside its own block; the pane does not move sideways.
- request-AC13 -> This backlog slice. Proof: AC5: The overflow, column-track and scroll-reset rules exist in one place and are used by both surfaces.
- request-AC14 -> This backlog slice. Proof: AC9: Both surfaces hold at 1440x900, 820x1180 and 390x844 with no horizontal page scroll.
- request-AC15 -> This backlog slice. Proof: AC7: Browser-host tests cover both surfaces against the shared behavior.
- request-AC16 -> This backlog slice. Proof: AC8: The bundle is regenerated and the targeted vitest checks, `npm run test:viewer-smoke` and `npm run lint` pass for this slice.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_115_a_review_timeline_that_reads_like_a_timeline`
- Architecture decision(s): (none yet)
- Request: `req_386_make_the_review_timeline_readable_an_anchored_rail_denser_tiles_and_the_shared_split_pane`
- Primary task(s): `task_398_orchestrate_the_review_timeline_reading_ergonomics`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_398_orchestrate_the_review_timeline_reading_ergonomics`

# Notes
- Task `task_398_orchestrate_the_review_timeline_reading_ergonomics` was finished via `logics-manager flow finish task` on 2026-08-23.
