## item_450_use_full_permission_for_write_enabled_cdx_missions - Use full permission for write-enabled CDX missions
> From version: 2.11.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Write-enabled CDX missions launched from the viewer need to run with enough provider permission to actually create files, run validation, and commit when the selected mission mode asks for it.
The current viewer plan maps `allowFileWrites=true` to `--permission workspace-write`, which can still trigger Claude approval gates and leave required artifacts unwritten.
Operators should not discover the mismatch after a long mission. The viewer should either launch with `--permission full` for write-enabled mission modes or block early with a clear session-permission preflight.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: The backlog slice stays bounded and reviewable.
- AC2: The backlog slice preserves the request's core acceptance criteria.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The backlog slice stays bounded and reviewable.
- request-AC2 -> This backlog slice. Proof: AC2: The backlog slice preserves the request's core acceptance criteria.

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
- Request: `req_255_use_full_permission_for_write_enabled_cdx_missions`
- Primary task(s): `task_240_use_full_permission_for_write_enabled_cdx_missions`

# AI Context
- Summary: Use full permission for write-enabled CDX missions
- Keywords: backlog-groom, request, use full permission for write-enabled cdx missions, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Use full permission for write-enabled CDX missions.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_255_use_full_permission_for_write_enabled_cdx_missions` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_255_use_full_permission_for_write_enabled_cdx_missions.md`.
- Generated locally by logics-manager.
- Task `task_240_use_full_permission_for_write_enabled_cdx_missions` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_240_use_full_permission_for_write_enabled_cdx_missions`
