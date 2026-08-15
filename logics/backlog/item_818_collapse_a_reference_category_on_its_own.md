## item_818_collapse_a_reference_category_on_its_own - Collapse a reference category on its own
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Reading one category at a time
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: collapse, reference, category, own
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The reference index collapses as a whole but its per-category groups do not, so a reader who wants one category scrolls past all of them.
- The affordance already exists one level up, so the index teaches a gesture it then refuses at the level where it is most useful.

# Scope
- In:
  - Each category header collapses and expands its own group, using the affordance the index header already uses.
  - Remember the state for the session, as the index header's own state is remembered.
  - Keyboard reachable and announced, like the header it copies.
- Out:
  - Changing which categories exist or what they contain.
  - Persisting the state across viewer restarts.

# Acceptance criteria
- AC1: Each reference category collapses and expands independently of the others.
- AC2: The state survives a re-render of the board within the session.
- AC3: The control is reachable and announced the way the index header is.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Each reference category collapses and expands independently of the others.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_098_a_board_that_tells_the_truth_while_it_is_still_loading`
- Architecture decision(s): (none yet)
- Request: `req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents`
- Primary task(s): `task_378_orchestrate_the_board_arrival_and_runbook_document_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_378_orchestrate_the_board_arrival_and_runbook_document_work` was finished via `logics-manager flow finish task` on 2026-08-15.
