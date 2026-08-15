## task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector - Deliver a durable, ChatGPT-native, reactive MCP connector
> From version: 2.22.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-15 23:04:10

# AI Context
- Summary: Orchestrates the three slices: durable subdomain/token, the OAuth front door ChatGPT's own connector screen actually needs, and the two viewer bugs (toggle field mismatch, no auto-refresh) that make working controls look broken.
- Keywords: deliver, durable, chatgpt, native, reactive, mcp, connector
- Use when: Implementing this task.
- Skip when: Anything about the MCP tool surface itself -- this is only about reaching and authenticating to it.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Persist the tunnel subdomain and bearer token across restarts, with rotation, so ChatGPT's configuration survives every stop/start.
- [ ] 2. Add the OAuth authorization-code + PKCE front door so ChatGPT's own connector screen can complete setup without a no-auth workaround.
- [ ] 3. Fix the Settings toggle's field mismatch and make the connector detail screen poll itself while starting.
- [ ] 4. Run focused MCP/viewer tests covering durability, the OAuth exchange, and the toggle/polling fixes; validate the request chain and record closeout evidence.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_847_make_the_tunnel_url_and_bearer_token_durable_across_restarts`
- `item_848_give_the_connector_a_chatgpt_native_oauth_front_door`
- `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-Stopping and starting the connector any number of times keeps the same public URL and the same bearer token, so a ChatGPT connector configured once keeps working without edits. -> `item_847_make_the_tunnel_url_and_bearer_token_durable_across_restarts`. Proof deferred to slice closeout.
- request-The persisted bearer token lives outside version control, with file permissions restricted to the operator, and can be rotated on demand without editing any file by hand. -> `item_847_make_the_tunnel_url_and_bearer_token_durable_across_restarts`. Proof deferred to slice closeout.
- request-The connector's HTTP server exposes an OAuth 2.0 authorization-code + PKCE flow (metadata discovery, dynamic client registration, authorize, token) that ChatGPT's own connector-creation screen can complete end to end, granting the same access the bearer token grants today -- with no client secret and no login screen beyond an explicit local approval. -> `item_848_give_the_connector_a_chatgpt_native_oauth_front_door`. Proof deferred to slice closeout.
- request-The 401 a request without credentials receives points at the new OAuth metadata endpoint, so ChatGPT's connector screen auto-detects the flow instead of showing placeholder OAuth fields. -> `item_848_give_the_connector_a_chatgpt_native_oauth_front_door`. Proof deferred to slice closeout.
- request-The Settings screen's Connector toggle reflects the connector's real running state on load and after every toggle, and toggling it on or off actually starts or stops the connector. -> `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`. Proof deferred to slice closeout.
- request-The connector detail screen (Settings / ChatGPT Developer Mode) updates itself without a manual click while it is open and the connector is running but not yet ready, stopping once the URL/token appear or the connector reports an error. -> `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`. Proof deferred to slice closeout.
- request-An operator's first visit to the connector screen is enough to get everything ChatGPT needs in one place; every visit after that is a one-click ON/OFF with nothing left to re-copy. -> `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): (none yet)
