## task_377_orchestrate_the_second_look_at_insights_and_health - Orchestrate the second look at Insights and Health
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
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
- [x] 1. Re-measure first, over HTTP against a freshly started viewer, and record the baseline -- the first pass at this work drew its conclusion from a warm process and cached the wrong thing.
- [x] 2. Extend the existing corpus-signature cache to lint and the health report.
- [x] 3. Warm the cached reports in the background after startup.
- [x] 4. Keep the last rendered answer per screen and revalidate behind it.
- [x] 5. Re-measure the same way and compare against the recorded baseline.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_813_put_lint_and_the_health_report_behind_the_corpus_signature_cache`
- `item_814_warm_the_corpus_reports_off_the_request_path`
- `item_815_show_the_last_answer_while_the_new_one_is_computed`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task, via `item_813_put_lint_and_the_health_report_behind_the_corpus_signature_cache`. Proof: the audit's corpus-signature cache is now keyed by report name, and `/api/lint` and `/api/health` are served from it. Measured over HTTP against a freshly started viewer: 9ms each on a second look, and 0.17s / 0.12s after touching one document -- so the corpus changing is still what decides, not a timer.
- request-AC2 -> This task, via `item_814_warm_the_corpus_reports_off_the_request_path`. Proof: a daemon thread computes all three shortly after startup, after the banner and the browser launch. At t=1.2s after start, with the warm-up still in flight, the first look read lint 0.27s, audit 0.039s, health 0.36s against a baseline of 4.18s, 8.68s and 0.69s.
- request-AC3 -> This task, via `item_815_show_the_last_answer_while_the_new_one_is_computed`. Proof: returning to Corpus insights renders the previous answer within 60ms, marked "Showing the previous answer while the corpus is rechecked", then settles to "Checked just now". After switching to another project the screen falls back to the loading placeholder rather than showing the first project's answer.
- request-AC4 -> This task, via all three slices. Proof: both screens now answer in milliseconds on a second look and in well under a second on a first -- see the numbers on AC1 and AC2.
- request-AC5 -> This task. Proof: every timing above was taken with `curl` against a viewer started from the working tree for this measurement, never in a process that had already done the work. This also caught a second version of the original error: `logics-manager` on PATH is an npm-installed copy of the package, so the first attempt measured code that predated the audit cache and read 8.5s.

# Validation
- `tests/python/test_viewer_cli.py`: lint and health cached until the corpus changes, and a report computed once when two callers race.
- The client behaviour verified on a running viewer over CDP rather than by reading the rule.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- All three slices shipped. The first look after a viewer start went from about thirteen seconds to under a second, and the second look to milliseconds.
- The mistake req_366 existed to correct was repeatable in a new form: the first measurement here was taken against the npm-installed `logics-manager`, not the working tree, and reported an 8.5s audit that had been cached weeks earlier. Timings are only worth quoting alongside what produced them.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_813_put_lint_and_the_health_report_behind_the_corpus_signature_cache`, `item_814_warm_the_corpus_reports_off_the_request_path`, `item_815_show_the_last_answer_while_the_new_one_is_computed`
- Related request(s): `req_366_finish_the_insights_and_health_work_the_first_measurement_got_wrong`

# Links
- Request: `req_366_finish_the_insights_and_health_work_the_first_measurement_got_wrong`
- Product brief(s): `prod_097_corpus_screens_that_are_quick_on_the_first_look_too`
- Architecture decision(s): (none yet)
