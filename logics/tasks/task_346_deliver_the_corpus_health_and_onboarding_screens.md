## task_346_deliver_the_corpus_health_and_onboarding_screens - Deliver the corpus, health and onboarding screens
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 77%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Classify the signals first, baseline the campaign with wait-and-prove, then Validation health, then Corpus insights, then Getting Started -- checking each against the mockup and inheriting the panel framing.
- Keywords: delivery order, signal classification, campaign baseline, validation health, corpus insights, getting started
- Use when: Implementing any part of the Corpus insights, Validation health or Getting Started work.
- Skip when: Working on the other viewer tasks (task_341 to task_345).

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Settle the signal classification first: it is a product decision, and the insights grouping cannot be drawn without it.
- [ ] 2. Extend the campaign next, with the wait-and-prove behaviour, and record what it reports about today's three screens as the baseline.
- [ ] 3. Then Validation health, which is the least trusted of the three and the cheapest to make trustworthy: verdict, grouping, suspect findings, then the action's scope.
- [ ] 4. Then Corpus insights, which depends on the classification.
- [ ] 5. Then Getting Started, which is self-contained: measure and navigation first, then the per-stage counts.
- [ ] 6. Check each against `logics/external/mockup/insights_health_onboarding_redesign.html`, and inherit the panel framing rather than re-deciding it.
- [ ] 7. Rebuild the browser host and confirm both surfaces before closeout.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

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
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_746_decide_which_workflow_signals_are_defects_and_which_are_work_in_flight`. Proof deferred to slice closeout.
- request-AC2 -> `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`. Proof deferred to slice closeout.
- request-AC3 -> `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`. Proof deferred to slice closeout.
- request-AC4 -> `item_747_make_the_corpus_insights_headline_count_only_what_needs_a_decision`. Proof deferred to slice closeout.
- request-AC5 -> `item_748_give_corpus_insights_one_visual_language`. Proof deferred to slice closeout.
- request-AC6 -> `item_749_lead_validation_health_with_the_verdict_it_owns`. Proof deferred to slice closeout.
- request-AC7 -> `item_750_group_the_findings_and_flag_what_the_repository_contradicts`. Proof deferred to slice closeout.
- request-AC8 -> `item_750_group_the_findings_and_flag_what_the_repository_contradicts`. Proof deferred to slice closeout.
- request-AC9 -> `item_751_say_what_applying_fixes_would_change`. Proof deferred to slice closeout.
- request-AC10 -> `item_752_give_getting_started_a_reading_measure_and_a_position`. Proof deferred to slice closeout.
- request-AC11 -> `item_752_give_getting_started_a_reading_measure_and_a_position`. Proof deferred to slice closeout.
- request-AC12 -> `item_753_make_getting_started_reflect_the_project_in_front_of_it`. Proof deferred to slice closeout.
- request-AC13 -> `item_754_cover_the_three_screens_including_how_slowly_they_load`. Proof deferred to slice closeout.
- request-AC14 -> `item_754_cover_the_three_screens_including_how_slowly_they_load`. Proof deferred to slice closeout.
- request-AC15 -> `item_754_cover_the_three_screens_including_how_slowly_they_load`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_349_make_the_corpus_health_and_onboarding_screens_earn_the_numbers_they_print`
- Product brief(s): `prod_085_numbers_a_screen_can_defend`
- Architecture decision(s): (none yet)
