## item_611_stop_asking_abandoned_requests_for_an_implementation_chain - Stop asking abandoned requests for an implementation chain
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Truthful audit verdicts
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 16:24:23

# Problem
- One done set serves every purpose in the audit, so obsolete, archived and superseded reach the delivered-request checks alongside done. An abandoned request with no backlog is reported as a delivered request missing its backlog.
- The acceptance-criteria traceability pass reaches the same request by a separate route, keyed on scope rather than on doneness, and reports the missing backlog under its own code. Fixing only the first route leaves the finding in place under the second.

# Scope
- In:
  - Separate terminal from delivered, and use delivered only where the audit is judging a shipped request.
  - Apply it to both the missing-backlog and the incomplete-backlog checks on delivered requests.
  - Skip the acceptance-criteria traceability pass for abandoned requests, so the same complaint does not reappear under another code.
  - Leave every other use of the terminal check untouched: chain propagation, closing an eligible request, and the active-work filter.
- Out:
  - Changing which statuses are terminal.
  - Relaxing anything required of a request whose status is done.
  - Introducing a new status for abandoned work.

# Acceptance criteria
- AC1: An abandoned request with acceptance criteria and no backlog produces no findings.
- AC2: A delivered request with no backlog still produces its finding, and one linked to an incomplete item still produces its own.
- AC3: Active-work filtering and chain propagation behave identically to before, shown by their existing tests still passing unchanged.
- AC4: A regression test covers the abandoned request with acceptance criteria and no backlog, and fails against the current code.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `test_an_abandoned_request_is_not_asked_for_a_backlog` in `tests/python/test_honest_outcomes.py`, covering Obsolete, Archived and Superseded under both codes.
- request-AC2 -> This backlog slice. Proof: `test_a_delivered_request_still_requires_its_backlog` in `tests/python/test_honest_outcomes.py`.
- request-AC3 -> This backlog slice. Proof: the existing suite passes unchanged; `_is_done` keeps serving chain propagation and the active-work filter.
- request-AC4 -> This backlog slice. Evidence needed: Every flag a command declares appears on that command's help screen, derived from the declaration rather than restated beside it.
- request-AC5 -> This backlog slice. Evidence needed: A closeout that finishes the task reports that the task closed, distinctly from whether the post-close checks passed.
- request-AC6 -> This backlog slice. Evidence needed: The printed outcome of such a closeout does not read as a failure to close.
- request-AC7 -> This backlog slice. Evidence needed: Each defect leaves behind a test that fails against the current code.
- request-AC8 -> This backlog slice. Evidence needed: A reviewed edit can be re-baselined even when the document was already re-baselined earlier the same day.
- request-AC9 -> This backlog slice. Evidence needed: A version bound that must track a released version is derived from it, not restated beside it.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_056_say_what_actually_happened`
- Architecture decision(s): (none yet)
- Request: `req_308_report_workflow_outcomes_honestly_across_audit_help_and_closeout`
- Primary task(s): `task_305_orchestrate_the_honest_outcome_corrections`

# AI Context
- Summary: Stop asking abandoned requests for an implementation chain
- Keywords: scaffolded-backlog, stop asking abandoned requests for an implementation chain, implementation-ready
- Use when: Implementing the scaffolded slice for Stop asking abandoned requests for an implementation chain.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a permanent blocking finding on work that was correctly closed
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_305_orchestrate_the_honest_outcome_corrections`

# Notes
- Task `task_305_orchestrate_the_honest_outcome_corrections` was finished via `logics-manager flow finish task` on 2026-08-08.
