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
> Indicators reviewed: 2026-08-15 17:28:42

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
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_839_stop_paying_for_a_cache_that_can_never_hit`
- `item_840_warm_the_badge_components_off_the_request_path`
- `item_841_answer_nothing_changed_without_rebuilding_the_corpus`
- `item_842_re_measure_the_tick_and_record_what_it_is_made_of`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_839_stop_paying_for_a_cache_that_can_never_hit`. Proof deferred to slice closeout.
- request-AC4 -> `item_839_stop_paying_for_a_cache_that_can_never_hit`. Proof deferred to slice closeout.
- request-AC2 -> `item_840_warm_the_badge_components_off_the_request_path`. Proof deferred to slice closeout.
- request-AC4 -> `item_840_warm_the_badge_components_off_the_request_path`. Proof deferred to slice closeout.
- request-AC3 -> `item_841_answer_nothing_changed_without_rebuilding_the_corpus`. Proof deferred to slice closeout.
- request-AC4 -> `item_841_answer_nothing_changed_without_rebuilding_the_corpus`. Proof deferred to slice closeout.
- request-AC4 -> `item_842_re_measure_the_tick_and_record_what_it_is_made_of`. Proof deferred to slice closeout.
- request-AC5 -> `item_842_re_measure_the_tick_and_record_what_it_is_made_of`. Proof deferred to slice closeout.
- request-AC1 -> This task. Proof: item_839 floors cdx/git status lifetimes at max(2s, poll*1.5); steady polls now cache-hit (measured 0.001s/tick, was an every-tick miss at 2.3s).
- request-AC2 -> This task. Proof: item_840 warms badge components in the same warm-up pass as the corpus reports; first poll after start now 6.093s, was 9.07s, and a poll racing the warm-up waits on it rather than recomputing (test_a_status_component_is_computed_once_even_when_the_warm_up_is_racing).
- request-AC3 -> This task. Proof: item_841's cached_items_body gates the /api/items ETag/body on corpus_signature; a 304 now costs 0.010s, was 0.156s, and a changed corpus still returns the byte-identical uncached payload (test_viewer_items_body_is_cached_until_the_corpus_changes).
- request-AC4 -> This task. Proof: item_842 re-measured over HTTP against this repo's own corpus: steady tick ~0.01s (was 3.1s), cold first poll 6.093s (was 9.07s), forced poll 4.833s (unchanged, deliberately).
- request-AC5 -> This task. Proof: item_842 confirmed by inspection that none of item_839/840/841 touch `ci_status_payload`, `release_status_payload`, or their call sites -- only cache lifetimes and warm-up order changed.

# Validation
- (no validation recorded yet)

# Report
- All four backlog slices landed: item_839 (cache lifetimes floored at 1.5x the poll interval), item_840 (badge components warmed off the request path, same mechanism as req_366), item_841 (the /api/items 304 decided from corpus_signature instead of a rebuild), item_842 (re-measured: steady tick ~0.01s, was 3.1s; cold first poll 6.093s, was 9.07s; forced poll 4.833s, unchanged). File watcher stays closed (prod_104 non-goal): the items route no longer dominates the tick (0.009s of ~0.01s), so the condition that would reopen it -- the corpus rebuild dominating a measured tick -- does not hold.

# Links
- Request: `req_373_make_the_auto_refresh_cost_what_it_is_worth`
- Product brief(s): `prod_104_a_poll_that_costs_what_it_is_worth`
- Architecture decision(s): (none yet)
