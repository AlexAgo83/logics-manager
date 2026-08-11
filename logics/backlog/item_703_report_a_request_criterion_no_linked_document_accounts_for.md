## item_703_report_a_request_criterion_no_linked_document_accounts_for - Report a request criterion no linked document accounts for
> From version: 2.21.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Corpus lineage
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: A criterion added to a request after its chain was scaffolded is invisible until a closeout gate demands proof for it; nothing compares the declared set against the covered set.
- Keywords: ac-coverage, chain-drift, audit, closeout
- Use when: Changing how a request's criteria are matched against its linked items and tasks.
- Skip when: The work concerns whether proof is valid, rather than whether a criterion was accounted for at all.

# Problem
- `item_695` carried five criteria while its request carried six; the gap surfaced only as a blocking finding at closeout.

# Scope
- In:
  - Compare the criteria a request declares against those its linked items and tasks account for.
  - Report the difference as a warning, before closeout.
- Out:
  - Changing how proof is matched, or repairing the gap automatically.

# Acceptance criteria
- AC5: An unaccounted criterion is reported, naming it and the documents checked.
- AC6: The finding is a warning and stays silent on complete coverage.
- AC7: Tests cover a complete chain and one with an uncovered criterion.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: An unaccounted criterion is reported, naming it and the documents checked.
- request-AC6 -> This backlog slice. Proof: AC6: The finding is a warning and stays silent on complete coverage.
- request-AC7 -> This backlog slice. Proof: AC7: Tests cover a complete chain and one with an uncovered criterion.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_076_tooling_that_tells_the_truth_about_itself`
- Architecture decision(s): (none yet)
- Request: `req_340_close_the_three_trust_gaps_the_2_21_7_cycle_exposed`
- Primary task(s): `task_337_deliver_the_three_trust_gaps_from_the_2_21_7_cycle`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_337_deliver_the_three_trust_gaps_from_the_2_21_7_cycle` was finished via `logics-manager flow finish task` on 2026-08-11.
