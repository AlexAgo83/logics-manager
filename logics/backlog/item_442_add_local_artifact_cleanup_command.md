## item_442_add_local_artifact_cleanup_command - Add local artifact cleanup command
> From version: 2.11.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Developer ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Ignored local artifacts can accumulate substantially: release artifacts, build output, code-review graph DB, Logics cache, coverage, and smoke profiles.
- The project ignores these paths but does not expose one bounded cleanup command.

# Scope
- In:
  - Add a conservative cleanup script or documented command for ignored local artifacts.
  - Avoid deleting source files, workflow docs, package-lock data, or user configuration.
  - Report what was removed or support a dry-run mode.
- Out:
  - Cleaning `node_modules` by default.
  - Deleting graph/cache directories without explicit operator intent if they are expensive to rebuild.

# Acceptance criteria
- AC1: A documented cleanup command removes or previews safe local artifacts.
- AC2: The cleanup command preserves tracked files and source directories.
- AC3: README or contributor guidance explains when to run the cleanup.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: A documented cleanup command removes or previews safe local artifacts.
- request-AC5 -> This backlog slice. Evidence needed: Low-coverage high-risk modules have targeted tests or explicit coverage goals tied to observable behavior.
- request-AC6 -> This backlog slice. Evidence needed: Lifecycle/integration tests have documented prerequisites and a clear path for optional or scheduled execution.
- request-AC7 -> This backlog slice. Evidence needed: Validation evidence includes Logics lint/audit, npm lint/test, Python tests, package validation, and npm audit policy status.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_024_project_audit_remediation_plan`
- Architecture decision(s): (none yet)
- Request: `req_250_address_project_audit_follow_up_actions`
- Primary task(s): `task_233_orchestrate_project_audit_remediation`

# AI Context
- Summary: Add local artifact cleanup command
- Keywords: scaffolded-backlog, add local artifact cleanup command, implementation-ready
- Use when: Implementing the scaffolded slice for Add local artifact cleanup command.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Tasks
- `task_233_orchestrate_project_audit_remediation`

# Notes
- Task `task_233_orchestrate_project_audit_remediation` was finished via `logics-manager flow finish task` on 2026-06-19.
