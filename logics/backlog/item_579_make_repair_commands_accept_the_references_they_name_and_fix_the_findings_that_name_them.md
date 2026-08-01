## item_579_make_repair_commands_accept_the_references_they_name_and_fix_the_findings_that_name_them - Make repair commands accept the references they name and fix the findings that name them
> From version: 2.19.5
> Schema version: 1.0
> Status: Ready
> Understanding: 93
> Confidence: 88
> Progress: 0%
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

# Decision framing
- Product framing: Not needed
- Architecture framing: Needed — repair scope must be settled before implementation.
- Recommendation: widen coverage rather than remove the repair hints. A finding is
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
