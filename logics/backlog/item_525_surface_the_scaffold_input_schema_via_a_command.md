## item_525_surface_the_scaffold_input_schema_via_a_command - Surface the scaffold input schema via a command
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85
> Progress: 100%
> Complexity: Low
> Theme: Developer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The request-chain input schema is undocumented in the tool; authors copy an existing logics/scaffold/*.json to learn the keys.

# Scope
- In:
  - Add flow scaffold request-chain --print-schema (or --template) emitting the key structure / a minimal valid starter
  - Reference the command from the scaffold help text
- Out:
  - Changing the schema itself

# Acceptance criteria
- AC1: A command prints the input schema or a minimal valid template.
- AC2: The scaffold help text points to it.
- AC3: A pytest asserts the command runs and emits valid JSON.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: A command prints the input schema or a minimal valid template.
- request-AC2 -> This backlog slice. Evidence needed: --dry-run runs the same input validation as apply (including the context-pack profile/mode check), so a dry-run that passes guarantees the apply will not fail on input errors.
- request-AC3 -> This backlog slice. Evidence needed: Apply is atomic: if any step fails, no partial docs or INDEX changes remain and no ids are consumed, so a corrected re-run reuses the same ids.
- request-AC4 -> This backlog slice. Evidence needed: flow validate and audit resolve a short ref (e.g. req_285) to its full slug, or fail with a 'did you mean <slug>' hint instead of a bare 'Workflow source not found'.
- request-AC6 -> This backlog slice. Proof: test_scaffold_robustness.py test_print_schema_and_example_emit_valid_json covers the schema-discovery command.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_035_scaffold_tooling_robustness`
- Architecture decision(s): (none yet)
- Request: `req_286_make_flow_scaffold_request_chain_fail_fast_atomic_and_self_documenting`
- Primary task(s): `task_283_orchestrate_scaffold_robustness_hardening`

# AI Context
- Summary: Surface the scaffold input schema via a command
- Keywords: scaffolded-backlog, surface the scaffold input schema via a command, implementation-ready
- Use when: Implementing the scaffolded slice for Surface the scaffold input schema via a command.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_283_orchestrate_scaffold_robustness_hardening`

# Notes
- Task `task_283_orchestrate_scaffold_robustness_hardening` was finished via `logics-manager flow finish task` on 2026-06-27.
