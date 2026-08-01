## item_575_stop_scaffolded_tasks_asserting_work_that_has_not_happened - Stop scaffolded tasks asserting work that has not happened
> From version: 2.19.5
> Schema version: 1.0
> Status: Done
> Understanding: 92
> Confidence: 87
> Progress: 100%
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
- request-AC7 -> This backlog slice. Evidence needed: Validation evidence stating a zero failure count is accepted. A single bullet reading `npm test passed (26 assertions, 0 failures)` satisfies the closeout preflight.
- request-AC8 -> This backlog slice. Evidence needed: `flow companion architecture` and `flow companion product` produce documents that pass `logics-manager lint` immediately, with no missing indicator.
- request-AC9 -> This backlog slice. Evidence needed: Companion bodies contain no content about any product other than the one named in the invocation, and every placeholder is impossible to mistake for content.
- request-AC10 -> This backlog slice. Evidence needed: `sync update-indicators` validates the requested indicators against the target document kind, and its error names the set that kind accepts.
- request-AC11 -> This backlog slice. Evidence needed: A semantic body edit that does not change status can be re-baselined without changing any indicator value and without labelling the edit non-semantic.
- request-AC12 -> This backlog slice. Evidence needed: Indicator values are written in the same format the templates use, so a corpus never mixes two forms for one indicator.
- request-AC13 -> This backlog slice. Evidence needed: Reference extraction ignores references inside fenced code blocks and inline code spans, so a document can quote a reference without creating a link.
- request-AC14 -> This backlog slice. Evidence needed: Every reference accepted by `flow validate` is accepted by every other command that takes a reference, or the error names the kind restriction rather than reporting the document as missing.
- request-AC15 -> This backlog slice. Evidence needed: Every audit finding that names a repair command is fixed by that command, or the finding no longer names one.
- request-AC16 -> This backlog slice. Evidence needed: `logics-manager index`, `flow start` and `flow progress` each report what they actually changed, including no-ops and documents modified beyond the one named.
- request-AC17 -> This backlog slice. Evidence needed: The status vocabulary and the scaffold input enums are discoverable without triggering a failure, and the documented key list matches the accepted key set.
- request-AC18 -> This backlog slice. Evidence needed: `logics-manager flow list` produces a listing in the default form shown as the first example in its own help text.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- Generated `# Report` says "Not started." at all four call sites; `# AC Traceability` is derived from `backlog_items[].request_acs`; unclaimed request ACs are warned at scaffold time and marked in the doc; `# Validation` carries a placeholder the closeout gate rejects.

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

# Tasks
- `task_297_orchestrate_agent_facing_correctness_remediation`

# Notes
- Task `task_297_orchestrate_agent_facing_correctness_remediation` was finished via `logics-manager flow finish task` on 2026-08-01.
