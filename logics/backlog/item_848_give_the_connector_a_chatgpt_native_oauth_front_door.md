## item_848_give_the_connector_a_chatgpt_native_oauth_front_door - Give the connector a ChatGPT-native OAuth front door
> From version: 2.22.0
> Schema version: 1.0
> Status: Obsolete
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: ChatGPT developer-mode MCP operations
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-16 00:20:00

# AI Context
- Summary: ChatGPT's own connector-creation screen only offered OAuth (or a Mixte option that also only exposes OAuth fields) or no authentication in the flow an operator actually went through this session -- getting a working connector required --no-bearer, an insecure workaround with no real place in normal use.
- Keywords: oauth authorization code, pkce, dynamic client registration, well-known metadata, www-authenticate resource_metadata
- Use when: Adding or changing the connector's HTTP auth surface.
- Skip when: Anything about the MCP tool surface itself once a request is authenticated.

# Problem
- ChatGPT's connector-creation screen only offers OAuth (or a Mixte option that also only exposes OAuth fields) or no authentication at all in the flow an operator actually goes through -- the existing static bearer token has no field to land in there, forcing a no-auth workaround to get a working connector.

# Scope
- In:
  - GET /.well-known/oauth-authorization-server: metadata naming the three endpoints below, PKCE support, and a public (no client secret) token endpoint auth method.
  - POST /register: RFC 7591 dynamic client registration, storing the registered redirect_uri in memory for the life of the connector process.
  - GET /authorize: validates the request against a registered client, issues a one-time authorization code bound to the PKCE challenge, and redirects back immediately -- no real login form, since this is the operator's own machine, but an explicit local approval step rather than a silent pass-through.
  - POST /token: validates the code and PKCE verifier, then issues an access token that gates /mcp exactly like today's bearer token -- reusing the existing bearer-check code path rather than adding a second one.
  - A resource_metadata parameter on /mcp's existing 401 WWW-Authenticate header, pointing at the new metadata endpoint.
  - Tests driving the full authorization_code + PKCE exchange against the real HTTP server, plus the existing bearer-token path continuing to work unchanged.
- Out:
  - Refresh tokens or any token lifetime beyond the server process's own lifetime -- matches today's static bearer token exactly.
  - A real multi-user login screen or credential store.
  - Changing what the existing static --bearer-token/--no-bearer flags do.

# Acceptance criteria
- A client that discovers metadata, registers, completes /authorize with PKCE, and exchanges the code at /token receives a token that successfully calls /mcp.
- An /authorize request with a mismatched redirect_uri or an invalid client_id is refused rather than issuing a code.
- A /token request with the wrong code_verifier is refused.
- The existing static bearer token (LOGICS_MCP_BEARER_TOKEN / --bearer-token) still gates /mcp exactly as before; the two auth paths coexist.

# AC Traceability
- request-The connector's HTTP server exposes an OAuth 2.0 authorization-code + PKCE flow (metadata discovery, dynamic client registration, authorize, token) that ChatGPT's own connector-creation screen can complete end to end, granting the same access the bearer token grants today -- with no client secret and no login screen beyond an explicit local approval. -> This backlog slice. Proof: A client that discovers metadata, registers, completes /authorize with PKCE, and exchanges the code at /token receives a token that successfully calls /mcp.
- request-The 401 a request without credentials receives points at the new OAuth metadata endpoint, so ChatGPT's connector screen auto-detects the flow instead of showing placeholder OAuth fields. -> This backlog slice. Proof: An /authorize request with a mismatched redirect_uri or an invalid client_id is refused rather than issuing a code.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): (none yet)
- Request: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
- Primary task(s): `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`
- Superseded by: `req_377_expose_the_mcp_surface_to_hosted_web_clients_through_a_public_https_door`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
