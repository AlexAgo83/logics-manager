## req_365_say_the_viewer_is_working_wherever_the_operator_is_looking - Say the viewer is working, wherever the operator is looking
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer polish
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 11:47:46

# AI Context
- Summary: req_360's ring answers only the case where a screen is open, and it rotates for the load's whole duration -- on a 12ms cached answer it is shown and hidden inside a frame, on a 2.7s one it holds the eye to say 'still going'. Adds the missing case (a load with no screen), a threshold below which nothing appears, plus the roadmap/runbook accent omission and the phone header's button grid.
- Keywords: loading feedback, status spinner, header sheen, loading ring, stage accent, roadmap colour, mobile header menu
- Use when: Changing any loading affordance in the viewer, or adding a stage colour.
- Skip when: Anything about how long a load takes -- that is req_366. This is only about saying that one is happening.

# Needs
- As an operator, I need to see that the viewer is working when the load has no screen to draw on, instead of a status line whose text quietly changes.
- As an operator, I need the loading animation to mark that a load started rather than run for as long as it lasts, so a long screen does not hold my attention for the whole wait to tell me nothing.
- As an operator, I need a roadmap document to carry its own colour like every other stage.
- As an operator on a phone, I need the header's controls behind one menu button on the selector's own row, instead of a two-column grid of buttons taking a block of the screen.

# Context
- req_360 shipped a loading ring on the document header, coloured by the stage or a decided neutral. It answered the case where a screen is open, and only that case: a load that has no screen open changes the status line's text and gives no other signal.
- The ring rotates for as long as the load lasts. Measured on this corpus, Corpus insights takes about 2.7s cold, which is roughly a lap and a half of a 1.8s rotation -- long enough for the motion to become a clock the operator cannot read, since it says 'still going' and nothing an operator can act on.
- Nothing gates the ring on duration. The audit cache added by req_364 answers in 12ms on a second look, so the ring is now shown and hidden inside a single frame for most loads -- an appearance the eye catches only as a glitch.
- A proposal for both is prototyped in logics/external/mockup/loading_feedback_proto.html: a spinner beside (not instead of) the status text, a slow low-alpha sheen across the header's own background, and a ring that travels one eased lap and hands over to a steady dimmed outline until the payload lands. Both under prefers-reduced-motion fallbacks.
- The board's stage accents stop at `spec`: `.card[data-stage="roadmap"]` and `.card[data-stage="runbook"]` have no border-left-color rule, so both draw the grey base while their colour tokens (`--stage-color-roadmap`, `--stage-color-runbook`) already exist and are used elsewhere. The same omission was found and fixed for the progress bar in item_790; the accent's copy of the list was missed.
- At 420px and below, `.viewer-topbar__actions` lays its screen buttons out as `repeat(2, minmax(0, 1fr))` -- a block of the viewport spent on navigation, on the viewport with the least to spare.

# Acceptance criteria
- AC1: A load with no document screen open is visible in the status line: a spinner beside the message rather than replacing it, and the header's own background carrying a slow low-alpha sheen in the same loading colour.
- AC2: The document header's ring travels one lap and then holds a steady dimmed outline until the load ends, instead of rotating for the load's whole duration.
- AC3: No loading affordance is shown for a load that resolves quickly -- a threshold below which nothing appears at all, so a cached answer does not flash a spinner.
- AC4: Every stage with a colour token carries it on the board's card accent, roadmap and runbook included, and nothing is left to derive the list a second time.
- AC5: At phone widths the header's screen buttons are one menu button on the project selector's own row, opening the navigation the viewer already has rather than a second copy of it.
- AC6: Every animation added here has a `prefers-reduced-motion: reduce` fallback that removes travel rather than only slowing it.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_096_a_viewer_that_says_what_it_is_doing`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_020_local_web_viewer_for_cli_driven_logics_work.md
- logics/external/mockup/loading_feedback_proto.html
- clients/viewer/viewer.css
- clients/viewer/src/browser-host/index.js
- clients/shared-web/media/css/board.css

# Backlog
- `item_809_show_a_load_that_has_no_screen_to_draw_on`
- `item_810_one_lap_then_a_resting_outline_and_nothing_at_all_for_a_short_load`
- `item_811_give_every_stage_with_a_colour_token_its_accent`
- `item_812_one_menu_button_on_the_phone_header`
