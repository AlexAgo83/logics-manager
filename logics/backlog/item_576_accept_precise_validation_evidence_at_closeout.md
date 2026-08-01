## item_576_accept_precise_validation_evidence_at_closeout - Accept precise validation evidence at closeout
> From version: 2.19.5
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Medium
> Theme: Gates
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `has_validation_evidence` skips any bullet containing the substring `failure`, so evidence stating a zero failure count is rejected for being precise.
- The detector iterates per bullet, so a single-bullet `--validation` blob is rejected outright while a multi-line section survives because an unrelated line clears the check.
- The preflight then rolls back the evidence the writer had already appended, which reads as the flag having done nothing.
- The documented repair points at the flag that cannot satisfy the gate, so the operator is sent to a dead end.
- This is a regression: the substring blocklist was introduced in v2.10.0 by a fix intended to reject weak evidence.

# Scope
- In:
  - Replace substring matching on the rejection markers with matching that does not fire on a negated or zero-count form.
  - Keep rejecting genuinely weak evidence: placeholders, imperatives, pending states, and reported failures.
  - Correct the repair hint attached to `validation_evidence_missing` so it names something that satisfies the gate.
  - Add a non-regression test using the exact string rejected in the field.
  - Make the rollback on preflight failure distinguishable in the output from having written nothing.
- Out:
  - Reordering the closeout pipeline, which the root cause does not require.
  - Relaxing the gate itself, which correctly caught a real gap in the field.

# Acceptance criteria
- AC1: A single bullet reading `npm test passed (26 assertions, 0 failures)` is accepted as validation evidence.
- AC2: A bullet reporting an actual failure, a pending state, or a placeholder is still rejected.
- AC3: `flow closeout --validation` with the field's verbatim string succeeds where it previously failed, with a test pinning that exact string.
- AC4: The repair hint on `validation_evidence_missing` names an action that satisfies the gate.
- AC5: Closeout output distinguishes evidence rolled back after a failed preflight from evidence never written.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: A single bullet reading `npm test passed (26 assertions, 0 failures)` is accepted as validation evidence.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Accept precise validation evidence at closeout
- Keywords: scaffolded-backlog, accept precise validation evidence at closeout, implementation-ready
- Use when: Implementing the scaffolded slice for Accept precise validation evidence at closeout.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
