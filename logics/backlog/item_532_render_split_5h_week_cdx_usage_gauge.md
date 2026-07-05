## item_532_render_split_5h_week_cdx_usage_gauge - Render split 5h/week CDX usage gauge
> From version: 2.15.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer CDX usage UI
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The current compact CDX usage gauge shows one remaining percentage, so operators cannot tell whether the short 5h window or the weekly window is the limiting factor without opening separate columns.

# Scope
- In:
  - Extend the shared gauge input to carry `fiveHour` and `week` usage values or an equivalent small shape.
  - Update `cdxSessionUsage` and CDX ok-cell usage construction to pass both `remaining_5h_pct` and `remaining_week_pct` plus their reset times.
  - Render two 50/50 gauge columns inside the existing gauge dimensions, with a subtle divider.
  - Apply independent tone/fill/unknown state per side.
  - Keep the existing outer click target and refresh data attribute unchanged.
  - Add focused viewer/browser-host tests and update generated viewer host bundle if required.
- Out:
  - Changing the backend CDX status payload shape.
  - Changing project-wide color semantics for CDX readiness.
  - Expanding the terminal row height or status table width.

# Acceptance criteria
- AC1: `renderCdxUsageGauge` can render 5h and week values side by side in one compact gauge.
- AC2: The gauge outer element still has `data-viewer-cdx-usage-refresh`, `role=button`, and `tabindex=0`.
- AC3: 5h and week sides have independent fill heights and tone classes.
- AC4: Unknown/missing values render neutral for only the missing side.
- AC5: Tests assert split markup in both terminal usage and CDX OK-cell scenarios.
- AC6: Viewer host bundle/check scripts pass after source edits.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `renderCdxUsageGauge` can render 5h and week values side by side in one compact gauge.
- request-AC2 -> This backlog slice. Proof: AC2: The gauge outer element still has `data-viewer-cdx-usage-refresh`, `role=button`, and `tabindex=0`.
- request-AC3 -> This backlog slice. Proof: AC3: 5h and week sides have independent fill heights and tone classes.
- request-AC4 -> This backlog slice. Proof: AC4: Unknown/missing values render neutral for only the missing side.
- request-AC5 -> This backlog slice. Proof: AC5: Tests assert split markup in both terminal usage and CDX OK-cell scenarios.
- request-AC6 -> This backlog slice. Proof: AC6: Viewer host bundle/check scripts pass after source edits.
- request-AC7 -> This backlog slice. Proof: AC6: Viewer host bundle/check scripts pass after source edits.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_037_split_cdx_usage_gauge`
- Architecture decision(s): (none yet)
- Request: `req_289_split_the_cdx_usage_gauge_into_5h_and_week_columns`
- Primary task(s): `task_286_implement_split_5h_week_cdx_usage_gauge`

# AI Context
- Summary: Render split 5h/week CDX usage gauge
- Keywords: scaffolded-backlog, render split 5h/week cdx usage gauge, implementation-ready
- Use when: Implementing the scaffolded slice for Render split 5h/week CDX usage gauge.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
