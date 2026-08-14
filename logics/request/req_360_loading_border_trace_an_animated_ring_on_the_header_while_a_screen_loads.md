## req_360_loading_border_trace_an_animated_ring_on_the_header_while_a_screen_loads - Loading border trace: an animated ring on the header while a screen loads
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer loading feedback
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:13:30

# AI Context
- Summary: A stage-coloured animated ring travels the viewer header's edge while a screen loads, approved from a working prototype (`logics/external/mockup/loading_border_trace_proto.html`) that already solved the hard part -- the CSS technique that actually renders (an opaque inner cover over an absolutely-positioned glow/sweep layer, not a CSS mask, which was tried first and rendered invisible).
- Keywords: loading ring, conic-gradient, stage colours, board.css tokens, reduced motion, header animation
- Use when: Building the shared CSS ring mechanism, deciding the neutral colour for untyped screens, or wiring the ring into a real screen's loading lifecycle.
- Skip when: Anything about the mockup-vs-viewer gap review — that's req_359, unrelated.

# Needs
- As an operator watching a screen load (some take 10-20s against a large corpus), I need a visual, ambient signal that something is happening, not just static text, so a slow load doesn't read as a stuck one.
- As an operator, I need that signal coloured by what kind of document is loading (request/backlog/task/product), reusing colours the app already uses elsewhere, so it doesn't introduce a new visual language.
- As an operator with motion sensitivity or an OS-level reduced-motion setting, I need the same information without the travelling animation.
- As an operator relying on the existing textual loading state (e.g. a screen reader), I need that text kept exactly as it is today -- this is an addition, not a replacement.

# Context
- Approved from a working, hand-tested prototype at logics/external/mockup/loading_border_trace_proto.html: a thin CSS conic-gradient comet travels around a header's own edge while `data-loading` is set, coloured via a `--loading-color` custom property.
- The prototype's first implementation attempt (a `mask-composite: exclude` ring cutout) rendered invisible in Chrome despite looking correct on paper -- confirmed by disabling the mask and watching the gradient appear underneath. The working technique instead wraps the header's own opaque content in an inner element (`position: relative; z-index: 1`) that covers everything except a small padding band (e.g. 2px), so the animated layer underneath only shows through that band. This is a real, already-paid-for lesson -- re-deriving it from the mask approach would repeat the same dead end.
- The sweep element driving the conic-gradient must be square and larger than its own box (e.g. `inset: -60%`), not sized to the header's actual rectangle, or the gradient's angular math skews with the header's aspect ratio.
- On the real toolbar (much wider and shorter than the prototype's demo header), the comet will visibly move faster across the long top/bottom edges than the short sides -- an inherent trade-off of conic-gradient on a non-square box, not a defect to chase away, but worth checking against the real toolbar's actual proportions before finalizing ring thickness and rotation speed.
- Stage colours already exist as CSS custom properties in clients/shared-web/media/css/board.css (--stage-color-request, --stage-color-backlog, --stage-color-task, --stage-color-product, etc.) and are already used for id-prefix tinting and card accents -- this feature reuses them, it does not add a new palette.
- Existing loading-state wiring points in the viewer: `setMeta("Refreshing...")` and `showScreenLoading(title, waitingFor)` in clients/viewer/src/browser-host/index.js are where a screen already knows it is loading and, for typed screens, what kind of document it is loading.
- Out of scope: redesigning the existing loading text/copy itself (kept as-is, this is a visual addition beside it), and the unrelated mockup-vs-viewer gap review already captured in req_359.

# Acceptance criteria
- AC1: A reusable CSS ring mechanism exists (one set of rules, not duplicated per screen) driven by a `data-loading` attribute and a `--loading-color` custom property on a header element, matching the prototype's proven technique (opaque inner cover over an absolutely-positioned glow+sweep layer, not a CSS mask).
- AC2: The ring is coloured via the existing --stage-color-* tokens when the loading screen is a known document stage (request/backlog/task/product), and a decided, documented neutral colour for screens with no document type (Settings, CI, Release, Workshop, CDX) -- not the prototype's placeholder choice left unexamined.
- AC3: The ring fades in and out on opacity (roughly 450ms) when loading starts and stops, never appearing or disappearing mid-rotation.
- AC4: Under `prefers-reduced-motion: reduce`, the ring shows a static/breathing glow (opacity pulse only, no rotation) instead of the travelling comet, via a real media query rather than a manual toggle.
- AC5: The real viewer screens' existing loading text (e.g. "Refreshing...", `showScreenLoading`'s waiting-for text) is unchanged -- the ring is wired in beside it, not instead of it.
- AC6: The ring is wired into the real viewer header for at least the board/document screens (request/backlog/task/product) and the untyped screens (Settings, CI, Release, Workshop, CDX), driven by the same loading-state signals those screens already have (`setMeta`/`showScreenLoading` and equivalents), not a new parallel loading-tracking mechanism.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_094_loading_border_trace`
- Architecture decision(s): (none yet)

# References
- logics/external/mockup/loading_border_trace_proto.html
- clients/shared-web/media/css/board.css
- clients/viewer/src/browser-host/index.js

# Backlog
- `item_788_build_the_reusable_loading_ring_css_mechanism_and_decide_the_neutral_colour`
- `item_789_wire_the_loading_ring_into_the_real_viewer_screens`
