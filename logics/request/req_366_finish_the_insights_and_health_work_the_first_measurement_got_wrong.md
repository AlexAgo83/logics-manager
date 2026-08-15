## req_366_finish_the_insights_and_health_work_the_first_measurement_got_wrong - Finish the Insights and Health work the first measurement got wrong
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer responsiveness on a large corpus
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 11:48:08

# AI Context
- Summary: req_364 timed lint inside a process that had already run an audit, read 0.16s, and cached the audit alone. Re-measured over HTTP against a fresh viewer: lint 4.18s cold and 0.97s warm, now the dominant cost of both screens, with the first look after a start paying about thirteen seconds.
- Keywords: lint cache, health cache, corpus signature, startup warm-up, stale while revalidate, cold measurement
- Use when: Changing what any corpus report costs, or before quoting a timing for these endpoints.
- Skip when: Changing what lint, audit or the health report check, and incremental auditing -- still a non-goal for the reason req_364 recorded.

# Needs
- As an operator, I need Corpus insights and Validation health to answer quickly on the first look after starting the viewer, not only on the second.
- As an operator returning to one of those screens, I need to read what it said last time immediately, with the fresh answer replacing it when it arrives, instead of watching it be rebuilt from nothing.

# Context
- req_364 measured audit at 1.39s and lint at 0.16s, concluded lint was not worth attacking, and cached the audit. The audit is now 12ms on a second look. That conclusion was wrong, and the reason it was wrong is worth recording: lint was timed inside a Python process that had already run an audit, so its corpus reads were served from a warm filesystem cache and its own imports were paid.
- Re-measured over HTTP against a freshly started viewer: the lint route 4.18s cold and 0.97s warm, the audit route 8.68s cold and 0.03s warm, the health route 0.69s cold and 0.39s warm. Lint is now the dominant cost of both screens, and the first look after a viewer starts pays about thirteen seconds.
- The corpus-signature cache req_364 built for the audit is a general mechanism -- document count and newest modification time across the workflow directories, read by stat -- and nothing about it is specific to auditing. Lint and the workflow health report are not behind it.
- Nothing is warmed at startup, so the first operator to open either screen pays the whole cold cost on the request path.
- The client keeps nothing either: arriving at Insights or Health rebuilds the screen from nothing every time, even when the corpus has not changed since the last visit.

# Acceptance criteria
- AC1: Lint and the workflow health report are served from the same corpus-signature cache the audit uses, recomputing when the corpus changes and not when a timer lapses.
- AC2: The first open of either screen after the viewer starts does not pay the full cold computation on the request path.
- AC3: Returning to Insights or Health shows what it said last time immediately, with the fresh answer replacing it when it arrives, and says which of the two is on screen.
- AC4: Both screens answer in well under a second on a second look and in about a second on a first, measured over HTTP against a running viewer on this repository's corpus.
- AC5: The measurement that misled req_364 is not repeatable: timings quoted for these endpoints are taken over HTTP against a freshly started viewer, not in a process that has already done the work.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_097_corpus_screens_that_are_quick_on_the_first_look_too`
- Architecture decision(s): (none yet)

# References
- logics/request/req_364_make_insights_and_health_answer_quickly_on_a_large_corpus.md
- logics/product/prod_095_corpus_screens_that_stay_usable_as_the_corpus_grows.md
- logics_manager/viewer.py
- logics_manager/lint.py
- logics_manager/insights.py

# Backlog
- `item_813_put_lint_and_the_health_report_behind_the_corpus_signature_cache`
- `item_814_warm_the_corpus_reports_off_the_request_path`
- `item_815_show_the_last_answer_while_the_new_one_is_computed`
