## item_844_offer_to_commit_the_status_change_right_there - Offer to commit the status change right there
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: The commit is offered, not a separate errand
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The status-change flow offers to commit the change immediately through the existing git-commit route, with a default message; declining still applies the status change.
- Keywords: offer, commit, status, change, right
- Use when: Wiring the status-change flow to a commit, or changing what happens after a status is applied.
- Skip when: What the status modal shows before applying -- that is item_843.

# Problem
- `/api/git-commit` exists and already commits a document by path and message elsewhere in the viewer, but the status-change flow does not offer it: applying a status change and committing it are two unrelated trips through the UI today.
- A commit can fail (nothing staged, a git error) after the status change has already been written to disk; the flow must say why it failed without implying the status change itself failed.

# Scope
- In:
  - From the same status-change step, let the operator commit the change immediately with a proposed default message, or apply without committing.
  - Wire the commit action to the existing `/api/git-commit` route with the changed document's path.
  - Report a failed commit clearly, leaving the applied status change as-is.
  - Keep the existing single-action gate (`withPrimaryAction`) around the whole flow so it cannot run twice concurrently.
- Out:
  - Batching other pending changes into the same commit.
  - A commit message editor beyond a sensible, overridable default.

# Acceptance criteria
- AC1: Choosing to commit calls the existing `/api/git-commit` route with the changed document and a default message.
- AC2: Declining to commit still applies the status change; nothing is committed and no error is shown.
- AC3: A failed commit reports why, and the status change remains applied.
- AC4: The whole flow (status pick through commit decision) is still guarded by the existing single-action gate.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Choosing to commit calls the existing `/api/git-commit` route with the changed document and a default message.
- request-AC3 -> This backlog slice. Proof: AC2: Declining to commit still applies the status change; nothing is committed and no error is shown.
- request-AC5 -> This backlog slice. Proof: AC3: A failed commit reports why, and the status change remains applied.
- request-AC6 -> This backlog slice. Proof: AC4: The whole flow (status pick through commit decision) is still guarded by the existing single-action gate.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_105_one_step_not_two_for_a_status_change_that_should_be_committed`
- Architecture decision(s): (none yet)
- Request: `req_374_confirm_the_status_change_offer_to_commit_it`
- Primary task(s): `task_385_orchestrate_the_status_confirm_and_commit_work`

# Priority
- Priority: High - the commit offer is the second half of the same interaction
- Rationale: Set by scaffold input or defaulted for grooming.
