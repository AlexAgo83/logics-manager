## item_492_name_remedy_commands_in_blocking_lint_validate_messages - Name remedy commands in blocking lint/validate messages
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
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
- request-AC3 -> This backlog slice. Proof: Malformed scaffold input produces a precise validation error naming the offending key/type and is covered by a test.
- request-AC5 -> This backlog slice. Proof: Closeout-deferred proofs are reported under a distinct severity (e.g. deferred/info) separate from actionable fixable findings, so a fresh scaffold validates clean; --fixable no longer lists them.
- request-AC6 -> This backlog slice. Proof: flow scaffold request-chain --validate runs validation inline and prints a ready-to-dev summary, reusing the existing validate path.
- request-AC7 -> This backlog slice. Proof: No new runtime dependency is added; new behavior reuses existing scaffold/validate/lint code paths.
- request-AC8 -> This backlog slice. Proof: The full pytest and vitest suites pass, with coverage for the MCP scaffold tool, schema/example output, input validation, and the severity reclassification.

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
- Task `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements`
