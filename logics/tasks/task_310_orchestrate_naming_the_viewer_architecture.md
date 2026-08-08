## task_310_orchestrate_naming_the_viewer_architecture - Orchestrate naming the viewer architecture
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 01:49:49

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Move the shared bindings into one named store, and retire the three hand-built accessors.
- [x] 2. Key the cache on the server's component vocabulary: WITHDRAWN after measurement, recorded on `item_631`. The mapping is many-to-one, three matches are interface state, and every screen already refetches on open.
- [x] 3. Declare each screen once and route on the declaration instead of the title string.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_630_name_the_viewer_s_shared_state`
- `item_631_let_the_server_s_change_notice_invalidate_the_cache`
- `item_632_let_a_screen_declare_itself`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_630_name_the_viewer_s_shared_state`. Proof: `clients/viewer/src/browser-host/state.js`, and `hands every screen the same reader rather than a hand-picked set of thunks` in `tests/viewer.shared-state.test.ts`.
- request-AC2 -> This task. Proof: withdrawn after measurement -- the component vocabulary maps onto seven of thirty-two caches, three of the matches are interface state, and every screen already fetches when it opens. Recorded on `item_631_let_the_server_s_change_notice_invalidate_the_cache`.
- request-AC3 -> This task. Proof: withdrawn -- the signature comparisons are optimistic-update bookkeeping, not staleness detection. Recorded on `item_631_let_the_server_s_change_notice_invalidate_the_cache`.
- request-AC4 -> This task. Proof: nothing was attached to the stream, so the polling fallback is untouched. Recorded on `item_631_let_the_server_s_change_notice_invalidate_the_cache`.
- request-AC5 -> `item_632_let_a_screen_declare_itself`. Proof: `routes on the declaration rather than on a chain of title comparisons` in `tests/viewer.screen-registry.test.ts`.
- request-AC6 -> every slice. Proof: no framework, no new runtime and no new endpoint; `ci-check` exits 0 and the extension bundle is regenerated from its sources.
- request-AC7 -> every slice. Proof: 824 vitest tests, 1127 Python tests and the viewer campaign pass after each slice, not only at the end.
- request-AC8 -> `item_630` and `item_632`. Proof: `carries what is shared, not everything the host holds` derives the store's contents from the module, and `declares no screen that nothing opens` derives the registry's entries and the titles the code sets from the sources.

# Validation
- (no validation recorded yet)
- command: `node scripts/ci-check.mjs` | result: passed | date: 2026-08-09 | note: 824 vitest + 1127 python + campaign green
- Finish workflow executed on 2026-08-09.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-09.
- Linked backlog item(s): `item_630_name_the_viewer_s_shared_state`, `item_631_let_the_server_s_change_notice_invalidate_the_cache`, `item_632_let_a_screen_declare_itself`
- Related request(s): `req_313_write_down_the_architecture_the_viewer_already_has_a_named_store_server_driven_invalidation_declared_screens`

# AI Context
- Summary: Orchestrate naming the viewer architecture
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_313_write_down_the_architecture_the_viewer_already_has_a_named_store_server_driven_invalidation_declared_screens`
- Product brief(s): `prod_061_the_architecture_written_down`
- Architecture decision(s): (none yet)
