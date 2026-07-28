## item_566_surface_cdx_memory_quality_warnings_without_blocking_cdx_use - Surface CDX memory quality warnings without blocking CDX use
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer trust signals
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A noisy or unavailable memory source should be visible before an operator relies on it, but it should not block unrelated CDX status, history, or mission workflows.

# Scope
- In:
  - Add CDX Memory status badges or compact warning labels for unavailable, high-noise, stale, empty, and ready states.
  - Keep badges local to the CDX surface and avoid inflating global unread counters unless the state needs operator attention.
  - Ensure unrelated CDX sections still render when memory is unavailable.
  - Add browser-host tests for warning badges and fallback behavior.
- Out:
  - Treating memory warnings as release or workflow blockers.
  - Sending notifications outside the viewer.

# Acceptance criteria
- AC1: High-noise, unavailable, stale, and ready memory states have distinct visible labels.
- AC2: Memory warnings do not block existing CDX status/history/mission rendering.
- AC3: Tests cover warning labels and fallback behavior.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: High-noise, unavailable, stale, and ready memory states have distinct visible labels.
- request-AC6 -> This backlog slice. Proof: AC2: Memory warnings do not block existing CDX status/history/mission rendering.
- request-AC8 -> This backlog slice. Proof: AC3: Tests cover warning labels and fallback behavior.
- request-AC4 -> This backlog slice. Evidence needed: The screen provides a compact raw/cleaned inspection toggle without allowing memory mutation.
- request-AC7 -> This backlog slice. Evidence needed: Python tests cover the viewer payload for populated, empty, unavailable, and noisy memory cases.
- request-AC4 -> This backlog slice. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`
- request-AC7 -> This backlog slice. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_046_cdx_memory_viewer_inspection`
- Architecture decision(s): (none yet)
- Request: `req_298_add_a_cdx_memory_viewer_screen_for_cleaned_handoff_inspection`
- Primary task(s): `task_295_orchestrate_cdx_memory_viewer_screen_delivery`

# AI Context
- Summary: Surface CDX memory quality warnings without blocking CDX use
- Keywords: scaffolded-backlog, surface cdx memory quality warnings without blocking cdx use, implementation-ready
- Use when: Implementing the scaffolded slice for Surface CDX memory quality warnings without blocking CDX use.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_295_orchestrate_cdx_memory_viewer_screen_delivery` was finished via `logics-manager flow finish task` on 2026-07-28.
