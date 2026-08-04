## item_584_add_explicit_github_lifecycle_notifications - Add explicit GitHub lifecycle notifications
> From version: 2.19.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: GitHub delivery feedback
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-04

# Problem
- Once work moves into Logics, external GitHub reporters lack a lightweight, reliable indication of its outcome.

# Scope
- In:
  - Map selected accepted, in-progress, delivered, and declined events to labels or comments.
  - Record source and target refs for idempotent updates.
  - Make issue closure an explicit configurable or approval-gated action.
- Out:
  - Comment mirroring.
  - Field-level conflict resolution.
  - Closing issues solely because a related task changed state.

# Acceptance criteria
- AC1: Selected lifecycle changes create one traceable GitHub update per linked issue.
- AC2: Retries do not duplicate comments or transitions.
- AC3: Issue closure requires the configured explicit confirmation path.
- AC4: A bridge failure is surfaced in Logics without blocking local workflow progress.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Selected lifecycle changes create one traceable GitHub update per linked issue.
- request-AC6 -> This backlog slice. Proof: AC2: Retries do not duplicate comments or transitions.
- request-AC7 -> This backlog slice. Proof: AC3: Issue closure requires the configured explicit confirmation path.
- request-AC5 -> This backlog slice. Evidence needed: Request-to-delivery progress is visible in Logics viewers, with direct GitHub links and a compact linked-issue state when configured.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_050_multi_channel_request_intake_and_github_issues_bridge`
- Architecture decision(s): (none yet)
- Request: `req_301_create_a_multi_channel_request_intake_and_github_issues_bridge`
- Primary task(s): `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery`

# AI Context
- Summary: Add explicit GitHub lifecycle notifications
- Keywords: scaffolded-backlog, add explicit github lifecycle notifications, implementation-ready
- Use when: Implementing the scaffolded slice for Add explicit GitHub lifecycle notifications.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - closes the feedback loop after safe intake exists
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery`

# Notes
- Task `task_298_orchestrate_multi_channel_request_intake_and_github_issues_bridge_delivery` was finished via `logics-manager flow finish task` on 2026-08-04.
