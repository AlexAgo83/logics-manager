## item_557_make_logics_remediation_messages_copy_paste_safe - Make Logics remediation messages copy-paste safe
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: CLI ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Indicator-gate failures already know the deterministic remedy, but the current hint is too generic and can still leave assistants guessing whether to update indicators or mark a non-semantic edit.

# Scope
- In:
  - Update lint output for modified-without-indicator failures to include a concrete `logics-manager sync update-indicators <ref> --understanding <n> --confidence <n>` example.
  - Mention `> Non-semantic edit:` as the right escape hatch for cosmetic-only doc edits.
  - Improve `sync update-indicators --help` with accepted status spelling and one safe example.
  - Add or update tests that assert the exact remediation text.
- Out:
  - Automatically choosing new understanding or confidence values.
  - Changing the semantic-edit detection rules.

# Acceptance criteria
- AC1: A changed workflow doc without indicator updates prints a complete update-indicators example and the non-semantic marker option.
- AC2: `sync update-indicators --help` includes at least one copy-paste-safe example and the canonical request status spelling.
- AC3: Tests cover both the lint message and help text.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A changed workflow doc without indicator updates prints a complete update-indicators example and the non-semantic marker option.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`
- Primary task(s): `task_294_orchestrate_logics_operator_ergonomics_improvements`

# AI Context
- Summary: Make Logics remediation messages copy-paste safe
- Keywords: scaffolded-backlog, make logics remediation messages copy-paste safe, implementation-ready
- Use when: Implementing the scaffolded slice for Make Logics remediation messages copy-paste safe.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
