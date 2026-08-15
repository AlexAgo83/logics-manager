## item_791_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections - Fleet home: confirm the redesign live, add favourites/all-projects sections
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 04:31:03

# AI Context
- Summary: This repo's own redesigned `renderFleetHome()` has never been visually confirmed on a running server, and the mockup's two labelled sections ("Favorites" / "All projects") don't exist in the implementation.
- Keywords: renderFleetHome, --fleet, favorites section, viewer-fleet__row
- Use when: Implementing this backlog item.
- Skip when: Any other screen — this is Fleet home only.

# Problem
No server currently reachable on the review machine actually served this repo's redesigned `renderFleetHome()` — the one `--fleet`-capable server running used the globally-installed npm package and still rendered the pre-redesign card-grid overlay. The redesign itself is fully written in `clients/viewer/browser-host.js`/`viewer.css` (rows, coloured+shaped left accent, zero-dimming, inline path, favourite star, "current" tag, toolbar-integrated root chips) but has never been visually confirmed rendering live. Separately, the mockup's two labelled sections ("Favorites" / "All projects") don't exist in the implementation — favourites are only sorted to the top of one continuous row list, with no section heading separating them.

# Scope
- In:
  - Launch this repository's own checkout with `--fleet` on a clean port and visually confirm the redesigned row layout actually renders as coded (not just read from source).
  - Add explicit "Favorites" / "All projects" section labels to the fleet home row list, matching the mockup's two-section layout.
- Out:
  - Any change to the row layout, accent colours/shapes, or other elements already confirmed correct in source.
  - Fixing the stale globally-installed npm package — that's an environment/deployment concern, not a code change in this repo.

# Acceptance criteria
- AC1: A `--fleet` launch of this repository's own checkout, on a clean port, is screenshotted and confirmed to show the row-based redesign (not the old card-grid overlay).
- AC2: The fleet home row list shows a "Favorites" section and an "All projects" section as distinct labelled groups, not one continuous sorted list.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: Screenshot of this repository's own running viewer server, navigated to Fleet home, confirms the row-based redesign renders live (left accent, favourite stars, "current" tag, root chips), and shows "Favorites"/"All projects" as distinct labelled groups built in `renderFleetHome()` (`clients/viewer/src/browser-host/index.js`). Verified by `npx vitest run tests/viewer.browser-host.test.ts` (211/211 passed, including 2 new regression tests).

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: The redesign is already coded; this is a confirmation pass plus one small structural addition.

# Notes
- Fleet home also has a separate, unrelated bug tracked in req_362/item_800 (a stale `rootScreenTitle` latch that hides Close/Minimize on later reopenings). That fix is independent of this slice's scope and does not block confirming the redesign here.
- Task `task_362_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections` was finished via `logics-manager flow finish task` on 2026-08-15.

# Tasks
- `task_362_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections`
