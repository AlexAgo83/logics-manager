## task_383_orchestrate_the_issue_bridge_work - Orchestrate the issue bridge work
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 20:04:46
> Owner: claude

# AI Context
- Summary: Sequences the bridge work: provenance answerable, then attach, then the report, then the closeout notice, then close the #20/#21 drift with what was built.
- Keywords: orchestration, github issues, reconciliation
- Use when: Implementing this task.
- Skip when: Anything about what an issue body says -- it is never read.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Make provenance answerable first: two later slices need that answer, and each deriving it separately is how they drift.
- [x] 2. Add the attach command, which is the direction the real flow needs.
- [x] 3. Build the reconciliation report, and run it before anything is fixed so the starting state is recorded.
- [x] 4. Add the closeout notice, explicit by construction.
- [x] 5. Close the #20/#21 drift using what was built, not by hand, and re-run the report.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_834_report_where_the_corpus_and_the_tracker_disagree`
- `item_835_attach_an_issue_to_a_request_that_already_exists`
- `item_836_make_provenance_answerable`
- `item_837_tell_the_issues_when_the_request_is_delivered`
- `item_838_close_the_drift_this_request_was_opened_over`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_834_report_where_the_corpus_and_the_tracker_disagree`. Proof deferred to slice closeout.
- request-AC5 -> `item_834_report_where_the_corpus_and_the_tracker_disagree`. Proof deferred to slice closeout.
- request-AC2 -> `item_835_attach_an_issue_to_a_request_that_already_exists`. Proof deferred to slice closeout.
- request-AC4 -> `item_835_attach_an_issue_to_a_request_that_already_exists`. Proof deferred to slice closeout.
- request-AC4 -> `item_836_make_provenance_answerable`. Proof deferred to slice closeout.
- request-AC3 -> `item_837_tell_the_issues_when_the_request_is_delivered`. Proof deferred to slice closeout.
- request-AC5 -> `item_837_tell_the_issues_when_the_request_is_delivered`. Proof deferred to slice closeout.
- request-AC6 -> `item_838_close_the_drift_this_request_was_opened_over`. Proof deferred to slice closeout.
- request-AC1 -> This task. Proof: item_834's reconciliation_report_payload names all three disagreement kinds separately; test_reconciliation_report_names_all_three_disagreements covers all three plus the settled/closed no-op case. Verified live against this repo: #20/#21 showed up as open_issues_with_no_request before item_835 attached them.
- request-AC2 -> This task. Proof: item_835's attach_issue (mcp_request.py, exposed as attach_github_issue) writes the same Provenance shape create_request produces on a first attach, appends on a second; reachable today via the existing `mcp call` passthrough, no new CLI surface needed. Used for real on #20 (94e3a902) and #21 (12786498).
- request-AC3 -> This task. Proof: item_837's closeout_notice_payload states the label/comment for every issue a request names but posts nothing unless post=True; tell_issues_at_closeout inverts to dry_run defaulting true. Used for real: closeout_notice_payload(..., state="delivered", post=True) posted to #20/#21, verified live with `gh issue view --json labels,comments`.
- request-AC4 -> This task. Proof: item_836's provenance.py (request_issue_urls/all_request_provenance/requests_for_issue) answers from data, never by grepping prose; read_logics_doc carries provenance_issues. 7 tests in test_provenance.py.
- request-AC5 -> This task. Proof: reconciliation_report_payload and closeout_notice_payload request only number/state/labels/url from `gh issue list`/`gh issue view` -- never a body; asserted directly in tests/python/test_github_bridge.py.
- request-AC6 -> This task. Proof: item_838 attached #20/#21 to req_357 and told them for real (commits 94e3a902, 12786498, a3b68575, f2e9c651). Reconciliation report before: both listed under done_requests_with_open_issues; after: `{"open_issues_with_no_request": [], "done_requests_with_open_issues": [], "closed_issues_with_open_request": []}` -- neither appears anywhere.

# Validation
- (no validation recorded yet)
- python3 -m pytest tests/python/ passed on 2026-08-15: 1431 passed; npx vitest run passed: 971 passed (87 files); proven live on issues #20/#21 via gh issue view
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_834_report_where_the_corpus_and_the_tracker_disagree`, `item_835_attach_an_issue_to_a_request_that_already_exists`, `item_836_make_provenance_answerable`, `item_837_tell_the_issues_when_the_request_is_delivered`, `item_838_close_the_drift_this_request_was_opened_over`
- Related request(s): `req_372_put_the_github_issue_bridge_on_the_path_the_work_actually_takes`

# Links
- Request: `req_372_put_the_github_issue_bridge_on_the_path_the_work_actually_takes`
- Product brief(s): `prod_103_an_issue_bridge_on_the_path_people_walk`
- Architecture decision(s): (none yet)
