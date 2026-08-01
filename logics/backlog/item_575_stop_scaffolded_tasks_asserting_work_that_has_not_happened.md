## item_575_stop_scaffolded_tasks_asserting_work_that_has_not_happened - Stop scaffolded tasks asserting work that has not happened
> From version: 2.19.5
> Schema version: 1.0
> Status: In progress
> Understanding: 92
> Confidence: 87
> Progress: 10%
> Complexity: High
> Theme: Generated content
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Every scaffolded task carries frozen boilerplate whose `# Report` section reads `Implementation complete.` on a task at zero progress and `Ready` status, so an agent opening the task first reads a finished job.
- The AC traceability block maps to the scaffold command's own acceptance criteria rather than the request's, producing statements that are false about the target project.
- The `# Validation` section prescribes this tool's verification steps rather than the target project's gates.
- The correct mapping is already present in the scaffold input under `backlog_items[].request_acs` and is simply not consumed.
- Re-deriving that mapping by hand is what exposed two genuine coverage holes in the field, including a request AC that no backlog item claimed and that required human action no agent could perform.

# Scope
- In:
  - Replace the completion claim in the generated `# Report` with a not-started statement, at all four call sites that carry the literal.
  - Derive the generated `# AC Traceability` block from `backlog_items[].request_acs`, mapping each request AC to the backlog item that claims it.
  - Report every request acceptance criterion claimed by no backlog item during scaffolding.
  - Seed the generated `# Validation` section with a single line that cannot be mistaken for evidence and that the closeout gate still rejects.
  - Cover the generated output with a test asserting no section asserts completed work.
- Out:
  - Seeding `# Validation` from a project-level convention file, which is a feature and is deferred.
  - Changing what the closeout gate accepts, which is a separate slice.

# Acceptance criteria
- AC1: A freshly scaffolded task contains no completion claim in any section, and its `# Report` states that work has not started.
- AC2: The generated `# AC Traceability` maps each request AC to the backlog item declaring it in `request_acs`, with no reference to the scaffold command's own criteria.
- AC3: Scaffolding an input whose backlog items do not collectively claim every request AC reports each unclaimed AC by identifier.
- AC4: The generated `# Validation` section contains one line that the `validation_evidence_missing` gate rejects and that no reader would mistake for evidence.
- AC5: A test scaffolds from a fixture input and asserts the generated task asserts nothing that has not happened.
- AC6: Immediately after scaffolding, `flow validate` reports deferred task-level traceability for every request acceptance criterion, with none suppressed by a generated proof claim. This is the check the current boilerplate silences, and it is the one that would have caught it.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A freshly scaffolded task contains no completion claim in any section, and its `# Report` states that work has not started.
- request-AC4 -> This backlog slice. Proof: AC2: The generated `# AC Traceability` maps each request AC to the backlog item declaring it in `request_acs`, with no reference to the scaffold command's own criteria.
- request-AC5 -> This backlog slice. Proof: AC3: Scaffolding an input whose backlog items do not collectively claim every request AC reports each unclaimed AC by identifier.
- request-AC6 -> This backlog slice. Proof: AC4: The generated `# Validation` section contains one line that the `validation_evidence_missing` gate rejects and that no reader would mistake for evidence.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Stop scaffolded tasks asserting work that has not happened
- Keywords: scaffolded-backlog, stop scaffolded tasks asserting work that has not happened, implementation-ready
- Use when: Implementing the scaffolded slice for Stop scaffolded tasks asserting work that has not happened.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
