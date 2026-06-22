## item_487_merge_ci_runs_into_the_recent_activity_feed - Merge CI runs into the Recent activity feed
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 100
> Confidence: 100
> Progress: 100%
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
- request-AC7 -> This backlog slice. Proof: logics-manager lint and audit pass on the resulting workflow corpus and code.

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
- DECISION (operator-approved): reserve CI-events-in-activity to the BROWSER VIEWER, not the VS Code extension, to avoid re-implementing the fetch/payload wiring in TS and a blocking gh call in the board refresh. The viewer already fetches /api/ci-status (async, for the badge) into latestCiStatus, which now carries recentRuns (item_486). Plan: map latestCiStatus.recentRuns -> activityEvents kind:'ci' in dispatchViewerActivityUpdate (browser-host). Shared rendering + the git/ci filter already handle kind:'ci'.
- REMAINING (client). The VS Code webview feed renders payload.activityEvents (mainCore.js:469) — no client change needed IF the server maps recentRuns into the board payload's activityEvents. The browser viewer (browser-host) fetches CI separately and needs its own wiring. Open design decision: feed CI into the synchronous board payload (simpler, reuses the channel) vs keep it async like the badge (avoids slowing the board). Decide before wiring.
- DONE (browser viewer). Resolved the open decision by keeping CI async like the badge: `ciActivityEvents(latestCiStatus)` maps recentRuns -> kind:'ci' events, spread into `dispatchViewerActivityUpdate()` alongside git events. `refreshActivityFeedForCi()` re-dispatches while the panel is open (called from the badge-counter refreshers). Empty/unavailable CI -> runs default to [] so the feed is byte-for-byte unchanged (AC2). vitest covers the dispatch path via the activity-toggle open flow (AC3). Note: CI events ride `dispatchViewerActivityUpdate` (toggle-open / CI poll), not the signature-gated postToApp board dispatch, because they live in in-memory latestCiStatus rather than stored state.
- Task `task_271_orchestrate_ci_events_in_recent_activity` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_271_orchestrate_ci_events_in_recent_activity`
