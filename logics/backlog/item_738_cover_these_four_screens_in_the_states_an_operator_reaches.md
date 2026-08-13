## item_738_cover_these_four_screens_in_the_states_an_operator_reaches - Cover these four screens in the states an operator reaches
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The campaign reaches these screens' landing frames only -- the same shape of gap as driving `view` but never `view --fleet`, and the same mistake the review's own first pass made about the Git diff pane.
- Keywords: campaign coverage, clicked-into states, git domains, selected commit, scrolled gates, expanded settings, baseline before redraw
- Use when: Extending the campaign to these four screens or to any state behind a click.
- Skip when: Adding new check kinds beyond what the layout checks already provide.

# Problem
- The campaign reaches these screens' landing frames only. The review's first pass made the same mistake and reached a wrong conclusion about the Git diff pane from its first frame -- which is the same shape of gap as the campaign driving `view` but never `view --fleet`.

# Scope
- In:
  - Reach the states behind a click: each Git domain, a selected commit and file, a scrolled gate list, an expanded Settings.
  - Apply the existing layout checks to each, at the three viewports.
  - Do this before the redraws, so the checks observe the change.
  - Confirm both surfaces after rebuilding the shared sources.
- Out:
  - New check kinds beyond what the layout checks already provide.

# Acceptance criteria
- AC16: All four screens are covered in their clicked-into states at the three viewports.
- AC17: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# AC Traceability
- request-AC16 -> This backlog slice. Proof: AC16: All four screens are covered in their clicked-into states at the three viewports.
- request-AC17 -> This backlog slice. Proof: AC17: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)
- Request: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`
- Primary task(s): `task_344_deliver_the_git_ci_release_and_settings_redesign`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
