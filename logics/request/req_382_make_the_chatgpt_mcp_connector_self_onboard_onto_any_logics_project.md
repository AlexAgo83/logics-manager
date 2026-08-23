## req_382_make_the_chatgpt_mcp_connector_self_onboard_onto_any_logics_project - Make the ChatGPT MCP connector self-onboard onto any Logics project
> From version: 2.22.4
> Schema version: 1.0
> Status: Draft
> Understanding: 92%
> Confidence: 88%
> Complexity: High
> Theme: Connector onboarding
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 11:56:04

# AI Context
- Summary: Add a first-call connector probe so ChatGPT can prove the active Logics project, work, recent activity, and readable sources before answering.
- Keywords: chatgpt, mcp, connector, self, onboard, onto, any, logics, project
- Use when: Improving MCP connector project discovery, active-work onboarding, sourced project context, or transcript regressions where the model claims visibility without tool evidence.
- Skip when: Working only on connector auth/tunnel durability, viewer-only UI polish, or unrelated Logics workflow document lifecycle changes.

# Needs
- A model connected through the ChatGPT MCP connector can verify which Logics project and corpus it is actually looking at before answering operator questions.
- The connector exposes one read-only onboarding command that returns the current project identity, active work, key Logics documents, recent activity, available navigation commands, and explicit unavailable/error states.
- The model can switch or target projects through a bounded project-selection surface instead of relying on the user to paste context or assert that the plugin is connected.
- Project context is derived from existing sources of truth (Logics docs, status/health, context packs, viewer project metadata, and Git when available) rather than from a manually maintained assistant summary.
- Every important onboarding claim is sourced enough for the model to drill down with `search_project_context` or `read_project_resource` instead of receiving an opaque generated summary.

# Context
- A real ChatGPT connector dogfood session showed the model repeatedly saying it could not see the active corpus, even while the operator expected the connector to expose it. Once the plugin surface was actually reachable, `list_active_work` returned the active request/backlog/task chain, proving the missing piece is a reliable first probe and semantic project context, not raw MCP connectivity alone.
- The existing connector already has useful primitives (`list_active_work`, `get_logics_status`, `list_logics_docs`, `search_logics_docs`, `read_logics_doc`, `build_context_pack`), but a model has to guess which sequence to call and cannot clearly distinguish connector-installed, connector-available, project-selected, and tool-response states.
- The transcript showed the product risk: the model used soft language such as 'I look' or 'I try' without tool evidence. The connector should make the correct behavior cheap: call one bootstrap tool, inspect the explicit state, then read only the bounded resources needed.
- Recent Git and Logics activity are already present in separate runtime surfaces (viewer Git/status/activity and Logics status/context packs). The first version should aggregate these signals; it should not invent a broad repository summarizer or scan arbitrary source files.
- The useful target is project onboarding, not a permanent hand-written project memory. Cache may be used, but invalidation should follow Git head/status and Logics index/document timestamps so stale summaries do not become a hidden source of truth.

# Acceptance criteria
- AC1: A new read-only MCP tool, named `onboard_project` or equivalent, returns a structured payload with project identity, repository root/name, active corpus/doc counts, current Logics status summary, active work, key companion docs, recent activity, available follow-up tools, source pointers, and explicit unavailable/error states.
- AC2: The onboarding tool can be called safely in a fresh ChatGPT connector conversation without arguments; it never mutates files, never returns absolute filesystem paths to the remote model, and never requires the user to paste command output.
- AC3: The connector exposes bounded project navigation: list known/available projects, report the active project, and target or select a project using the same project registry/resolution rules the viewer already uses.
- AC4: Recent activity combines Logics workflow changes and Git signals when Git is available: current branch, dirty/unpushed counts, recent commit summaries, recently changed Logics docs, and graceful degraded messages when Git or history is unavailable.
- AC5: Project context is source-backed: each high-level item includes a `source` or `sources` field pointing to a Logics ref/path, Git commit/path, status payload section, or context-pack document entry, and follow-up tools can read that resource boundedly.
- AC6: `search_project_context` and `read_project_resource` wrap existing `search_logics_docs`, `read_logics_doc`, context-pack, and safe source-preview primitives so the model can deepen context without broad repository access.
- AC7: The tool definitions and docs make the intended model protocol explicit: first call onboarding, trust only returned tool evidence, then call search/read resources as needed; no response should imply a project is visible without a successful tool result.
- AC8: Tests cover the happy path, no-Logics/no-Git degraded states, project targeting, source-pointer shape, MCP tool schema exposure, and the transcript regression where `list_active_work` is reachable through onboarding without extra user-pasted context.
- AC9: Validation passes through focused Python tests for MCP/project context plus `logics-manager lint --require-status` and `logics-manager audit --group-by-doc` on the generated corpus.
- AC10: Every new connector tool is registered in the MCP tool-capability map as read-only and is exposed by the profile the tunnel actually serves (`curated`), with a test asserting the tool names appear in `select_tools` for that profile; tools missing from the map are served by no profile at all, so the connector would never see them.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_111_connector_project_onboarding_context`
- Architecture decision(s): (none yet)

# References
- `logics_manager/mcp_tool_definitions.py` exposes the current read-only MCP tools: `list_active_work`, `get_logics_status`, `list_logics_docs`, `search_logics_docs`, `read_logics_doc`, and `build_context_pack`, but no single project-onboarding probe.
- `logics_manager/mcp.py` dispatches MCP tools through `_TOOL_HANDLERS` and already attaches viewer URL templates to bounded document responses.
- `logics_manager/insights.py` builds the open-work signal used by `logics-manager status`, including active tasks, draft requests, priorities, and next actions.
- `logics_manager/sync.py` owns bounded document discovery and context-pack construction through `list-docs`, `search-docs`, `read-doc`, and `context-pack` payload builders.
- `logics_manager/viewer_git.py` already computes Git branch/status/history/change data for the viewer without mutating the repository.
- `logics_manager/viewer_project_tools.py` detects project-level capabilities, proving the repo already has a place for bounded project capability probes.

# Backlog
- `item_859_expose_one_read_only_onboard_project_mcp_tool`
- `item_860_add_bounded_project_discovery_and_targeting_for_connector_sessions`
- `item_861_aggregate_recent_logics_and_git_activity_for_onboarding`
- `item_862_expose_source_backed_project_context_search_and_resource_reads`
