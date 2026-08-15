## req_373_make_the_auto_refresh_cost_what_it_is_worth - Make the auto-refresh cost what it is worth
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer responsiveness on a large corpus
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 17:28:49

# AI Context
- Summary: An open viewer spends about 3.1s of every 15s answering questions nothing asked. Three quarters of it is one cache that can never hit.
- Keywords: auto-refresh, duty cycle, cdx-status, cold start, etag, no watcher
- Use when: The viewer feels busy while idle, or a component is added to the badge poll.
- Skip when: A file watcher is the proposal -- it addresses 5% and leaves the rest.

# Needs
- As an operator leaving the viewer open, I need it to stop spending a fifth of its time re-answering questions nothing asked, on a machine I am working on.
- As an operator opening the viewer, I need the first badge poll not to cost nine seconds on the request path.
- As an operator, I need an unchanged corpus to cost nothing to confirm.

# Context
- Measured on an isolated viewer, with a shim recording every `gh` invocation. Per 15s tick, steady state: the CDX status component 2.3s, `ci` and `releaseRuns` about 0.5s amortised over their 60s TTL, the git status component 0.11s, and the the items route rebuild 0.156s -- about 3.1s of work every 15 seconds, a fifth of the viewer's existence, for as long as a tab is open.
- the CDX status component is three quarters of that and its cache never helps: its TTL is 2s and the poll that consumes it runs every 15s, so every tick misses. Measured four times three seconds apart: 2.33s, 2.46s, 2.36s, 2.31s, no hit. The cost is `cdx status --json`, timed at 2.0s on its own.
- The first the status route after a viewer start costs 9.07s on the request path. req_366 solved exactly this shape for Insights and Health with a background warm-up; nothing warms the badge components.
- the items route is 6.17 MB. item_786 added an ETag so an unchanged corpus transfers nothing, and it works -- 304, zero bytes. But the server still rebuilds the whole payload and hashes it to decide that, so a conditional request costs 0.156s of work to answer 'nothing changed'. `corpus_signature` from req_364 answers that same question in 6ms and is not consulted here.
- The remote side is in reasonable shape and is not the problem: 60s TTL, `gh` and the workflow directory checked before any call, four GitHub API calls per refresh cycle -- about 240 an hour against a 5000/hour limit -- and the tick stops entirely while the tab is hidden.
- The poll is not redundant. The VS Code panel has a FileSystemWatcher and gets corpus changes pushed; the standalone browser viewer has none, and no watcher of any kind can see CI runs, release runs or CDX state.

# Acceptance criteria
- AC1: No cached component has a lifetime shorter than the poll that consumes it, so a cache that can never hit does not exist.
- AC2: Opening the viewer does not pay the badge components' cold cost on the request path.
- AC3: Answering 'the corpus has not changed' does not rebuild the corpus payload.
- AC4: The per-tick cost is re-measured the same way it was measured here -- an isolated viewer, over HTTP -- and compared against the 3.1s baseline.
- AC5: The remote call pattern is unchanged in what it asks GitHub for, and no worse in how often.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_104_a_poll_that_costs_what_it_is_worth`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_092_a_viewer_that_stays_as_fast_as_it_started.md
- logics/product/prod_097_corpus_screens_that_are_quick_on_the_first_look_too.md
- logics_manager/viewer.py
- logics_manager/viewer_cdx.py
- clients/viewer/src/browser-host/index.js

# Backlog
- `item_839_stop_paying_for_a_cache_that_can_never_hit`
- `item_840_warm_the_badge_components_off_the_request_path`
- `item_841_answer_nothing_changed_without_rebuilding_the_corpus`
- `item_842_re_measure_the_tick_and_record_what_it_is_made_of`
