## req_310_make_the_board_filters_answer_with_what_the_board_actually_shows - Make the board filters answer with what the board actually shows
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: One filtering authority, and a count that matches the board
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Let a filter return the documents it names, on a repository where the work is finished.
- Let the count above the board mean the board.
- Let a status option that can return nothing say so before it is chosen.
- Let the campaign catch a filter that lies, which it currently cannot.

# Context
- Reported from use: no board filter gives the right result. Measured by driving the viewer through the campaign's browser machinery over all thirty-four filter combinations.
- Two filtering systems are applied in series. The panel -- type, status, relations, activity, focus -- is evaluated first, then five inherited checkboxes: hide completed, hide processed requests, hide specs, show companion docs, hide empty columns. Selecting anything in the panel re-arms all five, so the inherited set is never actually out of the way.
- This repository holds 1311 documents whose only statuses are Done (1226) and Settled (85): every piece of work is finished. Hiding completed documents therefore empties the board for the entire workflow half of the corpus.
- The count and the board disagree because they ask different questions. The count filters the item list through the panel predicate alone; the board filters through the panel predicate and then the inherited checkboxes. Type workflow reports 1226 documents shown above a board rendering none. Type request reports 308 and renders none. Type backlog reports 618 and renders none.
- The intent was already written down. The chrome computes whether the local viewer's panel is present and, when it is, deliberately ignores the inherited toggles -- but only when deciding whether to light up the filter button. The visibility path never received the same treatment.
- Two narrower defects sit behind the same panel. The status option Done counts 1311 rather than 1226, because that branch asks whether a document is closed instead of whether its status is Done, so Settled documents answer yes. And the status options that return nothing here return nothing because no document carries that status, which is correct and indistinguishable from a broken filter.
- The campaign did not catch any of this: it asserts that the board is not blank, never that a filter returns what it names. The disagreement between the count and the board is the sharpest available probe, and nothing looks at it.

# Acceptance criteria
- AC1: One authority decides whether a document is shown; a panel selection is not undone by an inherited toggle.
- AC2: The count above the board is produced by the same predicate the board uses, and states the number of cards the board would render.
- AC3: On a corpus where every document is finished, a type or status selection returns the documents it names.
- AC4: The status option Done selects documents whose status is Done, distinctly from documents that are merely closed.
- AC5: A status option that can return nothing says so before it is chosen, rather than looking like a broken filter.
- AC6: The extension webview, which has no panel, keeps filtering exactly as it does today.
- AC7: The campaign fails when the count and the board disagree, and when a filter returns documents it did not name.
- AC8: Each behavior above leaves behind a test that fails against the current implementation.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_058_a_filter_that_means_the_board`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_057_a_viewer_campaign_that_reports_what_it_saw.md
- logics/product/prod_053_one_workflow_signal_every_logics_surface.md
- clients/viewer/src/browser-host/index.js
- clients/shared-web/media/webviewSelectors.js
- clients/shared-web/media/webviewChrome.js

# AI Context
- Summary: Make the board filters answer with what the board actually shows
- Keywords: request-chain-scaffold, make the board filters answer with what the board actually shows, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make the board filters answer with what the board actually shows.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_619_give_the_viewer_one_filtering_authority`
- `item_620_make_the_count_above_the_board_describe_the_board`
- `item_621_say_what_a_status_option_selects_and_what_it_would_return`
- `item_622_let_the_campaign_catch_a_filter_that_lies`
