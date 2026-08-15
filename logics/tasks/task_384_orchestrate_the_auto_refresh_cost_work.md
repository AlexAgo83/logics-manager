## task_384_orchestrate_the_auto_refresh_cost_work - Orchestrate the auto-refresh cost work
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Progress: 90%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:21:53

# AI Context
- Summary: Sequences the tick work: the lifetime that never hits, the warm-up, the signature-decided 304, then re-measure and record the breakdown.
- Keywords: orchestration, auto-refresh cost, measurement
- Use when: Implementing this task.
- Skip when: Changing what the badges show or how often the operator sees them move.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Fix the lifetime that can never hit first: it is three quarters of the tick and the smallest change here.
- [x] 2. Warm the badge components with the mechanism req_366 already built, rather than a second one.
- [x] 3. Decide the corpus 304 from the signature instead of from a rebuild.
- [x] 4. Re-measure the whole tick the way the baseline was taken, and record the breakdown where the lifetimes are set.
- [x] 5. Leave the file watcher closed, and record the measurement that would reopen it.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_839_stop_paying_for_a_cache_that_can_never_hit`
- `item_840_warm_the_badge_components_off_the_request_path`
- `item_841_answer_nothing_changed_without_rebuilding_the_corpus`
- `item_842_re_measure_the_tick_and_record_what_it_is_made_of`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_839_stop_paying_for_a_cache_that_can_never_hit`. Proof deferred to slice closeout.
- request-AC4 -> `item_839_stop_paying_for_a_cache_that_can_never_hit`. Proof deferred to slice closeout.
- request-AC2 -> `item_840_warm_the_badge_components_off_the_request_path`. Proof deferred to slice closeout.
- request-AC4 -> `item_840_warm_the_badge_components_off_the_request_path`. Proof deferred to slice closeout.
- request-AC3 -> `item_841_answer_nothing_changed_without_rebuilding_the_corpus`. Proof deferred to slice closeout.
- request-AC4 -> `item_841_answer_nothing_changed_without_rebuilding_the_corpus`. Proof deferred to slice closeout.
- request-AC4 -> `item_842_re_measure_the_tick_and_record_what_it_is_made_of`. Proof deferred to slice closeout.
- request-AC5 -> `item_842_re_measure_the_tick_and_record_what_it_is_made_of`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- All four backlog slices landed: item_839 (cache lifetimes floored at 1.5x the poll interval), item_840 (badge components warmed off the request path, same mechanism as req_366), item_841 (the /api/items 304 decided from corpus_signature instead of a rebuild), item_842 (re-measured: steady tick ~0.01s, was 3.1s; cold first poll 6.093s, was 9.07s; forced poll 4.833s, unchanged). File watcher stays closed (prod_104 non-goal): the items route no longer dominates the tick (0.009s of ~0.01s), so the condition that would reopen it -- the corpus rebuild dominating a measured tick -- does not hold.

# Links
- Request: `req_373_make_the_auto_refresh_cost_what_it_is_worth`
- Product brief(s): `prod_104_a_poll_that_costs_what_it_is_worth`
- Architecture decision(s): (none yet)
