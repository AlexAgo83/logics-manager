## task_344_deliver_the_git_ci_release_and_settings_redesign - Deliver the Git, CI, Release and Settings redesign
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 01:29:50

# AI Context
- Summary: Baseline the campaign in the clicked-into states, then Git (open on content, then the diff pane, then remove duplication), then CI, then the Release verdict and its gates in that order, then Settings.
- Keywords: remote screens redesign, delivery order, campaign baseline, git diff, ci duration, release verdict, gate vocabulary, settings state
- Use when: Implementing any part of the Git, CI, Release or Settings redesign.
- Skip when: Working on the fleet home (task_341), the project view (task_342), or the fleet root work (task_343).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Extend the campaign first, into the clicked-into states, and record what it reports about today's four screens; that baseline is what proves the rest changed anything.
- [x] 2. Then Git, in the order the mockup shows: open on content and lead with a verdict, then the commit list and diff pane, then remove what is said twice.
- [x] 3. Then CI, then Release's verdict, then its gates -- the gate vocabulary depends on the verdict wording, so the two land in that order.
- [x] 4. Then Settings, which is the most self-contained of the four.
- [x] 5. Check each screen against `logics/external/mockup/remote_settings_redesign.html`, and do not re-decide the panel framing: it is inherited from item_711.
- [x] 6. Rebuild the browser host and confirm the standalone viewer and the extension host before closeout.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_731_open_the_git_screen_on_content_and_lead_it_with_a_verdict`
- `item_732_make_the_commit_list_and_the_diff_pane_readable`
- `item_733_say_each_git_fact_once`
- `item_734_report_a_ci_run_by_its_verdict_and_its_duration`
- `item_735_state_in_one_sentence_whether_the_release_can_proceed`
- `item_736_make_the_release_gates_readable_at_a_glance`
- `item_737_turn_settings_into_controls_with_state`
- `item_738_cover_these_four_screens_in_the_states_an_operator_reaches`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_731_open_the_git_screen_on_content_and_lead_it_with_a_verdict`. Proof: measured at 1440x900 on this repository -- the Git screen leads with `43 commits ready to push. 10 files changed here are not part of them.` and a Push button, where a large `Clean` tile used to sit beside `Ahead 5` as a small pill.
- request-AC2 -> `item_731_open_the_git_screen_on_content_and_lead_it_with_a_verdict`. Proof: the opening domain is the first one that has something in it, history as the fallback. `changes` was hardcoded in three places -- the markup, `applyGitDomain`'s fallback and `previous.domain` on a fresh open -- and the one that won was the one nobody would look at, so fixing only the markup changed nothing on screen. Verified with a clean-tree payload: the screen opens on History, not on two blank panes.
- request-AC3 -> `item_732_make_the_commit_list_and_the_diff_pane_readable`. Proof: `white-space: nowrap` and `word-break: keep-all` on the hash, verified in a live viewer; and the document panel prints the screen title once, verified by removing the Settings hero that repeated it.
- request-AC4 -> `item_732_make_the_commit_list_and_the_diff_pane_readable`. Proof: the diff render starts at the first hunk -- verified against the live corpus, zero `--meta` lines and a first line of `@@ -7517,209 +7517,220 @@`. Additions, deletions and hunk headers keep their distinct classes, which the stylesheet colours. A truncated diff carries `Load the rest of this diff`, taking the same `full` escape hatch the file preview has always had; `canForce` turns itself off once the forced ceiling is hit.
- request-AC5 -> `item_732_make_the_commit_list_and_the_diff_pane_readable`. Proof: a path is truncated from the front (`direction: rtl` with `unicode-bidi: plaintext`), so the basename survives; the per-file change size was already rendered and selecting a file already scoped the diff, both confirmed rather than rebuilt.
- request-AC6 -> `item_733_say_each_git_fact_once`. Proof: the `Remote` domain is retired -- its entire content was `Tracking <ref>` and `Ahead N, behind M`, both printed verbatim in the tiles above it -- and the `Files` tile is retired, since its three counts are the domain rail below it, which is also the control that scopes the list. The regression asserts the five remaining domains by name and that no `remote` panel exists.
- request-AC1 -> `item_734_report_a_ci_run_by_its_verdict_and_its_duration`. Proof: the CI screen leads with `Failed in 4m 12s, N ago.` where four metric tiles sat, and the tiles compact into a strip below it. Covered by a regression asserting the verb and the duration.
- request-AC7 -> `item_734_report_a_ci_run_by_its_verdict_and_its_duration`. Proof: the run and every job report a duration computed from the two ends the payload already carried, with a relative time and the absolute stamp on the tooltip. Covered by a regression asserting `4m 12s` on the run and `3m` on the failing job.
- request-AC8 -> `item_734_report_a_ci_run_by_its_verdict_and_its_duration`. Proof: **the job tones never worked.** `ciBadgeTone` takes a badge state and the rows were feeding it a raw GitHub conclusion, so every job on the CI *and* the Release screens resolved to `unknown` and every row was drawn identically. `ciStateFromStatus` mirrors `logics_manager/viewer.py::_ci_badge_state`; the regression asserts the tones are `failing` and `passing` and never `unknown`.
- request-AC9 -> `item_734_report_a_ci_run_by_its_verdict_and_its_duration`. Proof: failures lead, unresolved follow, and passing jobs collapse behind a native `<details>` that states how many -- keyboard-reachable without a handler of its own. The same renderer serves both screens, which is what delivers the Release side of this criterion.
- request-AC1 -> `item_735_state_in_one_sentence_whether_the_release_can_proceed`. Proof: the Release screen leads with `Blocked by local_validation: evidence targets a different commit. 5 of 5 gates have evidence.` and the next action beneath it.
- request-AC10 -> `item_735_state_in_one_sentence_whether_the_release_can_proceed`. Proof: the verdict names the blocking gate, quotes its own reason and states the evidence count in one sentence, so `blocked`, `pass` and `8/8` stop sitting side by side unexplained. The `Next action` row is gone from the list below, since the verdict carries it.
- request-AC8 -> `item_736_make_the_release_gates_readable_at_a_glance`. Proof: each gate carries a tone class from `releaseBadgeTone` and the blocking one carries a border, so state is form and colour rather than a repeated string. The release jobs share the CI screen's renderer, which is where the same defect was fixed for both.
- request-AC9 -> `item_736_make_the_release_gates_readable_at_a_glance`. Proof: the blocking gate leads the list and is the only one rendered open; the regression asserts both, and that every other gate is closed. The passing release jobs collapse to a counted line through the shared renderer.
- request-AC11 -> `item_736_make_the_release_gates_readable_at_a_glance`. Proof: one word per gate state from `releaseBadgeTone`; the blocking gate leads, is marked by form and is the only one expanded; a substate is shown only when it says something the id does not; and `optional` is stated beside a gate that is not passing, because what it changes is the meaning of a failure.
- request-AC1 -> `item_737_turn_settings_into_controls_with_state`. Proof: the Settings screen opens on an identity block stating what this viewer is -- address, mode, transport, version, project and the connector's position -- where nine identical buttons used to be the whole screen.
- request-AC12 -> `item_737_turn_settings_into_controls_with_state`. Proof: `/api/viewer-info` serves the address, mode, transport, version and project off the server object -- the values the launch banner has always printed to stdout, where a browser cannot read them -- and the connector's position comes from the endpoint that already answers it.
- request-AC13 -> `item_737_turn_settings_into_controls_with_state`. Proof: the automatic-refresh control is a `role="switch"` with `aria-checked` and a visible `On`/`Off`, so where it sits is read rather than inferred from a small square.
- request-AC14 -> `item_737_turn_settings_into_controls_with_state`. Proof: `Stop viewer` carries `This page stops working until you restart it from a terminal` and a danger border, where it used to be drawn exactly like `Insights`, a link. The confirmation was already there -- `controlViewerServer` has always shown a modal -- so this confirms it rather than adding a second one.
- request-AC15 -> `item_737_turn_settings_into_controls_with_state`. Proof: Insights, Health and Getting Started are gone from Settings along with their dispatch lines; the navigation already offers all three.
- request-AC16 -> `item_738_cover_these_four_screens_in_the_states_an_operator_reaches`. Proof: the campaign visits the Git screen, its History domain, CI, Release and Settings at 1440x900, 820x1180 and 390x844, applying the existing layout checks -- 238 checks, no findings. Coverage proven load-bearing by renaming `data-viewer-git-domain` and watching both Git surfaces fail. It also caught a real regression during this task: a 404 on `/api/viewer-info` failed `console is clean` on all three viewports.
- request-AC17 -> `item_738_cover_these_four_screens_in_the_states_an_operator_reaches`. Proof: every change is in `clients/viewer/src/browser-host/` and `logics_manager/`, rebuilt with `npm run bundle:viewer-host` after each; the extension webview loads the same built host, and no screen in this task carries markup that only one surface produces.

# Validation
- `npx vitest run`: 882 passed across 82 files. Every regression this task added was proven load-bearing by reintroducing the defect it covers.
- `python3 -m pytest tests/python`: 1365 passed, including the diff-continuation payload.
- Viewer UI campaign at the three viewports: 238 checks, no findings -- and one real catch during the task, a 404 that failed `console is clean` on every viewport.
- `npm run lint`: clean, including the line budget and the function-length gate.
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_731_open_the_git_screen_on_content_and_lead_it_with_a_verdict`, `item_732_make_the_commit_list_and_the_diff_pane_readable`, `item_733_say_each_git_fact_once`, `item_734_report_a_ci_run_by_its_verdict_and_its_duration`, `item_735_state_in_one_sentence_whether_the_release_can_proceed`, `item_736_make_the_release_gates_readable_at_a_glance`, `item_737_turn_settings_into_controls_with_state`, `item_738_cover_these_four_screens_in_the_states_an_operator_reaches`
- Related request(s): `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`

# Links
- Request: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)
