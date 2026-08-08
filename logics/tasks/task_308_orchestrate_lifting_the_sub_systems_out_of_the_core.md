## task_308_orchestrate_lifting_the_sub_systems_out_of_the_core - Orchestrate lifting the sub-systems out of the core
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-08 18:59:10

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Lift cdx and git out of the viewer server, on the seam the route modules already established.
- [x] 2. Lift cdx out of the browser host; git and the workshop measured and left, recorded on `item_624`. Coupling measured — cdx touches 1 shared binding, the workshop 3, git 12 — so cdx is movable and git is blocked by the shared state this request does not move. The board filters were lifted as the proving cut.
- [x] 3. Cut the flow entry module underneath the verbs: the shared vocabulary moved to `flow/docs.py`, since cutting by verb would have moved the coupling rather than removed it.
- [x] 4. Make the size ledger lower itself when a file shrinks, and refuse an unjustified raise.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_623_lift_cdx_and_git_out_of_the_viewer_server`
- `item_624_lift_cdx_git_and_the_workshop_out_of_the_browser_host`
- `item_625_cut_the_flow_entry_module_by_verb`
- `item_626_make_the_size_ledger_a_ratchet`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_623` and `item_624` and `item_625`. Proof: `viewer_cdx.py`, `viewer_git.py`, `flow/docs.py`, `browser-host/cdx.js` and `browser-host/filters.js`, each imported by the core rather than written inside it.
- request-AC2 -> every slice. Proof: 1102 Python tests, 797 vitest tests and the viewer campaign pass; `npm run check:viewer-host` confirms the generated bundle matches its sources.
- request-AC3 -> every slice. Proof: `scripts/check-source-line-budget.mjs` — viewer.py 5937 to 3322, flow/__init__.py 4909 to 3626, browser-host/index.js 7853 to 5862. Every entry moved down.
- request-AC4 -> `item_626`. Proof: `does not raise a ceiling on its own when a file grows` and `still refuses a new oversized file with no entry at all` in `tests/lineBudgetLedger.test.ts`.
- request-AC5 -> `item_624`. Proof: git measured at 12 bindings it does not own and left where it is, recorded in the slice's decision note; the shared state was not moved.
- request-AC6 -> `item_624`. Proof: `logics_manager/mcp.py` keeps its recorded reason and its 2054 ceiling, untouched by this request.
- request-AC7 -> every slice. Proof: `tests/python/test_viewer_subsystem_modules.py` (18), `tests/python/test_flow_package_surface.py` (11), `tests/viewer.cdx-module.test.ts` (4) and `tests/lineBudgetLedger.test.ts` (5); the import-order test caught a circular import the lift had introduced.

# Validation
- (no validation recorded yet)
- command: `node scripts/ci-check.mjs` | result: passed | date: 2026-08-08 | note: ci-check green: 1102 python, 797 vitest, campaign, both ledgers lowered
- Finish workflow executed on 2026-08-08.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-08.
- Linked backlog item(s): `item_623_lift_cdx_and_git_out_of_the_viewer_server`, `item_624_lift_cdx_git_and_the_workshop_out_of_the_browser_host`, `item_625_cut_the_flow_entry_module_by_verb`, `item_626_make_the_size_ledger_a_ratchet`
- Related request(s): `req_311_lift_the_viewer_s_sub_systems_out_of_its_core_and_turn_the_size_ledger_into_a_ratchet`

# AI Context
- Summary: Orchestrate lifting the sub-systems out of the core
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_311_lift_the_viewer_s_sub_systems_out_of_its_core_and_turn_the_size_ledger_into_a_ratchet`
- Product brief(s): `prod_059_sub_systems_beside_the_core_not_inside_it`
- Architecture decision(s): (none yet)
