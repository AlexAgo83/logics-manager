## task_385_orchestrate_the_status_confirm_and_commit_work - Orchestrate the status-confirm-and-commit work
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claude
> Indicators reviewed: 2026-08-15 18:40:09

# AI Context
- Summary: Sequences the status-confirm-and-commit work: state the change before it lands, then offer to commit it.
- Keywords: orchestration, status change, commit offer
- Use when: Implementing this task.
- Skip when: Changing what statuses are legal, or building a CLI/MCP confirmation UX.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Show what a status change will do before it lands, in the same modal flow the status picker already uses.
- [ ] 2. Offer to commit it right there, wired to the existing git-commit route, without blocking a declined commit from applying the status change.
- [ ] 3. Verify the single-action gate still holds across the combined flow.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_843_show_what_a_status_change_will_do_before_it_lands`
- `item_844_offer_to_commit_the_status_change_right_there`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_843_show_what_a_status_change_will_do_before_it_lands`. Proof deferred to slice closeout.
- request-AC4 -> `item_843_show_what_a_status_change_will_do_before_it_lands`. Proof deferred to slice closeout.
- request-AC2 -> `item_844_offer_to_commit_the_status_change_right_there`. Proof deferred to slice closeout.
- request-AC3 -> `item_844_offer_to_commit_the_status_change_right_there`. Proof deferred to slice closeout.
- request-AC5 -> `item_844_offer_to_commit_the_status_change_right_there`. Proof deferred to slice closeout.
- request-AC6 -> `item_844_offer_to_commit_the_status_change_right_there`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_374_confirm_the_status_change_offer_to_commit_it`
- Product brief(s): `prod_105_one_step_not_two_for_a_status_change_that_should_be_committed`
- Architecture decision(s): (none yet)
