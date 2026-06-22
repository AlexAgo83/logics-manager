## item_494_add_inline_validation_to_flow_scaffold - Add inline validation to flow scaffold
> From version: 2.12.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: CLI ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Scaffolding and validating are two manual steps; assistants repeat the ritual every time.

# Scope
- In:
  - Add flow scaffold request-chain --validate that runs the existing validate path on the new request and prints a ready-to-dev summary
  - Reuse the deferred-vs-actionable classification so the summary is accurate
- Out:
  - Auto-committing (out of scope; left to the operator)
  - Changing default scaffold behavior

# Acceptance criteria
- AC1: --validate runs validation inline and prints a ready-to-dev summary.
- AC2: A test covers the inline-validate path.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: --validate runs validation inline and prints a ready-to-dev summary.
- request-AC7 -> This backlog slice. Proof: AC2: A test covers the inline-validate path.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_assistant_authoring_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_276_improve_logics_manager_authoring_ergonomics_for_ai_assistants`
- Primary task(s): `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements`

# AI Context
- Summary: Add inline validation to flow scaffold
- Keywords: scaffolded-backlog, add inline validation to flow scaffold, implementation-ready
- Use when: Implementing the scaffolded slice for Add inline validation to flow scaffold.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
