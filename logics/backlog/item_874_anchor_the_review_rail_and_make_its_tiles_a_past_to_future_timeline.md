## item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline - Anchor the Review rail and make its tiles a past-to-future timeline
> From version: 2.22.4
> Schema version: 1.0
> Status: In progress
> Understanding: 94%
> Confidence: 90%
> Progress: 90%
> Complexity: High
> Theme: Viewer review
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 16:32:15

# AI Context
- Summary: Rebuilds the rail as an anchored, dense, oldest-to-newest timeline with ghost tiles and a centred initial scroll.
- Keywords: anchor, review, rail, tiles, past, future, timeline
- Use when: changing the rail's layout, ordering, tile content or the burst payload's author and timestamp fields.
- Skip when: working on the file rows or the diff pane.

# Problem
- `.viewer-review` is a plain grid inside a surface whose overflow scrolls everything, so the rail leaves the screen as soon as a diff is read.
- A tile spends its height on an author and a full ISO timestamp, and its subject is unclamped, so few tiles fit and none is quick to read.
- The rail runs newest-first from the left, so time reads backwards and there is nothing to show that the timeline continues.
- The working-tree burst exists but sits first, away from the position that would make it read as the work in progress.

# Scope
- In:
  - Make the review surface a two-row grid at full height, the rail in the first row and the body in the second with its own scroll, and stop the surface itself from scrolling as one region.
  - Carry `author` and an ISO `timestamp` as separate fields on commit bursts instead of one pre-joined meta string, keeping the existing bounded, read-only construction.
  - Render the timestamp as a relative time with the platform's own formatter, with a readable fallback when it is missing, and drop the author from the tile.
  - Clamp the subject, reduce the type sizes, and bring the tile height down without clipping.
  - Reverse the rail order in the renderer so the oldest tile is leftmost and the newest rightmost, and record the supersession of `req_381` AC2.
  - Render at least five non-interactive ghost tiles after the newest tile, as plain elements hidden from assistive technology.
  - Give the working-tree tile a treatment distinct from a commit tile that does not depend on colour alone.
  - Centre the newest real tile on open by setting the rail's own horizontal scroll offset, never through `scrollIntoView`.
  - Cover the ordering, the ghost tiles, the relative time and its fallback, and the working-tree position in tests.
- Out:
  - The file list and its badges.
  - The diff pane and the shared split-pane pattern.
  - Any change to how bursts or their file lists are computed.

# Acceptance criteria
- AC1: Scrolling the diff leaves the rail in place, and the surface has no single scroll region containing both.
- AC2: A commit tile shows a relative time and a clamped subject, and shows no author.
- AC3: The payload carries author and an ISO timestamp as separate fields, covered by a Python test.
- AC4: The tile's minimum height is below the current 86px and nothing is clipped at any of the three viewports.
- AC5: Five or more ghost tiles follow the newest tile, are not buttons, carry no keyboard focus, and are hidden from assistive technology.
- AC6: The leftmost tile is the oldest and the rightmost real tile the newest, with the tab order matching.
- AC7: A dirty working tree puts its tile between the newest commit and the ghost tiles, distinguishable without colour.
- AC8: On open, the rail's scroll offset centres the newest real tile and no ancestor has moved.
- AC9: Browser-host tests cover the ordering, the ghost tiles, the relative time and its fallback, and the working-tree position.
- AC10: The bundle is regenerated and the targeted vitest and pytest checks, `npm run test:viewer-smoke` and `npm run lint` pass for this slice.
- AC11: The layout holds at 1440x900, 820x1180 and 390x844, with the rail keeping its own horizontal scrolling at the phone width.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Scrolling the diff leaves the rail in place, and the surface has no single scroll region containing both.
- request-AC2 -> This backlog slice. Proof: AC2: A commit tile shows a relative time and a clamped subject, and shows no author.
- request-AC3 -> This backlog slice. Proof: AC3: The payload carries author and an ISO timestamp as separate fields, covered by a Python test.
- request-AC4 -> This backlog slice. Proof: AC4: The tile's minimum height is below the current 86px and nothing is clipped at any of the three viewports.
- request-AC5 -> This backlog slice. Proof: AC5: Five or more ghost tiles follow the newest tile, are not buttons, carry no keyboard focus, and are hidden from assistive technology.
- request-AC6 -> This backlog slice. Proof: AC6: The leftmost tile is the oldest and the rightmost real tile the newest, with the tab order matching.
- request-AC7 -> This backlog slice. Proof: AC7: A dirty working tree puts its tile between the newest commit and the ghost tiles, distinguishable without colour.
- request-AC8 -> This backlog slice. Proof: AC8: On open, the rail's scroll offset centres the newest real tile and no ancestor has moved.
- request-AC14 -> This backlog slice. Proof: AC11: The layout holds at 1440x900, 820x1180 and 390x844, with the rail keeping its own horizontal scrolling at the phone width.
- request-AC15 -> This backlog slice. Proof: AC9: Browser-host tests cover the ordering, the ghost tiles, the relative time and its fallback, and the working-tree position.
- request-AC16 -> This backlog slice. Proof: AC10: The bundle is regenerated and the targeted vitest and pytest checks, `npm run test:viewer-smoke` and `npm run lint` pass for this slice.

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
