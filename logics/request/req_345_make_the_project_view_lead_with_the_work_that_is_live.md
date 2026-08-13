## req_345_make_the_project_view_lead_with_the_work_that_is_live - Make the project view lead with the work that is live
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: 91.5% of this corpus is finished, and the board, the card, the details panel and the activity feed are all scaled for it; this reallocates their surface and their visual channels to the 13 items that are live.
- Keywords: project, view, lead, work, live
- Use when: changing the board's columns or cards, the selected-card state, the details panel, or the activity feed.
- Skip when: working on the fleet home, the document reader or editor, or the Workshop, Remote and CDX screens.

# Needs
- Reported by the operator, 2026-08-13, after reviewing the board, the card's selected state, the details panel and the activity feed together.
- The full review with real captures and a side-by-side mockup of every proposal is in `logics/external/board_activity_visual_review_2026_08_13.md` and `logics/external/mockup/board_activity_redesign.html`. This request delivers what those mockups show.
- The operator's own words about the details panel: they never open it, because it does not give them anything. That is the sharpest symptom, and it turned out to be measurable rather than a matter of taste.
- The board itself is the strongest screen in the viewer. Almost nothing here is a rebuild; it is a reallocation of surface and of visual channels the screen already spends.

# Context
- **The measurement that reframes the rest.** Of the 1 511 docs in this corpus, 1 382 are Done or Settled -- 91.5%. What is live is 13 items: 7 backlog Ready, 2 requests Draft, 2 tasks Ready, 2 product briefs Proposed. The board opens on every document, newest first, and so spends its whole surface on finished work.
- **The model already draws a line the screen does not.** `clients/shared-web/media/logicsModel.js` defines `isPrimaryFlowStage` as request, backlog or task, and `isCompanionStage` as product, roadmap or architecture, with specs beside them. The board renders all seven stages as equal peer columns, which is why the sixth is clipped mid-word at 1440. The distinction is behavioural: the flow is a queue work moves through, the companions are a library consulted from a card. The counts agree -- 1 393 docs in the flow against 118 companions (81 product, 29 architecture, 7 roadmap, 1 runbook, 0 spec), and every companion is Settled. Nothing in them can be triaged.
- **The card spends its loudest channels on its least informative facts.** The card background encodes the stage, which the column it sits in already states; status, which is what varies inside a column, gets only the done-dimming. And the `U __% / C __%` chip printed on every card takes 91 distinct values across 1 393 docs, of which `U 90% / C 85%` alone covers 34%; Understanding runs 75 to 100 with a median of 95 and 100% of docs sit at 85 or above. It costs a full line on every card and is very nearly a constant. Meanwhile nothing on a card says when it last moved, and a blocked card is drawn like any other with its reason a click away.
- **Clicking a card fires two mechanisms that show the same facts.** It sets `.card--preview-open` and expands an inline preview inside the card, and it opens the right-hand details panel. Status and Updated then appear twice, six hundred pixels apart. The inline preview also grows the card in place, so every card below it moves under the pointer.
- **The details panel's entire text content, dumped from the live DOM with a request selected, is a title, a status, a timestamp, the document's path, the same slug a second time under `NAME`, and seven collapsed section headings.** Opening a card shows labels. Learning anything costs a click per label, and the fastest route to the content is the button that leaves the panel. It also ends two-thirds up with a void above its actions, and overlaps the Roadmaps column rather than making room. The payload it already receives carries `summaryPoints`, `acceptanceCriteria`, `references`, `usedBy`, `ageDays` and `provenance` -- the substance is in hand and is not shown.
- **Activity is tidy but tells no story.** Ten documents written by one scaffold produced ten peer rows; each row prints the human title and then the full snake-case ref, which on mobile wraps to three lines and becomes the largest thing in the card; rows span the full width to carry two short lines; the `L` and `P` badges are decoded nowhere; and one group header times the batch rather than the work.
- Out of scope: the fleet home, delivered by `logics/request/req_344_make_the_fleet_home_read_as_the_product_s_first_screen.md`; the document reader and editor; the Workshop, Remote and CDX screens; and what any document contains.
- Known risk, and it is the one to settle first: two of these ideas may not be renderable from what the viewer serves today. Grouping activity events into a chain thread needs each event to know which operation and which chain produced it. A document lifeline needs a date per beat, not just the current state. Both must be checked against the payload before they are designed in; if the data is absent, they are backend work, and the rest of this request is not.
- Known risk: `clients/viewer/browser-host.js` is a build output of `clients/viewer/src/browser-host/index.js`, and one source feeds both the standalone viewer and the extension host. A change made in the built file is silently lost, and a change correct in only one surface is not done.

# Acceptance criteria
- AC1: The board's columns are the primary flow only -- requests, backlog, tasks -- and the companion stages are reachable from the same screen as a searchable, grouped, collapsible index rather than peer columns; no column heading is clipped at 1440x900.
- AC2: The board opens on the work that is live, with finished documents folded per column behind a control that states how many were folded.
- AC3: A column header states how much of it is live and how much is finished, rather than how many of its documents are currently rendered.
- AC4: A card's fill and accent carry its status, and its stage is carried by the ref prefix that already encodes it, so two cards in one column are told apart by the thing that differs.
- AC5: The understanding and confidence values leave the card face for the details panel, and the line they occupied carries what varies instead: how long since the document moved, and why it is blocked when it is.
- AC6: Progress is drawn rather than printed, and every marker a card displays is either labelled or removed -- nothing on the card is a colour the screen never explains.
- AC7: Clicking a card selects it and opens the details panel, and does nothing else: the selected card is unmistakable among cards of every stage, no card changes height on click, and no second copy of the same facts is rendered inside it.
- AC8: The details panel leads with what the document says -- its summary, its acceptance criteria as a checklist with a count, and its links drawn as a parent-and-children shape -- expanded on open; indicators, context pack and raw references are what is folded.
- AC9: The details panel shows the document's lifeline: the beats it has reached, the beat it is on, and when each was reached.
- AC10: The details panel identifies the document once rather than printing its slug twice, makes room on the board instead of overlapping a column, and carries no dead space above its actions.
- AC11: The activity feed reads as a chronology: a continuous spine, a marker per day, and an event's kind legible from its own row without a legend elsewhere.
- AC12: Events produced by one operation are one entry, and the events belonging to one workflow chain can be read together as that chain's history, reachable from a card.
- AC13: A period with no activity is visible as such rather than inferred from timestamps.
- AC14: The board, the selected state, the details panel and the activity feed each hold at 1440x900, 820x1180 and 390x844 with no overlap, clipping or sideways scroll, and the viewer UI campaign covers all four.
- AC15: Every change is made in the shared board and browser-host sources and rebuilt, and behaves the same in the standalone viewer and in the extension host.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)

# References
- clients/shared-web/media/renderBoardApp.js
- clients/shared-web/media/logicsModel.js
- clients/shared-web/media/css/board.css
- clients/shared-web/media/css/details.css
- clients/viewer/src/browser-host/index.js
- logics_manager/viewer.py
- scripts/build/build-viewer-browser-host.mjs
- tests/run_local_viewer_visual_smoke.mjs
- tests/helpers/viewer-layout-checks.mjs
- logics/external/board_activity_visual_review_2026_08_13.md
- logics/external/mockup/board_activity_redesign.html

# Backlog
- `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines`
- `item_717_split_the_board_into_a_flow_queue_and_a_companion_library`
- `item_718_open_the_board_on_the_work_that_is_live`
- `item_719_reallocate_the_card_face_to_the_facts_that_vary`
- `item_720_make_selecting_a_card_one_mechanism`
- `item_721_lead_the_details_panel_with_what_the_document_says`
- `item_722_give_a_document_a_lifeline_in_the_details_panel`
- `item_723_draw_the_activity_feed_as_a_chronology`
- `item_724_tell_one_chain_s_story_in_the_activity_feed`
- `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign`
