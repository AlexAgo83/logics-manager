## task_285_sort_projects_by_last_used - Sort projects by last used
> From version: 2.15.7
> Schema version: 1.0
> Status: Ready
> Understanding: 84
> Confidence: 80
> Progress: 0
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Plan
- [ ] Locate the viewer project registry payload and switch-project update path.
- [ ] Add or reuse a `lastUsedAt` / equivalent timestamp field for project entries.
- [ ] Sort project-list output with active project first, then favorited inactive projects by last-used descending.
- [ ] Update the timestamp when `/api/switch-project` or equivalent project-open flow succeeds.
- [ ] Add focused Python or JS tests for ordering and timestamp update behavior.
- [ ] Run viewer-focused tests plus `logics-manager lint --require-status`.

# Backlog
- `item_531_sort_projects_by_last_used`

# Acceptance criteria
- AC1: The active project is always first in the viewer project list.
- AC2: Favorited inactive projects are sorted by last-used timestamp descending.
- AC3: Projects without a last-used timestamp fall after timestamped favorites using the existing stable/name fallback.
- AC4: Opening or switching to a project updates its last-used timestamp in the project registry.
- AC5: Tests cover active-first sorting, timestamp sorting, missing timestamp fallback, and timestamp update on project use.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_285_sort_projects_by_last_used.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement sort projects by last used.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_288_sort_projects_by_last_used`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
