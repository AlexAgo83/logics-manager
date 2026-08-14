## task_346_deliver_the_corpus_health_and_onboarding_screens - Deliver the corpus, health and onboarding screens
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 10:28:44

# AI Context
- Summary: Classify the signals first, baseline the campaign with wait-and-prove, then Validation health, then Corpus insights, then Getting Started -- checking each against the mockup and inheriting the panel framing.
- Keywords: delivery order, signal classification, campaign baseline, validation health, corpus insights, getting started
- Use when: Implementing any part of the Corpus insights, Validation health or Getting Started work.
- Skip when: Working on the other viewer tasks (task_341 to task_345).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Settle the signal classification first: it is a product decision, and the insights grouping cannot be drawn without it.
- [x] 2. Extend the campaign next, with the wait-and-prove behaviour, and record what it reports about today's three screens as the baseline.
- [x] 3. Then Validation health, which is the least trusted of the three and the cheapest to make trustworthy: verdict, grouping, suspect findings, then the action's scope.
- [x] 4. Then Corpus insights, which depends on the classification.
- [x] 5. Then Getting Started, which is self-contained: measure and navigation first, then the per-stage counts.
- [x] 6. Check each against `logics/external/mockup/insights_health_onboarding_redesign.html`, and inherit the panel framing rather than re-deciding it.
- [x] 7. Rebuild the browser host and confirm both surfaces before closeout.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight`
- `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`
- `item_748_give_corpus_insights_one_visual_language`
- `item_749_lead_validation_health_with_the_verdict_it_owns`
- `item_750_group_the_findings_and_flag_what_the_repository_contradicts`
- `item_751_say_what_applying_fixes_would_change`
- `item_752_give_getting_started_a_reading_measure_and_a_position`
- `item_753_make_getting_started_reflect_the_project_in_front_of_it`
- `item_754_cover_the_three_screens_including_how_slowly_they_load`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight`. Proof: item_746 classifies each signal and records the rule with its reasoning: a signal is a defect when it describes something that cannot resolve itself, work in flight when time alone resolves it. Broken references and orphans are defects; incomplete chains and promotion gaps are in flight, then defects after 14 days. The threshold is recorded as a guess with nothing measured behind it, because item_716 established no per-beat dates exist.
- request-AC2 -> `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`. Proof: the headline counts blocked + overdue chains + broken references + missing status + quality findings; chains still in flight get their own row with the threshold named in the label. Covered by a regression that opens the same three chains twice, aged differently, and asserts the headline differs by exactly two -- an assertion that reads the count off the headline and compares it to itself passes whether or not the classification runs, which the first version did.
- request-AC3 -> `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`. Proof: `Needs attention` is the sum of the signals listed below it and sat in the tile row as though it were one more of them. It is labelled `Needs attention (total)`.
- request-AC4 -> `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`. Proof: a row said its id and its status and never why it was on the list. The same renderer serves several lists and a document can appear under more than one signal, so the row carries the signal that listed it -- on Corpus insights and on Validation health's workflow groups, where the section heading is out of view once the reader has scrolled.
- request-AC5 -> `item_748_give_corpus_insights_one_visual_language`. Proof: the board's stage palette became `--stage-color-*` tokens declared once in `board.css`, and the insights bars carry their stage so those tokens apply. Verified in a live viewer: seven distinct colours across eight stage bars, matching the board. Copying the six values into a second stylesheet would have made a seventh place they must agree.
- request-AC6 -> `item_749_lead_validation_health_with_the_verdict_it_owns`. Proof: Validation health leads with its own verdict -- measured live, `Nothing blocks. 79 warnings and 1 workflow signal to look at.` -- and the `Release ready` tile is gone, replaced by a line naming the screen that owns the gate. Restating another screen's answer in a second vocabulary invites two screens to disagree.
- request-AC7 -> `item_750_group_the_findings_and_flag_what_the_repository_contradicts`. Proof: findings are grouped by file, the file carries its own count, and the finding is the headline of its own row. Measured live: 13 groups where there were 87 flat rows.
- request-AC8 -> `item_750_group_the_findings_and_flag_what_the_repository_contradicts`. Proof: a finding that says a document is missing while the corpus in front of the viewer lists it is marked suspect with the contradiction named. The finding and its words stay, because the viewer reports and does not adjudicate. The check is narrow on purpose -- it fires only on a missing/absent phrasing naming a `.md` path the corpus lists -- because a broader rule would start marking findings it does not understand.
- request-AC9 -> `item_751_say_what_applying_fixes_would_change`. Proof: `Apply fixes` asks the server what it would change, names the documents in a confirmation, and applies only if the operator agrees. The preview and the repair are one `audit_payload` call taking `autofix_dry_run`, not two implementations: a separate counter would have been free to disagree with what the button does. Proven by removing the dry-run guard and watching the preview write.
- request-AC10 -> `item_752_give_getting_started_a_reading_measure_and_a_position`. Proof: the prose takes a 68ch measure and the width that frees carries the screen's own stage navigation. Measured live at 1440x900: the paragraph column is 454px, roughly 60 characters, inside the 45-75 band, with no sideways scroll.
- request-AC11 -> `item_752_give_getting_started_a_reading_measure_and_a_position`. Proof: the screen states four stages and each stage says which one it is (`1 of 4`). Every stage ends in an action -- `Delivery Slices` ended in nothing, so the guide stopped being a sequence at its second step -- and no action is offered twice: `Open Health` sat in the Closeout stage and again in the footer.
- request-AC12 -> `item_753_make_getting_started_reflect_the_project_in_front_of_it`. Proof: each stage reports what this project already has there, from counts the screen already received. Measured live: `354 request, 92 product, 8 roadmap`, then 780 backlog, 348 task, 30 architecture. A stage with nothing yet is marked because it is the one worth reading first; nothing is hidden for having plenty.
- request-AC13 -> `item_754_cover_the_three_screens_including_how_slowly_they_load`. Proof: all three screens hold at 1440x900, 820x1180 and 390x844 under the campaign's existing layout checks. They had been visited since item_715 but skipped by the slow-check flag on every run, so they were covered in name only.
- request-AC14 -> `item_754_cover_the_three_screens_including_how_slowly_they_load`. Proof: the campaign waits for the screen's title *and* for the loading marker to be gone. The title alone is not the screen: item_770 gives these screens a placeholder carrying the final title while the scans run, so a check stopping at the title would assert on the placeholder.
- request-AC15 -> `item_754_cover_the_three_screens_including_how_slowly_they_load`. Proof: every change is in `clients/viewer/src/browser-host/`, `clients/shared-web/media/css/board.css` and `logics_manager/`, rebuilt with `npm run bundle:viewer-host` after each; the extension webview loads the same built host and the same board stylesheet.
- request-AC16 -> Delivered by `task_355_measure_how_long_these_screens_take_and_say_so_while_they_load` under the same request. Proof: measured 2026-08-14 against 1 614 workflow documents at 1440x900 through CDP, three runs, two warm and one against a freshly started server: Corpus insights 7 551-8 320 ms to useful content, Validation health 8 056-8 609 ms, Getting Started 4-6 ms. Cold and warm measured in the same band, so the cost is the scan and nothing is being cached. Recorded as a table in `item_770`.
- request-AC17 -> Delivered by `task_355_measure_how_long_these_screens_take_and_say_so_while_they_load` under the same request. Proof: the two slow screens take their place immediately and name what they are waiting for; the title lands in 14 ms and 5 ms where it used to take the whole scan. The placeholder goes up before the view token is taken, because `setDocument` invalidates pending views and announcing the load after `beginView()` cancelled the very load it announced.
- request-AC18 -> Delivered by `task_355_measure_how_long_these_screens_take_and_say_so_while_they_load` under the same request. Proof: time-to-useful after every change in this request is 8 320 ms and 8 609 ms, inside the band measured before it. The measurement script excludes the placeholder when deciding a screen is useful; counting it would have reported a false improvement of eight seconds.
# Validation
- `npx vitest run`: 888 passed across 82 files. Every regression this task added was proven load-bearing by reintroducing the defect it covers -- including one that was **not**: the first headline regression read the count off the headline and compared it to itself, so it stayed green with the classification removed. It compares two corpora now.
- `python3 -m pytest tests/python`: 1365 passed, including the autofix dry run.
- Viewer UI campaign at 1440x900, 820x1180 and 390x844: the three screens run rather than being skipped by the slow-check flag, 322 checks.
- `npm run lint`: clean, including the line budget and the function-length gate.
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight`, `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`, `item_748_give_corpus_insights_one_visual_language`, `item_749_lead_validation_health_with_the_verdict_it_owns`, `item_750_group_the_findings_and_flag_what_the_repository_contradicts`, `item_751_say_what_applying_fixes_would_change`, `item_752_give_getting_started_a_reading_measure_and_a_position`, `item_753_make_getting_started_reflect_the_project_in_front_of_it`, `item_754_cover_the_three_screens_including_how_slowly_they_load`
- Related request(s): `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`

# Links
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
