## item_462_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges - Real-time viewer sync via SSE plus fix for stale CI and CDX badges
> From version: 2.12.0
> Schema version: 1.0
> Status: Done
> Understanding: 96%
> Confidence: 88%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The viewer polls a full `/api/refresh` every X seconds (default ~15s) and recomputes even when nothing changed. Worse, when no screen is open the background tick only refreshes the git badge (`refreshViewer` -> `refreshGitBadgeCounters()`, `clients/viewer/browser-host.js:2547`); the unified `/api/status` poll `refreshBadgeCounters()` (`:1910`) that carries CI and CDX is never scheduled on the timer, so the CI badge stays stale until the operator opens the CI screen. There is no real-time push even though SSE infrastructure already exists for Workshop terminals (`logics_manager/viewer.py:3284,3334`). The result is laggy, sometimes-inconsistent badges and unnecessary recompute when idle.

# Scope
- In:
  - Add a server `GET /api/events` SSE channel that emits a debounced "changed" signal (with which component changed: corpus/git/ci/cdx) driven by a server-side watcher (mtime on `logics/`, git HEAD/refs; CI/CDX on their existing recompute cadence).
  - Client: subscribe via `EventSource`, and on a change event refetch only the affected component(s)/open screen instead of a blanket refresh.
  - Add an ETag/`If-None-Match` short-circuit to `/api/status` so unchanged polls return 304 (no recompute, no transfer).
  - Schedule the unified `refreshBadgeCounters()` on the background tick (or drive it from SSE) so CI and CDX badges update without opening their screens; keep git on a slower cadence to limit GitHub API pressure (configurable).
  - Keep polling as a fallback when SSE is unavailable, with a longer interval.
- Out:
  - Scroll/focus/selection preservation on re-render (already handled by req_260 / item_455).
  - Reworking the badge meaning/counts (covered by prior CDX badge work).
  - Any non-viewer surface.

# Acceptance criteria
- AC1: With the viewer open and no screen focused, a change to a tracked source (a corpus file edit, a git commit, a CI status change, a CDX session/run change) updates the relevant badge within a couple of seconds without the operator opening that screen.
- AC2: When nothing has changed, the background sync does not recompute or re-transfer a full status payload (verified via 304/ETag or an equivalent unchanged-skip), keeping idle cost low.
- AC3: The CI badge specifically updates in the background (regression guard for the original report) and CDX badges keep working.
- AC4: SSE is used when available and the viewer degrades gracefully to (stretched) polling when the channel drops or is unsupported.
- AC5: Tests cover the server change-event/ETag behavior and the client's background badge refresh + SSE-to-poll fallback; `viewer_assets/` stays in sync.

# AC Traceability
- request-AC1 -> This backlog slice delivers the SSE channel, conditional `/api/status`, and the background CI/CDX badge refresh. Proof: AC1, AC2, AC3, AC4.
- request-AC7 -> No regression. Proof: AC5 (tests pass; dual-copy `viewer_assets/` synced).
- request-AC6 -> This backlog slice. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Recommended (introduces a push transport + watcher)
- Architecture signals: new long-lived SSE endpoint, server-side watcher lifecycle, fallback strategy
- Architecture follow-up: Capture the SSE/watcher transport choice and fallback contract in an ADR if the design proves non-trivial during implementation.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`
- Primary task(s): `task_255_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges`

# AI Context
- Summary: Add an SSE push channel + watcher and conditional `/api/status`, and schedule the unified badge refresh so CI/CDX stop lagging.
- Keywords: SSE, EventSource, watcher, debounce, ETag, 304, conditional polling, ci badge, cdx badge, fallback
- Use when: Implementing or reviewing the viewer's real-time sync and badge freshness.
- Skip when: The change is unrelated to viewer sync/transport.

# Priority
- Impact: High — fixes visible badge staleness and reduces idle recompute.
- Urgency: Medium — depends on the rest of the batch landing first for a stable base.

# Notes
- Hybrid rationale: Derived from request `req_263_...` and kept bounded to the sync/transport slice.
- Source file: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`.
- Implementation note: `/api/events` now streams component-tagged changes for corpus/git/ci/cdx, `/api/status` supports cached ETag revalidation, and the browser viewer uses EventSource with polling fallback.
- Task `task_255_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_255_real_time_viewer_sync_via_sse_plus_fix_for_stale_ci_and_cdx_badges`
