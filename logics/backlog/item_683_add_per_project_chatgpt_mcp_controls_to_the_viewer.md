## item_683_add_per_project_chatgpt_mcp_controls_to_the_viewer - Add per-project ChatGPT MCP controls to the viewer
> From version: 2.21.3
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: ChatGPT developer-mode MCP operations
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Add per-project ChatGPT MCP controls to the viewer
- Keywords: scaffolded-backlog, add per-project chatgpt mcp controls to the viewer, implementation-ready
- Use when: Implementing the scaffolded slice for Add per-project ChatGPT MCP controls to the viewer.
- Skip when: The change belongs to another backlog slice.

# Problem
- The existing MCP connector workflow works from the CLI, but VS Code users have no fast, visible way to turn a project connection on or off or retrieve the ChatGPT URL.

# Scope
- In:
  - Add viewer API and UI controls backed by the existing MCP server, tunnel, health-check, and per-project lifecycle primitives.
  - Show local and public readiness separately and copy only a usable HTTPS /mcp URL for ChatGPT.
  - Require an explicit ON action, provide deterministic OFF cleanup, and avoid persisting bearer tokens in viewer preferences or logs.
  - Cover lifecycle reuse, startup failure, no-public-URL, URL copy, and shutdown with focused tests.
- Out:
  - Automatic startup, automatic public exposure, or permanent background services.
  - New tunnel providers or a new ChatGPT app implementation.
  - Changing MCP tool authorization beyond the existing server contract.

# Acceptance criteria
- ON starts or reuses exactly one MCP connection for the selected project and reports local, tunnel, and public URL state honestly.
- Copy URL is available only when the public HTTPS MCP endpoint is ready.
- OFF stops viewer-owned processes and the viewer no longer displays a token or active URL afterward.

# AC Traceability
- request-The viewer provides an explicit per-project ChatGPT MCP ON action, an OFF action, visible running state, and a one-click copy action for the HTTPS /mcp URL when a tunnel is ready. -> This backlog slice. Proof: ON starts or reuses exactly one MCP connection for the selected project and reports local, tunnel, and public URL state honestly.
- request-Starting MCP does not expose a service until the operator explicitly chooses ON; stopping it terminates the viewer-owned local server and tunnel and clears transient connection secrets from the displayed state. -> This backlog slice. Proof: Copy URL is available only when the public HTTPS MCP endpoint is ready.
- request-Focused browser-host, MCP lifecycle, and viewer API tests cover the three surfaces, including failed startup and unavailable public URL behavior. -> This backlog slice. Proof: OFF stops viewer-owned processes and the viewer no longer displays a token or active URL afterward.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_071_direct_viewer_operations_for_workflow_chains_and_chatgpt_mcp`
- Architecture decision(s): (none yet)
- Request: `req_327_make_viewer_navigation_and_chatgpt_mcp_developer_controls_direct`
- Primary task(s): `task_324_deliver_direct_viewer_chain_settings_and_chatgpt_mcp_controls`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
