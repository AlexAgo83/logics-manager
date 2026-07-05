## task_285_sort_projects_by_last_used - Sort projects by last used
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 84
> Confidence: 80
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Plan
- [x] Locate the viewer project registry payload and switch-project update path.
- [x] Add or reuse a `lastUsedAt` / equivalent timestamp field for project entries.
- [x] Sort project-list output with active project first, then favorited inactive projects by last-used descending.
- [x] Update the timestamp when `/api/switch-project` or equivalent project-open flow succeeds.
- [x] Add focused Python or JS tests for ordering and timestamp update behavior.
- [x] Run viewer-focused tests plus `logics-manager lint --require-status`.

# Backlog
- `item_531_sort_projects_by_last_used`

# Acceptance criteria
- AC1: The active project is always first in the viewer project list.
- AC2: Favorited inactive projects are sorted by last-used timestamp descending.
- AC3: Projects without a last-used timestamp fall after timestamped favorites using the existing stable/name fallback.
- AC4: Opening or switching to a project updates its last-used timestamp in the project registry.
- AC5: Tests cover active-first sorting, timestamp sorting, missing timestamp fallback, and timestamp update on project use.

# AC Traceability
- request-AC1 -> This task. Proof: `renderProjectMenu` ordering now pins the active project first, then sorts favorited inactive projects by `projectLastUsedAt`.
- request-AC2 -> This task. Proof: `task_285` implements the linked backlog slice and covers active-first, last-used, missing timestamp, switch, and picker update behavior in `tests/viewer.browser-host.test.ts`.
- backlog-AC1 -> This task. Proof: active project ordering is asserted by the project-menu tests and enforced before favorite sorting.
- backlog-AC2 -> This task. Proof: favorite projects read persisted `projectLastUsedAt` timestamps and sort newest first.
- backlog-AC3 -> This task. Proof: missing timestamps resolve to `0`, preserving the existing registry order after timestamped favorites.
- backlog-AC4 -> This task. Proof: successful `/api/switch-project`, native picker, and fallback picker payloads update `projectLastUsedAt` in viewer preferences.
- backlog-AC5 -> This task. Proof: `npm test -- tests/viewer.browser-host.test.ts -t "project"` covers the ordering and timestamp update cases.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_285_sort_projects_by_last_used.md` after implementation.
- Finish workflow executed on 2026-07-05.
- Linked backlog/request close verification passed.
- `npm test -- tests/viewer.browser-host.test.ts -t "project"` passed.
- `npm run check:viewer-host` passed.
- `npm run lint` passed.
- `logics-manager lint --require-status` passed.

# Report
- Implementation complete.
- Finished on 2026-07-05.
- Linked backlog item(s): `item_531_sort_projects_by_last_used`
- Related request(s): `req_288_sort_projects_by_last_used`

# AI Context
- Summary: Implement sort projects by last used.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_288_sort_projects_by_last_used`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
