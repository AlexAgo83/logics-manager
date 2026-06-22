## item_480_group_recent_activity_items_by_logical_timestamp - Group Recent Activity items by logical timestamp
> From version: 2.12.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Update the Recent Activity view so activity cells are grouped by logical timestamp.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: The request has been reviewed and clarified enough to triage.
- AC2: Follow-up backlog items preserve the need and relevant context.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The request has been reviewed and clarified enough to triage.
- request-AC2 -> This backlog slice. Proof: AC2: Follow-up backlog items preserve the need and relevant context.

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
- Request: `req_271_group_recent_activity_items_by_logical_timestamp`
- Primary task(s): `task_268_group_recent_activity_items_by_logical_timestamp`

# AI Context
- Summary: Group Recent Activity items by logical timestamp
- Keywords: backlog-groom, request, group recent activity items by logical timestamp, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Group Recent Activity items by logical timestamp.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_271_group_recent_activity_items_by_logical_timestamp` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_271_group_recent_activity_items_by_logical_timestamp.md`.
- Generated locally by logics-manager.
- Task `task_268_group_recent_activity_items_by_logical_timestamp` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_268_group_recent_activity_items_by_logical_timestamp`
