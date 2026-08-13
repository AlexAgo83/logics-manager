## req_351_make_the_reader_readable_and_the_filter_panel_say_something - Make the reader readable and the filter panel say something
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The reader leads with an uppercased file path and sets prose at 150 characters a line; the filter panel repeats one count four times and disagrees with the board; the new-request modal is already right and needs three small things.
- Keywords: document reader, reading measure, uppercased path, linked workflow, new request modal, filter panel, shown count, terminals excluded
- Use when: Changing the document reader, the new-request modal, or the board's filter panel.
- Skip when: The Workshop Terminals tab; the editor, dock, project tools and LAN banner; and the details panel's own redesign.

# Needs
- Requested by the operator, 2026-08-13, to continue through the viewer surfaces that had never been opened, with the Workshop Terminals tab excluded.
- Three were reached and driven: the document reader, the new-request modal and the filter panel. The mockup this request delivers is `logics/external/mockup/reader_modal_filters_redesign.html`.
- The reader matters more than its position in the sweep suggests: it is the destination of the details panel's own primary action, so a request to make that panel worth opening leads here.
- One of the three is close to right already and this request says so rather than changing it for the sake of consistency.

# Context
- **The reader's most prominent text is a file path in capitals.** The eyebrow renders the document's full path uppercased across the width, above the title it duplicates -- a snake_case slug in capitals, which is the least readable form the same information could take. It is the widest and loudest element on a screen whose only purpose is reading.
- **The reader's prose runs at roughly 150 characters per line**, twice a comfortable measure and worse than the Getting Started screen already flagged for the same fault. This is the screen in the product most made of prose.
- **Its one navigational element is the only thing collapsed.** `LINKED WORKFLOW` sits folded above the content, so the fastest route between related documents is hidden while everything else is expanded. The document has eight sections and no contents list, so there is no way to jump within it and no indication of its length. The indicator chips, by contrast, are the right treatment already and are exactly where the board's near-constant metric chip was proposed to move.
- **The new-request modal is close to right and should mostly be left alone.** A dimmed backdrop, a clear title, three labelled fields whose placeholders actually teach, and Cancel beside a primary Create request. It is the best-behaved surface found across five passes over this viewer. Two small things: the dismiss control is a lowercase letter `x` in the body font rather than a glyph, and Create request is enabled with an empty title, while nothing says where the document will be written even though the id is allocated at creation.
- **The filter panel repeats one number four times and disagrees with the board.** Type reads `All (1574)` and Status, Relations and Activity all read `Any (1574)` -- the same count four times, telling the reader nothing about what any one filter would narrow. The panel then reports `1574 of 1576 docs shown` while the columns behind it read ten-of-349, ten-of-760 and ten-of-341: two different meanings of the word shown, on one screen. `Group` is greyed in a way that reads as broken rather than unavailable, and `Clear filters` is the panel's loudest control while no filter is set.
- Out of scope by instruction: **the Workshop Terminals tab, which was never opened**. Out of scope because they could not be driven in this pass and are named rather than guessed at: the document editor, the minimized dock, the project tools (Translations, Theme) and the LAN banner.
- Known risk: the reader is reached from the details panel, which `logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md` is separately redesigning. The two must agree on how a document is identified -- ref and title, with the full path behind a copy action -- rather than each solving it.
- Known risk: `clients/viewer/browser-host.js` is a build output of `clients/viewer/src/browser-host/index.js`, and one source feeds both the standalone viewer and the extension host.

# Acceptance criteria
- AC1: A document is identified by its reference and its title; its full path is available on demand and is not the most prominent text on the screen, and nothing is uppercased that was not written in capitals.
- AC2: The reader sets its prose at a readable measure, and the width that frees carries navigation rather than nothing.
- AC3: A document's sections are listed so a reader can see how long it is and jump within it, and the reader's position is visible.
- AC4: The reader's linked workflow is visible without being unfolded, and leads to the documents it names.
- AC5: The document reader and the details panel identify a document the same way, rather than each choosing.
- AC6: A modal's dismiss control is a glyph rather than a letter of the body text.
- AC7: An action that creates a document states where the document will be written before it is created.
- AC8: A form's submit action is unavailable until the form can be submitted.
- AC9: Everything else about the new-request modal is preserved: its placeholders, field order, button order and backdrop are not changed.
- AC10: Each filter states what it would narrow rather than restating the size of the corpus, so no two filters read identically when neither is set.
- AC11: The filter panel and the board agree on what is shown, and the panel explains the count the columns display.
- AC12: A control offering a choice is presented as a choice with its options visible, rather than as a disabled field.
- AC13: An action recedes when there is nothing for it to do.
- AC14: The three surfaces hold at 1440x900, 820x1180 and 390x844, and the viewer UI campaign reaches them, proving which surface it captured.
- AC15: Every change is made in the shared browser-host sources and rebuilt, and behaves the same in the standalone viewer and in the extension host.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_087_surfaces_that_read_like_they_were_finished`
- Architecture decision(s): (none yet)

# References
- clients/viewer/index.html
- clients/viewer/viewer.css
- clients/viewer/src/browser-host/index.js
- clients/viewer/src/browser-host/filters.js
- clients/viewer/src/browser-host/util.js
- scripts/build/build-viewer-browser-host.mjs
- tests/helpers/viewer-filter-checks.mjs
- tests/run_local_viewer_visual_smoke.mjs
- logics/external/mockup/reader_modal_filters_redesign.html
- logics/runbook/run_002_build_a_visual_review_and_mockup_from_a_live_viewer.md

# Backlog
- `item_761_stop_the_reader_leading_with_a_path_in_capitals`
- `item_762_make_the_reader_a_place_to_read`
- `item_763_finish_the_new_request_modal_without_redesigning_it`
- `item_764_make_each_filter_say_what_it_would_narrow`
- `item_765_make_the_panel_and_the_board_agree_on_what_is_shown`
- `item_766_cover_the_reader_the_modal_and_the_filter_panel`
