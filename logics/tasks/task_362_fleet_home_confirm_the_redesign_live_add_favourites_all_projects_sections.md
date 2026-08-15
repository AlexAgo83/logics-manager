## task_362_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections - Fleet home: confirm the redesign live, add favourites/all-projects sections
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 04:31:02

# AI Context
- Summary: This repo's own redesigned `renderFleetHome()` has never been visually confirmed on a running server, and the mockup's two labelled sections ("Favorites" / "All projects") don't exist in the implementation.
- Keywords: renderFleetHome, --fleet, favorites section, viewer-fleet__row
- Use when: Implementing this task.
- Skip when: Any other screen — this is Fleet home only.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_791_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections`

# Acceptance criteria
- AC1: A `--fleet` launch of this repository's own checkout, on a clean port, is screenshotted and confirmed to show the row-based redesign (not the old card-grid overlay).
- AC2: The fleet home row list shows a "Favorites" section and an "All projects" section as distinct labelled groups, not one continuous sorted list.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_362_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_362_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections.md` after implementation.

# Validation
- `npx vitest run tests/viewer.browser-host.test.ts`: 211/211 passed, including the two new regression tests ("groups Fleet home rows under Favorites/All projects section labels (task_362)" and "omits an empty Fleet home section label (no favorites yet)").
- Visual confirmation via headless Chrome (`--use-mock-keychain`) against this repository's own running viewer server, navigated to Fleet home (same `showFleetHome()`/`renderFleetHome()` render path the `--fleet` CLI flag triggers at boot): screenshot shows the row-based redesign live (coloured+shaped left accent, favourite stars, "current" tag, root chips in the toolbar), not the old card-grid overlay, and two labelled sections ("Favorites", "All projects") separating the row list exactly as the mockup shows.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Confirmed the redesigned `renderFleetHome()` renders correctly on a live running server for this checkout (not only read from source): row layout, left accent, favourite stars, "current" tag all present and correct.
- Split the row list in `renderFleetHome()` (`clients/viewer/src/browser-host/index.js`) into two labelled groups ("Favorites" / "All projects") using the existing favourite-sorted `projects` array; each group renders its own heading only when non-empty (no empty-section heading when there are zero favourites, or when every project is favourited).
- Added `.viewer-fleet__section-label` styling (`clients/viewer/viewer.css`), mirroring the mockup's `.seclabel`.
- Rebuilt `clients/viewer/browser-host.js`.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_791_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections`
- Related request(s): `req_359_viewer_redesign_mockups_gap_review_across_all_screens`

# Links
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC3 -> This task. Proof: Screenshot of this repository's own running viewer server navigated to Fleet home confirms the row-based redesign renders live (left accent, favourite stars, "current" tag, root chips) -- not the old card-grid overlay -- and shows "Favorites"/"All projects" as distinct labelled groups.
