## item_506_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement - Reduce logics-manager workflow friction from flow-new flags to doc retirement
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Remove five concrete friction points that slow down day-to-day use of the `logics-manager` CLI, surfaced while driving a real corpus (the electrical-plan-editor project) end to end: create → groom → promote → merge → audit.
Goal: a `flow new` / grooming loop where flags are honored, error hints actually work, doc retirement is a first-class action, and the audit headline is not misleading. Less surprise, fewer manual re-stamp round-trips.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: `flow new request --understanding U --confidence C --complexity X --theme T` produces a request whose indicator lines reflect U/C/X/T (no hardcoded `90%`/`85%`/`Medium`/`Operator workflow`); parity with `flow new backlog`/`task`.
- AC2: The lint "modified without updating indicators" hint prints a command that succeeds as-is, and names the `> Non-semantic edit:` marker as the alternative; running the printed command on a drifted doc resolves the finding.
- AC3: `flow withdraw <doc> --superseded-by <ref>` sets a terminal status, drops the doc from `logics-manager status` active work, and stops its ACs from producing blocking traceability findings; the supersede link is recorded and lint stays green.
- AC4: An active/scoped audit view reports blocking issues only for in-scope, non-terminal docs, so a clean active corpus reports zero blocking even when stale out-of-scope docs have findings.
- AC5: Indicator percentage formatting is consistent between generated and hand-authored docs (single convention), and a regression test pins it.
- AC6: New/changed behavior is covered by tests under `tests/python/` and `lint --require-status` + `audit` stay green on this repo.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `flow new request --understanding U --confidence C --complexity X --theme T` produces a request whose indicator lines reflect U/C/X/T (no hardcoded `90%`/`85%`/`Medium`/`Operator workflow`); parity with `flow new backlog`/`task`.
- request-AC2 -> This backlog slice. Proof: AC2: The lint "modified without updating indicators" hint prints a command that succeeds as-is, and names the `> Non-semantic edit:` marker as the alternative; running the printed command on a drifted doc resolves the finding.
- request-AC3 -> This backlog slice. Proof: AC3: `flow withdraw <doc> --superseded-by <ref>` sets a terminal status, drops the doc from `logics-manager status` active work, and stops its ACs from producing blocking traceability findings; the supersede link is recorded and lint stays green.
- request-AC4 -> This backlog slice. Proof: AC4: An active/scoped audit view reports blocking issues only for in-scope, non-terminal docs, so a clean active corpus reports zero blocking even when stale out-of-scope docs have findings.
- request-AC5 -> This backlog slice. Proof: AC5: Indicator percentage formatting is consistent between generated and hand-authored docs (single convention), and a regression test pins it.
- request-AC6 -> This backlog slice. Proof: AC6: New/changed behavior is covered by tests under `tests/python/` and `lint --require-status` + `audit` stay green on this repo.

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
- Request: `logics/request/req_279_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Reduce logics-manager workflow friction from flow-new flags to doc retirement
- Keywords: backlog-groom, request, reduce logics-manager workflow friction from flow-new flags to doc retirement, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Reduce logics-manager workflow friction from flow-new flags to doc retirement.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_279_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_279_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement.md`.
- Generated locally by logics-manager.
- Task `task_276_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement` was finished via `logics-manager flow finish task` on 2026-06-26.

# Tasks
- `task_276_reduce_logics_manager_workflow_friction_from_flow_new_flags_to_doc_retirement`
