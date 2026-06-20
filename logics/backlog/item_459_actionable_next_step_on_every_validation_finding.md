## item_459_actionable_next_step_on_every_validation_finding - Actionable next-step on every validation finding
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The single most recurring friction across assistant sessions (confirmed in the transcript logs of multiple profiles) is that Logics validation gates read like dead-ends: a correctly-formed, dev-ready request→backlog→task chain still reports BLOCKING findings, and the messages do not say whether action is needed now or later.
Concretely, `audit` and `flow validate` report `ac_missing_item_traceability` / `ac_missing_task_traceability` ("with proof") as BLOCKING on a request whose linked tasks have not been implemented yet — even though proof (test results) cannot honestly exist before the work is done. Assistants repeatedly try to "fix" these or seek workarounds.
This request makes findings lifecycle-aware (defer proof-required findings until closeout) and actionable (each finding states the exact next step), without weakening the real closeout guarantee.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC3: Every relevant finding carries an actionable next step: deferred findings say "expected until task closeout"; deterministically-fixable findings include the exact repair command (e.g. `flow validate <refs> --apply-fixes --proof "..."`); human-required findings state what is needed.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: Every relevant finding carries an actionable next step: deferred findings say "expected until task closeout"; deterministically-fixable findings include the exact repair command (e.g. `flow validate <refs> --apply-fixes --proof "..."`); human-required findings state what is needed.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_261_make_logics_validation_findings_lifecycle_aware_and_actionable.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Actionable next-step on every validation finding
- Keywords: backlog-groom, request, actionable next-step on every validation finding, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Actionable next-step on every validation finding.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_261_make_logics_validation_findings_lifecycle_aware_and_actionable` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_261_make_logics_validation_findings_lifecycle_aware_and_actionable.md`.
- Generated locally by logics-manager.

# Tasks
- `task_249_orchestrate_lifecycle_aware_actionable_validation_findings`
- `task_251_actionable_next_step_on_every_validation_finding`
