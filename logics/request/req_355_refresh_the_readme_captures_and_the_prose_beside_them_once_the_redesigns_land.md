## req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land - Refresh the README captures and the prose beside them once the redesigns land
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: Documentation
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 21:37:36

# AI Context
- Summary: The four README captures predate every redesign in this cycle, two of them show a demo corpus a released build no longer has, and the prose beside them still calls the companion stages columns; nothing produces them, so nothing noticed.
- Keywords: readme captures, docs/media, stale documentation, demo corpus, alt text, capture provenance, viewer screens
- Use when: Refreshing published screenshots or the prose describing the viewer's screens, or deciding how documentation captures are produced.
- Skip when: Working on the screen redesigns themselves, or on the visual campaign's own working captures.

# Needs
- Raised by the operator, 2026-08-13, mid-redesign: the README captures will have to be redone at the end, because every screen they show is being redrawn.
- Checked while recording it, and the problem is wider than staleness. Two of the four captures show a corpus a released build no longer has, and the prose beside them describes a board layout that no longer exists.
- This is deliberately scheduled last. Recapturing before the redesigns land would produce a second set of images to redo.

# Context
- **The four captures predate every redesign in this cycle.** `docs/media/viewer-board.png` and `viewer-document.png` are dated 2026-08-09, `viewer-health.png` and `viewer-insights.png` 2026-08-10. Since then `logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md` cut the board from seven columns to three with a reference index below them, folded finished work behind a counted control, reallocated the card face, retired the inline preview a click used to expand, and rewrote the details panel to lead with the criteria and a lifeline; `logics/request/req_344_make_the_fleet_home_read_as_the_product_s_first_screen.md` redrew the first screen. Every screen in every capture is now drawn differently. Those requests are cited as the cause, not as this request's lineage -- its own backlog is the three slices below.
- **Two captions describe a corpus a user cannot reach.** The health and insights captures are labelled `from the demo corpus`, and `logics/request/req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact.md` removed the synthetic demo board from every released artifact -- it now appears only behind an explicit environment variable. A reader following the README sees a screen the product will not show them.
- **The prose is wrong independently of the images.** The Viewer section describes `requests, backlog items, tasks, product briefs, and architecture decisions as columns`. After that split, the columns are the flow stages and the companion documents are a reference index below them. The alt text on the board capture repeats the same list.
- **Nothing produces these captures.** There is no script in `scripts/` that writes to `docs/media/`, so they are made by hand and their provenance is not written down. That is why they went stale silently: nothing compares them to the product, and nothing records what viewport, corpus or screen state they were taken at, so the next person recapturing them cannot match the framing.
- **The capability to take them already exists.** `logics/runbook/run_002_build_a_visual_review_and_mockup_from_a_live_viewer.md` describes driving a live viewer and capturing it keychain-safely, and `tests/run_local_viewer_visual_smoke.mjs` already navigates the screens under test. Whatever is written for this should reuse that rather than inventing a third way to point a browser at the viewer.
- Out of scope: the redesigns themselves, each tracked by its own request; and the visual campaign's own captures, which are working artefacts rather than published documentation.
- Known risk: this request is only correct once the screens it documents are final. Running it early produces work that has to be redone, which is the specific waste the operator raised it to avoid.

# Acceptance criteria
- AC1: Every capture in the README shows the shipped design of the screen it names, taken after the redesigns it documents have landed.
- AC2: No capture or caption presents the synthetic demo corpus, which a released build does not show.
- AC3: The prose and alt text beside each capture describe what the screen now does, including the board's flow columns and reference index.
- AC4: How the captures are produced is written down -- screen, viewport, corpus and any state the framing depends on -- so the next person can reproduce the framing rather than guess it.
- AC5: The work runs after the screen redesigns are delivered, and the request states which ones it waited on.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_091_a_readme_that_shows_the_product_a_reader_will_get`
- Architecture decision(s): (none yet)

# References
- README.md
- docs/media/viewer-board.png
- docs/media/viewer-document.png
- docs/media/viewer-health.png
- docs/media/viewer-insights.png
- logics/roadmap/road_008_viewer_work_in_lots.md
- logics/request/req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact.md
- logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md
- logics/runbook/run_002_build_a_visual_review_and_mockup_from_a_live_viewer.md

# Backlog
- `item_778_retake_the_readme_captures_against_the_delivered_screens`
- `item_779_correct_the_prose_and_alt_text_that_describe_the_old_screens`
- `item_780_write_down_how_a_documentation_capture_is_produced`
