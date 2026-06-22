## item_491_make_the_scaffold_input_schema_discoverable_and_validated - Make the scaffold input schema discoverable and validated
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: CLI ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- flow scaffold request-chain --help documents no input keys and malformed input fails opaquely, so an assistant must reverse-engineer an example file.

# Scope
- In:
  - Document the input JSON keys in --help and add --print-schema/--example emitting the schema and a skeleton
  - Validate the input JSON and raise precise errors naming the missing/invalid key
  - Reuse the same schema definition for the MCP tool (sibling slice)
- Out:
  - Changing the accepted schema itself
  - The MCP registration (sibling slice)

# Acceptance criteria
- AC1: --help and --print-schema/--example describe the input; a test asserts the skeleton round-trips through scaffold.
- AC2: Malformed input yields a precise, tested error.
- AC3: The schema is defined once and shared with the MCP tool.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: --help and --print-schema/--example describe the input; a test asserts the skeleton round-trips through scaffold.
- request-AC3 -> This backlog slice. Proof: AC2: Malformed input yields a precise, tested error.
- request-AC7 -> This backlog slice. Proof: AC3: The schema is defined once and shared with the MCP tool.
- request-AC4 -> This backlog slice. Proof: Blocking lint/validate messages that have a deterministic remedy name the remedy command (e.g. sync update-indicators) in their text.
- request-AC5 -> This backlog slice. Proof: Closeout-deferred proofs are reported under a distinct severity (e.g. deferred/info) separate from actionable fixable findings, so a fresh scaffold validates clean; --fixable no longer lists them.
- request-AC6 -> This backlog slice. Proof: flow scaffold request-chain --validate runs validation inline and prints a ready-to-dev summary, reusing the existing validate path.
- request-AC8 -> This backlog slice. Proof: The full pytest and vitest suites pass, with coverage for the MCP scaffold tool, schema/example output, input validation, and the severity reclassification.
- request-AC9 -> This backlog slice. Proof: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_assistant_authoring_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_276_improve_logics_manager_authoring_ergonomics_for_ai_assistants`
- Primary task(s): `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements`

# AI Context
- Summary: Make the scaffold input schema discoverable and validated
- Keywords: scaffolded-backlog, make the scaffold input schema discoverable and validated, implementation-ready
- Use when: Implementing the scaffolded slice for Make the scaffold input schema discoverable and validated.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Done: --print-schema and --example on flow scaffold request-chain; SCAFFOLD_REQUEST_CHAIN_SCHEMA_HELP in --help; _validate_scaffold_input raises precise key/type errors before writing.
- Task `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements`
