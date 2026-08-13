## item_740_keep_progress_and_both_modes_honest_at_any_width - Keep progress and both modes honest at any width
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 22:58:04

# AI Context
- Summary: Progress is a horizontal wash across the card, so a finished document at 100% is washed end to end; in list mode that wash spans the full row, and finished work carries more coloured area than live work despite the done-dimming.
- Keywords: card--progress-bar, progress wash, done dimming, aspect ratio, phone width, column collapse
- Use when: Changing how progress is drawn, or how either board mode behaves at phone width.
- Skip when: Which documents are shown, and the board's structure.

# Problem
Progress is drawn as a horizontal wash across the card, filled to `--progress`. At 100% a finished document is washed end to end; `.card--done` then dims it to 55%, which is the right intent.
In list mode that wash spans the full row width instead of a 230px card, so finished work still carries far more coloured area than live work. The encoding does not survive the change of aspect ratio.
At 390px the metric chip already wraps under the title and both modes read well -- the desktop list is that phone layout stretched, which is why it breaks. The phone case is close to correct and must not regress.
# Scope
- In:
  - Encode progress so it reads the same in a narrow card and in a full-width row, and so a finished document never carries more coloured area than a live one.
  - Keep both modes usable at phone width with nothing pushed off-screen: what is a column on a wide screen becomes a subordinate line under the title.
- Out:
  - Which facts a card or row shows, and the board's structure.
# Found by the campaign, 2026-08-13, for this slice to decide
- **Below 900px, selecting a card produces nothing visible at all.** `clients/shared-web/media/css/details.css` hides `.details` and `.splitter` outright under `@media (max-width: 900px)`, with a comment saying the panel and splitter eat too much of a phone and that selection info stays reachable by tapping the item to open the read-preview document.
- Measured at 820x1180 after selecting a card: the card carries `card--selected`, `details--collapsed` is false and `hidden` is false -- and the panel computes to `display: none`, 0x0. So a tap selects, and the selection has no visible outcome; seeing anything requires a second, different gesture.
- This matters for this slice because `item_720` made "a click selects and opens the panel" the rule, and its fix -- revealing a collapsed panel on selection -- cannot reach a panel hidden by a media query. The two decisions disagree, and the disagreement only exists below 900px, which is this slice's subject.
- Not decided here, deliberately: the media query is a documented choice, not an oversight, and overturning it while delivering a different slice would replace one undiscussed decision with another. The options are to give the narrow layout its own way to show a selection, to make the single tap do what the double tap does at that width, or to keep the current behaviour and say so on screen.
- The viewer UI campaign skips the details-panel surface below 900px with that reason stated, rather than failing on it: a campaign that fails on a decision somebody took on purpose teaches people to ignore its failures. If this slice changes the behaviour, that skip should go with it.

# Delivery notes
- Progress was `linear-gradient(... var(--progress))` across the whole element, so 60% covered about 138px in a 230px card and about 900px in a full-width row -- the same number meaning different amounts of colour depending on the aspect ratio -- and a finished document washed end to end carried more coloured area than any live one, whatever the dimming did afterwards. It is a 64px bar in both modes now, filled by a ratio, so the amount of colour tracks the progress and nothing else.
- List rows carried **no** progress encoding at all before this, which AC17 forbids as much as encoding it differently would. They carry the same bar.
- At 390px the list collapses to one column and the status, links and age become subordinate lines under the title, with `scrollWidth === clientWidth`. The first attempt overflowed by exactly its own 10px padding -- the row was `width: 100%` inside a padded container -- and the campaign's clipping check caught it, which is the coverage `item_725` added doing the job it was added for.
- **Not resolved here, and deliberately:** the finding recorded above, that below 900px selecting a card produces nothing visible because `details.css` hides the panel. That is a documented decision about the phone layout; revisiting it belongs to whoever wants it revisited, not to a progress-encoding change.

# Acceptance criteria
- AC18: Progress is encoded so that it reads the same in a narrow card and in a full-width row, and a finished document never carries more coloured area than a live one.
- AC19: At phone width both modes remain usable with nothing pushed off-screen: the facts that are columns on a wide screen become a subordinate line under the title.

# AC Traceability
- request-AC18 -> This backlog slice. Proof: the wash filled to `var(--progress)` across the whole element, so 60% covered about 138px in a 230px card and about 900px in a full-width row, and a finished document washed end to end carried more coloured area than any live one. It is a 64px bar in both modes, filled by `--progress-ratio`, so the coloured area tracks the progress and nothing else. List rows carried no progress encoding at all before this.
- request-AC19 -> This backlog slice. Proof: measured at 390x844 -- the list collapses to `grid-template-columns: minmax(0, 1fr)`, status, links and age become subordinate lines under the title, and `scrollWidth === clientWidth`. The first attempt overflowed by exactly its own 10px padding and the campaign's `mobile: board: nothing is clipped outside the viewport` check failed on it.

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
- request-AC16 -> Delivered by `item_739_make_list_mode_a_table` under the same request. Proof: measured at 1440x900 -- list rows are 33px tall where they were about 82px, laid out as `minmax(0,1fr) auto 140px 100px 80px` carrying title, linkage, status, links and age.
- request-AC17 -> Delivered by `item_739_make_list_mode_a_table` under the same request. Proof: the list row reuses `createCardTitle`, `createLinkageBadges`, `createCardAgeSegment`, `cardStatusKey` and the same progress bar rather than drawing its own; the mode control names the current mode and the one switching would reach.
# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Primary task(s): `task_342_deliver_the_project_view_that_leads_with_live_work`

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_345_make_the_project_view_lead_with_the_work_that_is_live` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md`.
- Generated locally by logics-manager.
- Task `task_353_make_list_mode_a_table` was finished via `logics-manager flow finish task` on 2026-08-13.
- Task `task_354_keep_progress_and_both_modes_honest_at_any_width` was finished via `logics-manager flow finish task` on 2026-08-13.
- Task `task_342_deliver_the_project_view_that_leads_with_live_work` was finished via `logics-manager flow finish task` on 2026-08-13.

# Tasks
- `task_354_keep_progress_and_both_modes_honest_at_any_width`
- `task_353_make_list_mode_a_table`
- `task_342_deliver_the_project_view_that_leads_with_live_work`
