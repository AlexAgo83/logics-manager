## item_567_validate_cdx_memory_screen_integration_with_focused_visual_and_payload_tests - Validate CDX Memory screen integration with focused visual and payload tests
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
