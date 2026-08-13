## task_342_deliver_the_project_view_that_leads_with_live_work - Deliver the project view that leads with live work
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-13 22:57:33

# AI Context
- Summary: Settle the payload question, take a campaign baseline, then board structure, card face, selection, panel, and the activity chronology -- checking each against the mockup in `logics/external/mockup/`.
- Keywords: project view redesign, delivery order, campaign baseline, board structure, card face, selection, details panel, activity chronology
- Use when: Implementing any part of the project-view redesign.
- Skip when: Working on the fleet home, which is task_341.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Settle the payload question first: whether activity events carry their operation and chain, and whether a lifeline has per-beat dates. Two items are designed on the answer, and the rest of the request does not depend on it.
- [x] 2. Extend the campaign next and record what it reports about today's four surfaces; that baseline is what proves the later items changed anything.
- [x] 3. Then the board's structure -- flow versus library, and live work first -- since both decide the surface everything else is drawn inside.
- [x] 4. Then the card face, then selection, then the panel, checking each against `logics/external/mockup/board_activity_redesign.html`. Selection must land after the card face and before the panel: it is the seam between them.
- [x] 5. Then the activity chronology, and the chain thread only if the first item found the data to support it.
- [x] 6. Rebuild the shared sources and confirm the standalone viewer and the extension host before closeout.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

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

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC9 -> `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines`. Proof: measured across 1 593 documents -- one has a non-empty `provenance`, whose keys are an external tracker link, and no per-beat date exists anywhere in the payload. Recorded in the item with the two ways to obtain one (a git walk, or a forward event log) and the cost of each, so `item_722` built on a measurement rather than an assumption.
- request-AC12 -> `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines`. Proof: activity is built client-side by diffing the previous snapshot against the current poll, so no event records the command that wrote it and two scaffolds in one poll window are indistinguishable. Grouping by workflow chain is available from `references` and `usedBy`; grouping by operation needs a backend event and is out of this request.
- request-AC1 -> `item_717_split_the_board_into_a_flow_queue_and_a_companion_library`. Proof: measured at 1440x900 against this corpus -- three flow columns (`request|backlog|task`), 129 companion documents in a collapsible reference index below them, and `scrollWidth === clientWidth`, where seven peer columns previously clipped the sixth mid-word.
- request-AC2 -> `item_718_open_the_board_on_the_work_that_is_live`. Proof: 1 382 of 1 511 documents in this corpus are finished (91.5%). Each column folds its finished work behind a control stating the count; the fold turns off under an active search or when a group has no live work, which six filter-authority tests caught when it did not.
- request-AC3 -> `item_718_open_the_board_on_the_work_that_is_live`. Proof: headers read `9 live - 344 done` rather than `10/353`. Status-based rather than progress-based, because requests carry no Progress indicator and splitting on it left the Requests column reporting the old count.
- request-AC4 -> `item_719_reallocate_the_card_face_to_the_facts_that_vary`. Proof: a `card--status-*` accent per card, with a distinct border style per status so the ordering survives greyscale; verified load-bearing by removing the class and watching the regression fail. The stage stays on the ref prefix the card already printed.
- request-AC5 -> `item_719_reallocate_the_card_face_to_the_facts_that_vary`. Proof: the `U __% / C __%` pair took 91 distinct values across the corpus, one pair covering 34%, every document at 85 or above. It moved to the details panel, which already rendered every indicator, and the line it held carries the age -- captured showing `today`, `2d`, `3d`, `1mo`, `2mo` on live cards. The blocked reason is not on the card: the payload records no reason for a blocked status, which `item_716` measured; the status itself is named.
- request-AC6 -> `item_719_reallocate_the_card_face_to_the_facts_that_vary`. Proof: progress remains a drawn wash rather than a printed number; the request badge, the task dots and the status accent each carry a label -- the accent's status is named in the card's `aria-label` and `title`, added when this proof was written and found it missing.
- request-AC7 -> `item_720_make_selecting_a_card_one_mechanism`. Proof: measured against the live corpus at 1440x900 -- card height 70px before and after the click and the card below it unmoved at y=322, an outline rather than a border change so it cannot be confused with a stage border or the status accent, and the inline preview retired along with the seven helpers that fed it. Selecting reveals a collapsed panel, proven by removing the reveal and watching the regression fail.
- request-AC8 -> `item_721_lead_the_details_panel_with_what_the_document_says`. Proof: the panel opens on `Acceptance criteria (N)` as a checklist, then the summary, then the links; `indicators`, `contextPack`, `dependencyMap`, `references`, `specs` and `companionDocs` are the only sections that fold. The default list was declared twice, in `mainApp.js` and `mainCore.js`, both listing every section; it is now one list in `logicsModel.js`.
- request-AC10 -> `item_721_lead_the_details_panel_with_what_the_document_says`. Proof: the `File: <relPath>` line is gone -- it was the stage folder the eyebrow names plus the slug the Name row carries. Measured at 1440x900: the panel starts at x=1140 and the last column ends at x=804, so no column is overlapped; and every document type overflows the panel body (a roadmap, among the sparsest, gives 1277px of content in 661px), so no dead space remains above the actions.
- request-AC9 -> `item_722_give_a_document_a_lifeline_in_the_details_panel`. Proof: the lifeline draws the stage's declared sequence from `logics_manager/statuses.json` and marks the current beat. **Dates are not shown, because none exist** -- the panel states that in as many words rather than deriving one from `updatedAt`. Blocked, Obsolete, Rejected and Superseded are drawn as exits, and the sequence before an exit is left unmarked rather than claimed.
- request-AC11 -> `item_723_draw_the_activity_feed_as_a_chronology`. Proof: a spine behind the markers, one header per day where the feed previously grouped by floored minute, a per-row time, and the kind named on the row -- captured showing `PROMOTED`, `UPDATED`, `LINKED COMPANION DOCS` under a single `TODAY` header, with no legend elsewhere.
- request-AC13 -> `item_723_draw_the_activity_feed_as_a_chronology`. Proof: a gap of more than a day renders as `N days with no recorded activity`, counted; proven load-bearing by disabling the branch and watching the regression fail.
- request-AC12 -> `item_724_tell_one_chain_s_story_in_the_activity_feed`. Proof: consecutive same-chain events collapse into one counted, expandable row, and the chain's events are also listed in the details panel so the history is reachable from a card. **Delivered as chain grouping, not operation grouping**, on AC12's own investigation: the row reads `N documents in one chain`, never `in one run`, and both surfaces carry the note that the writing command is not recorded.
- request-AC14 -> `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign`. Proof: the campaign visits all four surfaces at 1440x900, 820x1180 and 390x844, applying the existing layout checks -- 133 checks pass. The details panel is skipped below 900px with its reason stated, because `details.css` hides it there on purpose; that tension is recorded in `item_740_keep_progress_and_both_modes_honest_at_any_width`, which owns narrow-width behaviour. Coverage proven load-bearing by removing `card--selected` and watching `selected card: reachable` fail.
- request-AC15 -> `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign`. Proof: every change is in `clients/shared-web/media/*` and `clients/viewer/src/browser-host/`, rebuilt via `npm run bundle:viewer-host` after each; the extension's webview loads the same media files, and the added `workflowStatuses.generated.js` was wired into `clients/viewer/index.html`, `clients/vscode/src/logicsWebviewHtml.ts` and both test harnesses together.
- request-AC16 -> Delivered by `task_353_make_list_mode_a_table` under the same request. Proof: measured at 1440x900 -- list rows are 33px tall where they were about 82px, laid out as `minmax(0,1fr) auto 140px 100px 80px` carrying title, linkage, status, links and age.
- request-AC17 -> Delivered by `task_353_make_list_mode_a_table` under the same request. Proof: the list row reuses `createCardTitle`, `createLinkageBadges`, `createCardAgeSegment`, `cardStatusKey` and the same progress bar rather than drawing its own; the mode control names the current mode and the one switching would reach.
- request-AC18 -> Delivered by `task_354_keep_progress_and_both_modes_honest_at_any_width` under the same request. Proof: progress was a wash filled to `var(--progress)` across the element, so the same value covered about 138px in a card and about 900px in a row; it is a 64px bar in both modes, filled by a ratio.
- request-AC19 -> Delivered by `task_354_keep_progress_and_both_modes_honest_at_any_width` under the same request. Proof: measured at 390x844 -- the list collapses to one column, status, links and age become subordinate lines under the title, and `scrollWidth === clientWidth`.

# Validation
- `npx vitest run`: 876 passed across 82 files. Every regression added by this task was proven load-bearing by reintroducing the defect it covers and watching it fail -- the status accent, the reference index fold, the panel reveal on selection, the inline markdown rendering, the quiet-period marker and the chain collapse.
- Viewer UI campaign at 1440x900, 820x1180 and 390x844: 133 checks, no findings. The board, the selected state, the details panel and the activity feed are covered as surfaces; the details panel is skipped below 900px with its reason stated, because `details.css` hides it there on purpose.
- `npm run lint`: clean, including the source line budget and the function-length gate.
- Measured against the live corpus rather than a fixture: three flow columns and a 129-document reference index at 1440x900 with no sideways scroll; column headers reading `9 live - 344 done`; card height unchanged at 70px across a click with the card below it unmoved; the panel starting at x=1140 against a last column ending at x=804; the reference index scrolling 1265px of content in 704px.
- Finish workflow executed on 2026-08-13.
- Linked backlog/request close verification passed.

# Report
- Delivered 2026-08-13 across ten slices. Two of them changed what the request assumed: `item_722` draws a lifeline with no dates because `item_716` measured that none exist, and `item_724` groups by workflow chain rather than by operation because the operation is not recoverable from a snapshot diff. Both say so on screen rather than implying otherwise.
- Finished on 2026-08-13.
- Linked backlog item(s): `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines`, `item_717_split_the_board_into_a_flow_queue_and_a_companion_library`, `item_718_open_the_board_on_the_work_that_is_live`, `item_719_reallocate_the_card_face_to_the_facts_that_vary`, `item_720_make_selecting_a_card_one_mechanism`, `item_721_lead_the_details_panel_with_what_the_document_says`, `item_722_give_a_document_a_lifeline_in_the_details_panel`, `item_723_draw_the_activity_feed_as_a_chronology`, `item_724_tell_one_chain_s_story_in_the_activity_feed`, `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign`, `item_740_keep_progress_and_both_modes_honest_at_any_width`
- Related request(s): `req_345_make_the_project_view_lead_with_the_work_that_is_live`

# Links
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
