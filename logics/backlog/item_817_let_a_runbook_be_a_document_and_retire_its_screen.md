## item_817_let_a_runbook_be_a_document_and_retire_its_screen - Let a runbook be a document, and retire its screen
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: One way to read a document
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: let, runbook, document, retire, screen
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- Runbooks are already documents in the payload and already have a stage colour, but `getStageHeading` has no case for them -- so a runbook group is headed by the raw stage name -- and the stage is not treated as a companion, so runbooks never reach the reference index.
- They also have a screen of their own. item_792 moved it under Corpus and a later wave gave it a loading state; neither was wrong at the time, but the screen is what should not exist. Every other companion kind is read the same way as the rest of the corpus.

# Scope
- In:
  - Give the runbook stage a heading and treat it as a companion kind, so runbooks appear on the board and in the list beside product briefs, roadmaps and architecture decisions.
  - Delete the Runbooks screen, its navigation entry, its entry in the Corpus switcher, and the code that only existed to render it.
  - Leave the bounded runbook lookup alone: `/api/runbooks` and `match_runbooks` answer a different question, for agents rather than for this screen.
- Out:
  - Changing what a runbook document contains, or how lint and audit treat it.
  - Removing the runbook kind from the CLI or the MCP surface.

# Acceptance criteria
- AC1: A runbook appears on the board and in the list with its own heading and its own stage colour.
- AC2: No route, navigation entry or switcher entry reaches a Runbooks screen, and none of its rendering code is left behind unused.
- AC3: The bounded runbook lookup still answers, and its tests still pass unchanged.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A runbook appears on the board and in the list with its own heading and its own stage colour.
- request-AC4 -> This backlog slice. Proof: AC2: No route, navigation entry or switcher entry reaches a Runbooks screen, and none of its rendering code is left behind unused.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_098_a_board_that_tells_the_truth_while_it_is_still_loading`
- Architecture decision(s): (none yet)
- Request: `req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents`
- Primary task(s): `task_378_orchestrate_the_board_arrival_and_runbook_document_work`

# Priority
- Priority: High - mostly deletion, and it removes a whole surface
- Rationale: Set by scaffold input or defaulted for grooming.
