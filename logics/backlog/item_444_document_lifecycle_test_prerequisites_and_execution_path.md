## item_444_document_lifecycle_test_prerequisites_and_execution_path - Document lifecycle test prerequisites and execution path
> From version: 2.11.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Integration validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `npm run test:lifecycle` skips by default unless `PLUGIN_LIFECYCLE_TESTS=1` is set.
- The skip is clean, but operators need a clearer path for when and how to run the lifecycle checks.

# Scope
- In:
  - Document prerequisites for enabling plugin lifecycle tests.
  - Decide whether lifecycle checks belong in release, nightly, or manual validation.
  - Make skip output or docs explicit enough that a skipped lifecycle run is not mistaken for full integration coverage.
- Out:
  - Forcing lifecycle tests into every local fast path.
  - Changing extension packaging behavior.

# Acceptance criteria
- AC1: Lifecycle test prerequisites and enabling command are documented.
- AC2: Release or CI guidance states whether lifecycle tests are required, optional, or scheduled.
- AC3: The skip behavior remains explicit and non-misleading.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: Lifecycle test prerequisites and enabling command are documented.
- request-AC7 -> This backlog slice. Proof: AC2: Release or CI guidance states whether lifecycle tests are required, optional, or scheduled.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_024_project_audit_remediation_plan`
- Architecture decision(s): (none yet)
- Request: `req_250_address_project_audit_follow_up_actions`
- Primary task(s): `task_233_orchestrate_project_audit_remediation`

# AI Context
- Summary: Document lifecycle test prerequisites and execution path
- Keywords: scaffolded-backlog, document lifecycle test prerequisites and execution path, implementation-ready
- Use when: Implementing the scaffolded slice for Document lifecycle test prerequisites and execution path.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
