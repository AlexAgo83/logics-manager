## item_497_make_the_public_cdxlogicsmodel_api_null_safe - Make the public CdxLogicsModel API null-safe
> From version: 2.12.12
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Client robustness
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Four exported functions in clients/shared-web/media/logicsModel.js (around lines 143/150, 179/186, 207/214 and collectPrimaryFlowItems) read item.references without guarding item, throwing a TypeError at the window.CdxLogicsModel boundary.

# Scope
- In:
  - Add an entry guard (if (!item) return safe-default) to each affected exported function
  - Mirror the fix into the synced media source per the webview media mirror process
  - Add a test exercising the public functions with null/undefined input
- Out:
  - Refactoring the model beyond the null guards
  - Changing return shapes for valid input

# Acceptance criteria
- AC1: Each public CdxLogicsModel function returns a safe default for null/undefined item instead of throwing.
- AC2: A vitest test covers the null/undefined boundary.
- AC3: The media mirror stays in sync and the lint guard passes.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Each public CdxLogicsModel function returns a safe default for null/undefined item instead of throwing.
- request-AC12 -> This backlog slice. Proof: AC2: A vitest test covers the null/undefined boundary.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Make the public CdxLogicsModel API null-safe
- Keywords: scaffolded-backlog, make the public cdxlogicsmodel api null-safe, implementation-ready
- Use when: Implementing the scaffolded slice for Make the public CdxLogicsModel API null-safe.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
