## task_255_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges - Real-time viewer sync via SSE plus fix for stale CI and CDX badges
> From version: 2.12.0
> Schema version: 1.0
> Status: Done
> Understanding: 96%
> Confidence: 88%
> Progress: 100%
> Complexity: High
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] Quick fix: the idle background tick now calls the unified `refreshBadgeCounters()` (git + CI + CDX) instead of `refreshGitBadgeCounters()` alone, so the CI and CDX badges refresh without opening their screens (`clients/viewer/browser-host.js` `refreshViewer` idle branch).
- [x] Add `GET /api/events` SSE endpoint in `logics_manager/viewer.py` emitting `ready` and `changed` events tagged by component (`corpus`, `git`, `ci`, `cdx`).
- [x] Add a server-side watcher: mtime poll/notify on `logics/`, git HEAD/refs/packed refs; CI/CDX gated on a slower status-signature cadence using the existing status component cache.
- [x] Add ETag/`If-None-Match` to `/api/status` so unchanged polls return 304 (no recompute, no transfer).
- [x] Client: subscribe via `EventSource`, refetch only affected component(s)/open screen on change; keep scheduled polling as fallback when SSE drops/unsupported.
- [x] Tests (python + viewer) cover change-event/ETag/304 and SSE→poll fallback.
- [x] Background badge-refresh covered by a viewer test (CI badge updates on the idle tick); `viewer_assets/` synced; full suite green.

# Backlog
- `item_462_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges`

# Acceptance criteria
- AC1: A tracked change (corpus edit, git commit, CI status change, CDX session/run change) updates the relevant badge within ~2s with the viewer open and no screen focused.
- AC2: An unchanged background sync returns 304/ETag (or equivalent skip) with no full recompute/re-transfer.
- AC3: The CI badge updates in the background (regression guard) and CDX badges keep working.
- AC4: SSE is used when available and degrades gracefully to stretched polling otherwise.
- AC5: Tests cover server change-event/ETag and client background refresh + fallback; `viewer_assets/` synced.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run` (viewer tests) and the python viewer/CLI tests.
- Run `python3 -m logics_manager flow finish task task_255_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges.md` after implementation.
- Finish workflow executed on 2026-06-20.
- Linked backlog/request close verification passed.

# Report
- Implemented the concrete reported bug: the viewer's idle background tick refreshed only the git badge, so the CI (and CDX) badges stayed stale until their screen was opened. `refreshViewer`'s idle POST branch now calls the unified `refreshBadgeCounters()` (`/api/status` -> git + CI + CDX). Added a viewer test proving the CI badge flips passing->failing on a background refresh with no screen open.
- Implemented the real-time push slice: `/api/events` streams SSE `ready`/`changed` events; the server watches corpus mtimes, git refs, and slower CI/CDX status signatures; status caches are invalidated for changed components; the client subscribes via `EventSource` and refreshes only the affected badges/open screen while keeping polling as fallback.
- Validation: python viewer tests (88) cover `/api/events` corpus change events and status ETag/304; viewer suite (118) covers EventSource subscription, changed-event badge refresh, and SSE error fallback. `viewer_assets/` synced.
- Finished on 2026-06-20.
- Linked backlog item(s): `item_462_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges`
- Related request(s): `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`

# AI Context
- Summary: Implement SSE push + watcher, conditional `/api/status`, and background unified badge refresh; keep polling fallback.
- Keywords: SSE, EventSource, watcher, debounce, ETag, 304, ci badge, cdx badge, fallback
- Use when: You need the bounded implementation task for viewer real-time sync.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC2 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC3 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC4 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC5 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC6 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC7 -> This task. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
