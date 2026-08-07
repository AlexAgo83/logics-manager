## item_602_report_the_resolved_install_in_the_viewer_s_update_state - Report the resolved install in the viewer's update state
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Update visibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-07

# Problem
- The viewer reports the installed and available versions but not which package manager owns the running copy, where it lives, or whether another executable of the same name is on PATH.
- A shadowing duplicate install has caused real breakage twice, and the CLI now detects it, but an operator working in the viewer cannot see it.

# Scope
- In:
  - Add the resolved manager, the executable path, and any duplicate executables to the update state the viewer already sends.
  - Show a clear warning when duplicates are detected.
  - Reuse the CLI's existing detection rather than duplicating it.
- Out:
  - Performing an update from the viewer.
  - Removing or repairing a duplicate install automatically.
  - Changing the existing update fields.

# Acceptance criteria
- AC1: The update state names the resolved manager and the executable path.
- AC2: Duplicate executables on PATH are reported and shown as a warning.
- AC3: A single clean install produces no warning.
- AC4: The existing update fields keep their names and meaning.
- AC5: Detection is reused from the CLI, not reimplemented.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: The update state names the resolved manager and the executable path.
- request-AC8 -> This backlog slice. Proof: AC2: Duplicate executables on PATH are reported and shown as a warning.
- request-AC3 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC4 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC5 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC6 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_053_one_workflow_signal_every_logics_surface`
- Architecture decision(s): (none yet)
- Request: `req_305_give_the_viewer_surfaces_the_same_workflow_signals_the_cli_reports`
- Primary task(s): `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals`

# AI Context
- Summary: Report the resolved install in the viewer's update state
- Keywords: scaffolded-backlog, report the resolved install in the viewer's update state, implementation-ready
- Use when: Implementing the scaffolded slice for Report the resolved install in the viewer's update state.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Low - makes an already-diagnosed failure visible without a terminal
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals`

# Notes
- Task `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals` was finished via `logics-manager flow finish task` on 2026-08-07.
