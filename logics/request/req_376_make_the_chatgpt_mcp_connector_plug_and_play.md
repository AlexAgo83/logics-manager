## req_376_make_the_chatgpt_mcp_connector_plug_and_play - Make the ChatGPT MCP connector plug-and-play
> From version: 2.22.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: ChatGPT developer-mode MCP connector operations
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The connector already delivers a correct URL and token once (2.22.0 fixed the buffering and regex bugs blocking that), but every restart forces a full ChatGPT reconfiguration, ChatGPT's own setup screen has no field for the bearer auth this tool uses, and two viewer bugs (a wrong field name, a screen that never re-fetches) make the controls look broken even when the connector works.
- Keywords: mcp connector, oauth, pkce, dynamic client registration, durable token, subdomain, settings toggle, reactive polling
- Use when: Touching launch_tunnel, the connector's HTTP auth, or the viewer's Settings/ChatGPT Developer Mode screens.
- Skip when: Anything about the MCP tool surface itself (what tools exist, what they do) -- this is only about reaching and authenticating to that surface.

# Needs
- As an operator, I need the connector's public URL and bearer token to stay the same across stop/start cycles, so I configure ChatGPT once and never re-paste anything afterward.
- As an operator, I need ChatGPT's own connector-creation screen to accept this connector cleanly through the authentication method it actually offers (OAuth), rather than falling back to no authentication at all.
- As an operator, I need the Settings screen's Connector toggle to actually reflect and control whether the connector is running.
- As an operator watching the connector detail screen while it starts, I need it to update on its own once the tunnel is ready, without a manual refresh click.

# Context
- Verified live this session: three consecutive starts of the same repo's connector produced three different localtunnel URLs (every-ducks-yawn, bumpy-spoons-rush, yummy-facts-vanish) and three different bearer tokens, forcing a full ChatGPT connector reconfiguration each time.
- Verified live this session: ChatGPT's own 'new connector' screen offered only OAuth, a Mixte option that also only exposes OAuth fields, and no-authentication -- no simple bearer/API-key field was available in that flow. Getting a working connector today required --no-bearer, an insecure workaround with no real place in normal use.
- Root-caused this session: the Settings screen's Connector toggle (clients/viewer/src/browser-host/index.js, renderSettingsScreen's mcpState) reads data.payload?.state from /api/mcp-connector's response, but that endpoint's payload shape (logics_manager/viewer.py's mcp_connector_payload) has no state field -- it returns running/url/token/error. The toggle's checked state is always computed from an undefined field, so it always renders unchecked/"unknown" regardless of whether the connector is actually running.
- The connector detail screen (showChatgptMcp in the same file) already reads the right fields (running/url/token) and renders correctly once fetched -- it simply never re-fetches on its own; the operator has to click the existing 'Refresh status' button, confirmed directly this session (the URL had actually arrived well before the operator saw it).
- The stdout-buffering bug and the token-capture regex bug that used to prevent the connector from ever delivering a correct URL/token were fixed and released in 2.22.0 earlier this session (logics_manager/mcp.py's launch_tunnel, logics_manager/viewer.py's capture() thread) -- this request builds on a connector that now delivers a correct URL/token once, just not durably, not through a ChatGPT-native auth flow, and not reactively.

# Acceptance criteria
- Stopping and starting the connector any number of times keeps the same public URL and the same bearer token, so a ChatGPT connector configured once keeps working without edits.
- The persisted bearer token lives outside version control, with file permissions restricted to the operator, and can be rotated on demand without editing any file by hand.
- The connector's HTTP server exposes an OAuth 2.0 authorization-code + PKCE flow (metadata discovery, dynamic client registration, authorize, token) that ChatGPT's own connector-creation screen can complete end to end, granting the same access the bearer token grants today -- with no client secret and no login screen beyond an explicit local approval.
- The 401 a request without credentials receives points at the new OAuth metadata endpoint, so ChatGPT's connector screen auto-detects the flow instead of showing placeholder OAuth fields.
- The Settings screen's Connector toggle reflects the connector's real running state on load and after every toggle, and toggling it on or off actually starts or stops the connector.
- The connector detail screen (Settings / ChatGPT Developer Mode) updates itself without a manual click while it is open and the connector is running but not yet ready, stopping once the URL/token appear or the connector reports an error.
- An operator's first visit to the connector screen is enough to get everything ChatGPT needs in one place; every visit after that is a one-click ON/OFF with nothing left to re-copy.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): (none yet)

# References
- logics_manager/mcp.py
- logics_manager/viewer.py
- clients/viewer/src/browser-host/index.js
- logics/scaffold/viewer-graph-settings-chatgpt-mcp-controls.json

# Backlog
- `item_847_make_the_tunnel_url_and_bearer_token_durable_across_restarts`
- `item_848_give_the_connector_a_chatgpt_native_oauth_front_door`
- `item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive`
