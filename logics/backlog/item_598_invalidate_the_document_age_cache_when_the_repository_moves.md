## item_598_invalidate_the_document_age_cache_when_the_repository_moves - Invalidate the document-age cache when the repository moves
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Low
> Theme: Correctness of the age lookup
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-07

# Problem
- The batched age lookup caches its result per process with no invalidation, which is correct for a one-shot command and wrong for a long-running one.
- In the MCP server, a document committed after the first lookup is never dated and existing ages freeze for the life of the process. Wiring the viewer to this lookup would freeze its display the same way, on a surface that refreshes every fifteen seconds.

# Scope
- In:
  - Key the cache on the repository's current commit, so a new commit produces a fresh lookup.
  - Keep the single batched walk per commit, rather than reverting to one lookup per document.
  - Keep the existing fallback for a document that is untracked or has no commit yet.
  - Cover the long-running case in a test that commits between two lookups in one process.
- Out:
  - A time-based expiry policy.
  - Watching the filesystem for changes.
  - Caching anything other than the age lookup.

# Acceptance criteria
- AC1: Two lookups in one process, with a commit between them, return results reflecting that commit.
- AC2: Repeated lookups with no commit in between do not repeat the full walk.
- AC3: A repository with no version-control history still returns the filesystem fallback.
- AC4: A test fails against the current implementation and passes against the fix.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Two lookups in one process, with a commit between them, return results reflecting that commit.
- request-AC2 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC3 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC4 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC5 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC6 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC7 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`
- request-AC8 -> This backlog slice. Proof: Delivered across commits 39273708 (age-cache invalidation), a90566ec (one age and one threshold), 40c64da3 (/api/health), cdfa141c (per-project switcher state and one corpus definition), 65dc821c (install details in the viewer). Validated with python -m pytest tests/python (909 passed) and npx vitest run (760 passed), lint, and audit. Source: `65dc821c`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_053_one_workflow_signal_every_logics_surface`
- Architecture decision(s): (none yet)
- Request: `req_305_give_the_viewer_surfaces_the_same_workflow_signals_the_cli_reports`
- Primary task(s): `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals`

# AI Context
- Summary: Invalidate the document-age cache when the repository moves
- Keywords: scaffolded-backlog, invalidate the document-age cache when the repository moves, implementation-ready
- Use when: Implementing the scaffolded slice for Invalidate the document-age cache when the repository moves.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a shipped defect, and every other slice depends on the fix
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals`

# Notes
- Task `task_302_orchestrate_viewer_parity_with_the_cli_workflow_signals` was finished via `logics-manager flow finish task` on 2026-08-07.
