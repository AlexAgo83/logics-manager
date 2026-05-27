## item_357_local_mcp_connector_launcher_for_chatgpt_developer_mode - Local MCP connector launcher for ChatGPT developer mode
> From version: 2.0.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: MCP workflow ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Option-A local-first usage still requires too many manual steps: generate a token, start `serve-http`, start a tunnel, test health, configure ChatGPT developer mode, and stop everything after use. Operators need a launcher that makes this flow reliable without introducing a central service.

# Scope
- In:
  - a CLI entrypoint such as `logics-manager mcp connect`;
  - bearer-token generation or validation;
  - local server startup guidance or orchestration;
  - tunnel setup guidance and smoke checks;
  - printed ChatGPT developer-mode setup instructions;
  - stop/cleanup guidance.
- Out:
  - a hosted SaaS connector;
  - automatic publication to ChatGPT;
  - long-lived public tunnel management.

# Acceptance criteria
- AC1: A local connector launcher can generate or accept a bearer token for MCP access.
- AC2: The launcher can start or clearly guide startup of the local MCP HTTP server.
- AC3: The launcher can guide tunnel setup and run `/health` plus authenticated `/mcp` smoke checks.
- AC4: The launcher prints copyable ChatGPT developer-mode URL and auth instructions.
- AC5: The launcher documents stop/cleanup behavior for short-lived tunnel sessions.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: the launcher improves option-A ChatGPT developer-mode setup.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`
- Architecture decision(s): (none yet)
- Request: `logics/request/req_192_expand_local_chatgpt_mcp_action_surface.md`
- Primary task(s): `logics/tasks/task_158_local_mcp_connector_launcher_for_chatgpt_developer_mode.md`

# AI Context
- Summary: Local MCP connector launcher for ChatGPT developer mode
- Keywords: backlog, promote, slice, local mcp connector launcher for chatgpt developer mode
- Use when: You need a bounded backlog item for Local MCP connector launcher for ChatGPT developer mode.
- Skip when: The change should go straight to implementation detail.

# Priority
- Impact:
- Urgency:

# Notes
- Generated locally by logics-manager.
- Task `task_158_local_mcp_connector_launcher_for_chatgpt_developer_mode` was finished via `logics-manager flow finish task` on 2026-05-27.

# Tasks
- `task_158_local_mcp_connector_launcher_for_chatgpt_developer_mode`
