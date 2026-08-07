## item_599_derive_document_age_and_staleness_from_one_implementation - Derive document age and staleness from one implementation
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Single source of truth
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-07

# Problem
- The browser viewer dates documents from filesystem mtime, so a fresh clone gives every document the same date and any recency ordering becomes meaningless.
- The embedded editor panel then computes staleness over that mtime with its own hardcoded thirty-day threshold, while the CLI uses a configurable fourteen-day threshold over commit dates. The same document can be stale in one surface and current in the other.

# Scope
- In:
  - Source the viewer's document timestamps from the shared commit-based lookup, keeping the filesystem fallback.
  - Expose the derived age alongside the timestamp so a surface does not have to compute it.
  - Replace the editor panel's own staleness computation and hardcoded threshold with the reported verdict.
  - Keep the existing timestamp field name and format so current consumers are unaffected.
- Out:
  - Redesigning how either surface displays dates.
  - Adding new sort or filter controls.
  - Changing the configured default threshold.

# Acceptance criteria
- AC1: A document's reported age is identical whichever surface reports it.
- AC2: The age survives a fresh clone, where every file shares one filesystem timestamp.
- AC3: No surface carries its own staleness threshold; changing the configured value changes every surface.
- AC4: The existing timestamp field keeps its name and format.
- AC5: Tests cover a committed document, an untracked one, and agreement between the surfaces.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A document's reported age is identical whichever surface reports it.
- request-AC3 -> This backlog slice. Proof: AC2: The age survives a fresh clone, where every file shares one filesystem timestamp.
- request-AC8 -> This backlog slice. Proof: AC3: No surface carries its own staleness threshold; changing the configured value changes every surface.
- request-AC4 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
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
- Summary: Derive document age and staleness from one implementation
- Keywords: scaffolded-backlog, derive document age and staleness from one implementation, implementation-ready
- Use when: Implementing the scaffolded slice for Derive document age and staleness from one implementation.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - two surfaces currently disagree about the same document
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals`

# Notes
- Task `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals` was finished via `logics-manager flow finish task` on 2026-08-07.
