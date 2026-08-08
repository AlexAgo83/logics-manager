## item_645_repair_without_overwriting_what_was_written_by_hand - Repair without overwriting what was written by hand
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: A repair that adds nothing twice
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The repair appends a placeholder for every criterion regardless of what is already there, so a section carrying hand-written proofs ends up holding both, and the operator deletes one set by hand.
- It compounds the format problem: because the repair is currently the only practical way to learn the format, an operator who writes proofs first and repairs second -- the natural order -- is exactly the one whose work is duplicated.
- Skipping a criterion that already has a line is safer than replacing it: replacing can destroy authored content, skipping never can.

# Scope
- In:
  - Skip a criterion that already has a traceability line rather than appending a second one.
  - Report what was skipped, so a run that changes nothing says why.
  - Cover a section holding hand-written proofs, and one holding none.
- Out:
  - Replacing or rewriting an existing line.
  - Judging whether an existing proof is good enough.
  - Changing the repair's other kinds.

# Acceptance criteria
- AC1: A criterion that already has a line is left alone, and no second line is added for it.
- AC2: A criterion with no line still gets its placeholder.
- AC3: A run that adds nothing reports what it skipped and why.
- AC4: A test covers a section with hand-written proofs and fails against the current implementation.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: `test_a_hand_written_proof_is_left_alone` in `tests/python/test_gate_you_can_satisfy.py`; a proof written in a shape the strict check does not read is no longer duplicated.
- request-AC8 -> This backlog slice. Proof: `test_running_the_repair_twice_adds_nothing_the_second_time` in the same file; both fail against the previous implementation.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- The skip predicate is looser than the proof check on purpose. Asking whether a criterion was proven would still have appended beside a proof written by hand in a shape the strict check does not read, which is exactly the reported case. It now asks whether a traceability line exists at all, in any shape. Skipping never destroys authored content; replacing can.

# Links
- Product brief(s): `prod_064_a_gate_you_can_satisfy`
- Architecture decision(s): (none yet)
- Request: `req_316_make_the_closeout_gate_teachable_self_consistent_and_non_destructive`
- Primary task(s): `task_313_orchestrate_making_the_closeout_gate_satisfiable`

# AI Context
- Summary: Repair without overwriting what was written by hand
- Keywords: scaffolded-backlog, repair without overwriting what was written by hand, implementation-ready
- Use when: Implementing the scaffolded slice for Repair without overwriting what was written by hand.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - small alone, compounding with the format problem
- Rationale: Set by scaffold input or defaulted for grooming.
