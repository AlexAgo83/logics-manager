## prod_107_a_connector_configured_once_then_just_on_off - A connector configured once, then just ON/OFF
> Date: 2026-08-15
> Status: Proposed
> Related request: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
> Related backlog: `item_847_make_the_tunnel_url_and_bearer_token_durable_across_restarts`, `item_848_give_the_connector_a_chatgpt_native_oauth_front_door`, `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`
> Related task: `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
The ChatGPT MCP connector already works once it starts, but every restart forces a full reconfiguration in ChatGPT, and ChatGPT's own setup screen has no simple slot for the bearer auth this tool uses. This makes the connector durable across restarts, gives it a real OAuth front door ChatGPT's screen actually supports, and makes the viewer's own controls (the toggle, the detail screen) tell the truth about what is running.

# Goals
- One-time ChatGPT configuration that survives every future stop/start.
- A ChatGPT-native authentication flow, not a no-auth workaround.
- Viewer controls that reflect and drive real connector state without a manual refresh.

# Non-goals
- A multi-user or multi-tenant authorization system -- this remains a single local operator's own machine.
- Refresh tokens or any token lifetime beyond the connector process's own lifetime.
- A new tunnel provider, custom domain, or hosted relay beyond the existing localtunnel-based transport.
- Removing or replacing the existing static bearer token as a supported auth mode -- OAuth is an additional front door onto the same access, not a replacement.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
- Task back-reference: `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`
