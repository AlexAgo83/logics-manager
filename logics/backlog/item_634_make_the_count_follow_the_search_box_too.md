## item_634_make_the_count_follow_the_search_box_too - Make the count follow the search box too
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: One number, every filter
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 00:47:55

# Problem
- Typing a query narrowed the board to nine cards while the count kept reading 1337 of 1337 docs shown. The per-column counts were right; the global one was not recomputed at all.
- The count was already made to ask the board's own predicate, and the search box is part of that predicate. What is missing is that nothing recomputes it when the query changes.
- The campaign is green on this because its count-versus-board check walks the filter selects and never types anything.

# Scope
- In:
  - Recompute the count when the query changes, through the same predicate the board uses.
  - Extend the campaign's count-versus-board check to drive the search box as well as the selects.
  - Keep the per-column counts as they are, since they are already correct.
- Out:
  - Changing how search matches.
  - Changing the wording of the count beyond what the numbers require.
  - Debouncing or otherwise altering the search's timing.

# Acceptance criteria
- AC1: With a query typed, the count equals what the board renders.
- AC2: Clearing the query returns the count to the unfiltered total.
- AC3: The campaign drives the search box and fails when the count disagrees with the board.
- AC4: A test covers the query path and fails against the current implementation.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: `the count follows the search box` in `tests/helpers/viewer-filter-checks.mjs`, run by the campaign at each viewport; against the previous implementation it reports `the count stayed at 1360 while the query narrowed the board to 50 card(s)`.
- request-AC6 -> This backlog slice. Proof: the same check, plus `reports a count that ignores the search box` in `tests/viewer.filter-checks.test.ts`.
- request-AC7 -> This backlog slice. Proof: `skips the search check when there is no search box` pins that the check degrades rather than failing where there is nothing to type in.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_062_say_what_just_happened`
- Architecture decision(s): (none yet)
- Request: `req_314_close_what_the_attended_tour_found_say_what_is_unavailable_count_what_is_shown_report_when_a_screen_is_done`
- Primary task(s): `task_311_orchestrate_the_attended_tour_findings`

# AI Context
- Summary: Make the count follow the search box too
- Keywords: scaffolded-backlog, make the count follow the search box too, implementation-ready
- Use when: Implementing the scaffolded slice for Make the count follow the search box too.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the same defect as the filter panel, on the path nothing checked
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_311_orchestrate_the_attended_tour_findings`

# Notes
- Task `task_311_orchestrate_the_attended_tour_findings` was finished via `logics-manager flow finish task` on 2026-08-09.
