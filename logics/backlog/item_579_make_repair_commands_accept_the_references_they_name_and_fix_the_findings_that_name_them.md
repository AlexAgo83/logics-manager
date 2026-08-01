## item_579_make_repair_commands_accept_the_references_they_name_and_fix_the_findings_that_name_them - Make repair commands accept the references they name and fix the findings that name them
> From version: 2.19.5
> Schema version: 1.0
> Status: Done
> Understanding: 93
> Confidence: 88
> Progress: 100%
> Complexity: High
> Theme: Reference handling
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The same document produces two different errors depending on the reference form: the bare reference reports the document as missing, which is false, while the path reports the kind restriction, which is true.
- Both repair commands accept only a request, while the findings that name them live on tasks and companion documents, so they report changing nothing while the findings persist.
- The flag that takes references is plural and kind-agnostic in name while being kind-restricted in behaviour.
- Whether these commands are meant to cover task-side traceability at all is the one genuine design question left in the lot, and must be settled before the slice is implemented.

# Scope
- In:
  - Settle and record whether repair coverage widens to the findings that name it, or the findings stop naming a repair.
  - Make every command that takes a reference accept the same forms, resolving bare references and paths alike.
  - Make the error name the kind restriction rather than reporting an existing document as missing.
  - Implement the settled decision so that every audit finding naming a repair is fixed by that repair.
  - Cover the six reference forms recorded in the field report with tests.
- Out:
  - Renaming the flag that takes references.
  - Adding new repair commands beyond what the settled decision requires.

# Acceptance criteria
- AC1: The decision on repair scope is recorded in the corpus before implementation begins.
- AC2: Each of the six reference forms recorded in the field report resolves, or fails with an error naming the kind restriction.
- AC3: No command reports an existing document as missing.
- AC4: Every audit finding that names a repair command is fixed by running that command, verified on a corpus reproducing the field's warnings.
- AC5: Any finding that keeps no repair no longer names one in its output.

# AC Traceability
- request-AC14 -> This backlog slice. Proof: AC1: The decision on repair scope is recorded in the corpus before implementation begins.
- request-AC15 -> This backlog slice. Proof: AC2: Each of the six reference forms recorded in the field report resolves, or fails with an error naming the kind restriction.
- request-AC3 -> This backlog slice. Evidence needed: No scaffolded document asserts work that has not happened. A freshly scaffolded task at zero progress contains no completion claim in any section.
- request-AC4 -> This backlog slice. Evidence needed: Scaffolded AC traceability is derived from `backlog_items[].request_acs` in the scaffold input, mapping each request AC to the backlog item that claims it.
- request-AC5 -> This backlog slice. Evidence needed: Scaffolding reports every request acceptance criterion claimed by no backlog item, at scaffold time rather than at review time.
- request-AC6 -> This backlog slice. Evidence needed: Scaffolded `# Validation` carries one line that cannot be mistaken for evidence, and that the `validation_evidence_missing` gate still rejects.
- request-AC7 -> This backlog slice. Evidence needed: Validation evidence stating a zero failure count is accepted. A single bullet reading `npm test passed (26 assertions, 0 failures)` satisfies the closeout preflight.
- request-AC8 -> This backlog slice. Evidence needed: `flow companion architecture` and `flow companion product` produce documents that pass `logics-manager lint` immediately, with no missing indicator.
- request-AC9 -> This backlog slice. Evidence needed: Companion bodies contain no content about any product other than the one named in the invocation, and every placeholder is impossible to mistake for content.
- request-AC10 -> This backlog slice. Evidence needed: `sync update-indicators` validates the requested indicators against the target document kind, and its error names the set that kind accepts.
- request-AC11 -> This backlog slice. Evidence needed: A semantic body edit that does not change status can be re-baselined without changing any indicator value and without labelling the edit non-semantic.
- request-AC12 -> This backlog slice. Evidence needed: Indicator values are written in the same format the templates use, so a corpus never mixes two forms for one indicator.
- request-AC13 -> This backlog slice. Evidence needed: Reference extraction ignores references inside fenced code blocks and inline code spans, so a document can quote a reference without creating a link.
- request-AC16 -> This backlog slice. Evidence needed: `logics-manager index`, `flow start` and `flow progress` each report what they actually changed, including no-ops and documents modified beyond the one named.
- request-AC17 -> This backlog slice. Evidence needed: The status vocabulary and the scaffold input enums are discoverable without triggering a failure, and the documented key list matches the accepted key set.
- request-AC18 -> This backlog slice. Evidence needed: `logics-manager flow list` produces a listing in the default form shown as the first example in its own help text.

# Decision framing
- Product framing: Not needed
- Architecture framing: Needed — repair scope must be settled before implementation.
- Recommendation: widen coverage rather than remove the repair hints. A finding is
- A wrong-kind bare ref names the kind found and the kind wanted instead of claiming the document is missing; companion refs resolve; mermaid repair reports what it skipped and why. Verified against the live corpus: the ac-traceability repair does reach linked tasks, and `companion_doc_missing_mermaid` names no repair at all.
  emitted against a specific document, so the repair must be addressable at the
  same granularity as the finding. Today `companion_doc_missing_mermaid` fires on
  a companion while its repair accepts only a request, and `ac_missing_task_traceability`
  fires on a request while the boilerplate it should rewrite lives on a task. Both
  repairs are deterministic and mechanical, which is exactly the class worth
  automating; removing the hint would delete a working fix path to make the message
  honest, which is the wrong trade.
- Proposed rule: a repair command accepts the reference of any document that can
  carry the finding it repairs, and every finding names a command that, run
  verbatim, resolves it. If a finding has no such command, it names none.
- Suggested implementation order: make reference resolution uniform first, since
  the current `Source not found` on an existing document hides the kind restriction
  and makes the coverage question hard to reason about. Widening coverage on top of
  a resolver that reports honestly is a much smaller change than doing both at once.

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Make repair commands accept the references they name and fix the findings that name them
- Keywords: scaffolded-backlog, make repair commands accept the references they name and fix the findings that name them, implementation-ready
- Use when: Implementing the scaffolded slice for Make repair commands accept the references they name and fix the findings that name them.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_297_orchestrate_agent_facing_correctness_remediation`

# Notes
- Task `task_297_orchestrate_agent_facing_correctness_remediation` was finished via `logics-manager flow finish task` on 2026-08-01.
