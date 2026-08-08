## task_310_orchestrate_naming_the_viewer_architecture - Orchestrate naming the viewer architecture
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Move the shared bindings into one named store, and retire the three hand-built accessors.
- [ ] 2. Key the cache on the server's component vocabulary and let the change notice invalidate it, keeping the polling fallback correct.
- [ ] 3. Declare each screen once and route on the declaration instead of the title string.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_630_name_the_viewer_s_shared_state`
- `item_631_let_the_server_s_change_notice_invalidate_the_cache`
- `item_632_let_a_screen_declare_itself`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC6, request-AC7, request-AC8 -> `item_630_name_the_viewer_s_shared_state`. Proof deferred to slice closeout.
- request-AC2, request-AC3, request-AC4, request-AC6, request-AC7, request-AC8 -> `item_631_let_the_server_s_change_notice_invalidate_the_cache`. Proof deferred to slice closeout.
- request-AC5, request-AC6, request-AC7, request-AC8 -> `item_632_let_a_screen_declare_itself`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate naming the viewer architecture
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_313_write_down_the_architecture_the_viewer_already_has_a_named_store_server_driven_invalidation_declared_screens`
- Product brief(s): `prod_061_the_architecture_written_down`
- Architecture decision(s): (none yet)
