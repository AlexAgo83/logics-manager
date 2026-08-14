## task_356_keep_the_viewer_as_fast_as_it_started - Keep the viewer as fast as it started
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: viewer, fast, started
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Establish what 'unchanged' can be checked against cheaply, and what that check itself costs -- a staleness check that walks every file has moved the cost rather than removed it.
- [ ] 2. Reuse the payload behind that check, and prove a real edit still lands, before touching the cadence: a slow refresh that is correct is better than a fast one that is not.
- [ ] 3. Then set the cadence against the measured cost, and write down what an idle viewer consumes.
- [ ] 4. Record, in the campaign's own file, that the card timeout was reporting the server rather than the test. Several sessions were spent raising it.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_781_serve_an_unchanged_corpus_without_rebuilding_it`
- `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`
- `item_783_fail_when_the_work_is_repeated_or_a_change_is_missed`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_781_serve_an_unchanged_corpus_without_rebuilding_it`. Proof deferred to slice closeout.
- request-AC2 -> `item_781_serve_an_unchanged_corpus_without_rebuilding_it`. Proof deferred to slice closeout.
- request-AC3 -> `item_781_serve_an_unchanged_corpus_without_rebuilding_it`. Proof deferred to slice closeout.
- request-AC4 -> `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`. Proof deferred to slice closeout.
- request-AC5 -> `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`. Proof deferred to slice closeout.
- request-AC6 -> `item_783_fail_when_the_work_is_repeated_or_a_change_is_missed`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
- Product brief(s): `prod_092_a_viewer_that_stays_as_fast_as_it_started`
- Architecture decision(s): (none yet)
