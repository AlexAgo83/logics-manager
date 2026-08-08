## item_620_make_the_count_above_the_board_describe_the_board - Make the count above the board describe the board
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: One number, one meaning
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The count filters the item list through the panel predicate alone, while the board filters through the panel predicate and then the inherited checkboxes. The two answers are computed in different modules from different inputs, so nothing forces them to agree.
- They do not: type workflow reports 1226 documents shown above a board rendering none, type request reports 308 with none, type backlog reports 618 with none. The number is the surface an operator trusts to know whether a filter worked.

# Scope
- In:
  - Produce the count from the same predicate the board uses.
  - State what the board would render, distinct from the cards currently paged in.
  - Cover the agreement in a test, and have the campaign assert it on every run.
- Out:
  - Changing the wording of the summary beyond what the numbers require.
  - Changing the page size or the show-more behavior.

# Acceptance criteria
- AC1: The count and the board are produced by one predicate.
- AC2: For every filter combination, the count equals the number of documents the board would render.
- AC3: The count remains distinguishable from the number of cards currently paged in.
- AC4: A test asserts the agreement across the filter combinations and fails against the current implementation.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: `counts what the board renders, not what the panel alone would allow` and `agrees with the board for every panel selection, including one that allows nothing` in `tests/webview.filter-authority.test.ts`.
- request-AC7 -> This backlog slice. Proof: the count is produced by `window.__CDX_LOGICS_VISIBLE_COUNT__`, which filters through the board's own `isVisible`; the campaign check lands with `item_622`.
- request-AC8 -> This backlog slice. Proof: both tests fail against the previous implementation.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_058_a_filter_that_means_the_board`
- Architecture decision(s): (none yet)
- Request: `req_310_make_the_board_filters_answer_with_what_the_board_actually_shows`
- Primary task(s): `task_307_orchestrate_the_board_filter_corrections`

# AI Context
- Summary: Make the count above the board describe the board
- Keywords: scaffolded-backlog, make the count above the board describe the board, implementation-ready
- Use when: Implementing the scaffolded slice for Make the count above the board describe the board.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the surface that reports the filter contradicts it
- Rationale: Set by scaffold input or defaulted for grooming.
