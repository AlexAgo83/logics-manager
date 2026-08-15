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

# Follow-up
- Reported by the operator: "the ring still does not go round". Two causes, both found by sampling the rotation over time rather than by reading the rule.
  - Declared on the ring itself, a one-shot animation runs once when the element is created -- at page load, before any loading -- and `forwards` then holds it at its end state for ever. It never played again. Applied only while `data-loading` is set, it starts with the load and restarts on the next one.
  - Once it ran, it was still cut off: Health warm answers in about 600ms and the lap is 1150ms, so the comet vanished half way round. A gesture that marks a beginning has to be allowed to finish or it reads as a fault. Once shown, the affordance now stays for at least one lap; a new load starting in the tail cancels it.
- Measured after the fix by sampling the computed transform every 150ms: the rotation sweeps the full circle and lands on the identity matrix at 1200ms, then clears at 1350ms -- with the underlying load having finished well before.

# Follow-up, third report
- The operator kept reporting the ring as broken after two fixes that both measured clean. The measurements were the problem: sampling the computed transform proved the element was rotating, which is not the same claim as the light travelling the header. Capturing the header itself at points around the lap showed what they were seeing -- a short bright blob near the middle of the bottom edge that never moved along an edge.
- Cause: a conic gradient maps *angle* to rim position, and this header is about 1560x62 -- 25:1 -- so nearly the whole perimeter falls into a sliver of the angular range. The prototype had warned about exactly this ("the trade-off to watch on a very wide, short header") and req_360's report claimed the oversized square sweep box answered it. That claim was wrong twice over: `inset: -60%` resolves percentages against width and height separately, so the box keeps the header's own aspect ratio and is not square at all, and a square box would not have helped either, since a conic gradient's angles are angles whatever shape the box is.
- Replaced rather than tuned: two 2px lights walk the edges directly, left to right along the top for the first half of the lap and right to left along the bottom for the second. Uniform by construction at any width, which the conic version could never be at this aspect ratio. It also needs no cover over the middle and no mask -- there is nothing in the middle to hide.
- Verified by capturing the header at points around the lap: at 15% the light is on the top edge toward the left, at 80% on the bottom edge travelling back.

# Decision reversed by the operator
- The slice's own title proposed one lap and a resting outline, on the argument that a light which never stops is a clock nobody can read. Seen running, the operator asked for the opposite: it should keep travelling, and the highlighted frame behind it should go. Their call, and it is implemented that way -- the outline existed only to carry the wait after the lap ended, so it has nothing to carry when the light never leaves.
- Linear rather than eased: each half of the circuit is one leg, and easing each leg separately puts a stutter at both seams. That was invisible while the animation ran once and obvious once it loops.
- The minimum-visible rule stays and changes meaning: it is no longer about letting a one-shot gesture finish, but about not showing a fragment of a circuit and taking it away again.

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
