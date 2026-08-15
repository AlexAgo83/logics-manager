## req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents - Make the project view honest on arrival, and let runbooks be documents
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 13:13:44

# AI Context
- Summary: The board shows its empty-state placeholder while the first payload is still in flight, so the screen an operator reaches first asserts the project holds nothing at the moment nothing is known. Runbooks are already documents in the payload with their own colour, but have no stage heading, never reach the reference index, and carry a screen of their own that no other companion kind needs.
- Keywords: board loading state, empty state, runbook documents, reference index, collapse category, getting started counts
- Use when: Changing what the board shows before its first payload, or how a companion document kind reaches the board.
- Skip when: The bounded runbook lookup agents use -- the screen goes, the route stays.

# Needs
- As an operator arriving on a project, I need the board to say it is loading rather than to say the project is empty, and to use the space it has while it does.
- As an operator, I need a runbook to be a document among the others -- on the board and in the list, beside product briefs, roadmaps and architecture decisions -- rather than a screen of its own.
- As an operator reading the reference index, I need to collapse a category I am not looking at, the way the index itself already collapses.
- As an operator reading Getting Started, I need its stage list to say something I can act on rather than four bare totals.

# Context
- The board renders an empty-state placeholder while the first payload is still in flight, so arriving on a project states that it holds no documents at the moment nothing is known about it. It is the screen an operator reaches first and most often, and the one place the viewer currently asserts something false rather than saying it does not know yet.
- Runbooks are already documents in the payload -- `/api/items` returns them with `stage: "runbook"`, and this corpus has two -- and the stage already has a colour token that the card accent picks up since item_811. What is missing is that `getStageHeading` has no `runbook` case, so the heading falls back to the raw stage name, and the stage is not treated as a companion, so it never reaches the reference index.
- Runbooks also have a screen of their own, moved under Corpus by item_792 and given a loading state by a later wave. Neither was wrong at the time; the screen itself is what should not exist, since every other companion kind is read the same way as the rest of the corpus.
- The bounded, ranked runbook lookup (`/api/runbooks`, the `match_runbooks` MCP tool) answers a different question and is used by agents rather than by this screen. It stays.
- The reference index collapses as a whole (`companionIndexOpen` in renderBoardApp.js) but its per-category groups do not, so a reader who wants one category still scrolls past all of them.
- Getting Started's stage nav lists four totals -- 471, 815, 371, 30 -- with no scale and no action attached. item_753 added them to orient rather than to grade, and as bare numbers they do neither: a reader cannot tell whether 815 is a lot, and the count spans a stage boundary the label does not name.

# Acceptance criteria
- AC1: While the first payload is in flight the board says it is loading and does not claim the project is empty; the empty state appears only once a payload has arrived and is genuinely empty.
- AC2: The loading state uses the space the board has rather than a small indicator in a large blank, and does not shift the layout when the real content replaces it.
- AC3: A runbook appears on the board and in the list as a document of its own kind, with its own heading and colour, alongside the other companion kinds.
- AC4: The Runbooks screen and its navigation entries are gone, and nothing in the viewer still routes to them; the bounded runbook lookup used by agents is unaffected.
- AC5: Each category of the reference index can be collapsed and expanded on its own, by the same affordance the index itself uses.
- AC6: Getting Started's stage list states something a reader can act on rather than a bare total per stage.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_098_a_board_that_tells_the_truth_while_it_is_still_loading`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_020_local_web_viewer_for_cli_driven_logics_work.md
- clients/shared-web/media/renderBoardApp.js
- clients/shared-web/media/logicsModel.js
- clients/viewer/src/browser-host/workshop.js
- clients/viewer/viewer.css

# Backlog
- `item_816_say_the_board_is_loading_instead_of_saying_the_project_is_empty`
- `item_817_let_a_runbook_be_a_document_and_retire_its_screen`
- `item_818_collapse_a_reference_category_on_its_own`
- `item_819_make_getting_started_s_stage_list_say_something`
