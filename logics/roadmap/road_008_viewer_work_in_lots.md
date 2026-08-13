## road_008_viewer_work_in_lots - Viewer work in lots
> Date: 2026-08-13
> Status: Proposed
> Related product: (none yet)
> Related request: `req_344_make_the_fleet_home_read_as_the_product_s_first_screen`
> Reminder: Update status, milestone scope, linked refs, risks, and success signals when you edit this doc.
> Indicators reviewed: 2026-08-13 21:38:10

# AI Context
- Summary: Ten viewer requests and 62 backlog items sequenced into five lots by what each one waits on, not by version: defects first, then the decisions that unblock the rest, then the surfaces in order of how often an operator meets them.
- Keywords: viewer lots, delivery order, defects first, blocking decisions, campaign harness, panel framing, adr_029, no version numbers
- Use when: Choosing what to pick up next across the ten active viewer chains, or checking whether something can start yet.
- Skip when: You need the detail of one request; read that request instead.

# Summary
Ten requests were opened against the viewer in a single day, and an eleventh was split out of one of them during delivery, from five passes of visual review
plus three defect investigations. They are not independent: five of them are drawn on answers that
do not exist yet, four inherit a framing decision from a fifth, and eight of them each carry their
own copy of the same campaign work. This line groups them into lots ordered by what each one is
waiting for.

Lots, not versions. Nothing here promises a release boundary and no lot is sized to a milestone;
a lot is finished when the thing that made it a lot is true.

The `0.1` to `0.5` prefixes on the headings below are an ordering artefact, not version numbers.
`logics-manager flow roadmap validate` requires each milestone heading to begin with a dotted
number (`^## \d+(?:\.\d+){1,2}\s+-\s+`), so a roadmap of lots cannot be expressed without one.
The prefix carries the sequence and nothing else -- no release, no scope, no size.

# Milestones
## 0.1 - Lot 1: What is already broken for the operator
- Goal: Every defect an operator meets today is gone, and nothing in this lot waits on a decision.
- Scope: `req_354_stop_a_slow_screen_from_rendering_over_the_one_the_operator_moved_to` (found during delivery, and the workaround for it currently lives in the test harness rather than the product); `req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact` (the demo board ships on npm and VSIX today); `req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update`; from `req_346`, the picker recovery and making a failed action visible; from `req_350`, the colour-scheme declaration.
- Delivered 2026-08-13, except `req_354`, which was opened during Lot 3 for two defects the delivery ran into. `req_343`, `req_344` and `req_348` are Done. `req_343`'s AC6 was amended with the operator's approval -- the demo gate reads no filesystem state, so an invariant test replaced the build-and-inspect regression, and the broader need that AC expressed became `req_353_prove_a_published_artifact_contains_only_the_product` in Lot 5.
- Why first: none of it needs a design answer, all of it is either shipping broken or a few lines. The colour-scheme declaration in particular improves every screen in the product, including ones nobody has reviewed, and should not wait behind any redesign.
- Exit signal: an operator can add a fleet root, sees why an action failed, is not told to run an update they already ran, no release contains the demo board, and no control renders as a light-mode widget.

## 0.2 - Lot 2: The answers the rest depends on
- Goal: Every question that a later lot would otherwise have to guess at is answered and recorded.
- Scope: `item_716` (can the payload support chain threads and document lifelines); `item_746` (which workflow signals are defects and which are the normal state of work in flight); `item_728` (what `--fleet` actually decides); `item_767` (the second channel each colour-carried state uses); `item_711` (the panel framing, decided once and inherited); and the campaign harness, built by whichever of the eight campaign items is delivered first, per `adr_029`.
- Why second: five design items are drawn on these answers, and drawing before them encodes a guess. This lot produces almost no visible change, which is the point.
- Exit signal: each answer is written where the lots that need it can act on it, and the campaign can reach a screen, wait for it, prove which one it captured, and apply the layout checks.
- Delivered 2026-08-13. `item_716` answered by measurement, `item_767` and the two product decisions (`item_728`, `item_746`) taken and recorded as revisable, `item_711` shipped, and the harness built in `item_715` -- which immediately found that the layout checks assumed the board was the visible surface.

## 0.3 - Lot 3: The first screen and the board
- Goal: The two surfaces an operator meets most are the ones the redesigns have reached.
- Scope: the remainder of `req_344_make_the_fleet_home_read_as_the_product_s_first_screen`; `req_345_make_the_project_view_lead_with_the_work_that_is_live` in full, including list mode, the phone layouts, the details panel and the activity feed.
- Why third: the framing settled in Lot 2 lands here first and is inherited by everything after, and the board is where 91.5% of a corpus is finished and 13 items are live.
- Exit signal: the fleet home is a destination rather than a panel over an unchosen project, and the board opens on live work in either mode at any width.

## 0.4 - Lot 4: The operational screens
- Goal: Every screen opened with a question states its answer.
- Scope: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`; `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`, including the load-time measurement.
- Why together: both deliver the same shape -- a verdict in a sentence, the action beside it, the facts still available. Split across lots they become two implementations of it, which is exactly what `adr_029` exists to prevent.
- Exit signal: Git says whether you can push, CI says whether it passed and how long it took, Release says whether it can ship and why not, Settings says what this viewer is, and the health screens count only what needs a decision.

## 0.5 - Lot 5: The remaining surfaces, and the conditions held
- Goal: The surfaces nobody revisits are finished, and the conditions the earlier lots inherited are proven rather than assumed.
- Scope: the remainder of `req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens`; `req_351_make_the_reader_readable_and_the_filter_panel_say_something`; the remainder of `req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse`; the remainder of `req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing`; `req_353_prove_a_published_artifact_contains_only_the_product`.
- Why last: lower traffic, and `req_352`'s keyboard and focus work can only be verified against controls that have landed. The CodeQL alert sits here because it is not exploitable and its fix is an alignment with a sibling handler, not a mitigation. `req_353` sits here rather than in Lot 1 because the defect it was split from is already fixed -- what remains is the class, and a check written before the dev-only definition exists would encode a list.
- Exit signal: no screen carries state by colour alone, every control the redesigns added is reachable from the keyboard, and the campaign fails when either stops being true.

## 0.6 - Lot 6: What the outside world is shown
- Goal: The published documentation shows the product these lots produced, rather than the one they replaced.
- Scope: `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`.
- Why last: it documents screens, so it can only be correct once the screens are final. Raised by the operator mid-delivery, 2026-08-13, on the grounds that recapturing early produces a second set of images to redo. Checking it turned up more than staleness: two of the four captures are captioned as showing the demo corpus that `req_343` removed from released artifacts, and the prose still calls the companion stages columns, which `req_345` changed.
- Exit signal: every capture in the README shows a screen a released build will actually draw, the prose beside it says what that screen does, and how each capture was produced is written down -- nothing produces them today, which is why they went stale in silence.

# Sequencing
- Lot 1 can start immediately and in any internal order; nothing in it blocks anything else in it.
- Lot 2 gates Lots 3, 4 and 5. Its six answers can be produced in parallel by different people.
- Lot 3 and Lot 4 can overlap once Lot 2's framing answer exists, but the framing must not be re-decided in Lot 4 -- `req_347` states this and `adr_029` binds it.
- Lot 6 must follow every other lot without exception: it photographs the result, so any screen still in flight makes it wrong. It is cheap and short, and it is the only lot whose value is entirely outside the repository.
- Lot 5 must follow Lot 3 and Lot 4, because two of its five items verify what those lots produced. `req_353` is the exception: it depends on nothing in Lots 2 to 4 and could be pulled forward if release hygiene becomes urgent.
- Across every lot: the campaign harness is built once, by the first campaign item to land, and consumed by the seven that follow. A second harness is a review finding, not a variation.
- Across every lot: new interface state goes in the existing preference store under `req_315`'s user-versus-repository ruling, and the line budget binds without any request restating it.

# Risks
- **The campaign items are the ordering hazard.** Eight of them each say "before the redraws", and they are spread across seven requests. If two are started at once, the harness is written twice. `adr_029` names the rule; the lot boundaries are what make it observable.
- **Lot 2 produces nothing an operator can see**, which makes it the lot most likely to be skipped under pressure. Skipping it does not remove the work; it moves it into a screen as a guess that later has to be found and undone.
- **The colour and keyboard conditions arrive last and apply throughout.** Placing them in Lot 5 is a deliberate trade: they can only be verified against landed controls, but the earlier lots must build with them in mind. The two campaign checks in `item_769` are what keeps that from being a memo -- if they land early, they enforce; if they land late, they audit.
- **Three lots depend on decisions a person has to take, not code.** `item_746` in particular is a product judgement about which signals mean something is wrong. Nobody can be blocked politely on that for long, so it should be the first thing Lot 2 answers.
- **The demo board in Lot 1 was already shipping.** Fixed 2026-08-13; every release cut before then carries it.
- **Delivery finds defects the reviews did not.** `req_354` exists because the campaign harness, built in Lot 2, reported one screen while standing on another. Lots 3 to 5 should expect the same and leave room for it rather than treating the lot contents as fixed.
- **Nothing watches the published captures.** No script writes to `docs/media/`, so the four README images went a full redesign cycle out of date without anything reporting it, and two of them still advertise a corpus a release no longer ships. Lot 6 fixes the images; whether anything stops it recurring is a decision inside it.
- **`req_353` is the class the demo board was an instance of.** Nothing defines dev-only, so nothing stops the next development affordance from being gated on an inference. Leaving it in Lot 5 is a bet that no such affordance is added first.

# References
- Related product: (none yet)
- Related request: `req_344_make_the_fleet_home_read_as_the_product_s_first_screen`
- Governed by: `logics/architecture/adr_029_land_the_viewer_redesigns_on_the_shared_declaration_points.md`
- Method behind the reviews these lots deliver: `logics/runbook/run_002_build_a_visual_review_and_mockup_from_a_live_viewer.md`
- All eleven chains: `logics/request/req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact.md`, `logics/request/req_345_make_the_project_view_lead_with_the_work_that_is_live.md`, `logics/request/req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing.md`, `logics/request/req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question.md`, `logics/request/req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update.md`, `logics/request/req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print.md`, `logics/request/req_350_theme_the_viewer_s_native_controls_and_finish_the_workshop_and_cdx_screens.md`, `logics/request/req_351_make_the_reader_readable_and_the_filter_panel_say_something.md`, `logics/request/req_352_keep_the_viewer_redesigns_legible_without_colour_and_reachable_without_a_mouse.md`, `logics/request/req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land.md`
