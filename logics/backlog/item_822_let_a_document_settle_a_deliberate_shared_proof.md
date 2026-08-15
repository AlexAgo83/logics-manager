## item_822_let_a_document_settle_a_deliberate_shared_proof - Let a document settle a deliberate shared proof
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Confirm once
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `> Shared proof: AC1, AC2` records that a shared proof is deliberate, settling that group and nothing else.
- Keywords: shared proof declaration, indicator marker, audit noise
- Use when: Adding or reading the declaration, or wondering why a group stopped being reported.
- Skip when: Looking for a way to disable the check for a document or the corpus -- there is none, on purpose.

# Problem
- The check asks a human to confirm, and offers no way to record the answer, so the same confirmation is asked on every audit for ever.
- The two legitimate patterns are known and named in the check's own docstring; what is missing is a way for a document to say it is one of them.

# Scope
- In:
  - An explicit, checkable way for a document to state that a shared proof is deliberate and which criteria it covers.
  - The check stays live for that document: a proof shared by criteria the declaration does not name is still reported.
  - Apply it to the documents in this corpus that are the legitimate pattern, rather than leaving them reported.
- Out:
  - A blanket suppression flag, per document or per corpus.
  - Auto-writing the declaration on every reported document, which would settle the defects with the waves.

# Acceptance criteria
- AC1: A document declaring a shared proof for the criteria it covers is not reported for it.
- AC2: Adding a criterion to that shared proof without adding it to the declaration is reported.
- AC3: A document that has never written the declaration behaves exactly as it does today.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A document declaring a shared proof for the criteria it covers is not reported for it.
- request-AC3 -> This backlog slice. Proof: AC2: Adding a criterion to that shared proof without adding it to the declaration is reported.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_099_an_audit_worth_reading`
- Architecture decision(s): (none yet)
- Request: `req_368_make_the_duplicate_proof_check_say_something_a_reader_can_act_on`
- Primary task(s): `task_379_orchestrate_the_audit_signal_work`

# Priority
- Priority: High - without it the remaining findings are still never actioned
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_379_orchestrate_the_audit_signal_work` was finished via `logics-manager flow finish task` on 2026-08-15.
