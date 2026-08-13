## item_736_make_the_release_gates_readable_at_a_glance - Make the release gates readable at a glance
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 01:10:36

# AI Context
- Summary: One gate is called blocked, stale and pushed on the same screen; it sits fifth of eight; each costs about 100px; most substates repeat the gate's own name; and `optional`, which changes what a gate means, is grey small text.
- Keywords: release gates, gate vocabulary, stale pushed blocked, blocking first, optional gate, substate duplication
- Use when: Changing how release gates are listed, labelled or ordered.
- Skip when: Adding, removing or reordering the gates themselves.

# Problem
- One gate is called blocked, stale and pushed on the same screen; it sits fifth of eight; each gate costs about 100px; most substates repeat the gate's own name; and `optional`, which changes what a gate means, is grey small text.

# Scope
- In:
  - One word per gate state, used consistently with the tile and the verdict.
  - Blocking gate first and marked; the rest compact.
  - Surface `optional` where it changes the reader's conclusion, and drop substates that repeat the gate name.
  - Collapse the passing release jobs to a counted line.
- Out:
  - Adding, removing or reordering the gates themselves.

# Delivery notes
- The blocking gate leads, is marked by form as well as position, and is the only one left expanded; the rest keep their declared order behind it and stay compact.
- **A substate is shown only when it says something the gate's id does not.** `local_validation` followed by `validation` told the reader nothing twice.
- **`optional` is stated where it changes the conclusion** -- beside a gate that is not passing -- and stays quiet where it does not, because what it changes is the meaning of a *failure*.
- **A defect found while doing it, and it was mine.** The marker's condition read `tone !== "pass"`, but `releaseBadgeTone` returns `passing` -- so the check was always true and `optional` would have appeared on every gate including the passing ones. The regression caught it because the fixture asserted the tone rather than trusting it.
- **A defect found that was not mine, in the same class as `item_734`'s.** The Release screen had its own copy of the job list, and like the CI screen's copy it fed `ciBadgeTone` a raw GitHub conclusion that function does not speak -- so every release job also resolved to `unknown`. Both screens now use one `renderCiJobRows`, which is also what delivers this slice's counted fold for the passing jobs. Two copies of a rendering are two places for the same defect.
- The release run's `Status` row is gone, since the badge beside the heading states it, and both ends of the run became the duration they were hiding -- the same trade `item_734` made on the CI screen.
# Acceptance criteria
- AC8: Gate status is colour and form.
- AC9: The blocking gate leads and stays expanded; passing ones collapse.
- AC11: One word per state, optional is visible, and the gates fit in a glance.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC8: Gate status is colour and form.
- request-AC9 -> This backlog slice. Proof: AC9: The blocking gate leads and stays expanded; passing ones collapse.
- request-AC11 -> This backlog slice. Proof: AC11: One word per state, optional is visible, and the gates fit in a glance.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)
- Request: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`
- Primary task(s): `task_344_deliver_the_git_ci_release_and_settings_redesign`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
