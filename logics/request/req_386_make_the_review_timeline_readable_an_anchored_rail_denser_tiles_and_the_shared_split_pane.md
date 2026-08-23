## req_386_make_the_review_timeline_readable_an_anchored_rail_denser_tiles_and_the_shared_split_pane - Make the Review timeline readable: an anchored rail, denser tiles, and the shared split-pane
> From version: 2.22.4
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Viewer review
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Anchors the Review rail, makes its tiles dense and past-to-future with room for what has not happened yet, and puts the diff on the Explorer's list-and-detail pattern.
- Keywords: review, timeline, readable, anchored, rail, denser, tiles, shared, split, pane
- Use when: changing the Review rail, its file rows, or the list-and-detail behaviour shared with the Explorer.
- Skip when: changing how bursts or diffs are computed, or the Review keyboard model.

# Needs
- The burst rail must stay anchored while the operator reads: it is the navigation, and navigation that scrolls away is navigation lost.
- A burst tile must say what it is in less vertical space: a short relative time rather than a full timestamp, a clamped subject, and no author on a single-operator repository.
- The timeline must read the way time reads: the past on the left, the present on the right, with room shown for the commits that have not happened yet.
- Uncommitted work must have its place on that timeline, between the newest commit and the future.
- A changed file must be identifiable by its name first, with its directory available but subordinate, and its change kind and line counts readable without competing with the name.
- Reading a diff must work like reading a file in the Explorer: the list stays put, the diff owns its scroll, and each file starts at the top.

# Context
- Operator testing of the delivered Review surface produced eleven specific defects. None is a bug in the sense of something throwing; all are the surface being unusable for the reading it exists to support.
- Rail anchoring: `.viewer-review` is a plain grid inside `.review-panel`, whose `overflow: auto` scrolls the whole surface. The rail is not sticky and does not need to be: making `.viewer-review` a two-row grid at full height, with the body owning the scroll, makes the rail structurally immobile.
- Tile density: the tile carries author, a full ISO timestamp, and an unclamped subject, in a 86px minimum height. The author is removed from the rail; it stays in the diff. The timestamp becomes a relative time.
- Relative time decision: `review_bursts_payload` currently joins author and date into one pre-formatted `meta` string, so the client cannot reformat it. The payload carries `author` and an ISO `timestamp` as separate fields instead, and the client formats with the platform's own relative-time formatter. No date library is added.
- Placeholder decision: the future commits are shown as non-interactive ghost tiles, rendered as plain elements rather than buttons and hidden from assistive technology. Rendering them as buttons would put five empty controls into the keyboard order and into the campaign's keyboard-reachability and colour-only-state checks.
- Order decision: the past is on the left and the present on the right. This is a deliberate reversal of `req_381` AC2, which asked for recent commits in reverse chronological order and is recorded as superseded by this request rather than left to be rediscovered as a defect. The reversal is done in the renderer, not with a reversed flex direction, so the tab order still follows the visual order.
- Uncommitted work: the payload already emits a synthetic working-tree burst when the tree is dirty. Once the order is reversed it lands between the newest commit and the placeholders with no change to the payload; it only needs a distinct treatment so it reads as in progress rather than as another commit.
- Initial scroll decision: the rail's own `scrollLeft` is set from the active tile's offset. `scrollIntoView` is not used: it walks the ancestor chain and would move the whole surface.
- File rows: the row leads with the file name and carries its directory underneath in a smaller, subordinate line, with the full path available on hover, because an end ellipsis on a long Logics path cuts exactly the discriminating segment. The change kind and the line counts become badges pinned to the row's corners so they stop competing with the name for the same line.
- Colour decision: the kind badge keeps its letter inside the badge. Colour reinforces it and never carries it alone, which is what the campaign's colour-only-state check exists to hold.
- Split-pane decision: the Explorer and Review now have the same shape -- an anchored list that does not move, a detail pane owning the vertical scroll, code blocks owning the horizontal scroll, and a scroll reset on selection that does not take focus. The rules are factored into one shared set that both surfaces use, rather than fixed twice in two places.
- Out of scope: the Review payload's burst construction beyond the author and timestamp fields, the keyboard model, the diff rendering itself, and the seven visual campaign findings that predate this work.

# Acceptance criteria
- AC1: The burst rail does not move vertically when the diff is scrolled; the surface itself no longer scrolls as one region, and the rail needs no sticky positioning to stay put.
- AC2: A burst tile shows a clamped subject and a compact meta line, with no author, and its type sizes are smaller than the body text around it.
- AC3: Commit bursts carry a separate author and ISO timestamp in the payload, and the client renders the timestamp as a relative time using the platform formatter, with a readable fallback when the timestamp is absent.
- AC4: A burst tile occupies measurably less vertical space than the current 86px minimum, without clipping its subject or its meta line.
- AC5: At least five ghost tiles follow the newest tile to show that the timeline continues; they are not buttons, are hidden from assistive technology, take no place in the keyboard order, and are not counted as controls by the campaign.
- AC6: The rail is ordered oldest first on the left and newest last on the right; the reversal is done in the renderer so the keyboard order follows the visual order. This supersedes `req_381` AC2.
- AC7: When the working tree is dirty, its tile sits between the newest commit and the ghost tiles, and is visually distinct from a commit tile without relying on colour alone.
- AC8: On opening Review, the rail's horizontal scroll is set so the newest real tile is centred, using the rail's own scroll offset and without moving any ancestor.
- AC9: A file row leads with the file name; its directory appears underneath in a smaller, subordinate line, and the full path is available on hover.
- AC10: The change kind is a badge pinned to the row's top-right corner, with its letter inside the badge.
- AC11: The addition and deletion counts are a badge pinned to the row's bottom-right corner; neither badge overlaps the other or the row's text at any row height.
- AC12: The Review file list and diff pane behave like the Explorer's: the list keeps its scroll offset and focus when a file is selected, the diff pane owns the vertical scroll and resets to the top on selection without taking focus, and wide diff lines scroll inside their own block rather than moving the pane.
- AC13: The list-and-detail rules are defined once and used by both the Explorer and Review; neither surface carries its own copy of the overflow, column-track or scroll-reset rules.
- AC14: The layout holds at 1440x900, 820x1180 and 390x844 with no overlap, clipped labels or horizontal page scroll, and the rail keeps its own horizontal scrolling at the phone width.
- AC15: Browser-host tests cover the rail ordering, the ghost tiles being non-interactive, the relative-time rendering and its fallback, the working-tree tile's position, the file row structure and badges, and the non-destructive selection; Python tests cover the author and timestamp fields.
- AC16: The bundle is regenerated and `npm run bundle:viewer-host`, `npm run check:viewer-host`, the targeted vitest and pytest checks, `npm run test:viewer-smoke`, `npm run lint` and `logics-manager lint --require-status` pass, with the campaign reporting only the seven findings that predate this work, and each criterion closed with a proof naming what exercised it.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_115_a_review_timeline_that_reads_like_a_timeline`
- Architecture decision(s): (none yet)

# References
- `clients/viewer/src/browser-host/git.js` holds `renderReviewTimeline()`, `renderReviewFileButton()`, `showReviewTimeline()`, `selectReviewBurst()`, `loadReviewFile()` and `bindReviewKeyboard()`.
- `logics_manager/viewer_git.py` builds each commit burst in `review_bursts_payload()`, joining author and date into one pre-formatted `meta` string.
- `clients/viewer/viewer.css` holds `.viewer-review` as a plain grid with a gap, `.viewer-review__bursts` as a horizontal auto-column grid, `.viewer-review__burst` with a 86px minimum height, and `.viewer-review__body` as the two-column list-and-detail grid.
- `clients/viewer/viewer.css` also holds `.review-panel`, whose `overflow: auto` currently scrolls the whole surface including the rail.
- `clients/viewer/viewer.css` holds the Explorer treatment this request reuses: `.viewer-workspace__preview` with a `minmax(0, 1fr)` column, vertical-only overflow, and the horizontal overflow pushed down to the code and markdown blocks.
- `clients/viewer/src/browser-host/index.js` holds `updateWorkspaceSelection()` and `updateWorkspacePreviewPane()`, the non-destructive selection and scroll-reset the Explorer already uses.
- `tests/run_local_viewer_visual_smoke.mjs` judges the Review surface at three viewports, including the checks that every control is keyboard reachable and that no state is carried by colour alone.
- `tests/viewer.browser-host.test.ts` holds the Review rendering, selection and keyboard tests.

# Backlog
- `item_874_anchor_the_review_rail_and_make_its_tiles_a_past_to_future_timeline`
- `item_875_give_review_file_rows_a_name_first_layout_with_corner_badges`
- `item_876_factor_one_list_and_detail_pattern_and_put_the_review_diff_on_it`
