## item_446_fix_cdx_mission_execution_reporting_and_update_alias - Fix CDX mission execution reporting and update alias
> From version: 2.11.3
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Convert the failed CDX mission output from `2026-06-20` into tracked Logics work instead of leaving findings in a transient stdout artifact.
Fix the confirmed repository audit findings from that mission with scoped code changes, tests, and validation evidence.
Fix CDX mission execution/reporting so a run with permission denials and no applied work cannot look like a useful success.
Add a `logics-manager update` command when available, as an operator-friendly alias for the existing `self-update` workflow.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC3: CDX mission run/report handling exposes permission denials and classifies blocked write-capable missions distinctly from useful success.
- AC4: `logics-manager update` is available as a documented command path for the same end-user update workflow as `logics-manager self-update`, with help/test coverage.
- AC5: Final validation includes Logics `status`, `health`, `lint --require-status`, `audit --group-by-doc`, and relevant Python/TypeScript test targets.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: CDX mission run/report handling exposes permission denials and classifies blocked write-capable missions distinctly from useful success.
- request-AC4 -> This backlog slice. Proof: AC4: `logics-manager update` is available as a documented command path for the same end-user update workflow as `logics-manager self-update`, with help/test coverage.
- request-AC5 -> This backlog slice. Proof: AC5: Final validation includes Logics `status`, `health`, `lint --require-status`, `audit --group-by-doc`, and relevant Python/TypeScript test targets.
- request-AC1 -> This backlog slice. Evidence needed: The failed mission output is represented in the Logics corpus with backlog/task coverage and no audit finding is left only in the transient CDX stdout artifact.
- request-AC2 -> This backlog slice. Evidence needed: Confirmed repository audit findings are fixed or explicitly rejected with evidence; each accepted fix has targeted regression coverage.

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
- Request: `req_251_fix_mission_execution_and_repo_audit_findings`
- Primary task(s): `task_234_orchestrate_mission_execution_and_audit_finding_fixes`

# AI Context
- Summary: Fix CDX mission execution reporting and update alias
- Keywords: backlog-groom, request, fix cdx mission execution reporting and update alias, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Fix CDX mission execution reporting and update alias.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_251_fix_mission_execution_and_repo_audit_findings` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_251_fix_mission_execution_and_repo_audit_findings.md`.
- Generated locally by logics-manager.
- Task `task_236_fix_cdx_mission_execution_reporting_and_update_alias` was finished via `logics-manager flow finish task` on 2026-06-20.
- Task `task_234_orchestrate_mission_execution_and_audit_finding_fixes` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_234_orchestrate_mission_execution_and_audit_finding_fixes`
- `task_236_fix_cdx_mission_execution_reporting_and_update_alias`
