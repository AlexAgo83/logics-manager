## item_488_surface_recent_git_commits_as_activity_events - Surface recent git commits as activity events
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer activity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- payload.activityEvents has no server producer, so the already-parsed recentCommits never reach the activity feed and the Git toggle would have nothing to govern.

# Scope
- In:
  - Map the existing recentCommits (from _git_status.py) into the activity event channel as entries with kind:'git', carrying id (short hash), title (subject), updatedAt (commit date), marker, and optional commit url
  - Cap the count consistently with the existing GIT_HISTORY_DISPLAY_LIMIT and keep entries non-clickable where no url applies
  - Fall back to an empty git category when no commits or git is unavailable
- Out:
  - The filter button and persistence (sibling slice)
  - CI events (delivered by req_274)
  - Any new git fetch or parsing

# Acceptance criteria
- AC1: Git commits appear in Recent activity as activityKind:'git', newest first, time-bucketed.
- AC2: No new git command is run; the mapping reuses recentCommits.
- AC3: A vitest check covers the commit-to-event mapping and the empty fallback.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Git commits appear in Recent activity as activityKind:'git', newest first, time-bucketed.
- request-AC6 -> This backlog slice. Proof: AC2: No new git command is run; the mapping reuses recentCommits.
- request-AC7 -> This backlog slice. Proof: AC3: A vitest check covers the commit-to-event mapping and the empty fallback.
- request-AC4 -> This backlog slice. Proof: The two choices persist across reloads via the same webview state as activityPanelOpen, with defaults applied on first load.
- request-AC5 -> This backlog slice. Proof: The filter button shows the non-default 'active' indicator when either toggle is off, matching the project filter button behavior.
- request-AC8 -> This backlog slice. Proof: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_028_recent_activity_event_filter`
- Architecture decision(s): (none yet)
- Request: `req_275_add_a_git_ci_event_filter_to_the_recent_activity_view`
- Primary task(s): `task_272_orchestrate_the_recent_activity_event_filter`

# AI Context
- Summary: Surface recent git commits as activity events
- Keywords: scaffolded-backlog, surface recent git commits as activity events, implementation-ready
- Use when: Implementing the scaffolded slice for Surface recent git commits as activity events.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Tasks
- `task_272_orchestrate_the_recent_activity_event_filter`

# Notes
- Task `task_272_orchestrate_the_recent_activity_event_filter` was finished via `logics-manager flow finish task` on 2026-06-22.
