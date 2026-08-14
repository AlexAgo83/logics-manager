## item_789_wire_the_loading_ring_into_the_real_viewer_screens - Wire the loading ring into the real viewer screens
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer loading feedback
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:13:30

# AI Context
- Summary: Set `data-loading`/`--loading-color` from the viewer's existing loading signals (`setMeta`, `showScreenLoading`) for both typed document screens (coloured by stage) and untyped screens (neutral colour), without touching any existing loading text.
- Keywords: setMeta, showScreenLoading, data-loading wiring, stage colour, neutral colour
- Use when: Implementing this backlog item.
- Skip when: The CSS ring mechanism itself — that's item_788.

# Problem
- The loading-ring mechanism (once built) has no connection yet to the real signals a viewer screen already has for "I am loading" and "I am a request/backlog/task/product" -- setMeta/showScreenLoading and their callers know this today, but nothing sets `data-loading`/`--loading-color` from them.

# Scope
- In:
  - Set `data-loading` + `--loading-color` on the header when a document screen (request/backlog/task/product) starts and stops loading, coloured by that document's stage.
  - Set `data-loading` + the decided neutral colour when an untyped screen (Settings, CI, Release, Workshop, CDX) starts and stops loading.
  - Leave every existing loading text/copy (`setMeta("Refreshing...")`, `showScreenLoading`'s waiting-for text) exactly as it is today.
- Out:
  - The CSS ring mechanism itself -- built in the sibling slice.
  - Any new loading states beyond what the screens already track.

# Acceptance criteria
- AC1: Opening a request/backlog/task/product document shows the ring in that document's stage colour while it loads, and the ring clears when the content is ready.
- AC2: Opening an untyped screen (Settings, CI, Release, Workshop, or CDX) shows the ring in the decided neutral colour while it loads.
- AC3: The existing loading text on every wired screen is unchanged, verified by comparing before/after screen text.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Opening a request/backlog/task/product document shows the ring in that document's stage colour while it loads, and the ring clears when the content is ready.
- request-AC6 -> This backlog slice. Proof: AC2: Opening an untyped screen (Settings, CI, Release, Workshop, or CDX) shows the ring in the decided neutral colour while it loads.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_094_loading_border_trace`
- Architecture decision(s): (none yet)
- Request: `req_360_loading_border_trace_an_animated_ring_on_the_header_while_a_screen_loads`
- Primary task(s): `task_360_orchestrate_the_loading_border_trace_feature`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
