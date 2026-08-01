## item_576_accept_precise_validation_evidence_at_closeout - Accept precise validation evidence at closeout
> From version: 2.19.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
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
- request-AC2 -> This backlog slice. Evidence needed: Roadmap validation reports every `##` heading it did not parse as a milestone, naming the heading, instead of silently lowering the count.
- request-AC3 -> This backlog slice. Evidence needed: No scaffolded document asserts work that has not happened. A freshly scaffolded task at zero progress contains no completion claim in any section.
- request-AC4 -> This backlog slice. Evidence needed: Scaffolded AC traceability is derived from `backlog_items[].request_acs` in the scaffold input, mapping each request AC to the backlog item that claims it.
- request-AC5 -> This backlog slice. Evidence needed: Scaffolding reports every request acceptance criterion claimed by no backlog item, at scaffold time rather than at review time.
- request-AC6 -> This backlog slice. Evidence needed: Scaffolded `# Validation` carries one line that cannot be mistaken for evidence, and that the `validation_evidence_missing` gate still rejects.
- request-AC8 -> This backlog slice. Evidence needed: `flow companion architecture` and `flow companion product` produce documents that pass `logics-manager lint` immediately, with no missing indicator.
- request-AC9 -> This backlog slice. Evidence needed: Companion bodies contain no content about any product other than the one named in the invocation, and every placeholder is impossible to mistake for content.
- request-AC10 -> This backlog slice. Evidence needed: `sync update-indicators` validates the requested indicators against the target document kind, and its error names the set that kind accepts.
- request-AC11 -> This backlog slice. Evidence needed: A semantic body edit that does not change status can be re-baselined without changing any indicator value and without labelling the edit non-semantic.
- request-AC12 -> This backlog slice. Evidence needed: Indicator values are written in the same format the templates use, so a corpus never mixes two forms for one indicator.
- request-AC13 -> This backlog slice. Evidence needed: Reference extraction ignores references inside fenced code blocks and inline code spans, so a document can quote a reference without creating a link.
- request-AC14 -> This backlog slice. Evidence needed: Every reference accepted by `flow validate` is accepted by every other command that takes a reference, or the error names the kind restriction rather than reporting the document as missing.
- request-AC15 -> This backlog slice. Evidence needed: Every audit finding that names a repair command is fixed by that command, or the finding no longer names one.
- request-AC16 -> This backlog slice. Evidence needed: `logics-manager index`, `flow start` and `flow progress` each report what they actually changed, including no-ops and documents modified beyond the one named.
- request-AC17 -> This backlog slice. Evidence needed: The status vocabulary and the scaffold input enums are discoverable without triggering a failure, and the documented key list matches the accepted key set.
- request-AC18 -> This backlog slice. Evidence needed: `logics-manager flow list` produces a listing in the default form shown as the first example in its own help text.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- `has_validation_evidence` matches failure words rather than substrings, with negated forms excluded, so "0 failures" is accepted; weak evidence still rejected; the repair hint no longer suggests a string containing its own rejection marker; closeout distinguishes rolled-back writes.

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

# Tasks
- `task_297_orchestrate_agent_facing_correctness_remediation`

# Notes
- Task `task_297_orchestrate_agent_facing_correctness_remediation` was finished via `logics-manager flow finish task` on 2026-08-01.
