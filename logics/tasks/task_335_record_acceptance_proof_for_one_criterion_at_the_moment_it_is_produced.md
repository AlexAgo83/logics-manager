## task_335_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced - Record acceptance proof for one criterion at the moment it is produced
> From version: 2.21.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Implement record acceptance proof for one criterion at the moment it is produced.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_699_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced`

# Acceptance criteria
- AC1: Proof can be recorded for a single named acceptance criterion of a task, at any point in that task's life, without closing anything and without touching the other criteria.
- AC2: A record captures the command that was run and its result alongside the summary, so a reader can tell verification from assertion.
- AC3: Records accumulate rather than replace: capturing proof twice for one criterion keeps both, in order, since a re-run after a fix is the common case and the second result is not always the interesting one.
- AC4: At closeout, recorded proof composes the traceability entry for each criterion that has one; criteria without a record behave exactly as they do today.
- AC5: The existing whole-request `--proof` commands are unchanged in behaviour and remain available.
- AC6: Tests cover capture for one criterion, accumulation across two captures, composition at closeout, a task where no proof was captured, and the absence of any lifecycle change from a capture.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_335_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_335_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced.md` after implementation.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_338_record_acceptance_proof_for_one_criterion_at_the_moment_it_is_produced`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
