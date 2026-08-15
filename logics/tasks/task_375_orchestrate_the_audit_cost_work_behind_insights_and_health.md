## task_375_orchestrate_the_audit_cost_work_behind_insights_and_health - Orchestrate the audit cost work behind Insights and Health
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 05:00:28

# AI Context
- Summary: Sequences the five audit-cost slices behind Insights and Health: measure the baseline, remove the quadratic sweep, cache on the corpus signature, bound the payload, then reuse the source scan and memoise prose extraction.
- Keywords: audit cost, orchestration, corpus insights, validation health, measured baseline
- Use when: Implementing this task.
- Skip when: Any change to what the audit checks or how the screens present it.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Measure first and record the baseline, so every later claim is against a number rather than an impression.
- [ ] 2. Remove the quadratic link sweep: it is small today and dominant on a large corpus, and it is the only change that alters how the cost grows.
- [ ] 3. Cache the audit answer on the corpus signature, which is the gain an operator feels on the second look.
- [ ] 4. Bound the payload once the computation is cheap enough that delivery is the remaining cost.
- [ ] 5. Reuse the repository source scan and memoise the prose-level extraction.
- [ ] 6. Re-measure over HTTP against a running viewer, and confirm the findings are unchanged for the same corpus.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_804_index_the_backlog_to_task_links_instead_of_re_scanning_for_each_item`
- `item_805_serve_the_audit_answer_from_a_cache_keyed_on_the_corpus_not_on_a_timer`
- `item_806_send_the_screens_the_findings_they_display_not_all_of_them`
- `item_807_stop_rebuilding_the_repository_wide_source_blob_on_every_audit`
- `item_808_memoise_the_remaining_reference_extraction`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_804_index_the_backlog_to_task_links_instead_of_re_scanning_for_each_item`. Proof deferred to slice closeout.
- request-AC2 -> `item_805_serve_the_audit_answer_from_a_cache_keyed_on_the_corpus_not_on_a_timer`. Proof deferred to slice closeout.
- request-AC5 -> `item_805_serve_the_audit_answer_from_a_cache_keyed_on_the_corpus_not_on_a_timer`. Proof deferred to slice closeout.
- request-AC3 -> `item_806_send_the_screens_the_findings_they_display_not_all_of_them`. Proof deferred to slice closeout.
- request-AC5 -> `item_806_send_the_screens_the_findings_they_display_not_all_of_them`. Proof deferred to slice closeout.
- request-AC4 -> `item_807_stop_rebuilding_the_repository_wide_source_blob_on_every_audit`. Proof deferred to slice closeout.
- request-AC5 -> `item_808_memoise_the_remaining_reference_extraction`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_364_make_insights_and_health_answer_quickly_on_a_large_corpus`
- Product brief(s): `prod_095_corpus_screens_that_stay_usable_as_the_corpus_grows`
- Architecture decision(s): (none yet)
