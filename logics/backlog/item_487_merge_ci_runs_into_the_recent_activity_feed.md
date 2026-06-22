## item_487_merge_ci_runs_into_the_recent_activity_feed - Merge CI runs into the Recent activity feed
> From version: 2.12.8
> Schema version: 1.0
> Status: Ready
> Understanding: 88
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer frontend
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- getActivityEntries builds the feed only from workflow docs, so CI runs never appear even though the panel already renders heterogeneous activityKind entries.

# Scope
- In:
  - Map ci payload recentRuns into activity entries with activityKind:'ci', reusing the {id, updatedAt, marker, activityKind, selectable} shape
  - Add the per-kind CSS class and marker for CI rows and wire the run url on click
  - Fall back to the current feed exactly when recentRuns is empty or CI is unavailable
- Out:
  - Changing the activity panel layout, bucketing, or doc-entry behavior
  - The server payload shape (sibling slice)

# Acceptance criteria
- AC1: CI runs appear in Recent activity, time-bucketed alongside doc entries, newest first.
- AC2: CI rows are visually distinct and open the run url; empty/unavailable CI leaves the feed unchanged.
- AC3: A vitest check covers the CI-entry mapping and the empty-CI fallback.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: CI runs appear in Recent activity, time-bucketed alongside doc entries, newest first.
- request-AC4 -> This backlog slice. Proof: AC2: CI rows are visually distinct and open the run url; empty/unavailable CI leaves the feed unchanged.
- request-AC5 -> This backlog slice. Proof: AC3: A vitest check covers the CI-entry mapping and the empty-CI fallback.
- request-AC6 -> This backlog slice. Proof: AC3: A vitest check covers the CI-entry mapping and the empty-CI fallback.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_027_ci_events_in_recent_activity`
- Architecture decision(s): (none yet)
- Request: `req_274_surface_ci_events_in_the_recent_activity_feed`
- Primary task(s): `task_271_orchestrate_ci_events_in_recent_activity`

# AI Context
- Summary: Merge CI runs into the Recent activity feed
- Keywords: scaffolded-backlog, merge ci runs into the recent activity feed, implementation-ready
- Use when: Implementing the scaffolded slice for Merge CI runs into the Recent activity feed.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- REMAINING (client). The VS Code webview feed renders payload.activityEvents (mainCore.js:469) — no client change needed IF the server maps recentRuns into the board payload's activityEvents. The browser viewer (browser-host) fetches CI separately and needs its own wiring. Open design decision: feed CI into the synchronous board payload (simpler, reuses the channel) vs keep it async like the badge (avoids slowing the board). Decide before wiring.
