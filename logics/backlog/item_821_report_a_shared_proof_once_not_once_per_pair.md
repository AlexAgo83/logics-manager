## item_821_report_a_shared_proof_once_not_once_per_pair - Report a shared proof once, not once per pair
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: One finding per thing
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: report, shared, proof, once, not, per, pair
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `duplicate_proof_ac_ids` returns pairs, so a proof shared by twelve criteria is reported eleven times, each line naming two of the twelve.
- A reader cannot see from any one of those lines how many criteria are involved, which is exactly what decides whether it is a wave or a mistake.

# Scope
- In:
  - Group the criteria that share a proof and report the group once, naming all of them.
  - Keep the wording a signal to check rather than a verdict, which is what it is.
  - Update the tests that assert the pair shape.
- Out:
  - Changing which proofs are considered identical.
  - Changing the severity.

# Acceptance criteria
- AC1: A proof shared by N criteria produces one finding naming all N.
- AC2: Two independent shared proofs in one document are two findings.
- AC3: The corpus warning count drops from 437 to the number of groups, and the number is stated rather than estimated.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A proof shared by N criteria produces one finding naming all N.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_099_an_audit_worth_reading`
- Architecture decision(s): (none yet)
- Request: `req_368_make_the_duplicate_proof_check_say_something_a_reader_can_act_on`
- Primary task(s): `task_379_orchestrate_the_audit_signal_work`

# Priority
- Priority: High - it is 437 warnings that are 127 things
- Rationale: Set by scaffold input or defaulted for grooming.
