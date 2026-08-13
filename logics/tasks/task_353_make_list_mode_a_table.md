## task_353_make_list_mode_a_table - Make list mode a table
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-13 22:58:15

# AI Context
- Summary: List mode rendered a compact card stretched to full width; it is a table now, with columns that carry the same facts the card face carries, in the same encoding.
- Keywords: list mode, table columns, list-row, mode toggle labelling, shared encoding
- Use when: Changing what list mode shows or how its columns are laid out.
- Skip when: Card mode's own layout, and which documents the board shows.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_739_make_list_mode_a_table`

# Acceptance criteria
- AC16: List mode presents documents as a table with columns that earn the width -- at least status, links and age beside the title -- rather than a stretched card whose only right-hand content is pinned to the far edge.
- AC17: Card mode and list mode encode the same facts the same way, so switching mode changes the shape of the screen and not what it means; and the current mode, and the mode switching would reach, are both stated.

# AC Traceability
- request-AC16 -> This task. Proof: measured at 1440x900 against the live corpus -- rows are 33px tall where they were about 82px, with `minmax(0,1fr) auto 140px 100px 80px` columns carrying title, linkage, status, links and age. The near-constant `U __% / C __%` chip that used to sit at the far right edge is gone from the face entirely under `item_719`.
- request-AC17 -> This task. Proof: the row reuses `createCardTitle`, `createLinkageBadges`, `createCardAgeSegment` and `cardStatusKey` rather than drawing its own versions, and `item_740` gave both modes the same progress bar. The task-coverage dots were missing from the first version and the existing coverage test caught it. The mode control states the current mode and the mode switching would reach, in both its `aria-label` and its `title`.
- request-AC1 -> Delivered by `item_717_split_the_board_into_a_flow_queue_and_a_companion_library` under the same request. Proof: measured at 1440x900 against this corpus -- three flow columns (`request|backlog|task`), 129 companion documents in a collapsible reference index below them, and `scrollWidth === clientWidth`, where seven peer columns previously clipped the sixth mid-word.
- request-AC2 -> Delivered by `item_718_open_the_board_on_the_work_that_is_live` under the same request. Proof: 1 382 of 1 511 documents in this corpus are finished (91.5%). Each column folds its finished work behind a control stating the count; the fold turns off under an active search or when a group has no live work, which six filter-authority tests caught when it did not.
- request-AC3 -> Delivered by `item_718_open_the_board_on_the_work_that_is_live` under the same request. Proof: headers read `9 live - 344 done` rather than `10/353`. Status-based rather than progress-based, because requests carry no Progress indicator and splitting on it left the Requests column reporting the old count.
- request-AC4 -> Delivered by `item_719_reallocate_the_card_face_to_the_facts_that_vary` under the same request. Proof: a `card--status-*` accent per card, with a distinct border style per status so the ordering survives greyscale; verified load-bearing by removing the class and watching the regression fail. The stage stays on the ref prefix the card already printed.
- request-AC5 -> Delivered by `item_719_reallocate_the_card_face_to_the_facts_that_vary` under the same request. Proof: the `U __% / C __%` pair took 91 distinct values across the corpus, one pair covering 34%, every document at 85 or above. It moved to the details panel, which already rendered every indicator, and the line it held carries the age -- captured showing `today`, `2d`, `3d`, `1mo`, `2mo` on live cards. The blocked reason is not on the card: the payload records no reason for a blocked status, which `item_716` measured; the status itself is named.
- request-AC6 -> Delivered by `item_719_reallocate_the_card_face_to_the_facts_that_vary` under the same request. Proof: progress remains a drawn wash rather than a printed number; the request badge, the task dots and the status accent each carry a label -- the accent's status is named in the card's `aria-label` and `title`, added when this proof was written and found it missing.
- request-AC7 -> Delivered by `item_720_make_selecting_a_card_one_mechanism` under the same request. Proof: measured against the live corpus at 1440x900 -- card height 70px before and after the click and the card below it unmoved at y=322, an outline rather than a border change so it cannot be confused with a stage border or the status accent, and the inline preview retired along with the seven helpers that fed it. Selecting reveals a collapsed panel, proven by removing the reveal and watching the regression fail.
- request-AC8 -> Delivered by `item_721_lead_the_details_panel_with_what_the_document_says` under the same request. Proof: the panel opens on `Acceptance criteria (N)` as a checklist, then the summary, then the links; `indicators`, `contextPack`, `dependencyMap`, `references`, `specs` and `companionDocs` are the only sections that fold. The default list was declared twice, in `mainApp.js` and `mainCore.js`, both listing every section; it is now one list in `logicsModel.js`.
- request-AC9 -> Delivered by `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines` under the same request. Proof: measured across 1 593 documents -- one has a non-empty `provenance`, whose keys are an external tracker link, and no per-beat date exists anywhere in the payload. Recorded in the item with the two ways to obtain one (a git walk, or a forward event log) and the cost of each, so `item_722` built on a measurement rather than an assumption.
- request-AC10 -> Delivered by `item_721_lead_the_details_panel_with_what_the_document_says` under the same request. Proof: the `File: <relPath>` line is gone -- it was the stage folder the eyebrow names plus the slug the Name row carries. Measured at 1440x900: the panel starts at x=1140 and the last column ends at x=804, so no column is overlapped; and every document type overflows the panel body (a roadmap, among the sparsest, gives 1277px of content in 661px), so no dead space remains above the actions.
- request-AC11 -> Delivered by `item_723_draw_the_activity_feed_as_a_chronology` under the same request. Proof: a spine behind the markers, one header per day where the feed previously grouped by floored minute, a per-row time, and the kind named on the row -- captured showing `PROMOTED`, `UPDATED`, `LINKED COMPANION DOCS` under a single `TODAY` header, with no legend elsewhere.
- request-AC12 -> Delivered by `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines` under the same request. Proof: activity is built client-side by diffing the previous snapshot against the current poll, so no event records the command that wrote it and two scaffolds in one poll window are indistinguishable. Grouping by workflow chain is available from `references` and `usedBy`; grouping by operation needs a backend event and is out of this request.
- request-AC13 -> Delivered by `item_723_draw_the_activity_feed_as_a_chronology` under the same request. Proof: a gap of more than a day renders as `N days with no recorded activity`, counted; proven load-bearing by disabling the branch and watching the regression fail.
- request-AC14 -> Delivered by `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign` under the same request. Proof: the campaign visits all four surfaces at 1440x900, 820x1180 and 390x844, applying the existing layout checks -- 133 checks pass. The details panel is skipped below 900px with its reason stated, because `details.css` hides it there on purpose; that tension is recorded in `item_740_keep_progress_and_both_modes_honest_at_any_width`, which owns narrow-width behaviour. Coverage proven load-bearing by removing `card--selected` and watching `selected card: reachable` fail.
- request-AC15 -> Delivered by `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign` under the same request. Proof: every change is in `clients/shared-web/media/*` and `clients/viewer/src/browser-host/`, rebuilt via `npm run bundle:viewer-host` after each; the extension's webview loads the same media files, and the added `workflowStatuses.generated.js` was wired into `clients/viewer/index.html`, `clients/vscode/src/logicsWebviewHtml.ts` and both test harnesses together.
- request-AC18 -> Delivered by `task_354_keep_progress_and_both_modes_honest_at_any_width` under the same request. Proof: progress was a wash filled to `var(--progress)` across the element, so the same value covered about 138px in a card and about 900px in a row; it is a 64px bar in both modes, filled by a ratio.
- request-AC19 -> Delivered by `task_354_keep_progress_and_both_modes_honest_at_any_width` under the same request. Proof: measured at 390x844 -- the list collapses to one column, status, links and age become subordinate lines under the title, and `scrollWidth === clientWidth`.

# Plan
- [x] Use `python3 -m logics_manager flow progress task task_353_make_list_mode_a_table.md --progress <n>%` during multi-wave work.
- [x] Run `python3 -m logics_manager flow finish task task_353_make_list_mode_a_table.md` after implementation.

# Validation
- `npx vitest run`: 876 passed (82 files).
- Viewer UI campaign at 1440x900, 820x1180 and 390x844: 133 checks, no findings.
- Measured in the live viewer: list rows 33px tall, five columns at 1440, one column at 390, no sideways scroll at either.
- Finish workflow executed on 2026-08-13.
- Linked backlog/request close verification passed.

# Report
- Delivered 2026-08-13. The row keeps the `card` class because selection, focus and keyboard navigation all find a document through `findCardById`, which queries `.card`; dropping it turned the list into rows the keyboard could not reach, which the existing tests caught before the change shipped.
- Finished on 2026-08-13.
- Linked backlog item(s): `item_716_confirm_what_the_payload_can_and_cannot_tell_about_chains_and_lifelines`, `item_717_split_the_board_into_a_flow_queue_and_a_companion_library`, `item_718_open_the_board_on_the_work_that_is_live`, `item_719_reallocate_the_card_face_to_the_facts_that_vary`, `item_720_make_selecting_a_card_one_mechanism`, `item_721_lead_the_details_panel_with_what_the_document_says`, `item_723_draw_the_activity_feed_as_a_chronology`, `item_725_cover_the_board_the_selected_state_the_panel_and_the_feed_in_the_campaign`, `item_739_make_list_mode_a_table`, `item_740_keep_progress_and_both_modes_honest_at_any_width`
- Related request(s): `req_345_make_the_project_view_lead_with_the_work_that_is_live`

# Links
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
