## item_809_show_a_load_that_has_no_screen_to_draw_on - Show a load that has no screen to draw on
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
