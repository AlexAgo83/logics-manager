## item_816_say_the_board_is_loading_instead_of_saying_the_project_is_empty - Say the board is loading instead of saying the project is empty
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Arrival
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: say, board, loading, instead, saying, project, empty
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The board shows its empty-state placeholder while the first payload is still in flight, so arriving on a project asserts that it holds no documents at the moment nothing is known about it.
- This is the screen an operator reaches first and returns to most, so it is also the viewer's most-seen statement -- and it is the one place the viewer says something false rather than saying it does not know yet.

# Scope
- In:
  - Distinguish 'no payload yet' from 'a payload arrived and is empty', and show the empty state only for the second.
  - Fill the space the board has while loading, rather than putting a small indicator in a large blank.
  - Draw what is coming -- the columns and rows the payload will fill -- so the layout does not jump when the real content replaces it.
  - A reduced-motion fallback, like every other loading affordance in the viewer.
- Out:
  - Loading states for screens other than the board.
  - Changing what the genuine empty state says.

# Acceptance criteria
- AC1: Before any payload arrives the board states that it is loading and never that the project is empty.
- AC2: The real content replaces the loading state without the layout shifting.
- AC3: A project that genuinely holds no documents still reaches the empty state it has today.
- AC4: Under `prefers-reduced-motion: reduce` the loading state does not animate.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Before any payload arrives the board states that it is loading and never that the project is empty.
- request-AC2 -> This backlog slice. Proof: AC2: The real content replaces the loading state without the layout shifting.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_098_a_board_that_tells_the_truth_while_it_is_still_loading`
- Architecture decision(s): (none yet)
- Request: `req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents`
- Primary task(s): `task_378_orchestrate_the_board_arrival_and_runbook_document_work`

# Priority
- Priority: High - the screen states something false, on the screen reached first
- Rationale: Set by scaffold input or defaulted for grooming.
