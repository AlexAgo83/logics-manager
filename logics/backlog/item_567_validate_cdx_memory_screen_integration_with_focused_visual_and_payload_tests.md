## item_567_validate_cdx_memory_screen_integration_with_focused_visual_and_payload_tests - Validate CDX Memory screen integration with focused visual and payload tests
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Viewer screens can regress through blank panels, unstable layout, or untested fetch states when a new CDX sub-screen is added.

# Scope
- In:
  - Add Python payload tests for the API contract if not fully covered in the payload slice.
  - Add browser-host tests with fixtures for ready, empty, noisy, unavailable, and stale memory states.
  - Add or update a visual smoke fixture if the viewer test harness already supports CDX sub-screens.
  - Document the smallest validation command set in the task closeout notes.
- Out:
  - Full Playwright screenshot suite unless an existing harness makes it cheap.
  - Testing every CDX section again.

# Acceptance criteria
- AC1: Focused tests fail if the Memory screen renders blank for ready or unavailable payloads.
- AC2: Tests assert scope controls, raw/cleaned toggle, warning labels, and bounded excerpts.
- AC3: Closeout notes name the exact Python and browser-host commands used.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: Focused tests fail if the Memory screen renders blank for ready or unavailable payloads.
- request-AC8 -> This backlog slice. Proof: AC2: Tests assert scope controls, raw/cleaned toggle, warning labels, and bounded excerpts.
- request-AC3 -> This backlog slice. Evidence needed: The screen renders source path, scope, bytes before/after cleaning, estimated noise ratio, detected repo, warnings, and latest useful handoff excerpt.
- request-AC4 -> This backlog slice. Evidence needed: The screen provides a compact raw/cleaned inspection toggle without allowing memory mutation.
- request-AC5 -> This backlog slice. Evidence needed: Empty memory, unavailable `cdx memory`, unsupported JSON, and noisy-memory cleanup states are rendered explicitly and do not blank the viewer.
- request-AC6 -> This backlog slice. Evidence needed: Badges or status labels make high-noise, stale, or unavailable memory visible from the CDX area.
- request-AC3 -> This backlog slice. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`
- request-AC4 -> This backlog slice. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`
- request-AC5 -> This backlog slice. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`
- request-AC6 -> This backlog slice. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_046_cdx_memory_viewer_inspection`
- Architecture decision(s): (none yet)
- Request: `req_298_add_a_cdx_memory_viewer_screen_for_cleaned_handoff_inspection`
- Primary task(s): `task_295_orchestrate_cdx_memory_viewer_screen_delivery`

# AI Context
- Summary: Validate CDX Memory screen integration with focused visual and payload tests
- Keywords: scaffolded-backlog, validate cdx memory screen integration with focused visual and payload tests, implementation-ready
- Use when: Implementing the scaffolded slice for Validate CDX Memory screen integration with focused visual and payload tests.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_295_orchestrate_cdx_memory_viewer_screen_delivery` was finished via `logics-manager flow finish task` on 2026-07-28.
