## item_735_state_in_one_sentence_whether_the_release_can_proceed - State in one sentence whether the release can proceed
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 01:10:36

# AI Context
- Summary: The screen shows blocked, passed and a complete evidence count side by side without reconciling them, and the sentence that resolves it is a right-aligned key/value cell at the same weight as a file path.
- Keywords: release verdict, blocked reconciliation, next action, evidence count, gate state, release run
- Use when: Changing what the Release screen states about whether a release can proceed.
- Skip when: What the gates check, and the release contract itself.

# Problem
- The screen shows `blocked`, `pass` and `8/8` side by side without reconciling them, and the sentence that resolves it is a right-aligned key/value cell at the same weight as a file path.

# Scope
- In:
  - State why a release is blocked, reconciling the gate state, the run result and the evidence count.
  - Put the action that unblocks it beside the statement.
  - Keep the underlying facts available.
- Out:
  - What the gates check, and the release contract itself.

# Delivery notes
- The verdict is the reconciliation the screen was missing: it names the blocking gate, quotes its own reason, and states the evidence count in the same sentence -- so `blocked`, `pass` and `8/8` stop sitting side by side as three unexplained facts. The next action follows it, where it used to be a right-aligned key/value cell weighted like a file path.
- The `Next action` row is gone from the list below, because the verdict now carries it and a fact stated twice is a fact an operator has to reconcile.
- The underlying facts stay: the tiles keep State, Version, Blocked gate and Evidence, compacted into a strip rather than setting the scale of the screen.
# Acceptance criteria
- AC1: The screen leads with its verdict and the action that follows.
- AC10: A blocked release is explained in one sentence that reconciles gate, run and evidence.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The screen leads with its verdict and the action that follows.
- request-AC10 -> This backlog slice. Proof: AC10: A blocked release is explained in one sentence that reconciles gate, run and evidence.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)
- Request: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`
- Primary task(s): `task_344_deliver_the_git_ci_release_and_settings_redesign`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
