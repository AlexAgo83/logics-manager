## task_228_expose_release_workflow_context_for_assistants_and_mcp_clients - Expose release workflow context for assistants and MCP clients
> From version: 2.8.1
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Backlog
- `item_433_expose_release_workflow_context_for_assistants_and_mcp_clients`

# Acceptance criteria
- AC1: Context packs include release config presence, target version when known, current state, next action, and required gates.
- AC2: MCP or equivalent bounded surfaces can return release plan/status data without requiring broad file scans.
- AC3: Agent guidance states that release readiness must come from project-owned evidence, not conversational memory.
- AC4: Publication-oriented actions remain explicit and distinguishable from safe read/validate actions.
- AC5: Tests or fixtures show that another project can expose release context without custom assistant-specific code.

# AC Traceability
- request-AC1 -> `task_224_define_the_release_workflow_contract_and_schema`. Proof: Added the release contract schema and multi-project fixture contracts.
- request-AC2 -> `task_226_implement_release_status_and_validation_commands`. Proof: Added structured release status, plan, and validate payloads with gates, next action, blocking reasons, and evidence references.
- request-AC3 -> `task_224_define_the_release_workflow_contract_and_schema` and `task_226_implement_release_status_and_validation_commands`. Proof: Contract states and gate payloads distinguish preparation, validation, git, GitHub release, and external publication.
- request-AC4 -> `task_227_expose_release_workflow_state_in_the_logics_viewer`. Proof: Added compact viewer release state and gate evidence rendering.
- request-AC5 -> This task. Proof: Context packs include release workflow state and MCP exposes read-only release status/plan tools for assistant clients.
- request-AC6 -> This task. Proof: Release context is derived from `logics/release/contract.json` and temporary project tests, not provider-specific assistant code.
- request-AC7 -> `task_224_define_the_release_workflow_contract_and_schema`. Proof: Fixture validation covers `logics-manager`, `cdx-manager`, and `cp-wc-26` release contracts.
- request-AC8 -> `task_226_implement_release_status_and_validation_commands` and this task. Proof: Status/validate block missing, stale, failed, or wrong commit/tag evidence, and assistant guidance requires project-owned evidence.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_228_expose_release_workflow_context_for_assistants_and_mcp_clients.md` after implementation.
- PYTHONPATH=. python3.11 -m pytest tests/python/test_release_contract_schema.py tests/python/test_logics_manager_mcp.py::test_mcp_read_list_search_and_context_tools -vv passed (11 tests).
- PYTHONPATH=. python3.11 -m py_compile logics_manager/release.py logics_manager/sync.py logics_manager/mcp.py passed.
- Finish workflow executed on 2026-06-18.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Implemented release context projection for assistant context packs, added read-only MCP release status/plan tools, and marked publication plan steps as explicit operator actions.
- Finished on 2026-06-18.
- Linked backlog item(s): `item_433_expose_release_workflow_context_for_assistants_and_mcp_clients`
- Related request(s): `req_248_release_workflow_multi_project_ai_assistants`

# AI Context
- Summary: Implement expose release workflow context for assistants and mcp clients.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_248_release_workflow_multi_project_ai_assistants`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
