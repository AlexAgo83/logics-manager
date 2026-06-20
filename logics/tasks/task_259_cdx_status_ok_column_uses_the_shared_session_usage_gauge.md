## task_259_cdx_status_ok_column_uses_the_shared_session_usage_gauge - CDX status OK column uses the shared session usage gauge
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 100%
> Confidence: 99%
> Progress: 100%
> Complexity: Low
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] In `renderCdxStatus` (`clients/viewer/browser-host.js`), render the OK/readiness column with the existing `renderCdxUsageGauge(usage, sessionName)` (`:3957`).
- [x] Map each CDX status row to the gauge's usage input; when no usable usage data exists, fall back to the current pill/percent.
- [x] Tests cover gauge rendering in the status column and the no-usage fallback; `viewer_assets/` synced.

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
- Implemented: the `ok` cell renderer in `renderCdxStatus` now builds `{percent, reset}` from the row (`cdxRemainingPct` + `formatCdxResetAt`) and renders `renderCdxUsageGauge(usage, name)` inside `.viewer-cdx__ok-cell`; falls back to the legacy remaining pill/percent when the row has no session name or no usable usage. Added centering CSS for the cell.
- Validation: added a test asserting one gauge per session row in the OK column with the correct `data-viewer-cdx-usage-refresh` targets; `npx vitest run tests/viewer.browser-host.test.ts` → 112 passed; `viewer_assets/` synced.

# AI Context
- Summary: Reuse renderCdxUsageGauge in the CDX status OK column with a no-usage fallback.
- Keywords: cdx status, OK column, readiness, usage gauge, renderCdxUsageGauge
- Use when: You need the bounded implementation task for the CDX status gauge.
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
