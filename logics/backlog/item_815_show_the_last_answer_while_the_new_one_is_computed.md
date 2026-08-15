## item_815_show_the_last_answer_while_the_new_one_is_computed - Show the last answer while the new one is computed
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: A screen that keeps what it said
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: show, last, answer, while, new, computed
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- Arriving at Insights or Health rebuilds the screen from nothing, even when the corpus has not changed since the last visit, so the operator watches a placeholder to be shown what they were already shown.
- The viewer keeps no rendered state for these screens at all.

# Scope
- In:
  - Keep the last rendered answer per screen for the session and show it immediately on return.
  - Revalidate behind it and replace it when the fresh answer differs.
  - Say which of the two is on screen, so a stale answer is never read as a current one -- the loading affordances from the sibling request are the natural place.
  - Drop what is kept when the project changes: another project's answer is not a stale answer, it is the wrong one.
- Out:
  - Persisting across viewer restarts.
  - Caching document screens, whose cost has not been measured.

# Acceptance criteria
- AC1: Returning to Insights or Health shows the previous answer without an empty frame.
- AC2: The fresh answer replaces it when it arrives, and the screen states which of the two is showing.
- AC3: Switching project does not show the previous project's answer.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Returning to Insights or Health shows the previous answer without an empty frame.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_097_corpus_screens_that_are_quick_on_the_first_look_too`
- Architecture decision(s): (none yet)
- Request: `req_366_finish_the_insights_and_health_work_the_first_measurement_got_wrong`
- Primary task(s): `task_377_orchestrate_the_second_look_at_insights_and_health`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
