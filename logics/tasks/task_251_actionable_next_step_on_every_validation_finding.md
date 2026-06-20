## task_251_actionable_next_step_on_every_validation_finding - Actionable next-step on every validation finding
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_459_actionable_next_step_on_every_validation_finding`

# Acceptance criteria
- AC3: Every relevant finding carries an actionable next step: deferred findings say "expected until task closeout"; deterministically-fixable findings include the exact repair command (e.g. `flow validate <refs> --apply-fixes --proof "..."`); human-required findings state what is needed.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_251_actionable_next_step_on_every_validation_finding.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement actionable next-step on every validation finding.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_261_make_logics_validation_findings_lifecycle_aware_and_actionable`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
