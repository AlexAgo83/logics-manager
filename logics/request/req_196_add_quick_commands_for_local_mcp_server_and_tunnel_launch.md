## req_196_add_quick_commands_for_local_mcp_server_and_tunnel_launch - Add quick commands for local MCP server and tunnel launch
> From version: 2.1.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: MCP workflow ergonomics
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Provide fast, copyable commands to launch the local Logics MCP HTTP server with an HTTPS tunnel for ChatGPT developer-mode testing.
- Support both bearer-protected sessions for safer external testing and intentionally unauthenticated sessions for short-lived live debugging.
- Reduce the number of manual steps needed to start, inspect, share, and stop a local MCP tunnel.

# Context
- The current workflow requires composing multiple commands manually: start `mcp serve-http`, decide whether to set `LOGICS_MCP_BEARER_TOKEN`, start `localtunnel` or another tunnel, copy the final `/mcp` URL, and remember the auth mode.
- The project already exposes `logics-manager mcp serve-http` and `logics-manager mcp connect`, but live debugging with ChatGPT benefits from a shorter operator-facing command surface.
- The command surface should work from the project binary as well as the installed CLI path where supported, without hiding which binary is being used.
- No-bearer mode is useful for quick local debugging through a short-lived tunnel, but it must be visibly marked as unsafe for long-lived or shared sessions.

# Acceptance criteria
- AC1: A documented or CLI-backed quick command starts the local MCP HTTP server and HTTPS tunnel with bearer auth enabled.
- AC2: A documented or CLI-backed quick command starts the local MCP HTTP server and HTTPS tunnel without bearer auth for short-lived debug sessions.
- AC3: The quick command output clearly prints the ChatGPT MCP URL, local `/health` URL, auth mode, and stop/cleanup instructions.
- AC4: No-bearer mode prints an explicit warning before or during launch that the tunnel is unauthenticated and should only be used for short-lived debugging.
- AC5: The workflow is easy to run from the project binary during development and does not require operators to manually assemble token, server, and tunnel commands.
- AC6: Basic smoke checks cover `/health`, `tools/list`, and the transport mode ChatGPT uses when discovering tools.

# Scope
- In:
  - quick launch commands or scripts for bearer and no-bearer MCP tunnel sessions;
  - clear output for ChatGPT setup values;
  - local and public smoke checks;
  - cleanup/stop guidance;
  - documentation for project-binary and installed-CLI usage.
- Out:
  - hosted or long-lived public MCP infrastructure;
  - automatic ChatGPT connector configuration;
  - changing the bounded MCP tool permissions model.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `README.md`
- `scripts/npm/logics-manager.mjs`
- `logics_manager/mcp.py`
- `python_tests/test_logics_manager_mcp.py`
- `logics_manager/flow.py`

# AI Context
- Summary: Add quick operator commands for launching the local Logics MCP server with an HTTPS tunnel, with and without bearer auth.
- Keywords: request-draft, mcp, chatgpt, tunnel, bearer, localtunnel, developer mode, logics-manager cli
- Use when: You need to improve the local ChatGPT MCP debug launch workflow.
- Skip when: The work already has an existing request or should go straight to a backlog slice.

# Backlog
- none
- `item_360_add_quick_commands_for_local_mcp_server_and_tunnel_launch`
