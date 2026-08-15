## item_843_show_what_a_status_change_will_do_before_it_lands - Show what a status change will do before it lands
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Low
> Theme: See it before it lands
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 18:40:09

# AI Context
- Summary: The existing status choice modal states the document, its current status, and the requested status before applying anything -- one modal, not a choice modal plus a second confirm.
- Keywords: show, status, change, before, lands
- Use when: Touching what the status modal displays or when it applies the change.
- Skip when: The commit offer itself -- that is item_844.

# Problem
- `changeCurrentDocumentStatus` picks a new status via `showThemedChoiceModal` and applies it immediately through `/api/update-status` -- there is no step where the operator confirms the document, old status, and new status before it changes.
- Adding a second, separate confirmation modal after the choice would turn one status change into two clicks through two modals, which is the opposite of what this request is for.

# Scope
- In:
  - Extend the existing status choice flow so the same step states the document, its current status, and the status being requested before it applies.
  - Keep this to one modal interaction, not a choice modal followed by a confirm modal.
  - Reuse the existing themed modal primitives; do not add a new modal system.
- Out:
  - The commit offer itself -- that is the next slice.
  - Changing which statuses are offered or how they are computed.

# Acceptance criteria
- AC1: The document, its current status, and the requested status are all visible before the change is applied.
- AC2: This is the same modal flow the status picker already uses, not an added second modal.
- AC3: Cancelling at this step leaves the status unchanged, exactly as today.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The document, its current status, and the requested status are all visible before the change is applied.
- request-AC4 -> This backlog slice. Proof: AC2: This is the same modal flow the status picker already uses, not an added second modal.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_105_one_step_not_two_for_a_status_change_that_should_be_committed`
- Architecture decision(s): (none yet)
- Request: `req_374_confirm_the_status_change_offer_to_commit_it`
- Primary task(s): `task_385_orchestrate_the_status_confirm_and_commit_work`

# Priority
- Priority: High - the confirmation is the point of the request
- Rationale: Set by scaffold input or defaulted for grooming.

# Validation
- Extended the existing status choice modal (showStatusChangeModal in render.js) with a live preview line -- "<doc>: <old> → <new>" -- updated on select change, instead of adding a second modal. Covered by test_shows_the_status_change_preview_live_and_updates_the_default_commit_message and the existing changes-status test, which still exercises the same .viewer-themed-modal__select control; cancel/escape behavior unchanged.
