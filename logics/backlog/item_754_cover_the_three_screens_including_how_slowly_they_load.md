## item_754_cover_the_three_screens_including_how_slowly_they_load - Cover the three screens, including how slowly they load
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 10:28:43

# AI Context
- Summary: None of the three is covered, and all load slowly enough that a capture seven seconds after the click returned the previous screen with a loading message -- so a check that does not wait asserts on whatever is there.
- Keywords: campaign coverage, slow loading screens, wait for screen, prove which screen, three viewports
- Use when: Extending the campaign to Corpus insights, Validation health or Getting Started, or to any slow-loading screen.
- Skip when: New check kinds beyond what the layout checks already provide.

# Problem
- None of these three is covered. They also load slowly enough that a capture taken seven seconds after the click returned the previous screen with a loading message -- so a check that does not wait for the screen it means to assert on will assert on whatever is there.

# Scope
- In:
  - Reach all three, wait for each to finish loading, and prove which screen was captured before asserting.
  - Apply the existing layout checks at the three viewports.
  - Do this before the redraws, so the checks observe the change.
  - Confirm both surfaces after rebuilding the shared sources.
- Out:
  - New check kinds beyond what the layout checks already provide.

# Delivery notes
- All three screens were already visited by the campaign, added by `item_715`, but skipped by the slow-check flag on every run -- so they were covered in name and never exercised. They run now at all three viewports: 322 checks, no findings.
- **The wait was on the title, and the title is not the screen.** `item_770` gives these screens a placeholder that carries the final title while the scans run, so a check stopping at the title would assert on the placeholder. The campaign waits for `[data-viewer-screen-loading]` to be gone as well, which is the same rule `run_002` records: prove which screen you captured, and prove it has finished.
- Delivered before the redraws, as the slice asks, so the checks will observe them.

# Acceptance criteria
- AC13: All three hold at the three viewports.
- AC14: The campaign waits for the screen and proves which one it captured.
- AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

# AC Traceability
- request-AC13 -> This backlog slice. Proof: AC13: All three hold at the three viewports.
- request-AC14 -> This backlog slice. Proof: AC14: The campaign waits for the screen and proves which one it captured.
- request-AC15 -> This backlog slice. Proof: AC15: Changes are made in the shared sources, rebuilt, and behave the same in both surfaces.

- request-AC1 -> Delivered by `item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight` under the same request. Proof: item_746 classifies each signal and records the rule with its reasoning: a signal is a defect when it describes something that cannot resolve itself, work in flight when time alone resolves it. Broken references and orphans are defects; incomplete chains and promotion gaps are in flight, then defects after 14 days. The threshold is recorded as a guess with nothing measured behind it, because item_716 established no per-beat dates exist.
- request-AC2 -> Delivered by `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision` under the same request. Proof: the headline counts blocked + overdue chains + broken references + missing status + quality findings; chains still in flight get their own row with the threshold named in the label. Covered by a regression that opens the same three chains twice, aged differently, and asserts the headline differs by exactly two -- an assertion that reads the count off the headline and compares it to itself passes whether or not the classification runs, which the first version did.
- request-AC3 -> Delivered by `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision` under the same request. Proof: `Needs attention` is the sum of the signals listed below it and sat in the tile row as though it were one more of them. It is labelled `Needs attention (total)`.
- request-AC4 -> Delivered by `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision` under the same request. Proof: a row said its id and its status and never why it was on the list. The same renderer serves several lists and a document can appear under more than one signal, so the row carries the signal that listed it -- on Corpus insights and on Validation health's workflow groups, where the section heading is out of view once the reader has scrolled.
- request-AC5 -> Delivered by `item_748_give_corpus_insights_one_visual_language` under the same request. Proof: the board's stage palette became `--stage-color-*` tokens declared once in `board.css`, and the insights bars carry their stage so those tokens apply. Verified in a live viewer: seven distinct colours across eight stage bars, matching the board. Copying the six values into a second stylesheet would have made a seventh place they must agree.
- request-AC6 -> Delivered by `item_749_lead_validation_health_with_the_verdict_it_owns` under the same request. Proof: Validation health leads with its own verdict -- measured live, `Nothing blocks. 79 warnings and 1 workflow signal to look at.` -- and the `Release ready` tile is gone, replaced by a line naming the screen that owns the gate. Restating another screen's answer in a second vocabulary invites two screens to disagree.
- request-AC7 -> Delivered by `item_750_group_the_findings_and_flag_what_the_repository_contradicts` under the same request. Proof: findings are grouped by file, the file carries its own count, and the finding is the headline of its own row. Measured live: 13 groups where there were 87 flat rows.
- request-AC8 -> Delivered by `item_750_group_the_findings_and_flag_what_the_repository_contradicts` under the same request. Proof: a finding that says a document is missing while the corpus in front of the viewer lists it is marked suspect with the contradiction named. The finding and its words stay, because the viewer reports and does not adjudicate. The check is narrow on purpose -- it fires only on a missing/absent phrasing naming a `.md` path the corpus lists -- because a broader rule would start marking findings it does not understand.
- request-AC9 -> Delivered by `item_751_say_what_applying_fixes_would_change` under the same request. Proof: `Apply fixes` asks the server what it would change, names the documents in a confirmation, and applies only if the operator agrees. The preview and the repair are one `audit_payload` call taking `autofix_dry_run`, not two implementations: a separate counter would have been free to disagree with what the button does. Proven by removing the dry-run guard and watching the preview write.
- request-AC10 -> Delivered by `item_752_give_getting_started_a_reading_measure_and_a_position` under the same request. Proof: the prose takes a 68ch measure and the width that frees carries the screen's own stage navigation. Measured live at 1440x900: the paragraph column is 454px, roughly 60 characters, inside the 45-75 band, with no sideways scroll.
- request-AC11 -> Delivered by `item_752_give_getting_started_a_reading_measure_and_a_position` under the same request. Proof: the screen states four stages and each stage says which one it is (`1 of 4`). Every stage ends in an action -- `Delivery Slices` ended in nothing, so the guide stopped being a sequence at its second step -- and no action is offered twice: `Open Health` sat in the Closeout stage and again in the footer.
- request-AC12 -> Delivered by `item_753_make_getting_started_reflect_the_project_in_front_of_it` under the same request. Proof: each stage reports what this project already has there, from counts the screen already received. Measured live: `354 request, 92 product, 8 roadmap`, then 780 backlog, 348 task, 30 architecture. A stage with nothing yet is marked because it is the one worth reading first; nothing is hidden for having plenty.
- request-AC16 -> Delivered by `task_355_measure_how_long_these_screens_take_and_say_so_while_they_load` under the same request. Proof: measured 2026-08-14 against 1 614 workflow documents at 1440x900 through CDP, three runs, two warm and one against a freshly started server: Corpus insights 7 551-8 320 ms to useful content, Validation health 8 056-8 609 ms, Getting Started 4-6 ms. Cold and warm measured in the same band, so the cost is the scan and nothing is being cached. Recorded as a table in `item_770`.
- request-AC17 -> Delivered by `task_355_measure_how_long_these_screens_take_and_say_so_while_they_load` under the same request. Proof: the two slow screens take their place immediately and name what they are waiting for; the title lands in 14 ms and 5 ms where it used to take the whole scan. The placeholder goes up before the view token is taken, because `setDocument` invalidates pending views and announcing the load after `beginView()` cancelled the very load it announced.
- request-AC18 -> Delivered by `task_355_measure_how_long_these_screens_take_and_say_so_while_they_load` under the same request. Proof: time-to-useful after every change in this request is 8 320 ms and 8 609 ms, inside the band measured before it. The measurement script excludes the placeholder when deciding a screen is useful; counting it would have reported a false improvement of eight seconds.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Primary task(s): `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_355_measure_how_long_these_screens_take_and_say_so_while_they_load`
- `task_346_deliver_the_corpus_health_and_onboarding_screens`

# Notes
- Task `task_355_measure_how_long_these_screens_take_and_say_so_while_they_load` was finished via `logics-manager flow finish task` on 2026-08-14.
- Task `task_346_deliver_the_corpus_health_and_onboarding_screens` was finished via `logics-manager flow finish task` on 2026-08-14.
