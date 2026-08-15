## item_819_make_getting_started_s_stage_list_say_something - Make Getting Started's stage list say something
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Counts that say something
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: getting, started, stage, list, say, something
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The stage nav lists four bare totals -- 471, 815, 371, 30 -- with no scale and no action attached. A reader cannot tell whether 815 is a lot, and one of the counts spans a stage boundary its label does not name.
- item_753 added them to orient rather than to grade, and as bare numbers they do neither.

# Scope
- In:
  - Decide what each entry is asserting before restyling it: a total, a share, or how much is open.
  - Say it in a form a reader can act on, and name what the number covers when it spans more than its label.
- Out:
  - Changing the four stages or the guide's prose.
  - Adding a chart: this is a four-line list.

# Acceptance criteria
- AC1: Each entry states what its number measures, and covers exactly what its label names.
- AC2: A reader can tell from the entry whether it is worth opening, without opening it.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: Each entry states what its number measures, and covers exactly what its label names.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_098_a_board_that_tells_the_truth_while_it_is_still_loading`
- Architecture decision(s): (none yet)
- Request: `req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents`
- Primary task(s): `task_378_orchestrate_the_board_arrival_and_runbook_document_work`

# Priority
- Priority: Low
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_378_orchestrate_the_board_arrival_and_runbook_document_work` was finished via `logics-manager flow finish task` on 2026-08-15.
