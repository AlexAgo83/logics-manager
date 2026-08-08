## item_619_give_the_viewer_one_filtering_authority - Give the viewer one filtering authority
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: One filtering authority
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Applying a panel selection re-arms the five inherited checkboxes, and the visibility path then applies both systems in series. Hiding completed documents is among them, so on a corpus whose documents are all finished the board is emptied by the act of filtering it.
- The chrome already computes that the inherited toggles should be ignored when the local viewer's panel is present, but uses that answer only to decide whether the filter button looks active. The visibility path never received it, which is the whole defect.

# Scope
- In:
  - Pass the same panel-is-present answer to the visibility path that the chrome already computes for the filter button.
  - Stop re-arming the inherited toggles on every panel selection.
  - Keep the inherited toggles authoritative in the extension webview, which has no panel.
  - Cover a finished corpus in a test: every document Done or Settled, a type selection, and the documents it names coming back.
- Out:
  - Removing the inherited toggles.
  - Adding or renaming filter dimensions.
  - Changing grouping, sorting, or paging.

# Acceptance criteria
- AC1: A panel selection is not undone by an inherited toggle.
- AC2: On a corpus of finished documents, selecting a workflow type returns those documents.
- AC3: With no panel present, filtering behaves exactly as it does today, shown by the existing webview tests passing unchanged.
- AC4: A test builds a finished corpus and fails against the current implementation.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `does not let an inherited toggle undo a panel selection` in `tests/webview.filter-authority.test.ts`.
- request-AC3 -> This backlog slice. Proof: the same test drives a corpus whose documents are all Done or Settled; measured against the running viewer, type workflow went from 0 rendered cards to the documents it names.
- request-AC6 -> This backlog slice. Proof: `keeps the inherited toggles authoritative where there is no panel` in the same file, plus the 180 existing browser-host tests passing.
- request-AC8 -> This backlog slice. Proof: the six tests in `tests/webview.filter-authority.test.ts`; five fail against the previous implementation.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_058_a_filter_that_means_the_board`
- Architecture decision(s): (none yet)
- Request: `req_310_make_the_board_filters_answer_with_what_the_board_actually_shows`
- Primary task(s): `task_307_orchestrate_the_board_filter_corrections`

# AI Context
- Summary: Give the viewer one filtering authority
- Keywords: scaffolded-backlog, give the viewer one filtering authority, implementation-ready
- Use when: Implementing the scaffolded slice for Give the viewer one filtering authority.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the board is unusable on a finished corpus
- Rationale: Set by scaffold input or defaulted for grooming.
