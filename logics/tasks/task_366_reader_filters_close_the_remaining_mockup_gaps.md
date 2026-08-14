## task_366_reader_filters_close_the_remaining_mockup_gaps - Reader/filters: close the remaining mockup gaps
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_795_reader_filters_close_the_remaining_mockup_gaps`

# Acceptance criteria
- AC1: The reader shows a short ref (e.g. R357) instead of the full document slug as its breadcrumb.
- AC2: Filters' `Group`/`Sort` render as a segmented control (Type | Status | Theme | None), not `<select>` dropdowns.
- AC3: `Clear filters` dims to roughly 50% opacity when no filter is currently active.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_366_reader_filters_close_the_remaining_mockup_gaps.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_366_reader_filters_close_the_remaining_mockup_gaps.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
