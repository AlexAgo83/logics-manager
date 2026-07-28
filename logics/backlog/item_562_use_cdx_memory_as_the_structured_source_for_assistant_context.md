## item_562_use_cdx_memory_as_the_structured_source_for_assistant_context - Use cdx memory as the structured source for assistant context
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Assistant context
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Raw CDX context files can contain ANSI escape sequences, huge TUI spinner lines, `/usage` prompts, and other noise that makes handoffs expensive and misleading.

# Scope
- In:
  - Add an assistant-facing command such as `logics-manager assist cdx-memory show --scope current --clean --format json` that shells out to `cdx memory ... --json` when available.
  - Clean ANSI/control sequences, repeated spinner fragments, very long TUI lines, and usage-limit prompts from the returned content.
  - Emit quality signals: source scope, bytes before/after, estimated noise ratio, detected repo path, latest actionable summary if present, and warnings when cdx memory is unavailable.
  - Reuse existing assist/context-pack patterns; do not create a new persistent memory store.
  - Add tests with a fixture containing ANSI/TUI noise and a clean useful handoff tail.
- Out:
  - Writing or clearing Codex memory.
  - Parsing every possible terminal UI artifact perfectly.
  - Replacing existing `sync context-pack`.

# Acceptance criteria
- AC1: The command reads `cdx memory` JSON when available and returns bounded cleaned content.
- AC2: ANSI/TUI noise and huge spinner lines are removed from a fixture while useful commands and final summaries remain.
- AC3: The command degrades gracefully when `cdx` is missing or `cdx memory` is unsupported.
- AC4: Tests cover clean, noisy, and unavailable-command paths.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: The command reads `cdx memory` JSON when available and returns bounded cleaned content.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`
- Primary task(s): `task_294_orchestrate_logics_operator_ergonomics_improvements`

# AI Context
- Summary: Use cdx memory as the structured source for assistant context
- Keywords: scaffolded-backlog, use cdx memory as the structured source for assistant context, implementation-ready
- Use when: Implementing the scaffolded slice for Use cdx memory as the structured source for assistant context.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
