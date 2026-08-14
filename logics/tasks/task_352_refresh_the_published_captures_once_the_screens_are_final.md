## task_352_refresh_the_published_captures_once_the_screens_are_final - Refresh the published captures once the screens are final
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
- Summary: (unfilled: replace before this doc is used)
- Keywords: refresh, published, captures, once, screens, final
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Wait for the screen redesigns to land. Starting early produces a second set of images to redo, which is the waste this request exists to avoid.
- [ ] 2. Write down how a capture is produced first, so the retake follows a recorded framing instead of setting one nobody wrote down again.
- [ ] 3. Then retake against a real corpus, and correct the prose in the same pass -- the text is wrong independently of the images, and fixing one without the other leaves the section half true.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_778_retake_the_readme_captures_against_the_delivered_screens`
- `item_779_correct_the_prose_and_alt_text_that_describe_the_old_screens`
- `item_780_write_down_how_a_documentation_capture_is_produced`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_778_retake_the_readme_captures_against_the_delivered_screens`. Proof: All four retaken from a live viewer against this repository's corpus at 1621 documents, after the redesigns landed. Each shows something the old capture could not: the board's `5 live / 350 done` headers and reference index, the reader's measure and contents list, health's `Nothing blocks` headline, insights' attention count.
- request-AC2 -> `item_778_retake_the_readme_captures_against_the_delivered_screens`. Proof: This repository's own `logics/`, never the synthetic demo board. The two captions reading `from the demo corpus` are gone with the images they labelled.
- request-AC5 -> `item_778_retake_the_readme_captures_against_the_delivered_screens`. Proof: Run last, after `item_717` through `item_722`, `item_752`/`item_753`, `req_350`, `req_351` and `req_352` -- listed in `item_778`'s delivery notes.
- request-AC3 -> `item_779_correct_the_prose_and_alt_text_that_describe_the_old_screens`. Proof: The Viewer section described the companion stages as columns, which stopped being true at `item_717`; all four alt texts repeated the same list. Each is rewritten to describe what is in the frame, since alt text is read by people who will never see the image. `read-only` went too: the viewer creates requests, changes status, applies fixes and drives git.
- request-AC4 -> `item_780_write_down_how_a_documentation_capture_is_produced`. Proof: `scripts/dev/capture-readme-media.mjs` and the `docs/media/PROVENANCE.md` it writes. Executable rather than prose, because a written procedure drifts from the product exactly as the images did. It reuses `scripts/dev/viewer-driver.mjs`, extracted from the viewer tour, rather than being a third way of pointing a browser at this viewer.

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_778_retake_the_readme_captures_against_the_delivered_screens`, `item_779_correct_the_prose_and_alt_text_that_describe_the_old_screens`, `item_780_write_down_how_a_documentation_capture_is_produced`
- Related request(s): `req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact`, `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`

# Links
- Request: `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`
- Product brief(s): `prod_091_a_readme_that_shows_the_product_a_reader_will_get`
- Architecture decision(s): (none yet)
