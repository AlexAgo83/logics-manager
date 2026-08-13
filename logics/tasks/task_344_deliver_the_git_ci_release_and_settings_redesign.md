## task_344_deliver_the_git_ci_release_and_settings_redesign - Deliver the Git, CI, Release and Settings redesign
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Baseline the campaign in the clicked-into states, then Git (open on content, then the diff pane, then remove duplication), then CI, then the Release verdict and its gates in that order, then Settings.
- Keywords: remote screens redesign, delivery order, campaign baseline, git diff, ci duration, release verdict, gate vocabulary, settings state
- Use when: Implementing any part of the Git, CI, Release or Settings redesign.
- Skip when: Working on the fleet home (task_341), the project view (task_342), or the fleet root work (task_343).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Extend the campaign first, into the clicked-into states, and record what it reports about today's four screens; that baseline is what proves the rest changed anything.
- [ ] 2. Then Git, in the order the mockup shows: open on content and lead with a verdict, then the commit list and diff pane, then remove what is said twice.
- [ ] 3. Then CI, then Release's verdict, then its gates -- the gate vocabulary depends on the verdict wording, so the two land in that order.
- [ ] 4. Then Settings, which is the most self-contained of the four.
- [ ] 5. Check each screen against `logics/external/mockup/remote_settings_redesign.html`, and do not re-decide the panel framing: it is inherited from item_711.
- [ ] 6. Rebuild the browser host and confirm the standalone viewer and the extension host before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

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
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_731_open_the_git_screen_on_content_and_lead_it_with_a_verdict`. Proof deferred to slice closeout.
- request-AC2 -> `item_731_open_the_git_screen_on_content_and_lead_it_with_a_verdict`. Proof deferred to slice closeout.
- request-AC3 -> `item_732_make_the_commit_list_and_the_diff_pane_readable`. Proof deferred to slice closeout.
- request-AC4 -> `item_732_make_the_commit_list_and_the_diff_pane_readable`. Proof deferred to slice closeout.
- request-AC5 -> `item_732_make_the_commit_list_and_the_diff_pane_readable`. Proof deferred to slice closeout.
- request-AC6 -> `item_733_say_each_git_fact_once`. Proof deferred to slice closeout.
- request-AC1 -> `item_734_report_a_ci_run_by_its_verdict_and_its_duration`. Proof deferred to slice closeout.
- request-AC7 -> `item_734_report_a_ci_run_by_its_verdict_and_its_duration`. Proof deferred to slice closeout.
- request-AC8 -> `item_734_report_a_ci_run_by_its_verdict_and_its_duration`. Proof deferred to slice closeout.
- request-AC9 -> `item_734_report_a_ci_run_by_its_verdict_and_its_duration`. Proof deferred to slice closeout.
- request-AC1 -> `item_735_state_in_one_sentence_whether_the_release_can_proceed`. Proof deferred to slice closeout.
- request-AC10 -> `item_735_state_in_one_sentence_whether_the_release_can_proceed`. Proof deferred to slice closeout.
- request-AC8 -> `item_736_make_the_release_gates_readable_at_a_glance`. Proof deferred to slice closeout.
- request-AC9 -> `item_736_make_the_release_gates_readable_at_a_glance`. Proof deferred to slice closeout.
- request-AC11 -> `item_736_make_the_release_gates_readable_at_a_glance`. Proof deferred to slice closeout.
- request-AC1 -> `item_737_turn_settings_into_controls_with_state`. Proof deferred to slice closeout.
- request-AC12 -> `item_737_turn_settings_into_controls_with_state`. Proof deferred to slice closeout.
- request-AC13 -> `item_737_turn_settings_into_controls_with_state`. Proof deferred to slice closeout.
- request-AC14 -> `item_737_turn_settings_into_controls_with_state`. Proof deferred to slice closeout.
- request-AC15 -> `item_737_turn_settings_into_controls_with_state`. Proof deferred to slice closeout.
- request-AC16 -> `item_738_cover_these_four_screens_in_the_states_an_operator_reaches`. Proof deferred to slice closeout.
- request-AC17 -> `item_738_cover_these_four_screens_in_the_states_an_operator_reaches`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)
