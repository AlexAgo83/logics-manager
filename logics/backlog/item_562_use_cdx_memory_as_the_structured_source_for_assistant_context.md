## item_562_use_cdx_memory_as_the_structured_source_for_assistant_context - Use cdx memory as the structured source for assistant context
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 92
> Confidence: 88
> Progress: 0%
> Complexity: Medium
> Theme: Assistant context
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Raw CDX context files can contain ANSI escape sequences, huge TUI spinner lines, `/usage` prompts, and other noise that makes handoffs expensive and misleading.
- Operators also need to inspect that cleaned memory in the Logics viewer, not only through a CLI payload, before trusting it as assistant context.

# Scope
- In:
  - Add an assistant-facing command such as `logics-manager assist cdx-memory show --scope current --clean --format json` that shells out to `cdx memory ... --json` when available.
  - Clean ANSI/control sequences, repeated spinner fragments, very long TUI lines, and usage-limit prompts from the returned content.
  - Emit quality signals: source scope, bytes before/after, estimated noise ratio, detected repo path, latest actionable summary if present, and warnings when cdx memory is unavailable.
  - Add a read-only CDX Memory sub-screen under the existing CDX viewer area, fed by the same cleaned payload.
  - The screen should show current/global scopes, source path, bytes before/after, noise ratio, latest useful handoff excerpt, detected repo, warnings, and a compact raw/cleaned toggle for inspection.
  - Reuse existing assist/context-pack patterns; do not create a new persistent memory store.
  - Add tests with a fixture containing ANSI/TUI noise and a clean useful handoff tail, plus viewer tests for populated, unavailable, and noisy memory states.
- Out:
  - Writing or clearing Codex memory.
  - Parsing every possible terminal UI artifact perfectly.
  - Replacing existing `sync context-pack`.
  - Building a memory editor or timeline in this wave.

# Acceptance criteria
- AC1: The command reads `cdx memory` JSON when available and returns bounded cleaned content.
- AC2: ANSI/TUI noise and huge spinner lines are removed from a fixture while useful commands and final summaries remain.
- AC3: The command degrades gracefully when `cdx` is missing or `cdx memory` is unsupported.
- AC4: The viewer exposes a CDX Memory sub-screen using the same cleaned payload with current/global scope selection and clear warnings.
- AC5: Tests cover clean, noisy, unavailable-command, and viewer rendering paths.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: The command reads `cdx memory` JSON when available and returns bounded cleaned content.
- request-AC7 -> This backlog slice. Proof: AC4: The viewer exposes a CDX Memory sub-screen using the same cleaned payload with current/global scope selection and clear warnings.

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
