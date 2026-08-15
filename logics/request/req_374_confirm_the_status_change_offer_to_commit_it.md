## req_374_confirm_the_status_change_offer_to_commit_it - Confirm the status change, offer to commit it
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: One deliberate step instead of two
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 18:51:18

# AI Context
- Summary: A status change and its commit are one operator intent most of the time; the status modal states what will change and offers to commit it right there, wired to the git-commit route that already exists.
- Keywords: confirm, status, change, offer, commit
- Use when: Touching the status control's modal flow or its wiring to git commit.
- Skip when: The confirmation is for something other than a document status change, or a CLI/MCP surface.

# Needs
- As an operator changing a document's status from the viewer, I need to see what will change -- which document, old status, new status -- before it lands, not after.
- As an operator, I need to commit that status change right from the same confirmation, with a sensible default message, or decline and leave it uncommitted for a later batched commit.
- As an operator, I need this to feel like one deliberate step, not a status pick followed by a separate trip to the git panel to commit it.

# Context
- The status control (`changeCurrentDocumentStatus` in `clients/viewer/src/browser-host/index.js`) already shows a choice modal (`showThemedChoiceModal`) to pick the new status, then calls the update-status route and applies it immediately -- there is no confirmation step and no offer to commit.
- The git-commit route already exists and is used elsewhere in the viewer (e.g. committing generated docs): it takes a list of file paths and a message and returns a commit result. This request wires the status-change flow to that existing route rather than building a second commit mechanism.
- The viewer already has themed modal primitives for this shape of interaction: `showThemedChoiceModal`, `showThemedConfirmModal`, `showThemedInputModal` in `clients/viewer/src/browser-host/render.js`, and a single-action gate (`withPrimaryAction`) that already wraps the status button's click handler.
- Other confirmations already exist in the viewer (restart, closeout) as a precedent for this shape of modal, themed consistently.
- This is viewer-only: the CLI and MCP tools already return structured payloads with no confirmation UX, and are out of scope.

# Acceptance criteria
- AC1: Before a status change is applied, the operator sees the document, its current status, and the status it would become.
- AC2: From that same step, the operator can commit the change immediately with a proposed default commit message, or apply without committing.
- AC3: Declining to commit still applies the status change; it only skips the commit.
- AC4: The status pick and the commit decision are one modal flow, not a status modal followed by a second confirmation modal.
- AC5: A commit that fails (e.g. nothing staged, git error) reports why and leaves the status change applied -- a failed commit does not roll back a status that already changed.
- AC6: The existing single-action gate around the status control still holds: the flow cannot be triggered twice concurrently.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_105_one_step_not_two_for_a_status_change_that_should_be_committed`
- Architecture decision(s): (none yet)

# References
- clients/viewer/src/browser-host/index.js
- clients/viewer/src/browser-host/render.js
- logics_manager/viewer.py

# Backlog
- `item_843_show_what_a_status_change_will_do_before_it_lands`
- `item_844_offer_to_commit_the_status_change_right_there`
