## item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load - One lap, then a resting outline, and nothing at all for a short load
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
- Keywords: lap, resting, outline, nothing, all, short, load
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The ring rotates for as long as the load lasts. On a screen taking several seconds it holds the eye for all of them to say 'still going', which is not something an operator can act on.
- Nothing gates it on duration either: since req_364 cached the audit, most loads resolve in milliseconds and the ring is shown and hidden inside a frame -- read as a glitch rather than as feedback.

# Scope
- In:
  - One eased lap, handing over to a steady dimmed outline that holds until the load ends and then fades.
  - A threshold below which no loading affordance appears at all, applied to the ring, the spinner and the sheen alike so they cannot disagree.
  - Keep the existing fade so nothing appears or disappears mid-travel.
  - A reduced-motion fallback.
- Out:
  - Timing the lap to the load: the duration is not known when it starts, and a lap that stretches to fit would be the progress bar this request rejects.
  - Changing the ring's colour rule.

# Acceptance criteria
- AC1: The ring completes one lap and then holds a steady dimmed outline for the rest of the load.
- AC2: A load that resolves faster than the threshold shows no ring, no spinner and no sheen.
- AC3: The threshold is one value read by all three affordances, not three that can drift.

# Report
- The ring's rotation is `1 forwards` with an eased curve instead of `infinite` linear, handing over to `.viewer-document__ring-rest` -- a steady dimmed inset outline that holds until the load ends. Motion marks the start; the outline carries the wait without competing for attention.
- Under reduced motion the resting outline is `display: none`: no lap runs, so there is nothing to hand over to, and a second static outline over the breathing glow would only mute it.
- The threshold is one constant read by all three affordances (`LOADING_AFFORDANCE_DELAY_MS`), because three thresholds are three things that come to disagree. The colour is set immediately and the attribute after the delay: a surface that changes colour as it appears reads as two events rather than one.
- The timer re-reads the surfaces when it fires rather than closing over them: a screen change between the click and the threshold replaces the header it was about to light.
- Measured live: at 120ms after a click neither surface is lit; at 520ms both are; the state clears about a second later; and a now-cached Insights load never lights anything at all while still opening the screen.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: The ring completes one lap and then holds a steady dimmed outline for the rest of the load.
- request-AC3 -> This backlog slice. Proof: AC2: A load that resolves faster than the threshold shows no ring, no spinner and no sheen.
- request-AC6 -> This backlog slice. Proof: AC3: The threshold is one value read by all three affordances, not three that can drift.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_096_a_viewer_that_says_what_it_is_doing`
- Architecture decision(s): (none yet)
- Request: `req_365_say_the_viewer_is_working_wherever_the_operator_is_looking`
- Primary task(s): `task_376_orchestrate_the_loading_feedback_and_navigation_polish`

# Priority
- Priority: High - the animation currently runs longest exactly when it says least
- Rationale: Set by scaffold input or defaulted for grooming.
