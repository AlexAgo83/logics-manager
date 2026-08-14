## task_348_deliver_the_reader_the_modal_and_the_filter_panel - Deliver the reader, the modal and the filter panel
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:01

# AI Context
- Summary: Settle document identity with the details panel's request first, baseline the campaign, then the reader, then the filter panel, then the modal -- last, so its three small changes do not acquire others.
- Keywords: document identity, campaign baseline, reader, filter panel, new request modal, delivery order
- Use when: Implementing the reader, modal or filter panel work.
- Skip when: The Terminals tab, and the other viewer tasks (task_341 to task_347).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Settle the document-identity question first, with the details panel's request, since both screens need one answer and the reader is where that panel's primary action lands.
- [ ] 2. Extend the campaign next and record the baseline for all three surfaces.
- [ ] 3. Then the reader, which is the largest of the three and the one an operator reaches most.
- [ ] 4. Then the filter panel, then the modal -- the modal last because it is three small changes and must not acquire others.
- [ ] 5. Check each against `logics/external/mockup/reader_modal_filters_redesign.html`, and inherit the panel framing rather than re-deciding it.
- [ ] 6. Rebuild the browser host and confirm both surfaces before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_761_stop_the_reader_leading_with_a_path_in_capitals`
- `item_762_make_the_reader_a_place_to_read`
- `item_763_finish_the_new_request_modal_without_redesigning_it`
- `item_764_make_each_filter_say_what_it_would_narrow`
- `item_765_make_the_panel_and_the_board_agree_on_what_is_shown`
- `item_766_cover_the_reader_the_modal_and_the_filter_panel`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_761_stop_the_reader_leading_with_a_path_in_capitals`. Proof: The eyebrow carries `<reference> - <status>`; `text-transform` is deleted from `.viewer-document__eyebrow`; the path moved to `#viewer-document-path-copy`, whose `title` and `aria-label` both name it. Measured live: `req_355_... - Draft`, textTransform `none`.
- request-AC5 -> `item_761_stop_the_reader_leading_with_a_path_in_capitals`. Proof: Both surfaces state the same four facts in the same order: stage (the badge beside the title / the panel's eyebrow), reference, status, title.
- request-AC2 -> `item_762_make_the_reader_a_place_to_read`. Proof: Measured on a live viewer at 1440px: prose set at **72 characters a line** against roughly 150 before. `.markdown-preview--reading` caps the prose column at `72ch`; the freed column carries the contents list.
- request-AC3 -> `item_762_make_the_reader_a_place_to_read`. Proof: `applyReadingLayout` lists the rendered headings with their count (`8 sections`), each jumping to its section; `trackReadingPosition` marks the topmost heading that has passed the top of the panel, by bar and weight as well as colour.
- request-AC4 -> `item_762_make_the_reader_a_place_to_read`. Proof: `renderChainGraph(..., { open: true })` in the reader. It was the only navigation the screen had and the one thing that arrived folded. Its nodes call `__logicsGraphNodeClick`, which the reader binds to `showDocumentByPath`.
- request-AC6 -> `item_763_finish_the_new_request_modal_without_redesigning_it`. Proof: `createThemedModal` renders the multiplication-sign entity rather than the letter `x`. Asserted in `tests/viewer.request-modal.test.ts`.
- request-AC7 -> `item_763_finish_the_new_request_modal_without_redesigning_it`. Proof: `previewRequestPath` states the destination as the fields are typed, using the backend's own naming rule including its fallback from title to the first line of the need. The rule now exists twice, so `tests/viewer.request-modal.test.ts` runs the Python and JavaScript versions against the same inputs and fails when they disagree.
- request-AC8 -> `item_763_finish_the_new_request_modal_without_redesigning_it`. Proof: Submit is disabled until Need is non-empty, with `Fill in Need first.` as its title. It used to be live and moved focus into the empty field without saying why.
- request-AC9 -> `item_763_finish_the_new_request_modal_without_redesigning_it`. Proof: The field list, placeholders, button order and backdrop are untouched; the diff adds a destination line and a disabled state and changes nothing else.
- request-AC10 -> `item_764_make_each_filter_say_what_it_would_narrow`. Proof: Each neutral option names its dimension and how many choices below it would actually match. Measured live: `All types - 8 to narrow by`, `Any status - 6`, `Any relation - 3`, `Any activity - 1` -- four different statements where there had been one number four times.
- request-AC12 -> `item_764_make_each_filter_say_what_it_would_narrow`. Proof: `Group` is genuinely disabled outside list mode and said so only in a `title`. `#group-by-note` states it on the screen, which is the only form a touch screen can read.
- request-AC13 -> `item_764_make_each_filter_say_what_it_would_narrow`. Proof: `#filter-reset` is disabled while no filter is set, dimmed rather than hidden.
- request-AC11 -> `item_765_make_the_panel_and_the_board_agree_on_what_is_shown`. Proof: The panel says `match` for what it counts and names the paging for what the columns do. Measured live: `1613 of 1615 docs match - 46 drawn so far, the rest load as you reach them`.
- request-AC14 -> `item_766_cover_the_reader_the_modal_and_the_filter_panel`. Proof: `item_766` added the reader and the new-request modal as campaign surfaces, each proved by markup only it produces, the modal dismissed after so it cannot occlude what follows. **The filter panel is not covered and the surface list says so**: its behaviour is already driven by `FILTER_CHECKS`, and four attempts at driving its layout left the panel closed at check time by a route not established.
- request-AC15 -> `item_766_cover_the_reader_the_modal_and_the_filter_panel`. Proof: All changes in `clients/viewer/src/browser-host/**` and `clients/shared-web/media/**`, rebuilt through `npm run bundle:viewer-host`.

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_761_stop_the_reader_leading_with_a_path_in_capitals`, `item_762_make_the_reader_a_place_to_read`, `item_763_finish_the_new_request_modal_without_redesigning_it`, `item_764_make_each_filter_say_what_it_would_narrow`, `item_765_make_the_panel_and_the_board_agree_on_what_is_shown`, `item_766_cover_the_reader_the_modal_and_the_filter_panel`
- Related request(s): `req_351_make_the_reader_readable_and_the_filter_panel_say_something`

# Links
- Request: `req_351_make_the_reader_readable_and_the_filter_panel_say_something`
- Product brief(s): `prod_087_surfaces_that_read_like_they_were_finished`
- Architecture decision(s): (none yet)
