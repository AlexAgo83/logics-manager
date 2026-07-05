## item_531_sort_projects_by_last_used - Sort projects by last used
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 84
> Confidence: 80
> Progress: 100%
> Complexity: Low
> Theme: Viewer project navigation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
In the viewer project list, favorited Logics projects are not ordered by recent use. Operators with several favorite projects have to scan the list even though the most useful project is usually the one they used most recently.

# Scope
- In:
  - sort favorited projects by last-used timestamp, newest first;
  - keep the currently active project pinned in the first position even if another favorite is newer;
  - update the last-used timestamp whenever a project is opened or switched to from the viewer;
  - preserve existing favorite/unfavorite behavior and project registry persistence;
  - add focused tests for active-first ordering, missing timestamps, and timestamp updates.
- Out:
  - changing project discovery rules;
  - changing the visual design of the project picker;
  - adding new project metadata beyond the last-used value needed for sorting.

# Acceptance criteria
- AC1: The active project is always first in the viewer project list.
- AC2: Favorited inactive projects are sorted by last-used timestamp descending.
- AC3: Projects without a last-used timestamp fall after timestamped favorites using the existing stable/name fallback.
- AC4: Opening or switching to a project updates its last-used timestamp in the project registry.
- AC5: Tests cover active-first sorting, timestamp sorting, missing timestamp fallback, and timestamp update on project use.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The request has been reviewed and clarified enough to triage.
- request-AC2 -> This backlog slice. Proof: AC2: Follow-up backlog items preserve the need and relevant context.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_288_sort_projects_by_last_used.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Sort projects by last used
- Keywords: backlog-groom, request, sort projects by last used, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Sort projects by last used.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Priority: Medium
- Rationale: Improves repeated multi-project navigation, but the embedded viewer migration already works without it.

# Notes
- Hybrid rationale: Derived from request `req_288_sort_projects_by_last_used` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_288_sort_projects_by_last_used.md`.
- Generated locally by logics-manager.
- Task `task_285_sort_projects_by_last_used` was finished via `logics-manager flow finish task` on 2026-07-05.

# Tasks
- `task_285_sort_projects_by_last_used`
