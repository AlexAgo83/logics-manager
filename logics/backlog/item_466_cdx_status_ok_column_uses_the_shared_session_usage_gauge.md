## item_466_cdx_status_ok_column_uses_the_shared_session_usage_gauge - CDX status OK column uses the shared session usage gauge
> From version: 2.12.0
> Schema version: 1.0
> Status: Ready
> Understanding: 100%
> Confidence: 99%
> Progress: 100%
> Complexity: Low
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The CDX status screen renders the readiness/OK column with plain badges (`renderCdxStatus`, badge helper `clients/viewer/browser-host.js:5047`), while the terminal view already shows a richer session usage gauge (`renderCdxUsageGauge(usage, sessionName)`, `:3957`) that operators are used to reading. The two surfaces are visually inconsistent and the status screen conveys less at a glance.

# Scope
- In:
  - Reuse the existing `renderCdxUsageGauge` component for the OK/readiness column of the CDX status table so the gauge is consistent with the terminal view.
  - Map the per-row CDX status data to the gauge's expected usage input; fall back to the current badge when usage data is unavailable.
- Out:
  - Changing the gauge's own visual design.
  - Adding new columns or reworking the rest of the CDX status table.

# Acceptance criteria
- AC1: The CDX status OK/readiness column renders the shared `renderCdxUsageGauge` component, matching the terminal view.
- AC2: When a row has no usable usage data, the column degrades gracefully (existing badge or a clear empty state) without errors.
- AC3: No regression in the CDX status screen; tests cover the gauge rendering in the status column and the no-usage fallback, and the dual-copy `viewer_assets/` stays in sync.

# AC Traceability
- request-AC5 -> This backlog slice reuses the session usage gauge in the CDX status OK column. Proof: AC1, AC2.
- request-AC7 -> No regression. Proof: AC3 (tests pass; dual-copy synced).
- request-AC4 -> This backlog slice. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.
- request-AC6 -> This backlog slice. Proof: Traceability repair: req_263 is split into backlog items 462-467 and tasks 255-260; current implementation evidence is recorded in the linked task reports and targeted viewer/Python validation.

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
- Request: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`
- Primary task(s): `task_259_cdx_status_ok_column_uses_the_shared_session_usage_gauge`

# AI Context
- Summary: Reuse renderCdxUsageGauge for the CDX status OK/readiness column with a graceful no-usage fallback.
- Keywords: cdx status, OK column, readiness, usage gauge, renderCdxUsageGauge, terminal view, consistency
- Use when: Implementing or reviewing the CDX status readiness column.
- Skip when: The change is unrelated to the CDX status screen.

# Priority
- Impact: Low-Medium — visual consistency and quicker read.
- Urgency: Low.

# Notes
- Hybrid rationale: Derived from request `req_263_...` and kept bounded to the CDX status gauge slice.
- Source file: `logics/request/req_263_viewer_ux_batch_real_time_sync_unified_file_preview_board_activity_restructure_cdx_gauge.md`.

# Tasks
- `task_259_cdx_status_ok_column_uses_the_shared_session_usage_gauge`
