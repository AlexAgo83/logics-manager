## item_498_unify_and_guard_workflow_statuses_across_python_and_typescript - Unify and guard workflow statuses across Python and TypeScript
> From version: 2.12.12
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Single source of truth
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Status sets are hardcoded separately in flow/__init__.py, lint.py, audit.py, insights.py and in insightsAggregate.ts and logicsViewProviderSupport.ts; markItemObsolete writes Obsolete but the TS dropdown omits it, CLOSED_STATUSES diverges, and no validation rejects an illegal status transition.

# Scope
- In:
  - Define statuses once (e.g. logics/config/statuses.json) and load them from both Python and TypeScript
  - Add Obsolete to the dropdown and align CLOSED_STATUSES on both sides
  - Validate status transitions against the state machine instead of allowing any status at any time
  - Add a CI guard that fails when the Python and TS status views diverge
- Out:
  - Adding new statuses beyond reconciling the existing divergence
  - Reworking unrelated lint/audit kind schemas

# Acceptance criteria
- AC1: Statuses are defined once and consumed by both Python and TypeScript.
- AC2: Obsolete is selectable and CLOSED_STATUSES is identical on both sides.
- AC3: Illegal status transitions are rejected and a CI guard fails on future divergence.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Statuses are defined once and consumed by both Python and TypeScript.
- request-AC12 -> This backlog slice. Proof: AC2: Obsolete is selectable and CLOSED_STATUSES is identical on both sides.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Unify and guard workflow statuses across Python and TypeScript
- Keywords: scaffolded-backlog, unify and guard workflow statuses across python and typescript, implementation-ready
- Use when: Implementing the scaffolded slice for Unify and guard workflow statuses across Python and TypeScript.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
