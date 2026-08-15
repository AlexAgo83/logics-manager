## task_385_orchestrate_the_status_confirm_and_commit_work - Orchestrate the status-confirm-and-commit work
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claude
> Indicators reviewed: 2026-08-15 18:51:14

# AI Context
- Summary: Sequences the status-confirm-and-commit work: state the change before it lands, then offer to commit it.
- Keywords: orchestration, status change, commit offer
- Use when: Implementing this task.
- Skip when: Changing what statuses are legal, or building a CLI/MCP confirmation UX.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Show what a status change will do before it lands, in the same modal flow the status picker already uses.
- [x] 2. Offer to commit it right there, wired to the existing git-commit route, without blocking a declined commit from applying the status change.
- [x] 3. Verify the single-action gate still holds across the combined flow.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_843_show_what_a_status_change_will_do_before_it_lands`
- `item_844_offer_to_commit_the_status_change_right_there`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_843_show_what_a_status_change_will_do_before_it_lands`. Proof deferred to slice closeout.
- request-AC4 -> `item_843_show_what_a_status_change_will_do_before_it_lands`. Proof deferred to slice closeout.
- request-AC2 -> `item_844_offer_to_commit_the_status_change_right_there`. Proof deferred to slice closeout.
- request-AC3 -> `item_844_offer_to_commit_the_status_change_right_there`. Proof deferred to slice closeout.
- request-AC5 -> `item_844_offer_to_commit_the_status_change_right_there`. Proof deferred to slice closeout.
- request-AC6 -> `item_844_offer_to_commit_the_status_change_right_there`. Proof deferred to slice closeout.
- request-AC1 -> This task. Proof: item_843 -- showStatusChangeModal's preview line states the document, current status, and requested status before Update status is clicked (test_shows_the_status_change_preview_live_and_updates_the_default_commit_message).
- request-AC2 -> This task. Proof: item_844 -- the same modal's commit checkbox, checked by default, commits through /api/git-commit with a proposed message; unchecking it applies the status change without committing (test_changes_status_from_the_opened_document_header_and_refreshes_the_preview, test_declining_the_commit_still_applies_the_status_change_and_commits_nothing).
- request-AC3 -> This task. Proof: declining the checkbox skips the commit call entirely -- the status change already applied stands untouched (test_declining_the_commit_still_applies_the_status_change_and_commits_nothing).
- request-AC4 -> This task. Proof: one showStatusChangeModal instance carries both the status select and the commit checkbox/message -- no second modal is opened at any point in the flow.
- request-AC5 -> This task. Proof: a failed /api/git-commit reports why and the status change (already written via /api/update-status before the commit is attempted) stays applied (test_reports_a_failed_commit_without_touching_the_status_change_already_applied).
- request-AC6 -> This task. Proof: the status button's click handler is still wrapped in withPrimaryAction("change-document-status", ...), unchanged by this work.

# Validation
- (no validation recorded yet)

# Report
- Both backlog slices landed: item_843 (the existing status choice modal now states doc/old status/new status live, one modal, no second confirm) and item_844 (the same modal offers to commit through the existing /api/git-commit route, defaulting on, with a decline or a failed commit never touching the status change already applied). The withPrimaryAction gate around the status button is untouched. vitest: 967 passed.

# Links
- Request: `req_374_confirm_the_status_change_offer_to_commit_it`
- Product brief(s): `prod_105_one_step_not_two_for_a_status_change_that_should_be_committed`
- Architecture decision(s): (none yet)
