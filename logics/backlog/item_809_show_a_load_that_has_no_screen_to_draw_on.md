## item_809_show_a_load_that_has_no_screen_to_draw_on - Show a load that has no screen to draw on
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Loading feedback
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: show, load, screen, draw
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- req_360's ring lives on the document header, so a load with no document screen open produces no signal beyond the status line's text quietly changing.
- The status line is also where a failure is announced, so an operator watching it cannot tell a line that is about to change from one that already has.

# Scope
- In:
  - A spinner in the status line, in its own slot beside the message rather than replacing it, so the line does not reflow when it appears.
  - A slow low-alpha sheen across the header's own background in the same loading colour, as prototyped.
  - Both driven by the loading signal that already exists, not a new one.
  - A reduced-motion fallback that stops the travel and holds a flat tint.
- Out:
  - Changing what the status line says.
  - A progress bar: no proportion is known.

# Acceptance criteria
- AC1: While the viewer is busy with no document screen open, the status line shows a spinner beside its message and the header background carries the sheen.
- AC2: The status line's text is unchanged, and its layout does not shift when the spinner appears or clears.
- AC3: Under `prefers-reduced-motion: reduce` neither the spinner nor the sheen travels.

# Report
- The spinner is a sibling of the status text, not a child: `renderMeta` writes `textContent`, which would have erased a child on the next tick. It sits in its own slot so the line does not reflow as it appears and clears.
- The header's own surface carries a slow sheen in the loading colour at 14% alpha. Deliberately not a progress bar -- nothing in these loads knows a proportion, and a bar filling at an invented rate is a claim the operator calibrates against and is wrong about.
- Both are lit by the same call as the ring, so a load cannot light one surface and not the other.
- Reduced motion: the spinner stops turning and becomes a filled dot; the sheen stops crossing and holds a flat tint. The state is still stated, nothing travels.

# Follow-up
- Reported by the operator twice on this slice, both times by using it rather than reading it, and both times the same class of mistake: a visual effect reaching for a property that belongs to the whole bar.
  - `overflow: hidden` on the topbar clipped the sheen *and* the navigation panels that hang below the bar's bottom edge. req_360 had identified exactly this on the document header -- "the header holds the Git actions menu" -- and this walked into it on the topbar. The clipping moved to a dedicated child, which is what the ring already does.
  - Lifting the bar's children with `z-index: 1` then put each of them in a stacking context capped at 1, so the menus were painted under the toolbar below. `position: relative` with `z-index: auto` creates no context, and the sheen being the first child is enough for everything after it to paint on top.
- Both are pinned by a test that reads the two rules rather than trusting the effect, and both were confirmed live with `elementFromPoint` at the open menu's own coordinates -- which answers "is this the thing actually painted here", where a screenshot only answers "does this look right".

# Follow-up, second report
- Reported by the operator: arriving on the app after a restart shows the word "Refreshing" and nothing else. The affordance was wired to `setPrimaryActionBusy`, which only fires for a primary action -- the initial load and the auto-refresh ticks go through `loadItems` and never set it.
- The two surfaces answer different questions, so they are now two affordances rather than one flag driving both: the document header says "this screen is loading", the app header says "the viewer is fetching". A refresh arriving on its own lights the app header and must not light a screen that is not reloading.
- Measured live from page load, polling every 100ms: the app header is lit from 300ms to 1200ms during the initial fetch -- the threshold, then the minimum visible duration.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: While the viewer is busy with no document screen open, the status line shows a spinner beside its message and the header background carries the sheen.
- request-AC6 -> This backlog slice. Proof: AC2: The status line's text is unchanged, and its layout does not shift when the spinner appears or clears.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_096_a_viewer_that_says_what_it_is_doing`
- Architecture decision(s): (none yet)
- Request: `req_365_say_the_viewer_is_working_wherever_the_operator_is_looking`
- Primary task(s): `task_376_orchestrate_the_loading_feedback_and_navigation_polish`

# Priority
- Priority: High - the case with no signal at all today
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_376_orchestrate_the_loading_feedback_and_navigation_polish` was finished via `logics-manager flow finish task` on 2026-08-15.
