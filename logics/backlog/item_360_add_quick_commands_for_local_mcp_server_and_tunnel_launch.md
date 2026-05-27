## item_360_add_quick_commands_for_local_mcp_server_and_tunnel_launch - Add quick commands for local MCP server and tunnel launch
> From version: 2.1.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Provide fast, copyable commands to launch the local Logics MCP HTTP server with an HTTPS tunnel for ChatGPT developer-mode testing.
Support both bearer-protected sessions for safer external testing and intentionally unauthenticated sessions for short-lived live debugging.
Reduce the number of manual steps needed to start, inspect, share, and stop a local MCP tunnel.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: A documented or CLI-backed quick command starts the local MCP HTTP server and HTTPS tunnel with bearer auth enabled.
- AC2: A documented or CLI-backed quick command starts the local MCP HTTP server and HTTPS tunnel without bearer auth for short-lived debug sessions.
- AC3: The quick command output clearly prints the ChatGPT MCP URL, local `/health` URL, auth mode, and stop/cleanup instructions.
- AC4: No-bearer mode prints an explicit warning before or during launch that the tunnel is unauthenticated and should only be used for short-lived debugging.
- AC5: The workflow is easy to run from the project binary during development and does not require operators to manually assemble token, server, and tunnel commands.
- AC6: Basic smoke checks cover `/health`, `tools/list`, and the transport mode ChatGPT uses when discovering tools.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A documented or CLI-backed quick command starts the local MCP HTTP server and HTTPS tunnel with bearer auth enabled.
- request-AC2 -> This backlog slice. Proof: AC2: A documented or CLI-backed quick command starts the local MCP HTTP server and HTTPS tunnel without bearer auth for short-lived debug sessions.
- request-AC3 -> This backlog slice. Proof: AC3: The quick command output clearly prints the ChatGPT MCP URL, local `/health` URL, auth mode, and stop/cleanup instructions.
- request-AC4 -> This backlog slice. Proof: AC4: No-bearer mode prints an explicit warning before or during launch that the tunnel is unauthenticated and should only be used for short-lived debugging.
- request-AC5 -> This backlog slice. Proof: AC5: The workflow is easy to run from the project binary during development and does not require operators to manually assemble token, server, and tunnel commands.
- request-AC6 -> This backlog slice. Proof: AC6: Basic smoke checks cover `/health`, `tools/list`, and the transport mode ChatGPT uses when discovering tools.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_196_add_quick_commands_for_local_mcp_server_and_tunnel_launch.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Add quick commands for local MCP server and tunnel launch
- Keywords: backlog-groom, request, add quick commands for local mcp server and tunnel launch, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Add quick commands for local MCP server and tunnel launch.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_196_add_quick_commands_for_local_mcp_server_and_tunnel_launch` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_196_add_quick_commands_for_local_mcp_server_and_tunnel_launch.md`.
- Generated locally by logics-manager.
- Task `task_161_add_quick_commands_for_local_mcp_server_and_tunnel_launch` was finished via `logics-manager flow finish task` on 2026-05-27.

# Tasks
- `task_161_add_quick_commands_for_local_mcp_server_and_tunnel_launch`
