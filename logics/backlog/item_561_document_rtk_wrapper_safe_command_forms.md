## item_561_document_rtk_wrapper_safe_command_forms - Document RTK wrapper-safe command forms
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Assistant instructions
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The wrapper is preferred for noisy commands, but some one-off command forms such as `npx` can change semantics when wrapped naively.

# Scope
- In:
  - Update `RTK.md` with a small wrapper-safe table: npm scripts, targeted Vitest, raw one-off commands, exact-output commands.
  - Update generated assistant instructions or bridge output so agents see the same caveat without opening RTK.md.
  - Add a test that asserts the generated instruction text includes the targeted Vitest safe form.
- Out:
  - Changing RTK itself.
  - Cataloging every possible shell command.

# Acceptance criteria
- AC1: `RTK.md` documents `rtk npm exec -- vitest ...` as the safe targeted Vitest form.
- AC2: Generated assistant instructions mention using raw commands when exact one-off semantics matter.
- AC3: A test asserts the wrapper caveat appears in generated instructions.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: `RTK.md` documents `rtk npm exec -- vitest ...` as the safe targeted Vitest form.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`
- Primary task(s): `task_294_orchestrate_logics_operator_ergonomics_improvements`

# AI Context
- Summary: Document RTK wrapper-safe command forms
- Keywords: scaffolded-backlog, document rtk wrapper-safe command forms, implementation-ready
- Use when: Implementing the scaffolded slice for Document RTK wrapper-safe command forms.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
