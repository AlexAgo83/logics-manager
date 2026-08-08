## item_643_derive_the_proof_verdict_once - Derive the proof verdict once
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: One implementation, one verdict
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- On an unchanged corpus, `flow validate` reported only that the request was not closed, `flow validate-closeout` reported three criteria without proof, and `closeout --dry-run` reported all thirteen. Nothing says which is authoritative.
- Earlier in the same session the counts moved as documents were edited -- ten, then three -- while `flow validate` reported nothing throughout. The three commands clearly compute proof state separately.
- The practical cost is that `flow validate` returning clean is not a signal that closeout will work, so it cannot be used as the gate before committing.

# Scope
- In:
  - Compute proof state in one place, and have all three commands use it.
  - Where a command legitimately checks more than another, state the difference in its help rather than leaving it to be discovered.
  - Cover the agreement with a test that runs all three against one corpus and compares their findings.
  - Keep each command's own scope: this is about the shared computation, not about merging the commands.
- Out:
  - Merging the three commands.
  - Changing what any of them does beyond the shared computation.
  - Changing the closeout chain's rollback behavior.

# Acceptance criteria
- AC1: One implementation answers whether a criterion has a proof, and the three commands call it.
- AC2: On an unchanged corpus the three report the same set of criteria without proof.
- AC3: A command that checks more says so in its help.
- AC4: A test compares all three on one corpus and fails against the current implementation.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: One implementation answers whether a criterion has a proof, and the three commands call it.
- request-AC8 -> This backlog slice. Proof: AC2: On an unchanged corpus the three report the same set of criteria without proof.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_064_a_gate_you_can_satisfy`
- Architecture decision(s): (none yet)
- Request: `req_316_make_the_closeout_gate_teachable_self_consistent_and_non_destructive`
- Primary task(s): `task_313_orchestrate_making_the_closeout_gate_satisfiable`

# AI Context
- Summary: Derive the proof verdict once
- Keywords: scaffolded-backlog, derive the proof verdict once, implementation-ready
- Use when: Implementing the scaffolded slice for Derive the proof verdict once.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - three commands, three answers, no stated authority
- Rationale: Set by scaffold input or defaulted for grooming.
