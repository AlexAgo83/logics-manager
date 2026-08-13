## item_736_make_the_release_gates_readable_at_a_glance - Make the release gates readable at a glance
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

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
