## item_701_report_a_runtime_that_disagrees_with_the_repository_it_audits - Report a runtime that disagrees with the repository it audits
> From version: 2.21.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Tooling trust
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Compare the running version against the repository `VERSION` and say so when they differ; a stale runtime reports fewer findings, so the corpus looks healthier than it is.
- Keywords: runtime-drift, version-mismatch, doctor, false-confidence
- Use when: Adding or changing the notice a command gives about its own version.
- Skip when: The work is about resolving which runtime to use, rather than reporting that the chosen one disagrees.

# Problem
- A bundled runtime one version behind reported `0 blocking` for a corpus that had 4 blocking findings, and a false acceptance proof was written from that answer.

# Scope
- In:
  - Compare the running version against the repository `VERSION` and report a mismatch once per command.
  - Name both versions and the update command.
- Out:
  - Blocking, gating, or auto-updating on a mismatch.

# Acceptance criteria
- AC1: A mismatch is reported once, naming both versions and how to update.
- AC2: The notice never blocks and never changes an exit code.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A mismatch is reported once, naming both versions and how to update.
- request-AC2 -> This backlog slice. Proof: AC2: The notice never blocks and never changes an exit code.

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
