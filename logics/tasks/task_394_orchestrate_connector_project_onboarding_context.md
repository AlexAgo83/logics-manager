## task_394_orchestrate_connector_project_onboarding_context - Orchestrate connector project onboarding context
> From version: 2.22.4
> Schema version: 1.0
> Status: In progress
> Understanding: 92%
> Confidence: 88%
> Progress: 40%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-23 12:40:54
> Owner: codex

# AI Context
- Summary: Coordinate the connector onboarding delivery across initial probe, project targeting, recent activity, and source-backed follow-up reads.
- Keywords: orchestrate, connector, project, onboarding, context
- Use when: Implementing or closing the full req_382 chain and recording cross-slice proof.
- Skip when: Working one isolated backlog item without updating orchestration progress or request-level proof.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Slice A: add the minimal read-only `onboard_project` MCP tool by composing existing status, active-work, companion-doc, and context-pack metadata. Prove no absolute paths leak, the tool appears in schema/handler coverage, and its capability entry puts it in the profile the tunnel serves.
- [ ] 2. Slice B: add project discovery/targeting using the existing viewer project registry or the smallest shared resolver that matches it. Keep targets bounded and explicit; avoid arbitrary path inputs.
- [ ] 3. Slice C: aggregate recent activity from Logics metadata and existing Git viewer helpers, then feed the bounded summary into onboarding with degraded states for no-Git/no-history cases.
- [ ] 4. Slice D: add `search_project_context` and `read_project_resource` as wrappers over existing safe Logics search/read/context-pack paths, with source-pointer round-trip tests.
- [ ] 5. Closeout proof: replay the transcript scenario in tests: a fresh MCP client calls onboarding, receives the active work without user-pasted output, can target another known project, can inspect recent activity, and can read a cited resource. Finish with focused Python MCP tests plus `logics-manager lint --require-status` and `logics-manager audit --group-by-doc`.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_859_expose_one_read_only_onboard_project_mcp_tool`
- `item_860_add_bounded_project_discovery_and_targeting_for_connector_sessions`
- `item_861_aggregate_recent_logics_and_git_activity_for_onboarding`
- `item_862_expose_source_backed_project_context_search_and_resource_reads`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_859_expose_one_read_only_onboard_project_mcp_tool`. Proof deferred to slice closeout.
- request-AC2 -> `item_859_expose_one_read_only_onboard_project_mcp_tool`. Proof deferred to slice closeout.
- request-AC5 -> `item_859_expose_one_read_only_onboard_project_mcp_tool`. Proof deferred to slice closeout.
- request-AC7 -> `item_859_expose_one_read_only_onboard_project_mcp_tool`. Proof deferred to slice closeout.
- request-AC8 -> `item_859_expose_one_read_only_onboard_project_mcp_tool`. Proof deferred to slice closeout.
- request-AC10 -> `item_859_expose_one_read_only_onboard_project_mcp_tool`. Proof deferred to slice closeout.
- request-AC3 -> `item_860_add_bounded_project_discovery_and_targeting_for_connector_sessions`. Proof deferred to slice closeout.
- request-AC8 -> `item_860_add_bounded_project_discovery_and_targeting_for_connector_sessions`. Proof deferred to slice closeout.
- request-AC4 -> `item_861_aggregate_recent_logics_and_git_activity_for_onboarding`. Proof deferred to slice closeout.
- request-AC5 -> `item_861_aggregate_recent_logics_and_git_activity_for_onboarding`. Proof deferred to slice closeout.
- request-AC8 -> `item_861_aggregate_recent_logics_and_git_activity_for_onboarding`. Proof deferred to slice closeout.
- request-AC5 -> `item_862_expose_source_backed_project_context_search_and_resource_reads`. Proof deferred to slice closeout.
- request-AC6 -> `item_862_expose_source_backed_project_context_search_and_resource_reads`. Proof deferred to slice closeout.
- request-AC7 -> `item_862_expose_source_backed_project_context_search_and_resource_reads`. Proof deferred to slice closeout.
- request-AC8 -> `item_862_expose_source_backed_project_context_search_and_resource_reads`. Proof deferred to slice closeout.
- request-AC9 -> `item_862_expose_source_backed_project_context_search_and_resource_reads`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_382_make_the_chatgpt_mcp_connector_self_onboard_onto_any_logics_project`
- Product brief(s): `prod_111_connector_project_onboarding_context`
- Architecture decision(s): (none yet)
