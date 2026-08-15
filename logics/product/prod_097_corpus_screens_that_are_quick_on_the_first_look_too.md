## prod_097_corpus_screens_that_are_quick_on_the_first_look_too - Corpus screens that are quick on the first look too
> Date: 2026-08-15
> Status: Proposed
> Related request: `req_366_finish_the_insights_and_health_work_the_first_measurement_got_wrong`
> Related backlog: `item_813_put_lint_and_the_health_report_behind_the_corpus_signature_cache`, `item_814_warm_the_corpus_reports_off_the_request_path`, `item_815_show_the_last_answer_while_the_new_one_is_computed`
> Related task: `task_377_orchestrate_the_second_look_at_insights_and_health`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Extend the caching req_364 built for the audit to the two costs it measured wrongly, warm them off the request path, and let a returning operator read the previous answer while the new one is computed.

# Goals
- One caching mechanism behind every expensive corpus report, not one of the three.
- A first look that does not pay what a background pass could have paid.
- A screen that shows its last answer rather than an empty frame.
- Timings taken the way an operator experiences them.

# Non-goals
- Incremental auditing, still: the checks are cross-document, and req_364's reasoning has not changed.
- Changing what lint, audit or the health report check.
- Redesigning either screen.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `req_366_finish_the_insights_and_health_work_the_first_measurement_got_wrong`
- Task back-reference: `task_377_orchestrate_the_second_look_at_insights_and_health`
