## item_458_lifecycle_aware_traceability_findings_defer_proof_until_closeout - Lifecycle-aware traceability findings (defer proof until closeout)
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
- AC1: Proof-required traceability findings (`ac_missing_item_traceability`, `ac_missing_task_traceability`) are NOT reported as blocking for a request whose linked tasks are still open (not finished); a correctly-formed dev-ready chain passes `audit` and `flow validate` with zero blocking findings. Such findings are surfaced as informational/deferred instead.
- AC2: The closeout guarantee is preserved — once a task is being finished/closed (or its status is terminal), the same traceability findings DO block until proof is supplied. No path lets a task close without proof.
- AC4: No regression — existing lint/audit/validate tests pass, and the new lifecycle classification + messaging are covered by tests (open-chain green, closeout-chain blocking).

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Proof-required traceability findings (`ac_missing_item_traceability`, `ac_missing_task_traceability`) are NOT reported as blocking for a request whose linked tasks are still open (not finished); a correctly-formed dev-ready chain passes `audit` and `flow validate` with zero blocking findings. Such findings are surfaced as informational/deferred instead.
- request-AC2 -> This backlog slice. Proof: AC2: The closeout guarantee is preserved — once a task is being finished/closed (or its status is terminal), the same traceability findings DO block until proof is supplied. No path lets a task close without proof.
- request-AC4 -> This backlog slice. Proof: AC4: No regression — existing lint/audit/validate tests pass, and the new lifecycle classification + messaging are covered by tests (open-chain green, closeout-chain blocking).

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
- Summary: Lifecycle-aware traceability findings (defer proof until closeout)
- Keywords: backlog-groom, request, lifecycle-aware traceability findings (defer proof until closeout), bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Lifecycle-aware traceability findings (defer proof until closeout).
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
- `task_250_lifecycle_aware_traceability_findings_defer_proof_until_closeout`
