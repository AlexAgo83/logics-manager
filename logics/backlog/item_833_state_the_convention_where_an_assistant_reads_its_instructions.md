## item_833_state_the_convention_where_an_assistant_reads_its_instructions - State the convention where an assistant reads its instructions
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: For the documents nobody fetched
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 15:59:35

# AI Context
- Summary: The convention in words, for the case the payloads cannot cover: a document named rather than fetched.
- Keywords: instructions.md, skill assets, convention, agent handoff
- Use when: Writing agent-facing conventions for this repository.
- Skip when: Restating the URL grammar; docs/cli.md holds it.

# Problem
- The three slices above cover a document an assistant fetched. They do not cover naming one it already knows about, which is most of what an answer does.
- `logics/instructions.md` and the bundled skills are where this repository already puts its agent conventions, and neither mentions the viewer link.

# Scope
- In:
  - State it in `logics/instructions.md`: name a document, give its link.
  - State it where the bundled skills describe how to report work, so it reaches assistants installed from `skills install`.
  - Say where the address comes from, so nobody hard-codes the default port.
- Out:
  - A new document for a convention that is three lines.
  - Restating the URL forms, which `docs/cli.md` already carries.

# Acceptance criteria
- AC1: `logics/instructions.md` states the convention and where the address comes from.
- AC2: The bundled skills state it where they describe reporting.
- AC3: Neither restates the URL grammar; both point at the one place that holds it.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: `logics/instructions.md` states the convention and where the address comes from.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_102_the_link_travels_with_the_document`
- Architecture decision(s): (none yet)
- Request: `req_371_put_the_viewer_link_where_every_assistant_already_looks`
- Primary task(s): `task_382_orchestrate_the_link_travels_with_the_document_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
