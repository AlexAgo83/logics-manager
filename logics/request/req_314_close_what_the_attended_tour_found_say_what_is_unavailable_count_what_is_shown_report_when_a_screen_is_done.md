## req_314_close_what_the_attended_tour_found_say_what_is_unavailable_count_what_is_shown_report_when_a_screen_is_done - Close what the attended tour found: say what is unavailable, count what is shown, report when a screen is done
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Surfaces that state what just happened
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 22:54:25

# Needs
- Let a menu entry that cannot open anything say so before it is chosen.
- Let the count above the board follow every filter, the search box included.
- Let a screen say when it has finished loading, and stop saying it is still working when it is not.
- Let a control that claims to regroup the board actually regroup it.
- Let a screen reader move through a screen by its headings, not only by its regions.
- Let the campaign catch each of these, since it was green on all of them.

# Context
- An attended pass walked all fourteen navigation targets of the running viewer, measured how long each took to report itself loaded, captured every screen, and recorded console and network problems. The script is kept at `scripts/dev/viewer-tour.mjs` so the pass is repeatable.
- Two menu entries do not open anything. Choosing Translations or Theme leaves the document on the Workshop explorer, with its title still reading Workshop; the only feedback is a line in the status bar saying no convention was detected. From the operator's side the button looks broken.
- Behind those two entries, the server answers HTTP 400 for a project that simply has no i18n or theme convention. A 400 says the request was malformed; the request is fine. The result is two red console errors on every visit to a perfectly ordinary project.
- The count above the board stops following the filters as soon as the search box is used. Typing a query narrowed the board to nine cards, with per-column counts correct at two of two and four of four, while the count kept reading 1337 of 1337 docs shown. The same defect class was fixed for the filter panel; the search path recomputes nothing.
- Two screens never report completion. Terminals and Commands leave the status bar reading Workshop / terminals, with no word of completion, while the twelve others end on loaded. Nothing distinguishes finished from still working. Separately, the status bar was still reading Closing preview after the preview had closed.
- The campaign was green on every one of these. Its count-versus-board check walks the filter selects and never the search box, and nothing looks at whether a status line reaches a terminal state.
- The start-up banner about another logics-manager on PATH warns about something real: an update may act on a copy that is not the one running. It is also two lines on every screen and a third of the display on a phone, permanently. The operator's decision is that it becomes dismissible for the session, and returns on the next one.
- A second, deeper pass found two more. Group by offers Type, Status and Theme and does nothing on the board: it renders one column per stage and never reads the mode, while the grouping it needs is already written and used by the list view. Theme is implemented in neither view. And the interface contains no heading element at all -- zero across every screen -- although its ARIA landmarks are present and correct, and although `req_013` closed the separate gap of naming every icon control.
- That pass also confirmed three things as sound rather than broken: twenty-four `:focus-visible` rules with no positive tabindex, no unnamed control or unlabelled input anywhere, and a minimise-to-dock-and-restore cycle that works end to end. A first report of a missing focus ring was withdrawn: `getComputedStyle` cannot read a pseudo-class, so the measurement was invalid, not the code.
- One tour finding was withdrawn rather than carried here: a report of thirty-five board columns came from a selector that counted each column's sub-elements as columns. The board renders one column per stage, as intended.

# Acceptance criteria
- AC1: A navigation entry that cannot open a screen states why before it is chosen, rather than leaving the previous screen in place.
- AC2: A project with no i18n or theme convention is answered as a normal result, not as a client error, and the console stays clean on it.
- AC3: The count above the board follows every filter, including the search box.
- AC4: Every screen reports when it has finished, and no status line outlives what it describes.
- AC5: The start-up PATH warning can be dismissed for the session and returns on the next one, or sooner if the condition changes.
- AC6: The campaign fails on each of these, so none of them can come back unnoticed.
- AC7: Each behavior leaves behind a test that fails against the current implementation.
- AC8: A control that offers a way to regroup the board changes what the board shows, and offers nothing it does not do.
- AC9: Every screen exposes a heading structure, so a screen reader has something to move between inside a region.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_062_say_what_just_happened`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_057_a_viewer_campaign_that_reports_what_it_saw.md
- logics/product/prod_058_a_filter_that_means_the_board.md
- scripts/dev/viewer-tour.mjs
- docs/runbooks/viewer-ui-campaign.md
- logics_manager/viewer.py

# AI Context
- Summary: Close what the attended tour found: say what is unavailable, count what is shown, report when a screen is done
- Keywords: request-chain-scaffold, close what the attended tour found: say what is unavailable, count what is shown, report when a screen is done, development-ready
- Use when: You need to implement or review the scaffolded workflow for Close what the attended tour found: say what is unavailable, count what is shown, report when a screen is done.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_633_say_what_is_unavailable_before_it_is_chosen`
- `item_634_make_the_count_follow_the_search_box_too`
- `item_635_report_when_a_screen_is_done_and_stop_reporting_what_is_over`
- `item_637_give_every_screen_a_heading_structure`
- `item_636_make_group_by_do_what_it_offers_and_stop_offering_what_it_does_not`
