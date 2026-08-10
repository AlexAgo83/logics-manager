## task_327_orchestrate_the_discoverable_runbook_library_delivery - Orchestrate the discoverable runbook library delivery
> From version: 2.21.4
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 00:58:12
> Owner: claude

# AI Context
- Summary: Orchestrate the discoverable runbook library delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Add the smallest companion-document contract (item_687): new `run_` kind on the existing `Kind`/`stage_statuses`/`flow companion` machinery, bootstrap instructions, and index entry.
- [x] 2. Carry the one kind through bounded read/list/search/context-pack/lint/audit/MCP surfaces, and add a `match` command as a thin ranked wrapper over existing document search (item_688); keep no-match non-blocking.
- [x] 3. Add Workshop Runbooks between Commands and Explorer: search, metadata, verified state transitions, and a runbook-book graph reusing the existing chain-graph renderer with a new resolver (item_689).
- [x] 4. Validate the full request chain. Cross-repository migration and automated capture-from-task tooling are explicitly out of scope for this delivery.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_687_define_the_runbook_companion_contract_and_agent_discovery_path`
- `item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling`
- `item_689_make_the_runbook_library_navigable_in_the_viewer`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_687_define_the_runbook_companion_contract_and_agent_discovery_path`. Proof: implemented in 4f847b88 (run_ kind, logics/runbook/, Draft/Active/Archived, Category/Verified); validated by tests/python/test_runbook_contract.py.
- request-AC2 -> `item_687_define_the_runbook_companion_contract_and_agent_discovery_path`. Proof: implemented in 4f847b88 (bootstrap instructions + `logics-manager index` Runbooks section); validated by tests/python/test_runbook_contract.py.
- request-AC7 -> `item_687_define_the_runbook_companion_contract_and_agent_discovery_path`. Proof: implemented in 4f847b88 (`flow companion runbook`, same creation path as every other companion kind; no import/capture tooling); validated by tests/python/test_agent_facing_correctness.py.
- request-AC3 -> `item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling`. Proof: implemented in f6f20925 (read-doc/list-docs/search-docs/context-pack/lint/audit/MCP accept kind=runbook); validated by tests/python/test_runbook_contract.py and test_logics_manager_mcp.py.
- request-AC4 -> `item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling`. Proof: implemented in f6f20925 (`sync match-runbooks` / `match_runbooks_payload`, capped at 3, ranked, reasoned); validated by tests/python/test_runbook_contract.py.
- request-AC5 -> `item_689_make_the_runbook_library_navigable_in_the_viewer`. Proof: implemented in adbedcb8 (Workshop Runbooks tab between Commands and Explorer, search + recent list + category/verified metadata); validated by tests/viewer.browser-host.test.ts.
- request-AC6 -> `item_689_make_the_runbook_library_navigable_in_the_viewer`. Proof: implemented in adbedcb8 (`resolve_runbook_library_graph`, request-chain graph untouched); validated by tests/python/test_runbook_library_graph.py.
- request-AC8 -> `item_687_define_the_runbook_companion_contract_and_agent_discovery_path`, `item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling`, and `item_689_make_the_runbook_library_navigable_in_the_viewer`. Proof: validated by `python3 -m pytest tests/python -q` (1300 passed) and `npx vitest run` (835 passed) across 4f847b88/f6f20925/adbedcb8.
- request-AC9 -> `item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling` and `item_689_make_the_runbook_library_navigable_in_the_viewer`. Proof: implemented in f6f20925/adbedcb8 (every match carries `reason`, no-match is non-error output, no capture flow to skip); validated by tests/python/test_runbook_contract.py.

# Validation
- `python3 -m pytest tests/python -q` (1300 passed) after item_689.
- `npx vitest run` (835 passed) after item_689.
- `npm run lint` (tsc/eslint/line-budget/status-constants) clean after item_689.
- `python3 -m logics_manager lint` / `audit` clean after item_689.
- command: `python3 -m pytest tests/python -q && npx vitest run && npm run lint` | result: passed | date: 2026-08-11
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- item_687 done: `run_` kind added to `lint.py`/`audit.py`/`sync.py`/`mcp.py`/`mcp_tool_definitions.py`/`viewer_docs.py`/`flow/docs.py`/`bootstrap.py`/`index.py`/`statuses.json`; `flow companion runbook` creates a Draft template; bootstrap instructions and `logics-manager index` mention runbooks; contract tests in `tests/python/test_runbook_contract.py`.
- item_688 done: `sync match-runbooks` (+ `match_runbooks_payload`) is a thin wrapper over the existing document search -- category/ref-path/Trigger/text tiers, capped at 3, each with a reason; exposed via CLI and the new `match_runbooks` MCP tool; `read-doc`/`list-docs`/`search-docs`/`context-pack` already resolved runbooks generically once item_687 registered the kind. Fixed a latent gap where `Category`/`Verified` were parsed by the index/mcp paths but not by `parse_workflow_doc`'s indicator set, which the match command depends on.
- item_689 done: `resolve_runbook_library_graph` (category -> runbook -> optional linked doc, `tests/python/test_runbook_library_graph.py`) reuses `chain_graph.py`'s node/edge shape so the client's existing `renderChainGraph`/`buildChainFlowchartSource` render it unmodified (two new classDefs only). New `/api/runbooks` and `/api/runbook-graph` viewer routes wrap `match_runbooks_payload`/`list_active_runbooks_payload`/`resolve_runbook_library_graph`. Runbooks tab added to Workshop between Commands and Explorer (`workshopTabs`), with search, recent list, a "View graph" toggle, and a viewer test (`tests/viewer.browser-host.test.ts`). Draft/Active/Archived status transitions reuse the existing generic `/api/update-status` + `statusOptionsByStage` path -- no new mutation code needed. No capture-suggestion UI, per the trimmed scope.
- Finished on 2026-08-11.
- Linked backlog item(s): `item_687_define_the_runbook_companion_contract_and_agent_discovery_path`, `item_688_expose_runbooks_through_bounded_commands_mcp_and_deliberate_migration_tooling`, `item_689_make_the_runbook_library_navigable_in_the_viewer`
- Related request(s): `req_330_make_operational_runbooks_a_discoverable_logics_companion_document`

# Links
- Request: `req_330_make_operational_runbooks_a_discoverable_logics_companion_document`
- Product brief(s): `prod_074_a_discoverable_library_of_operational_runbooks`
- Architecture decision(s): (none yet)
