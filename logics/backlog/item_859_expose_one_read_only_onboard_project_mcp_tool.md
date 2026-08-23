## item_859_expose_one_read_only_onboard_project_mcp_tool - Expose one read-only onboard_project MCP tool
> From version: 2.22.4
> Schema version: 1.0
> Status: Done
> Understanding: 92%
> Confidence: 88%
> Progress: 100%
> Complexity: Medium
> Theme: Connector onboarding
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 12:58:13

# AI Context
- Summary: Implement the minimal `onboard_project` MCP call by composing existing status, active-work, companion-doc, and context-pack metadata.
- Keywords: expose, read, only, onboard, project, mcp, tool
- Use when: Adding the first connector bootstrap tool or proving a fresh MCP client can see active Logics work without pasted output.
- Skip when: Implementing project switching, Git recent activity, or context-resource reads beyond the initial onboarding payload.

# Problem
- The connector already exposes useful low-level read tools, but a model in a fresh conversation has no obvious first call that proves the active project, corpus, and work state. This leads to guesses and user-pasted context.

# Scope
- In:
  - Add a read-only MCP tool definition for `onboard_project` with no required arguments and optional bounded fields such as `project`, `profile`, or `include_recent_activity` if existing patterns require them.
  - Implement the handler by composing existing payload builders: repo identity, `status_payload`, `flow_list_payload`/active work, companion doc listing, viewer URL template, and context-pack seed metadata.
  - Return explicit state fields for connector/tool/project availability instead of soft text: for example `available`, `project_selected`, `corpus_present`, `degraded`, and `messages`.
  - Return repo-relative paths or refs only; do not expose absolute local filesystem paths in the model-facing payload.
  - Document the intended model protocol in the tool description and nearby connector docs: call onboarding first, then trust only tool evidence.
  - Register the new tool names in `TOOL_CAPABILITIES` as read-only so the tunnel's served profile exposes them; an unregistered name is selected by no profile, not even `full`.
- Out:
  - Project switching and registry listing (sibling slice).
  - Detailed Git/recent activity aggregation (sibling slice).
  - Broad source-file scanning or AI-generated architecture summaries.

# Acceptance criteria
- AC1: `call_tool('onboard_project', {})` returns a structured project/corpus/work payload in a bootstrapped repository.
- AC2: The payload includes active requests/backlog/tasks equivalent to what `list_active_work` would expose, plus `get_logics_status` summary fields.
- AC3: A no-Logics repository or missing project produces an explicit degraded payload or clear MCP error without a traceback.
- AC4: Returned paths are repo-relative or refs; tests fail if an absolute repo path appears in the model-facing fields.
- AC5: Tool schema exposure and handler-table coverage include `onboard_project`.
- AC5: `onboard_project` and every sibling connector tool are entered in the MCP tool-capability map as read-only, and a test asserts they resolve through `select_tools(profile="curated")` and `profile="read-only"`.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `call_tool('onboard_project', {})` returns a structured project/corpus/work payload in a bootstrapped repository.
- request-AC2 -> This backlog slice. Proof: AC2: The payload includes active requests/backlog/tasks equivalent to what `list_active_work` would expose, plus `get_logics_status` summary fields.
- request-AC5 -> This backlog slice. Proof: AC3: A no-Logics repository or missing project produces an explicit degraded payload or clear MCP error without a traceback.
- request-AC7 -> This backlog slice. Proof: AC4: Returned paths are repo-relative or refs; tests fail if an absolute repo path appears in the model-facing fields.
- request-AC8 -> This backlog slice. Proof: AC5: Tool schema exposure and handler-table coverage include `onboard_project`.
- request-AC10 -> This backlog slice. Proof: AC5: `onboard_project` and every sibling connector tool are entered in the MCP tool-capability map as read-only, and a test asserts they resolve through `select_tools(profile="curated")` and `profile="read-only"`.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_111_connector_project_onboarding_context`
- Architecture decision(s): (none yet)
- Request: `req_382_make_the_chatgpt_mcp_connector_self_onboard_onto_any_logics_project`
- Primary task(s): `task_394_orchestrate_connector_project_onboarding_context`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_394_orchestrate_connector_project_onboarding_context`

# Notes
- Task `task_394_orchestrate_connector_project_onboarding_context` was finished via `logics-manager flow finish task` on 2026-08-23.
