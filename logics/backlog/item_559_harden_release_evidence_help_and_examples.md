## item_559_harden_release_evidence_help_and_examples - Harden release evidence help and examples
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Release workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `release evidence add --help` currently behaves like an invalid invocation, and missing required fields at publication time cost attention when the operator needs exact evidence.

# Scope
- In:
  - Make `logics-manager release evidence add --help` show the command help and exit successfully.
  - On missing required arguments, append a complete example using a placeholder gate id plus `--kind`, `--status`, `--summary`, `--target-version`, and optional `--commit`.
  - Optionally add `logics-manager release evidence example <gate_id>` if it reuses the same renderer and stays small.
  - Add CLI tests for help exit code and missing-field error text.
- Out:
  - Interactive evidence collection.
  - Changing the release evidence schema.
  - Recording evidence automatically from GitHub without explicit operator action.

# Acceptance criteria
- AC1: `release evidence add --help` exits 0 and displays the required flags.
- AC2: Missing-field errors include one complete example command.
- AC3: Tests cover help and missing-field paths.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: `release evidence add --help` exits 0 and displays the required flags.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`
- Primary task(s): `task_294_orchestrate_logics_operator_ergonomics_improvements`

# AI Context
- Summary: Harden release evidence help and examples
- Keywords: scaffolded-backlog, harden release evidence help and examples, implementation-ready
- Use when: Implementing the scaffolded slice for Harden release evidence help and examples.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
