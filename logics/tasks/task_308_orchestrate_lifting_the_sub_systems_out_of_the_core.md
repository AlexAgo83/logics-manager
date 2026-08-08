## task_308_orchestrate_lifting_the_sub_systems_out_of_the_core - Orchestrate lifting the sub-systems out of the core
> From version: 2.20.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-08 18:19:26

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Lift cdx and git out of the viewer server, on the seam the route modules already established.
- [x] 2. Lift cdx out of the browser host; git and the workshop measured and left, recorded on `item_624`. Coupling measured — cdx touches 1 shared binding, the workshop 3, git 12 — so cdx is movable and git is blocked by the shared state this request does not move. The board filters were lifted as the proving cut.
- [x] 3. Cut the flow entry module underneath the verbs: the shared vocabulary moved to `flow/docs.py`, since cutting by verb would have moved the coupling rather than removed it.
- [x] 4. Make the size ledger lower itself when a file shrinks, and refuse an unjustified raise.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_623_lift_cdx_and_git_out_of_the_viewer_server`
- `item_624_lift_cdx_git_and_the_workshop_out_of_the_browser_host`
- `item_625_cut_the_flow_entry_module_by_verb`
- `item_626_make_the_size_ledger_a_ratchet`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC2, request-AC3, request-AC7 -> `item_623_lift_cdx_and_git_out_of_the_viewer_server`. Proof deferred to slice closeout.
- request-AC1, request-AC2, request-AC3, request-AC5, request-AC7 -> `item_624_lift_cdx_git_and_the_workshop_out_of_the_browser_host`. Proof deferred to slice closeout.
- request-AC1, request-AC2, request-AC3, request-AC7 -> `item_625_cut_the_flow_entry_module_by_verb`. Proof deferred to slice closeout.
- request-AC3, request-AC4, request-AC6, request-AC7 -> `item_626_make_the_size_ledger_a_ratchet`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate lifting the sub-systems out of the core
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_311_lift_the_viewer_s_sub_systems_out_of_its_core_and_turn_the_size_ledger_into_a_ratchet`
- Product brief(s): `prod_059_sub_systems_beside_the_core_not_inside_it`
- Architecture decision(s): (none yet)
