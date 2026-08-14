## task_362_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections - Fleet home: confirm the redesign live, add favourites/all-projects sections
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
- Summary: This repo's own redesigned `renderFleetHome()` has never been visually confirmed on a running server, and the mockup's two labelled sections ("Favorites" / "All projects") don't exist in the implementation.
- Keywords: renderFleetHome, --fleet, favorites section, viewer-fleet__row
- Use when: Implementing this task.
- Skip when: Any other screen — this is Fleet home only.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_791_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections`

# Acceptance criteria
- AC1: A `--fleet` launch of this repository's own checkout, on a clean port, is screenshotted and confirmed to show the row-based redesign (not the old card-grid overlay).
- AC2: The fleet home row list shows a "Favorites" section and an "All projects" section as distinct labelled groups, not one continuous sorted list.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_362_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_362_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
