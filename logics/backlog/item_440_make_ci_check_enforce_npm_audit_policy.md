## item_440_make_ci_check_enforce_npm_audit_policy - Make ci check enforce npm audit policy
> From version: 2.11.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Validation gates
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `npm run ci:check` passed while `npm run audit:ci` failed, so the aggregate gate can produce a misleading green result.

# Scope
- In:
  - Add npm audit policy execution to the aggregate CI/check workflow.
  - Make failures visible with a concise command label and actionable output.
  - Preserve existing fast checks and package validation order unless a different order is justified.
- Out:
  - Changing the advisory classification policy beyond necessary wiring.
  - Replacing the existing audit script.

# Acceptance criteria
- AC1: `npm run ci:check` fails when `npm run audit:ci` has blocking findings.
- AC2: `npm run ci:check` passes only when Logics validation, tests, package validation, and npm audit policy all pass.
- AC3: README or developer docs identify `audit:ci` as part of the release-grade validation path.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: `npm run ci:check` fails when `npm run audit:ci` has blocking findings.
- request-AC7 -> This backlog slice. Proof: AC2: `npm run ci:check` passes only when Logics validation, tests, package validation, and npm audit policy all pass.
- request-AC4 -> This backlog slice. Evidence needed: Ignored local build, smoke, cache, and graph artifacts can be cleaned with a documented, bounded command.
- request-AC5 -> This backlog slice. Evidence needed: Low-coverage high-risk modules have targeted tests or explicit coverage goals tied to observable behavior.
- request-AC6 -> This backlog slice. Evidence needed: Lifecycle/integration tests have documented prerequisites and a clear path for optional or scheduled execution.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_024_project_audit_remediation_plan`
- Architecture decision(s): (none yet)
- Request: `req_250_address_project_audit_follow_up_actions`
- Primary task(s): `task_233_orchestrate_project_audit_remediation`

# AI Context
- Summary: Make ci check enforce npm audit policy
- Keywords: scaffolded-backlog, make ci check enforce npm audit policy, implementation-ready
- Use when: Implementing the scaffolded slice for Make ci check enforce npm audit policy.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Tasks
- `task_233_orchestrate_project_audit_remediation`

# Notes
- Task `task_233_orchestrate_project_audit_remediation` was finished via `logics-manager flow finish task` on 2026-06-19.
