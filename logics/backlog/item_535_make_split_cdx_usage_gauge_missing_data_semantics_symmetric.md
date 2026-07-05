## item_535_make_split_cdx_usage_gauge_missing_data_semantics_symmetric - Make split CDX usage gauge missing-data semantics symmetric
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Usage telemetry display
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The split usage gauge handles a missing weekly window as unknown, but a missing 5-hour window can fall back to generic availability data.
- That fallback makes partial usage telemetry look more precise than it is.

# Scope
- In:
  - Update the gauge data mapping so 5-hour and weekly windows independently render unknown when their specific fields are absent.
  - Add a missing-5-hour test alongside the existing missing-week coverage.
  - Keep existing rendering behavior for complete usage payloads.
- Out:
  - Changing upstream CDX usage collection.
  - Redesigning the usage gauge UI.

# Acceptance criteria
- Missing 5-hour data displays as neutral or unknown.
- Missing weekly data continues to display as neutral or unknown.
- Complete 5-hour and weekly data still renders the expected split gauge values.

# AC Traceability
- request-The split CDX usage gauge renders each missing 5-hour or weekly window as unknown without falling back to unrelated availability data. -> This backlog slice. Proof: Missing 5-hour data displays as neutral or unknown.
- request-Focused viewer, VS Code extension, lint, and Logics validation commands pass after the fixes are implemented. -> This backlog slice. Proof: Missing weekly data continues to display as neutral or unknown.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_post_release_viewer_hardening`
- Architecture decision(s): (none yet)
- Request: `req_290_post_release_viewer_and_vs_code_hardening`
- Primary task(s): `task_287_orchestrate_post_release_viewer_hardening`

# AI Context
- Summary: Make split CDX usage gauge missing-data semantics symmetric
- Keywords: scaffolded-backlog, make split cdx usage gauge missing-data semantics symmetric, implementation-ready
- Use when: Implementing the scaffolded slice for Make split CDX usage gauge missing-data semantics symmetric.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_287_orchestrate_post_release_viewer_hardening` was finished via `logics-manager flow finish task` on 2026-07-05.
