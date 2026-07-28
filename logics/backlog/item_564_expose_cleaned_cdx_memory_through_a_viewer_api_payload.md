## item_564_expose_cleaned_cdx_memory_through_a_viewer_api_payload - Expose cleaned CDX memory through a viewer API payload
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer API
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The viewer needs a stable payload contract for memory inspection, but should not duplicate raw cdx memory parsing or cleaning logic.

# Scope
- In:
  - Add a viewer payload function/endpoint such as `/api/cdx-memory` that delegates to the shared cleaned `cdx memory` reader.
  - Support `scope=current|global` and return a bounded payload with source path, content excerpts, bytes before/after, noise ratio, detected repo, warnings, and availability state.
  - Return explicit states for ready, empty, unavailable, unsupported-json, and clean-failed.
  - Keep the endpoint read-only and do not expose memory mutation commands.
  - Add Python tests for populated, empty, unavailable, unsupported, and noisy-memory payloads.
- Out:
  - Implementing the memory cleaning algorithm itself if it already exists in the sibling assistant-context slice.
  - Directly reading `.cdx/contexts` files from viewer code.

# Acceptance criteria
- AC1: `/api/cdx-memory?scope=current` returns a ready payload when `cdx memory show --json` succeeds.
- AC2: The payload includes source path, scope, byte counts, noise ratio, detected repo, warnings, and raw/cleaned bounded excerpts.
- AC3: Missing or unsupported `cdx memory` produces an explicit non-throwing unavailable payload.
- AC4: Python tests cover ready, empty, unavailable, unsupported-json, and noisy-memory paths.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: `/api/cdx-memory?scope=current` returns a ready payload when `cdx memory show --json` succeeds.
- request-AC3 -> This backlog slice. Proof: AC2: The payload includes source path, scope, byte counts, noise ratio, detected repo, warnings, and raw/cleaned bounded excerpts.
- request-AC5 -> This backlog slice. Proof: AC3: Missing or unsupported `cdx memory` produces an explicit non-throwing unavailable payload.
- request-AC7 -> This backlog slice. Proof: AC4: Python tests cover ready, empty, unavailable, unsupported-json, and noisy-memory paths.
- request-AC6 -> This backlog slice. Evidence needed: Badges or status labels make high-noise, stale, or unavailable memory visible from the CDX area.
- request-AC8 -> This backlog slice. Evidence needed: Browser-host tests cover the CDX Memory screen rendering, scope switching, raw/cleaned toggle, warning state, and no-overlap/empty-state behavior.
- request-AC6 -> This backlog slice. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`
- request-AC8 -> This backlog slice. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_046_cdx_memory_viewer_inspection`
- Architecture decision(s): (none yet)
- Request: `req_298_add_a_cdx_memory_viewer_screen_for_cleaned_handoff_inspection`
- Primary task(s): `task_295_orchestrate_cdx_memory_viewer_screen_delivery`

# AI Context
- Summary: Expose cleaned CDX memory through a viewer API payload
- Keywords: scaffolded-backlog, expose cleaned cdx memory through a viewer api payload, implementation-ready
- Use when: Implementing the scaffolded slice for Expose cleaned CDX memory through a viewer API payload.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_295_orchestrate_cdx_memory_viewer_screen_delivery` was finished via `logics-manager flow finish task` on 2026-07-28.
