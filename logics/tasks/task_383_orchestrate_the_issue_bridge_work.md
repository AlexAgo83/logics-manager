## task_383_orchestrate_the_issue_bridge_work - Orchestrate the issue bridge work
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:05:08

# AI Context
- Summary: Sequences the bridge work: provenance answerable, then attach, then the report, then the closeout notice, then close the #20/#21 drift with what was built.
- Keywords: orchestration, github issues, reconciliation
- Use when: Implementing this task.
- Skip when: Anything about what an issue body says -- it is never read.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Make provenance answerable first: two later slices need that answer, and each deriving it separately is how they drift.
- [ ] 2. Add the attach command, which is the direction the real flow needs.
- [ ] 3. Build the reconciliation report, and run it before anything is fixed so the starting state is recorded.
- [ ] 4. Add the closeout notice, explicit by construction.
- [ ] 5. Close the #20/#21 drift using what was built, not by hand, and re-run the report.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_834_report_where_the_corpus_and_the_tracker_disagree`
- `item_835_attach_an_issue_to_a_request_that_already_exists`
- `item_836_make_provenance_answerable`
- `item_837_tell_the_issues_when_the_request_is_delivered`
- `item_838_close_the_drift_this_request_was_opened_over`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_834_report_where_the_corpus_and_the_tracker_disagree`. Proof deferred to slice closeout.
- request-AC5 -> `item_834_report_where_the_corpus_and_the_tracker_disagree`. Proof deferred to slice closeout.
- request-AC2 -> `item_835_attach_an_issue_to_a_request_that_already_exists`. Proof deferred to slice closeout.
- request-AC4 -> `item_835_attach_an_issue_to_a_request_that_already_exists`. Proof deferred to slice closeout.
- request-AC4 -> `item_836_make_provenance_answerable`. Proof deferred to slice closeout.
- request-AC3 -> `item_837_tell_the_issues_when_the_request_is_delivered`. Proof deferred to slice closeout.
- request-AC5 -> `item_837_tell_the_issues_when_the_request_is_delivered`. Proof deferred to slice closeout.
- request-AC6 -> `item_838_close_the_drift_this_request_was_opened_over`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_372_put_the_github_issue_bridge_on_the_path_the_work_actually_takes`
- Product brief(s): `prod_103_an_issue_bridge_on_the_path_people_walk`
- Architecture decision(s): (none yet)
