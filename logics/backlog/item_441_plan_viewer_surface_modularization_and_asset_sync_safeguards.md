## item_441_plan_viewer_surface_modularization_and_asset_sync_safeguards - Plan viewer surface modularization and asset sync safeguards
> From version: 2.11.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Viewer maintainability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `clients/viewer/browser-host.js` and the packaged copy are each roughly 6.8k lines, while `logics_manager/viewer.py` is roughly 4.9k lines.
- The dual source/packaged viewer asset model works but creates risk when patches touch only one copy.

# Scope
- In:
  - Identify stable module boundaries for CDX, Git, Workshop, refresh/navigation, and import/export behavior.
  - Strengthen or document the `check:viewer-assets` sync contract so source and packaged assets cannot drift.
  - Prioritize seams that reduce regression risk without forcing a broad rewrite.
- Out:
  - Moving every viewer feature in a single task.
  - Changing the public viewer UX without a separate product request.

# Acceptance criteria
- AC1: A staged modularization plan exists for the largest viewer/browser-host areas.
- AC2: Asset sync validation remains part of release-grade checks.
- AC3: At least one high-risk viewer boundary has a focused refactor or test-backed extraction plan.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A staged modularization plan exists for the largest viewer/browser-host areas.
- request-AC7 -> This backlog slice. Proof: AC2: Asset sync validation remains part of release-grade checks.
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
- Summary: Plan viewer surface modularization and asset sync safeguards
- Keywords: scaffolded-backlog, plan viewer surface modularization and asset sync safeguards, implementation-ready
- Use when: Implementing the scaffolded slice for Plan viewer surface modularization and asset sync safeguards.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Tasks
- `task_233_orchestrate_project_audit_remediation`

# Notes
- Task `task_233_orchestrate_project_audit_remediation` was finished via `logics-manager flow finish task` on 2026-06-19.
