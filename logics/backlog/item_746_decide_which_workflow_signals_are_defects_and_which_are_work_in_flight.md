## item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight - Decide which workflow signals are defects and which are work in flight
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 93%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 10:28:43

# AI Context
- Summary: Incomplete workflow chains and promotion gaps were, at review time, entirely produced by chains scaffolded within the hour -- which is what a fresh scaffold is; grouping cannot be drawn until each signal is classified.
- Keywords: workflow signals, defect versus in flight, signal classification, promotion gap, incomplete chain, product decision
- Use when: Before grouping or counting workflow signals on any screen.
- Skip when: Changing which signals are computed, or the audit rules producing them.

# Problem
- Corpus insights counts incomplete workflow chains and promotion gaps as signals needing attention. Both were, at the time of the review, entirely produced by request chains scaffolded within the hour -- which is what a freshly scaffolded chain is. Grouping cannot be drawn until it is decided which signals mean something is wrong.

# Scope
- In:
  - Establish, per workflow signal, whether it indicates a defect or the expected state of work in flight.
  - Record the answer where the screens can act on it, including what happens to a signal that is neither.
- Out:
  - Changing which signals are computed, and the audit rules that produce them.

# Decision

Taken 2026-08-13, delegated by the operator, recorded as revisable.

**A signal is a defect when it describes something that cannot resolve itself. It is work
in flight when time alone will resolve it -- until it has had that time.**

| Signal | Class | Why |
| --- | --- | --- |
| Broken reference risks | defect | A reference to something absent does not fix itself. |
| Orphan or unlinked docs | defect | A document nothing links to will stay unlinked. |
| Incomplete workflow chains | in flight, then defect after 14 days | A scaffolded chain is incomplete by definition on the day it is written. |
| Promotion gaps | in flight, then defect after 14 days | Same: a request not yet promoted is the normal first state of a request. |

**The threshold is 14 days and it is a guess.** It is long enough that a chain scaffolded
and delivered inside a fortnight never appears, and short enough that abandoned work
surfaces within a sprint. Nothing was measured to choose it, because the corpus has no
record of how long chains historically took to promote -- `item_716` established that no
per-beat dates exist. The first operator to disagree should change the number, not the
rule.

**What made this necessary.** At review time, 100% of the documents Corpus insights listed
under Flow health were chains scaffolded within the hour, reported as incomplete chains
and promotion gaps -- which is exactly what a freshly scaffolded chain is. The headline
counted the normal state of new work, which is what made the number unusable rather than
merely imprecise.

**What this binds.** `item_747` counts only defects in the headline and shows in-flight
signals separately with their age. `item_750`'s suspect-finding marking is unaffected:
that is about a finding the repository contradicts, which is a different axis.

# Acceptance criteria
- AC1: Each signal is classified and the classification is recorded where a screen can use it.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Each signal is classified and the classification is recorded where a screen can use it.

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
- request-AC13 -> Delivered by `item_754_cover_the_three_screens_including_how_slowly_they_load` under the same request. Proof: all three screens hold at 1440x900, 820x1180 and 390x844 under the campaign's existing layout checks. They had been visited since item_715 but skipped by the slow-check flag on every run, so they were covered in name only.
- request-AC14 -> Delivered by `item_754_cover_the_three_screens_including_how_slowly_they_load` under the same request. Proof: the campaign waits for the screen's title *and* for the loading marker to be gone. The title alone is not the screen: item_770 gives these screens a placeholder carrying the final title while the scans run, so a check stopping at the title would assert on the placeholder.
- request-AC15 -> Delivered by `item_754_cover_the_three_screens_including_how_slowly_they_load` under the same request. Proof: every change is in `clients/viewer/src/browser-host/`, `clients/shared-web/media/css/board.css` and `logics_manager/`, rebuilt with `npm run bundle:viewer-host` after each; the extension webview loads the same built host and the same board stylesheet.
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
