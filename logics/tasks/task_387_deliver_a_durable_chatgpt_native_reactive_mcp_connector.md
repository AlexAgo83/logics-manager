## task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector - Deliver the ChatGPT connector over Secure MCP Tunnel
> From version: 2.22.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 80%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-16 01:05:00

# AI Context
- Summary: Orchestrates the three surviving slices: ChatGPT over OpenAI's Secure MCP Tunnel, the two viewer bugs (toggle field mismatch, no auto-refresh), and the screen that tells an operator which transport their client needs.
- Keywords: deliver, durable, chatgpt, native, reactive, mcp, connector
- Use when: Implementing this task.
- Skip when: Anything about the MCP tool surface itself -- this is only about reaching and authenticating to it.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- The reference keeps its original slug (`...durable_chatgpt_native_reactive...`) on purpose: a ref is an address, not a description, and renaming it would churn the slug through nine linked documents for a cosmetic gain. The readable title above is the one kept accurate.
- Proven manually end to end 2026-08-15 on the operator's mac: tunnel-client 0.0.11 from the Homebrew tap, a profile for this repository, a runtime key, the daemon up with `profile=full tools=49/49`, and ChatGPT's plugin discovering the surface (four dispatcher-forwarded commands, no error). The remaining work is making that reachable without a terminal.
- Re-scoped 2026-08-15 by `adr_031_one_mcp_transport_per_client_class`: the durable-public-URL and OAuth-front-door slices are Obsolete, replaced by OpenAI's Secure MCP Tunnel for ChatGPT plus transport guidance in the viewer.

# Plan
- [ ] 1. Run ChatGPT through OpenAI's Secure MCP Tunnel: `tunnel-client` against a locally configured `tunnel_id`, driving `logics-manager mcp serve`, creating the tunnel-client profile from the viewer as well as running it, reading machine-level credentials (`~/.config/logics-manager/tunnel.env`, env vars taking precedence), with each missing prerequisite resolved rather than merely named -- the binary offered for install on confirmation -- and no secret ever printed.
- [ ] 2. Fix the Settings toggle's field mismatch and make the connector screen poll itself while starting.
- [ ] 3. Make the connector screen name the transport per client class and walk the ChatGPT path from a bare machine to a connected plugin: prerequisite rows rendered from `tunnel-client doctor`, one action each, the key validated against the control plane on save, the block collapsing once met, and the last row confirming on ChatGPT's first real request.
- [ ] 4. Run focused MCP/viewer tests covering the tunnel launch path, the toggle/polling fixes, and the transport guidance; validate the request chain and record closeout evidence.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`
- `item_850_run_chatgpt_through_openais_secure_mcp_tunnel`
- `item_851_tell_the_operator_which_transport_their_client_needs`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-An operator can bring the ChatGPT connector up from the viewer without any public URL being created and without copying a URL or token into ChatGPT. -> `item_850_run_chatgpt_through_openais_secure_mcp_tunnel`. Proof deferred to slice closeout.
- request-Stopping and starting the connector any number of times leaves the ChatGPT-side configuration untouched: the `tunnel_id` is what ChatGPT holds, and it does not change. -> `item_850_run_chatgpt_through_openais_secure_mcp_tunnel`. Proof deferred to slice closeout.
- request-Whatever `tunnel-client` needs and does not have (no binary, no profile, no API key, or a key the control plane refuses) is resolved from the connector screen -- the binary offered for install, the credentials pointing at the one file to fill -- not merely reported as a generic failure. -> `item_850_run_chatgpt_through_openais_secure_mcp_tunnel`. Proof deferred to slice closeout.
- request-The Settings screen's Connector toggle reflects the connector's real running state on load and after every toggle, and toggling it on or off actually starts or stops the connector. -> `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`. Proof deferred to slice closeout.
- request-The connector screen updates itself without a manual click while it is open and the connector is starting, stopping once it is ready, stopped, or errored. -> `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`. Proof deferred to slice closeout.
- request-The connector screen names the transport for the client the operator is connecting and gives that client's setup verbatim -- the stdio command for local clients, the tunnel steps for ChatGPT -- and says plainly that hosted web clients are not supported yet. -> `item_851_tell_the_operator_which_transport_their_client_needs`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# Links
- Request: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): `adr_031_one_mcp_transport_per_client_class`
