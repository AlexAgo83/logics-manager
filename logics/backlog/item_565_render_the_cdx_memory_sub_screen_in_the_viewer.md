## item_565_render_the_cdx_memory_sub_screen_in_the_viewer - Render the CDX Memory sub-screen in the viewer
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer UI
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Operators need an inspectable UI for cleaned memory, not only JSON output from a CLI command.

# Scope
- In:
  - Add Memory as a sub-screen/tab inside the existing CDX viewer surface.
  - Reuse `.viewer-cdx__*` rendering patterns for rows, badges, pills, detail code blocks, and empty states.
  - Render current/global scope controls, source path, quality metrics, latest useful handoff excerpt, warnings, and raw/cleaned toggle.
  - Keep stable dimensions for code/excerpt panels so toggling raw/cleaned content does not shift the surrounding CDX layout.
  - Add browser-host tests for populated rendering, scope switching, raw/cleaned toggle, and empty state.
- Out:
  - Adding a separate top-level Memory navigation item.
  - Adding edit/clear/append actions.

# Acceptance criteria
- AC1: The CDX area exposes a Memory sub-screen reachable by keyboard and pointer.
- AC2: The screen renders quality metrics and excerpts using existing CDX visual language.
- AC3: Raw/cleaned toggle changes only the excerpt panel and does not expose mutation controls.
- AC4: Browser-host tests cover populated, scope-switch, toggle, and empty-state UI.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The CDX area exposes a Memory sub-screen reachable by keyboard and pointer.
- request-AC3 -> This backlog slice. Proof: AC2: The screen renders quality metrics and excerpts using existing CDX visual language.
- request-AC4 -> This backlog slice. Proof: AC3: Raw/cleaned toggle changes only the excerpt panel and does not expose mutation controls.
- request-AC8 -> This backlog slice. Proof: AC4: Browser-host tests cover populated, scope-switch, toggle, and empty-state UI.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_046_cdx_memory_viewer_inspection`
- Architecture decision(s): (none yet)
- Request: `req_298_add_a_cdx_memory_viewer_screen_for_cleaned_handoff_inspection`
- Primary task(s): `task_295_orchestrate_cdx_memory_viewer_screen_delivery`

# AI Context
- Summary: Render the CDX Memory sub-screen in the viewer
- Keywords: scaffolded-backlog, render the cdx memory sub-screen in the viewer, implementation-ready
- Use when: Implementing the scaffolded slice for Render the CDX Memory sub-screen in the viewer.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
