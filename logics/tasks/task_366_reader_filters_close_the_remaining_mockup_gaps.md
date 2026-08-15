## task_366_reader_filters_close_the_remaining_mockup_gaps - Reader/filters: close the remaining mockup gaps
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:22:29

# AI Context
- Summary: The new-request modal and the filter panel's core bugs are already fixed; this task closes the reader's breadcrumb wording and the filter panel's remaining control-shape gaps.
- Keywords: reader breadcrumb, linked workflow layout, group sort segmented control, clear filters dimming
- Use when: Implementing this task.
- Skip when: Any other screen family.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_795_reader_filters_close_the_remaining_mockup_gaps`

# Acceptance criteria
- AC1: The reader shows a short ref (e.g. R357) instead of the full document slug as its breadcrumb.
- AC2: Filters' `Group`/`Sort` render as a segmented control (Type | Status | Theme | None), not `<select>` dropdowns.
- AC3: `Clear filters` dims to roughly 50% opacity when no filter is currently active.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_366_reader_filters_close_the_remaining_mockup_gaps.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_366_reader_filters_close_the_remaining_mockup_gaps.md` after implementation.

# Validation
- `npx vitest run tests/webview.layout-collapse.test.ts tests/webview.selectors.test.ts tests/viewer.browser-host.test.ts tests/viewer.reader.test.ts`: 265/265 passed.
- `python3 -m pytest tests/python`: 1384/1384 passed.
- Reader eyebrow, measured live: reads `R363 • Draft` where it read the full slug before; the copy control beside the title still carries the whole path.
- Segmented control, driven live in list mode: the four segments report values `stage, status, theme, none`, exactly one active at a time. Selecting Theme re-headed the list with theme names ("A finding that teaches 1/1", "A gate that says what it wants and agrees with itself 1/1", ...); selecting None collapsed it to a single "All documents 10/1666". Outside list mode all four segments compute `disabled`, keeping item_764's rule.
- `Clear filters` with nothing set, measured live: `disabled`, `opacity: 0.45`, title "No filter is set" -- already delivered by an earlier wave, verified rather than re-implemented.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Reader: the eyebrow named the document by its full slug above a title that already says the same thing in prose, on the screen most made of reading. It uses the board's short reference (R363) now; the path stays one click away on the copy control. The stage-prefix rule exists twice -- `renderBoardApp.js` and `browser-host/util.js` are separate bundles with no shared module -- so a test pins the two tables to each other: a board card disagreeing with its own reader about a document's name is worse than either form alone.
- Filters: Group is a segmented control (Type | Status | Theme | None) in both hosts, replacing a two-option dropdown for a four-value choice -- one of those values being how grouping is turned off. The segments carry the same `value`s the select's options did, so the state model and `onGroupChange` are unchanged; the shared JS binds both `change` and `click` so either control shape works.
- Grouping itself: `status` had been the only alternative to `stage` on both surfaces, written inline as an inverted special case. Theme and None are the same grouping over a different heading, so each surface now reads one keyed table. Statuses keep their lifecycle order; the others sort by heading, there being no other order to claim.
- Caught by driving the real screen rather than trusting the first edit: the column path (`renderBoardApp.groupBoardItems`) was extended first, but grouping applies in list mode, which goes through `webviewSelectors.getListGroups`. The control switched a mode nothing read -- the segment lit up and the headings stayed on stages. Both paths are covered now, and the test says why both are checked.
- `Clear filters` dimming was already delivered (`reset.disabled = !hasActiveFilters`); verified live and recorded as such rather than re-implemented.
- Out of scope, unchanged: the "Linked workflow" placement. item_795 defers it pending a design decision on whether the diagram-block treatment is an acceptable richer alternative to the mockup's stacked list, and this slice does not pre-empt that.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_795_reader_filters_close_the_remaining_mockup_gaps`
- Related request(s): `req_359_viewer_redesign_mockups_gap_review_across_all_screens`

# AC Traceability
- request-AC6 -> This task. Proof: the in-scope Reader/filters findings from item_795 are resolved and driven live -- the short-ref eyebrow, the Type/Status/Theme/None segmented control with all four groupings re-heading the list, and the `Clear filters` dimming verified as already delivered. The "Linked workflow" placement stays explicitly deferred with item_795's stated reason.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
