## item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight - Decide which workflow signals are defects and which are work in flight
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 93%
> Confidence: 85%
> Progress: 66%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 08:31:09

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

# Decision

Taken 2026-08-13, delegated by the operator, recorded as revisable.

**A signal is a defect when it describes something that cannot resolve itself. It is work
in flight when time alone will resolve it -- until it has had that time.**

| Signal | Class | Why |
| --- | --- | --- |
| Broken reference risks | defect | A reference to something absent does not fix itself. |
| Orphan or unlinked docs | defect | A document nothing links to will stay unlinked. |
| Incomplete workflow chains | in flight, then defect after 14 days | A scaffolded chain is incomplete by definition on the day it is written. |
| Promotion gaps | in flight, then defect after 14 days | Same: a request not yet promoted is the normal first state of a request. |

**The threshold is 14 days and it is a guess.** It is long enough that a chain scaffolded
and delivered inside a fortnight never appears, and short enough that abandoned work
surfaces within a sprint. Nothing was measured to choose it, because the corpus has no
record of how long chains historically took to promote -- `item_716` established that no
per-beat dates exist. The first operator to disagree should change the number, not the
rule.

**What made this necessary.** At review time, 100% of the documents Corpus insights listed
under Flow health were chains scaffolded within the hour, reported as incomplete chains
and promotion gaps -- which is exactly what a freshly scaffolded chain is. The headline
counted the normal state of new work, which is what made the number unusable rather than
merely imprecise.

**What this binds.** `item_747` counts only defects in the headline and shows in-flight
signals separately with their age. `item_750`'s suspect-finding marking is unaffected:
that is about a finding the repository contradicts, which is a different axis.

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
