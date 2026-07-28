## item_558_normalize_workflow_status_aliases_before_persistence - Normalize workflow status aliases before persistence
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: CLI ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A user or assistant can type `In Progress` and get rejected even though the intended canonical value is obvious: `In progress`.

# Scope
- In:
  - Add one shared status normalization helper for CLI inputs that maps common variants to canonical status labels.
  - Use it in `sync update-indicators`, `flow start`, `flow progress` or other status-writing paths that accept user-provided status text.
  - Keep file output canonical and keep truly unknown statuses rejected with a did-you-mean hint.
  - Add focused tests for `In Progress`, `in_progress`, `in progress`, and an unknown status.
- Out:
  - Changing the canonical status vocabulary.
  - Accepting arbitrary statuses.

# Acceptance criteria
- AC1: `In Progress`, `in_progress`, and `in progress` are accepted and persisted as `In progress`.
- AC2: Unknown statuses still fail, but the error lists the allowed canonical labels.
- AC3: Tests cover request, backlog, and task status normalization where those kinds allow status updates.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: `In Progress`, `in_progress`, and `in progress` are accepted and persisted as `In progress`.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`
- Primary task(s): `task_294_orchestrate_logics_operator_ergonomics_improvements`

# AI Context
- Summary: Normalize workflow status aliases before persistence
- Keywords: scaffolded-backlog, normalize workflow status aliases before persistence, implementation-ready
- Use when: Implementing the scaffolded slice for Normalize workflow status aliases before persistence.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
