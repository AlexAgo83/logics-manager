## item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight - Decide which workflow signals are defects and which are work in flight
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Incomplete workflow chains and promotion gaps were, at review time, entirely produced by chains scaffolded within the hour -- which is what a fresh scaffold is; grouping cannot be drawn until each signal is classified.
- Keywords: workflow signals, defect versus in flight, signal classification, promotion gap, incomplete chain, product decision
- Use when: Before grouping or counting workflow signals on any screen.
- Skip when: Changing which signals are computed, or the audit rules producing them.

# Problem
- Corpus insights counts incomplete workflow chains and promotion gaps as signals needing attention. Both were, at the time of the review, entirely produced by request chains scaffolded within the hour -- which is what a freshly scaffolded chain is. Grouping cannot be drawn until it is decided which signals mean something is wrong.

# Scope
- In:
  - Establish, per workflow signal, whether it indicates a defect or the expected state of work in flight.
  - Record the answer where the screens can act on it, including what happens to a signal that is neither.
- Out:
  - Changing which signals are computed, and the audit rules that produce them.

# Acceptance criteria
- AC1: Each signal is classified and the classification is recorded where a screen can use it.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Each signal is classified and the classification is recorded where a screen can use it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Primary task(s): `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
