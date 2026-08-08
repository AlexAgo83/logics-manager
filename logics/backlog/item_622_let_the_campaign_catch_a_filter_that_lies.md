## item_622_let_the_campaign_catch_a_filter_that_lies - Let the campaign catch a filter that lies
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Campaign coverage
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 17:47:31

# Problem
- The campaign asserts that the board is not blank and that a document opens. It never asserts that a filter returns what it names, so it ran green through a board that renders nothing under four of its own type options.
- The disagreement between the count and the board is the sharpest probe available and costs one assertion, and the campaign is where it belongs: it is the only check that drives the real interface.

# Scope
- In:
  - Assert that the count and the board agree, at each swept viewport.
  - Walk the filter options read from the interface and assert each returns only documents it names.
  - Report each as a named check with its measured value, like the rest of the campaign.
  - Keep the run bounded: the sweep must not turn the campaign into a long job.
- Out:
  - Asserting specific document counts, which change with the corpus.
  - Driving the extension webview, which the campaign does not launch.
  - Fixing any defect these checks find, which belongs to the slices above.

# Acceptance criteria
- AC1: A campaign run asserts the count agrees with the board, per viewport.
- AC2: It walks the filter options read from the interface, not a hand-written list.
- AC3: A filter returning a document it did not name is reported with the measured value.
- AC4: The added checks fail against the current implementation and leave the run under its current duration.
- AC5: The new checks appear in the runbook's coverage table.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: `the count agrees with the board` and `a filter returns only what it names` in `tests/helpers/viewer-filter-checks.mjs`, run by the campaign at each viewport; against the pre-fix viewer the first reports `type=request announced 310 above an empty board` and the run exits non-zero.
- request-AC8 -> This backlog slice. Proof: the five tests in `tests/viewer.filter-checks.test.ts`, including `walks the type options read from the control, not a list of its own`.
- request-AC1 -> This backlog slice. Evidence needed: One authority decides whether a document is shown; a panel selection is not undone by an inherited toggle.
- request-AC2 -> This backlog slice. Evidence needed: The count above the board is produced by the same predicate the board uses, and states the number of cards the board would render.
- request-AC3 -> This backlog slice. Evidence needed: On a corpus where every document is finished, a type or status selection returns the documents it names.
- request-AC4 -> This backlog slice. Evidence needed: The status option Done selects documents whose status is Done, distinctly from documents that are merely closed.
- request-AC5 -> This backlog slice. Evidence needed: A status option that can return nothing says so before it is chosen, rather than looking like a broken filter.
- request-AC6 -> This backlog slice. Evidence needed: The extension webview, which has no panel, keeps filtering exactly as it does today.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_058_a_filter_that_means_the_board`
- Architecture decision(s): (none yet)
- Request: `req_310_make_the_board_filters_answer_with_what_the_board_actually_shows`
- Primary task(s): `task_307_orchestrate_the_board_filter_corrections`

# AI Context
- Summary: Let the campaign catch a filter that lies
- Keywords: scaffolded-backlog, let the campaign catch a filter that lies, implementation-ready
- Use when: Implementing the scaffolded slice for Let the campaign catch a filter that lies.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the campaign ran green through every defect above
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_307_orchestrate_the_board_filter_corrections`

# Notes
- Task `task_307_orchestrate_the_board_filter_corrections` was finished via `logics-manager flow finish task` on 2026-08-08.
