## item_842_re_measure_the_tick_and_record_what_it_is_made_of - Re-measure the tick and record what it is made of
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 40%
> Complexity: Low
> Theme: Measured the way an operator experiences it
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:29:35

# AI Context
- Summary: Re-measure per component the way the 3.1s baseline was taken, and write the breakdown where the lifetimes are set.
- Keywords: measurement discipline, per-tick breakdown, gh call pattern
- Use when: Quoting a timing for the auto-refresh, or adding a component to it.
- Skip when: Measuring anything the auto-refresh does not drive.

# Problem
- The 3.1s baseline was taken with an isolated viewer and a shim recording every `gh` call. A number taken any other way is not comparable to it, and this repository has already quoted two wrong ones -- lint timed in a warm process, and an audit timed against a stale installed CLI.
- Nothing records what a tick is made of, so the next component added is invisible until someone measures again by hand.

# Scope
- In:
  - Re-measure per-component and per-tick the same way, and compare against 3.1s.
  - Confirm the GitHub call pattern is unchanged: same endpoints, no more often.
  - Write the breakdown down where the lifetimes are set, so a new component is compared against it.
- Out:
  - A permanent instrumentation surface in the product.
  - Measuring anything the auto-refresh does not drive.

# Acceptance criteria
- AC1: The per-tick cost is stated per component, measured over HTTP against a viewer started for the measurement.
- AC2: The GitHub endpoints and their frequency are unchanged.
- AC3: The breakdown is recorded where someone adding a component will see it.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The per-tick cost is stated per component, measured over HTTP against a viewer started for the measurement.
- request-AC5 -> This backlog slice. Proof: AC2: The GitHub endpoints and their frequency are unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_104_a_poll_that_costs_what_it_is_worth`
- Architecture decision(s): (none yet)
- Request: `req_373_make_the_auto_refresh_cost_what_it_is_worth`
- Primary task(s): `task_384_orchestrate_the_auto_refresh_cost_work`

# Priority
- Priority: Medium
- Rationale: The first pass at this kind of work got its numbers from the wrong place twice
