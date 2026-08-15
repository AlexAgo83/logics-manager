## item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour - Build the reusable loading-ring CSS mechanism and decide the neutral colour
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer loading feedback
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:13:30

# AI Context
- Summary: Port the prototype's proven ring technique into the viewer's shared CSS (opaque inner cover + absolutely-positioned glow/sweep, square sweep box, opacity fade, reduced-motion fallback) and decide the neutral colour for untyped screens.
- Keywords: conic-gradient ring, opaque inner cover, prefers-reduced-motion, neutral colour decision
- Use when: Implementing this backlog item.
- Skip when: Wiring the ring into real screens — that's item_789.

# Problem
- The loading-ring technique exists only as a hand-tested standalone prototype (logics/external/mockup/loading_border_trace_proto.html); the viewer's own CSS has no shared version of it yet.
- The prototype's neutral colour for untyped screens (--vscode-descriptionForeground) was a placeholder chosen to have something to show, not a reviewed decision.

# Scope
- In:
  - Port the prototype's proven technique (opaque inner cover + absolutely-positioned glow/sweep layer, square sweep box) into the viewer's own shared CSS, as one reusable rule set keyed off `data-loading` + `--loading-color`.
  - Fade in/out on opacity (~450ms), no hard cut mid-rotation.
  - A `prefers-reduced-motion: reduce` fallback (static/breathing glow, no rotation) via a real media query.
  - A decided, documented neutral colour for screens with no document stage.
- Out:
  - Wiring this into any real screen's actual loading lifecycle -- that is the next slice.
  - Any change to the stage colour tokens themselves.

# Acceptance criteria
- AC1: The ring's CSS lives once in the viewer's shared stylesheet(s), not copy-pasted per screen, and is driven purely by `data-loading` + `--loading-color` on a header element.
- AC2: Toggling `data-loading` on a real header element in a local test produces a smooth fade-in/out with no visible snap, matching the prototype's behaviour.
- AC3: With `prefers-reduced-motion: reduce` simulated (e.g. via browser dev tools emulation), the ring shows a static/breathing glow with no rotation.
- AC4: A neutral colour for untyped screens is chosen and recorded (in code comment or this doc), not left as the prototype's unexamined placeholder.

# Report
- Ported from `logics/external/mockup/loading_border_trace_proto.html` into `clients/viewer/viewer.css` as one rule set driven by `data-loading` and `--loading-color` on `.viewer-document__header`.
- The reveal is a punch-through, not a CSS mask: `.viewer-document__ring` clips the rotating sweep and its own `::after` covers everything but a 2px rim. The prototype's first pass used `mask-composite: exclude` and the ring rendered invisible; that note is carried into the stylesheet so it is not tried again.
- One thing the prototype did not have to solve: it clipped on the header itself. The real header holds the Git actions menu, and `overflow: hidden` there would clip that menu open, so the clipping lives on a dedicated absolutely-positioned child -- which also keeps it out of the header's three-column grid.
- The sweep's box is square and oversized (`inset: -60%`) so the conic gradient's angular maths runs against a square rather than the header's wide box; otherwise the comet sprints along the long edges and crawls on the short ones.
- Neutral colour decided: `--viewer-loading-neutral`, the palette's description grey. It must not be any of the four stage colours, or an untyped screen would read as a request or a task; the description grey is already the palette's "this is not a state" colour and no stage claims it.
- Verified live: fade measured mid-transition at opacity 0.145 and 0.22 with `transition-duration: 0.45s`. Under `prefers-reduced-motion: reduce` emulated in Chrome, the sweep's animation computes to `none` with no gradient and the ring animates `viewer-loading-ring-breathe` at opacity 0.3 -- a pulse, no rotation.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The ring's CSS lives once in the viewer's shared stylesheet(s), not copy-pasted per screen, and is driven purely by `data-loading` + `--loading-color` on a header element.
- request-AC2 -> This backlog slice. Proof: AC2: Toggling `data-loading` on a real header element in a local test produces a smooth fade-in/out with no visible snap, matching the prototype's behaviour.
- request-AC3 -> This backlog slice. Proof: AC3: With `prefers-reduced-motion: reduce` simulated (e.g. via browser dev tools emulation), the ring shows a static/breathing glow with no rotation.
- request-AC4 -> This backlog slice. Proof: AC4: A neutral colour for untyped screens is chosen and recorded (in code comment or this doc), not left as the prototype's unexamined placeholder.

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

# Notes
- Task `task_360_orchestrate_the_loading_border_trace_feature` was finished via `logics-manager flow finish task` on 2026-08-15.
