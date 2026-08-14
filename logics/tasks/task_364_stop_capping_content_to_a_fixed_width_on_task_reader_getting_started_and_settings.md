## task_364_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings - Stop capping content to a fixed width on task/reader, Getting Started, and Settings
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
- Summary: Several screens cap content to a fixed width instead of using available space — on a task/reader screen this pushes the side menu to the right instead of the left; on Getting Started it leaves a dead column on the right of every stage card.
- Keywords: fixed width layout, fluid layout, reader side panel, getting started dead column, settings width
- Use when: Implementing this task.
- Skip when: Any content/copy change on these screens — this is layout width only.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_793_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings`

# Acceptance criteria
- AC1: On a task/reader screen, the side menu/TOC renders on the left, and content expands to use the available width to its right, at common desktop viewport widths.
- AC2: Getting Started's stage cards use the full available width with no persistent dead column on the right.
- AC3: Settings' layout uses the available width rather than capping to a fixed value.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_364_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_364_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
