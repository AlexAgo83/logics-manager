## task_377_orchestrate_the_second_look_at_insights_and_health - Orchestrate the second look at Insights and Health
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 11:47:46

# AI Context
- Summary: Sequences the three slices req_364 should have had: cache lint and health on the corpus signature, warm them off the request path, and keep the last rendered answer per screen.
- Keywords: orchestration, lint cache, warm-up, stale while revalidate, measured baseline
- Use when: Implementing this task.
- Skip when: Any change to what the reports check.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Re-measure first, over HTTP against a freshly started viewer, and record the baseline -- the first pass at this work drew its conclusion from a warm process and cached the wrong thing.
- [ ] 2. Extend the existing corpus-signature cache to lint and the health report.
- [ ] 3. Warm the cached reports in the background after startup.
- [ ] 4. Keep the last rendered answer per screen and revalidate behind it.
- [ ] 5. Re-measure the same way and compare against the recorded baseline.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_813_put_lint_and_the_health_report_behind_the_corpus_signature_cache`
- `item_814_warm_the_corpus_reports_off_the_request_path`
- `item_815_show_the_last_answer_while_the_new_one_is_computed`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_813_put_lint_and_the_health_report_behind_the_corpus_signature_cache`. Proof deferred to slice closeout.
- request-AC4 -> `item_813_put_lint_and_the_health_report_behind_the_corpus_signature_cache`. Proof deferred to slice closeout.
- request-AC2 -> `item_814_warm_the_corpus_reports_off_the_request_path`. Proof deferred to slice closeout.
- request-AC4 -> `item_814_warm_the_corpus_reports_off_the_request_path`. Proof deferred to slice closeout.
- request-AC3 -> `item_815_show_the_last_answer_while_the_new_one_is_computed`. Proof deferred to slice closeout.
- request-AC5 -> This task. Proof deferred to closeout. Deliberately not a backlog slice: it is how every timing in this chain must be taken, not a thing to build. The first pass at this work timed lint inside a process that had already run an audit, read 0.16s, and cached the wrong thing -- so the discipline sits on the task that sequences the measuring.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_366_finish_the_insights_and_health_work_the_first_measurement_got_wrong`
- Product brief(s): `prod_097_corpus_screens_that_are_quick_on_the_first_look_too`
- Architecture decision(s): (none yet)
