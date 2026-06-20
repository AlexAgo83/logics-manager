## task_259_cdx_status_ok_column_uses_the_shared_session_usage_gauge - CDX status OK column uses the shared session usage gauge
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 92%
> Confidence: 88%
> Progress: 0%
> Complexity: Low
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] In `renderCdxStatus` (`clients/viewer/browser-host.js`, badge helper `:5047`), render the OK/readiness column with the existing `renderCdxUsageGauge(usage, sessionName)` (`:3957`).
- [ ] Map each CDX status row to the gauge's usage input; when no usable usage data exists, fall back to the current badge or a clear empty state.
- [ ] Tests cover gauge rendering in the status column and the no-usage fallback; `viewer_assets/` synced.

# Backlog
- `item_466_cdx_status_ok_column_uses_the_shared_session_usage_gauge`

# Acceptance criteria
- AC1: The CDX status OK/readiness column renders `renderCdxUsageGauge`, matching the terminal view.
- AC2: Rows without usable usage degrade gracefully (badge/empty state) without errors.
- AC3: No regression; tests cover gauge + fallback; `viewer_assets/` synced.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `npx vitest run` (CDX status tests).
- Run `python3 -m logics_manager flow finish task task_259_cdx_status_ok_column_uses_the_shared_session_usage_gauge.md` after implementation.

# Report
- Pending implementation.

# AI Context
- Summary: Reuse renderCdxUsageGauge in the CDX status OK column with a no-usage fallback.
- Keywords: cdx status, OK column, readiness, usage gauge, renderCdxUsageGauge
- Use when: You need the bounded implementation task for the CDX status gauge.
- Skip when: The work is still at request/backlog shaping.

# Links
- Request: `req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
