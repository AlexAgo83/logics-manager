## item_875_give_review_file_rows_a_name_first_layout_with_corner_badges - Give Review file rows a name-first layout with corner badges
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 94%
> Confidence: 90%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 16:25:10

# AI Context
- Summary: Turns a file row into a name-first layout with the kind and line counts pinned to its corners.
- Keywords: review, file, rows, name, first, layout, corner, badges
- Use when: changing how a Review file row is laid out or labelled.
- Skip when: changing the rail, the diff pane, or which files a burst reports.

# Problem
- `renderReviewFileButton` puts the whole repo-relative path in the row's primary line, so a Logics path wraps over four lines and the file name is the hardest part to find.
- The change kind and the line counts sit inline with that path and compete with it for the same line.

# Scope
- In:
  - Lead the row with the file name, and put its directory underneath in a smaller subordinate line.
  - Expose the full path on hover, because an end ellipsis on a long Logics path removes the discriminating segment.
  - Pin the change kind to the row's top-right corner as a badge with its letter inside it.
  - Pin the addition and deletion counts to the row's bottom-right corner as a badge.
  - Reserve the space the badges need so neither overlaps the other nor the row's text, at every row height and viewport.
  - Keep the row's existing selection, keyboard and data attributes untouched.
  - Cover the row structure and both badges in browser-host tests.
- Out:
  - The rail and the diff pane.
  - Changing which files a burst reports.
  - Colour-coding that would carry the change kind without its letter.

# Acceptance criteria
- AC1: The row's primary line is the file name and its directory is a smaller line beneath it.
- AC2: The full path is available on hover.
- AC3: The change kind is a corner badge at the top right with its letter inside.
- AC4: The line counts are a corner badge at the bottom right.
- AC5: Neither badge overlaps the other or the row text at any row height, at the three viewports.
- AC6: Selection, keyboard behavior and data attributes are unchanged.
- AC7: Browser-host tests cover the row structure and both badges.
- AC8: The bundle is regenerated and the targeted vitest checks and `npm run lint` pass for this slice.
- AC9: The row and both badges hold at 1440x900, 820x1180 and 390x844 without overlap or clipping.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC1: The row's primary line is the file name and its directory is a smaller line beneath it. Also: AC2: The full path is available on hover.
- request-AC10 -> This backlog slice. Proof: AC3: The change kind is a corner badge at the top right with its letter inside.
- request-AC11 -> This backlog slice. Proof: AC4: The line counts are a corner badge at the bottom right. Also: AC5: Neither badge overlaps the other or the row text at any row height, at the three viewports.
- request-AC14 -> This backlog slice. Proof: AC9: The row and both badges hold at 1440x900, 820x1180 and 390x844 without overlap or clipping.
- request-AC15 -> This backlog slice. Proof: AC7: Browser-host tests cover the row structure and both badges.
- request-AC16 -> This backlog slice. Proof: AC8: The bundle is regenerated and the targeted vitest checks and `npm run lint` pass for this slice.

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
