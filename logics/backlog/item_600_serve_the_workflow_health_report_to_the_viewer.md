## item_600_serve_the_workflow_health_report_to_the_viewer - Serve the workflow health report to the viewer
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Viewer health screen
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-07

# Problem
- The viewer serves lint and audit but has no route to the workflow health report, so its health screen is built from validation findings alone.
- Blocked documents, backlog items with no task, and stale documents are therefore invisible in the viewer, even though the CLI reports all three.

# Scope
- In:
  - Add a read-only route serving the workflow health report unchanged.
  - Include its signals in the viewer's health screen alongside the existing validation findings.
  - Keep the response cheap enough for the viewer's refresh interval, relying on the fixed age cache.
  - Degrade clearly when the report cannot be produced.
- Out:
  - Mutating anything from the health screen.
  - Redesigning the health screen's layout.
  - Adding health signals that the report does not already carry.

# Acceptance criteria
- AC1: The route returns the workflow health report for the active repository.
- AC2: The health screen shows blocked documents and stale documents from that report.
- AC3: Existing validation findings remain shown and unchanged.
- AC4: A refresh cycle does not repeat the full age walk when no commit has landed.
- AC5: A failure to produce the report is surfaced without blanking the screen.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The route returns the workflow health report for the active repository.
- request-AC8 -> This backlog slice. Proof: AC2: The health screen shows blocked documents and stale documents from that report.
- request-AC3 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC5 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC6 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC7 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_053_one_workflow_signal_every_logics_surface`
- Architecture decision(s): (none yet)
- Request: `req_305_give_the_viewer_surfaces_the_same_workflow_signals_the_cli_reports`
- Primary task(s): `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals`

# AI Context
- Summary: Serve the workflow health report to the viewer
- Keywords: scaffolded-backlog, serve the workflow health report to the viewer, implementation-ready
- Use when: Implementing the scaffolded slice for Serve the workflow health report to the viewer.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - the health screen cannot show blocked or stale work without it
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals`

# Notes
- Task `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals` was finished via `logics-manager flow finish task` on 2026-08-07.
