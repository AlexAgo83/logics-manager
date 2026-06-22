## item_492_name_remedy_commands_in_blocking_lint_validate_messages - Name remedy commands in blocking lint/validate messages
> From version: 2.12.8
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100
> Complexity: Low
> Theme: Diagnostics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The 'modified without updating indicators' gate (and similar blocking messages) does not tell the operator that sync update-indicators is the fix.

# Scope
- In:
  - Append the remedy command to blocking messages that have a deterministic fix, starting with the indicator gate
  - Keep messages stable enough for existing tests or update them in the same change
- Out:
  - Changing which conditions are blocking
  - Auto-applying the remedy

# Acceptance criteria
- AC1: The indicator-gate message names sync update-indicators.
- AC2: A test asserts the remedy text is present.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The indicator-gate message names sync update-indicators.
- request-AC9 -> This backlog slice. Proof: AC2: A test asserts the remedy text is present.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_assistant_authoring_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_276_improve_logics_manager_authoring_ergonomics_for_ai_assistants`
- Primary task(s): `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements`

# AI Context
- Summary: Name remedy commands in blocking lint/validate messages
- Keywords: scaffolded-backlog, name remedy commands in blocking lint/validate messages, implementation-ready
- Use when: Implementing the scaffolded slice for Name remedy commands in blocking lint/validate messages.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Done: the indicator-gate lint message now appends 'fix: logics-manager sync update-indicators <ref>'.
