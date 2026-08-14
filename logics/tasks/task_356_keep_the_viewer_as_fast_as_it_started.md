## task_356_keep_the_viewer_as_fast_as_it_started - Keep the viewer as fast as it started
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-14 21:23:42

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: viewer, fast, started
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Establish what 'unchanged' can be checked against cheaply, and what that check itself costs -- a staleness check that walks every file has moved the cost rather than removed it.
- [x] 2. Reuse the payload behind that check, and prove a real edit still lands, before touching the cadence: a slow refresh that is correct is better than a fast one that is not.
- [x] 3. Then set the cadence against the measured cost, and write down what an idle viewer consumes.
- [x] 4. Record, in the campaign's own file, that the card timeout was reporting the server rather than the test. Several sessions were spent raising it.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_781_serve_an_unchanged_corpus_without_rebuilding_it`
- `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`
- `item_783_fail_when_the_work_is_repeated_or_a_change_is_missed`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_781_serve_an_unchanged_corpus_without_rebuilding_it`. Proof: Measured before: 6.1s on a fresh server, 38.0s on one up 2h30. After: three consecutive requests at 0.156s, 0.138s, 0.152s on a fresh server, and 0.325s on the same server after roughly half an hour of idling. **Stated precisely because the AC asks for an hour and half an hour is what was measured** -- the difference the AC is about, fresh against left-running, is answered.
- request-AC2 -> `item_781_serve_an_unchanged_corpus_without_rebuilding_it`. Proof: `collect_viewer_items` caches behind a corpus signature: per family the count, total byte size and newest mtime. Stat-walking the eight directories is 16ms against 3.7s to parse them. Warm in-process: 640ms -> 8ms.
- request-AC3 -> `item_781_serve_an_unchanged_corpus_without_rebuilding_it`. Proof: Covered by three regressions -- a new document appears, a deleted one disappears, and an edit that keeps the byte count appears. The signature carries size *and* mtime because either alone misses a case.
- request-AC4 -> `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`. Proof: Both sides take `max(configured, measured cost x 10)`. The client measures each automatic refresh; the event stream times its own corpus snapshot. On today's corpus the configured interval always wins, which is the point. The interval control states when the cost rather than the setting is pacing it.
- request-AC5 -> `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`. Proof: Measured with zero clients connected and nothing else running: **0.04s CPU over 240s wall, 0.017% of a core**. Per connected client the cost is one 12.5ms snapshot a second, capped at a tenth of the interval. The 85% figure that raised this request was taken with 124 leftover headless browsers connected, which the request now records as a correction.
- request-AC6 -> `item_783_fail_when_the_work_is_repeated_or_a_change_is_missed`. Proof: `tests/test_viewer_payload_cache.py` counts the parse rather than timing it -- a timing assertion is flaky on a busy machine, and this request began with a measurement taken on a busy machine. Six cases there, eight more in `tests/viewer.refresh-cadence.test.ts`.

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-14.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-14.
- Linked backlog item(s): `item_781_serve_an_unchanged_corpus_without_rebuilding_it`, `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`, `item_783_fail_when_the_work_is_repeated_or_a_change_is_missed`
- Related request(s): `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`

# Links
- Request: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
- Product brief(s): `prod_092_a_viewer_that_stays_as_fast_as_it_started`
- Architecture decision(s): (none yet)
