## task_161_add_quick_commands_for_local_mcp_server_and_tunnel_launch - Add quick commands for local MCP server and tunnel launch
> From version: 2.1.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_360_add_quick_commands_for_local_mcp_server_and_tunnel_launch`

# Acceptance criteria
- AC1: A documented or CLI-backed quick command starts the local MCP HTTP server and HTTPS tunnel with bearer auth enabled.
- AC2: A documented or CLI-backed quick command starts the local MCP HTTP server and HTTPS tunnel without bearer auth for short-lived debug sessions.
- AC3: The quick command output clearly prints the ChatGPT MCP URL, local `/health` URL, auth mode, and stop/cleanup instructions.
- AC4: No-bearer mode prints an explicit warning before or during launch that the tunnel is unauthenticated and should only be used for short-lived debugging.
- AC5: The workflow is easy to run from the project binary during development and does not require operators to manually assemble token, server, and tunnel commands.
- AC6: Basic smoke checks cover `/health`, `tools/list`, and the transport mode ChatGPT uses when discovering tools.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_161_add_quick_commands_for_local_mcp_server_and_tunnel_launch.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement add quick commands for local mcp server and tunnel launch.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_196_add_quick_commands_for_local_mcp_server_and_tunnel_launch`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
