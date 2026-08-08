## item_643_derive_the_proof_verdict_once - Derive the proof verdict once
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: One implementation, one verdict
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 23:40:07

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
- request-AC4 -> This backlog slice. Proof: `test_only_one_module_decides_what_counts_as_a_proof` and `test_the_legacy_allowance_is_named_not_reimplemented` in `tests/python/test_gate_you_can_satisfy.py`; the audit's second rule is gone and reaches `has_ac_proof(legacy=True)` instead.
- request-AC8 -> This backlog slice. Proof: the same tests, plus `flow validate-closeout --help` now stating what each of the three commands checks.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- Two divergences were found, and only one was a defect. The audit carried its own looser proof rule -- the criterion named anywhere and the keyword anywhere in the document -- while the closeout gate required both on one line; that duplication is gone, and the allowance is now a named argument of the single implementation. The second divergence is legitimate and was documented rather than removed: the audit defers an AC proof gap to a warning while no linked task is Done, because proof cannot exist before the work does, whereas the closeout preflight blocks on it whatever the lifecycle says. `flow validate-closeout --help` now states what each of the three commands checks, so the difference is predictable instead of surprising.

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

# Tasks
- `task_313_orchestrate_making_the_closeout_gate_satisfiable`

# Notes
- Task `task_313_orchestrate_making_the_closeout_gate_satisfiable` was finished via `logics-manager flow finish task` on 2026-08-08.
