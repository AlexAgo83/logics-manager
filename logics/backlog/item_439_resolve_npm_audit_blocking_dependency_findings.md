## item_439_resolve_npm_audit_blocking_dependency_findings - Resolve npm audit blocking dependency findings
> From version: 2.11.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Security maintenance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `npm run audit:ci` fails because `undici@7.27.2` is inside the vulnerable advisory range.
- The vulnerable dependency is transitive through VSIX packaging tooling, so the fix must preserve packaging and smoke validation.

# Scope
- In:
  - Evaluate `overrides` or dependency upgrades for `undici` and related package-lock changes.
  - Verify `npm run audit:ci`, `npm run package:ci`, and smoke checks after the dependency change.
  - Review whether the existing `dompurify` exception can be narrowed or removed with a Mermaid/DOMPurify update.
- Out:
  - Changing runtime viewer behavior unrelated to dependency updates.
  - Weakening the audit policy to hide actionable high-severity findings.

# Acceptance criteria
- AC1: `npm run audit:ci` no longer reports blocking `undici` findings.
- AC2: Packaging and extension smoke validation still pass after dependency changes.
- AC3: Any remaining allowed audit finding is documented with scope, reason, and follow-up trigger.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `npm run audit:ci` no longer reports blocking `undici` findings.
- request-AC7 -> This backlog slice. Proof: AC2: Packaging and extension smoke validation still pass after dependency changes.
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
- Summary: Resolve npm audit blocking dependency findings
- Keywords: scaffolded-backlog, resolve npm audit blocking dependency findings, implementation-ready
- Use when: Implementing the scaffolded slice for Resolve npm audit blocking dependency findings.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Tasks
- `task_233_orchestrate_project_audit_remediation`

# Notes
- Task `task_233_orchestrate_project_audit_remediation` was finished via `logics-manager flow finish task` on 2026-06-19.
