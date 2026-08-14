## item_791_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections - Fleet home: confirm the redesign live, add favourites/all-projects sections
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:19:55

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
- request-AC3 -> This backlog slice. Proof: AC3: A --fleet launch of this repository's own checkout serves the redesigned Fleet home (row layout, colored+shaped left accent, favorites/all-projects sections) and that has been visually confirmed against a running server, not only read from source.

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

# Tasks
- `task_362_fleet_home_confirm_the_redesign_live_add_favourites_all_projects_sections`
