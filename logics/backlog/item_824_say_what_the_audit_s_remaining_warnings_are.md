## item_824_say_what_the_audit_s_remaining_warnings_are - Say what the audit's remaining warnings are
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: A count that means something
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Records what the audit's warnings are made of, and scopes the duplicate-proof check to open documents -- all 127 findings were on Done ones.
- Keywords: audit breakdown, open documents only, closed is history
- Use when: Asking whether this corpus is clean, or why a check reports nothing on a Done document.
- Skip when: Changing what any check looks for.

# Problem
- With 437 of 437 warnings coming from one check, the summary line's count says nothing about the corpus, and no one can tell whether the number moving is good or bad.
- The anchor check was misreading lineage as a code citation until today, and it went unnoticed inside that count for as long as it existed.

# Scope
- In:
  - Re-measure the audit on this corpus after the slices above and record the breakdown by code, not just the total.
  - For any check still dominated by a legitimate pattern, either narrow it or record why it stays, where the check lives.
  - State the remaining count with what it is made of.
- Out:
  - Suppressing a check to improve the number.
  - Changing the summary line's format.

# Acceptance criteria
- AC1: The audit's warnings on this corpus are recorded by code, with a number.
- AC2: No check contributes a majority of the warnings by reporting a legitimate pattern.
- AC3: Whatever remains is explained where the check lives, so the next reader does not rediscover it from the count.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The audit's warnings on this corpus are recorded by code, with a number.
- request-AC5 -> This backlog slice. Proof: AC2: No check contributes a majority of the warnings by reporting a legitimate pattern.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_099_an_audit_worth_reading`
- Architecture decision(s): (none yet)
- Request: `req_368_make_the_duplicate_proof_check_say_something_a_reader_can_act_on`
- Primary task(s): `task_379_orchestrate_the_audit_signal_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_379_orchestrate_the_audit_signal_work` was finished via `logics-manager flow finish task` on 2026-08-15.
