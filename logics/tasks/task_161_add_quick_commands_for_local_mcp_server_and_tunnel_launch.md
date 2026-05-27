## task_161_add_quick_commands_for_local_mcp_server_and_tunnel_launch - Add quick commands for local MCP server and tunnel launch
> From version: 2.1.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

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
- Finish workflow executed on 2026-05-27.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-05-27.
- Linked backlog item(s): `item_360_add_quick_commands_for_local_mcp_server_and_tunnel_launch`
- Related request(s): `req_196_add_quick_commands_for_local_mcp_server_and_tunnel_launch`

# AI Context
- Summary: Implement add quick commands for local mcp server and tunnel launch.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_196_add_quick_commands_for_local_mcp_server_and_tunnel_launch`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- AC1 -> `logics-manager mcp tunnel`. Proof: `launch_tunnel` starts the local HTTP server and `localtunnel` with a generated bearer token by default.
- AC2 -> `logics-manager mcp tunnel --no-bearer`. Proof: the CLI exposes `--no-bearer` and `connector_plan(no_bearer=True)` omits bearer configuration.
- AC3 -> Connector output. Proof: `_print_connector_plan` prints ChatGPT MCP URL, local health URL through smoke checks, auth mode, auth header, and cleanup steps.
- AC4 -> No-bearer warning. Proof: `connector_plan(no_bearer=True)` returns an unauthenticated-session warning and `_print_connector_plan` renders it.
- AC5 -> Project binary workflow. Proof: `_project_binary_path` prefers `scripts/npm/logics-manager.mjs`, and README documents project-binary tunnel commands.
- AC6 -> Smoke and transport coverage. Proof: `connector_smoke_check` covers `/health` and `tools/list`; `test_mcp_http_transport_accepts_sse_get` covers ChatGPT-style `GET /mcp` discovery.
