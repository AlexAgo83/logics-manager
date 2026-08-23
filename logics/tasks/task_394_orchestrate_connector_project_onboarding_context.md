## task_394_orchestrate_connector_project_onboarding_context - Orchestrate connector project onboarding context
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-23 12:58:13
> Owner: codex

# AI Context
- Summary: Coordinate the connector onboarding delivery across initial probe, project targeting, recent activity, and source-backed follow-up reads.
- Keywords: orchestrate, connector, project, onboarding, context
- Use when: Implementing or closing the full req_382 chain and recording cross-slice proof.
- Skip when: Working one isolated backlog item without updating orchestration progress or request-level proof.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Slice A: add the minimal read-only `onboard_project` MCP tool by composing existing status, active-work, companion-doc, and context-pack metadata. Prove no absolute paths leak, the tool appears in schema/handler coverage, and its capability entry puts it in the profile the tunnel serves.
- [x] 2. Slice B: add project discovery/targeting using the existing viewer project registry or the smallest shared resolver that matches it. Keep targets bounded and explicit; avoid arbitrary path inputs.
- [x] 3. Slice C: aggregate recent activity from Logics metadata and existing Git viewer helpers, then feed the bounded summary into onboarding with degraded states for no-Git/no-history cases.
- [x] 4. Slice D: add `search_project_context` and `read_project_resource` as wrappers over existing safe Logics search/read/context-pack paths, with source-pointer round-trip tests.
- [x] 5. Closeout proof: replay the transcript scenario in tests: a fresh MCP client calls onboarding, receives the active work without user-pasted output, can target another known project, can inspect recent activity, and can read a cited resource. Finish with focused Python MCP tests plus `logics-manager lint --require-status` and `logics-manager audit --group-by-doc`.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_859_expose_one_read_only_onboard_project_mcp_tool`
- `item_860_add_bounded_project_discovery_and_targeting_for_connector_sessions`
- `item_861_aggregate_recent_logics_and_git_activity_for_onboarding`
- `item_862_expose_source_backed_project_context_search_and_resource_reads`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC2 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC5 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC7 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC8 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC10 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC3 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC8 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC4 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC5 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC8 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC5 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC6 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC7 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC8 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`
- request-AC9 -> This task. Proof: Implemented in 8fe91c91 and 070858ad: added read-only MCP project onboarding, project discovery/targeting, recent Logics/Git activity, source-backed search/read tools, read-only profile entries, and regression coverage. Validated with python3 -m pytest tests/python -q (1464 passed), npm test (87 files / 976 tests), npm run lint, logics-manager lint --require-status, and logics-manager audit --group-by-doc. Source: `8fe91c91,070858ad`

# Validation
- (no validation recorded yet)
- 1464 Python tests passed
- npm test passed: 87 files / 976 tests
- npm run lint passed with mcp.py under line budget
- logics-manager lint --require-status passed
- logics-manager audit --group-by-doc passed with 0 blocking issues
- command: `python3 -m pytest tests/python -q` | result: passed | date: 2026-08-23
- Finish workflow executed on 2026-08-23.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-23.
- Linked backlog item(s): `item_859_expose_one_read_only_onboard_project_mcp_tool`, `item_860_add_bounded_project_discovery_and_targeting_for_connector_sessions`, `item_861_aggregate_recent_logics_and_git_activity_for_onboarding`, `item_862_expose_source_backed_project_context_search_and_resource_reads`
- Related request(s): `req_382_make_the_chatgpt_mcp_connector_self_onboard_onto_any_logics_project`

# Links
- Request: `req_382_make_the_chatgpt_mcp_connector_self_onboard_onto_any_logics_project`
- Product brief(s): `prod_111_connector_project_onboarding_context`
- Architecture decision(s): (none yet)
