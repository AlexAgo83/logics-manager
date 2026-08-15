## req_376_make_the_chatgpt_mcp_connector_plug_and_play - Make the ChatGPT MCP connector plug-and-play
> From version: 2.22.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 85%
> Complexity: Medium
> Theme: ChatGPT developer-mode MCP connector operations
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-16 01:05:00

# AI Context
- Summary: ChatGPT reaches this repository's MCP surface through OpenAI's Secure MCP Tunnel -- outbound only, stable `tunnel_id`, server stays on localhost -- so there is no public URL, no bearer token to re-paste, and no OAuth front door to build. What remains is the viewer: a Connector toggle that reads a field the API never sends, a detail screen that never re-fetches, and a screen that must tell the operator what to do for the transport their client actually uses.
- Keywords: secure mcp tunnel, tunnel-client, tunnel_id, stdio, settings toggle, reactive polling, transport guidance
- Use when: Touching the connector's transport, or the viewer's Settings / ChatGPT Developer Mode screens.
- Skip when: Anything about the MCP tool surface itself (what tools exist, what they do), or about exposing that surface publicly -- that is `req_377_expose_the_mcp_surface_to_hosted_web_clients_through_a_public_https_door`.

# Needs
- As an operator, I need ChatGPT to reach this repository's MCP surface without exposing my machine to the public internet and without re-pasting anything after a restart.
- As an operator, I need the Settings screen's Connector toggle to actually reflect and control whether the connector is running.
- As an operator watching the connector screen while it starts, I need it to update on its own once the connector is ready, without a manual refresh click.
- As an operator starting from a machine with none of it installed, I need to reach a working ChatGPT connector from the viewer itself, without being handed a sequence of shell commands to run by hand.
- As an operator connecting some other MCP client, I need the connector screen to tell me which transport that client uses and give me exactly the setup it needs, instead of one universal URL-and-token that only fits one case.

# Context
- Superseded approach, 2026-08-15: this request originally aimed at a durable public localtunnel URL plus a hand-built OAuth 2.1 front door. `adr_031_one_mcp_transport_per_client_class` replaced that with one transport per client class, and the two slices that carried it (`item_847_...`, `item_848_...`) are Obsolete, their research preserved in `req_377_expose_the_mcp_surface_to_hosted_web_clients_through_a_public_https_door`.
- OpenAI Secure MCP Tunnel (released May 2026, https://developers.openai.com/api/docs/guides/secure-mcp-tunnels): `tunnel-client` runs on the operator's machine, opens an outbound HTTPS connection to OpenAI, pulls queued MCP work and forwards it to a server that never leaves localhost. In ChatGPT developer mode the connector is created by choosing Tunnel under Connection and selecting a `tunnel_id`, not by pasting a URL. It drives a stdio server directly via `--mcp-command`, so `logics-manager mcp serve` is enough -- no HTTP server, no tunnel provider, no token in the loop.
- External dependency this introduces: a `tunnel_id` created in OpenAI Platform tunnel settings, plus an API key carrying the Tunnels Read + Use scopes, with the Platform organization linked to the ChatGPT workspace. Confirmed available 2026-08-15: a tunnel named "Logics Manager" already exists in the operator's Personal organization (`tunnel_6a80...`, id held locally). Verified end to end 2026-08-15 on this machine: tunnel-client 0.0.11 installed from the Homebrew tap, a profile created for this repository, and `tunnel-client doctor` passing every check except the API key. Those credentials live in machine-level configuration (the operator's own config directory, owner-only, under logics-manager/tunnel.env), not in any project or versioned file: one connector serves every project on the machine, so per-repository credentials would be the wrong unit. The `tunnel_id` itself stays in the tunnel-client profile, which owns it.
- Local clients (Claude Code, Claude Desktop, Codex CLI) already work today over `logics-manager mcp serve` and need nothing built.
- Root-caused this session and still true: the Settings screen's Connector toggle (clients/viewer/src/browser-host/index.js:3206, renderSettingsScreen's mcpState) reads `data.payload?.state` from /api/mcp-connector, but that endpoint's payload (logics_manager/viewer.py:1931, mcp_connector_payload) returns running/url/token/error and has no `state` field. The toggle's checked state is always computed from an undefined value, so it renders unchecked/"unknown" whatever the connector is really doing.
- The connector detail screen (showChatgptMcp in the same file) reads the right fields and renders correctly once fetched -- it simply never re-fetches on its own; the operator has to click 'Refresh status', confirmed directly this session (the URL had actually arrived well before the operator saw it).
- The stdout-buffering and token-capture regex bugs were fixed and released in 2.22.0 earlier this session (logics_manager/mcp.py's launch_tunnel, logics_manager/viewer.py's capture() thread). That work stays valid for the localtunnel path, which remains available but is no longer what ChatGPT uses.

# Acceptance criteria
- An operator can bring the ChatGPT connector up from the viewer without any public URL being created and without copying a URL or token into ChatGPT.
- Stopping and starting the connector any number of times leaves the ChatGPT-side configuration untouched: the `tunnel_id` is what ChatGPT holds, and it does not change.
- The Settings screen's Connector toggle reflects the connector's real running state on load and after every toggle, and toggling it on or off actually starts or stops the connector.
- The connector screen updates itself without a manual click while it is open and the connector is starting, stopping once it is ready, stopped, or errored.
- The connector screen names the transport for the client the operator is connecting and gives that client's setup verbatim -- the stdio command for local clients, the tunnel steps for ChatGPT -- and says plainly that hosted web clients are not supported yet.
- Whatever `tunnel-client` needs and does not have (no binary, no profile, no API key, or a key the control plane refuses) is resolved from the connector screen -- the binary offered for install, the credentials pointing at the one file to fill -- not merely reported as a generic failure.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): `adr_031_one_mcp_transport_per_client_class`

# References
- logics_manager/mcp.py
- logics_manager/viewer.py
- clients/viewer/src/browser-host/index.js
- logics/scaffold/viewer-graph-settings-chatgpt-mcp-controls.json

# Backlog
- `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`
- `item_850_run_chatgpt_through_openais_secure_mcp_tunnel`
- `item_851_tell_the_operator_which_transport_their_client_needs`
