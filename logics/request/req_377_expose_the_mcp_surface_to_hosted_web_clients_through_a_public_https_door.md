## req_377_expose_the_mcp_surface_to_hosted_web_clients_through_a_public_https_door - Expose the MCP surface to hosted web clients through a public HTTPS door
> From version: 2.22.0
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: MCP transport and authentication
> Indicators reviewed: 2026-08-16 00:20:00
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Deliberately deferred. Holds the OAuth-front-door and tunnel-provider research from 2026-08-15 for the day a hosted web client that cannot spawn a local process needs to reach this MCP surface; nothing needs it today, so nothing is being built.
- Keywords: oauth 2.1, pkce, rfc 9728 protected resource metadata, rfc 8414, rfc 7591 dynamic client registration, client id metadata document, rfc 8707 resource, tailscale funnel, localtunnel
- Use when: A hosted web client (claude.ai connector or equivalent) actually requires a public HTTPS entry point, or someone proposes exposing the MCP surface publicly.
- Skip when: The client can run a local process (use stdio) or is ChatGPT (use OpenAI's Secure MCP Tunnel, `req_376_make_the_chatgpt_mcp_connector_plug_and_play`).

# Needs
- As an operator, I need a hosted MCP client that cannot spawn a local process -- a claude.ai web connector or an equivalent -- to reach this repository's MCP surface over the public internet.
- As an operator, I need that public door to authenticate through the flow hosted clients actually implement (OAuth 2.1 discovery), not through a token I paste somewhere.
- As an operator, I need the public door to stay off by default and be a deliberate, revocable act rather than a standing exposure.

# Context
- Deferred on purpose 2026-08-15: no hosted web client needs this today. Local clients (Claude Code, Claude Desktop, Codex CLI) already work over `logics-manager mcp serve`, and ChatGPT is served by OpenAI's Secure MCP Tunnel through `req_376_make_the_chatgpt_mcp_connector_plug_and_play`. This request exists so the research below is not lost, and becomes real the day a hosted client actually asks for it. See `adr_031_one_mcp_transport_per_client_class` for the split.
- Researched 2026-08-15 (MCP authorization spec): an MCP server MUST serve RFC 9728 protected resource metadata at /.well-known/oauth-protected-resource -- that is where clients start discovery, following it to the RFC 8414 authorization-server document. Serving only the authorization-server metadata dead-ends discovery. The spec also requires the RFC 8707 `resource` parameter on authorize/token and audience-bound token validation.
- Researched 2026-08-15 (hosted client registration): a hosted client either calls the registration_endpoint (RFC 7591 dynamic client registration) or skips registration and sends an HTTPS Client ID Metadata Document URL as the client_id. A client registry that only accepts /register-issued ids refuses the second path outright.
- Researched 2026-08-15 (tunnel providers): localtunnel's `--subdomain` is best-effort against one shared global namespace and silently falls back to a random URL when the name is taken (localtunnel issues #248, #641), and loca.lt terminates TLS on a third-party host -- it sees the plaintext, tokens included -- while showing an interstitial password page to browser-looking requests (issues #366, #598, #719) that lands squarely on the OAuth approval step. Tailscale Funnel is the better candidate: stable `<machine>.<tailnet>.ts.net` name, TLS terminated on the operator's own machine with a real certificate, no interstitial. Its trade-off is that the name is stable, guessable, and published in public Certificate Transparency logs -- the URL is never the secret, so the auth gate is the only boundary.
- Researched 2026-08-15 (durability): access tokens issued by such a door must persist across connector restarts, or every restart forces the hosted client to re-authorize -- which is the exact reconfiguration pain this whole line of work exists to remove.
- Today's HTTP surface (logics_manager/mcp.py) gates POST /mcp on a static bearer token via `_authorized`, with `--no-bearer` as an escape hatch. Under a permanently addressable public URL that escape hatch has no legitimate use and should refuse to start.

# Acceptance criteria
- AC1: A hosted web client that reads /.well-known/oauth-protected-resource, follows it to the authorization-server metadata, obtains a client id (dynamic registration or an HTTPS client-id metadata document), completes /authorize with PKCE and exchanges the code at /token receives a token that successfully calls /mcp.
- AC2: An unauthenticated POST /mcp answers 401 with a WWW-Authenticate resource_metadata pointer to a protected-resource metadata endpoint the server actually serves.
- AC3: An /authorize request with a mismatched redirect_uri or an unknown client_id is refused, and a /token request with the wrong code_verifier is refused.
- AC4: A token issued before a restart still calls /mcp afterwards, with no second authorization round trip.
- AC5: The public door is off unless explicitly started, and no-auth mode refuses to run behind it.
- AC6: The existing static bearer token path keeps working unchanged for local and tunnelled use.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): `adr_031_one_mcp_transport_per_client_class`

# References
- `logics_manager/mcp.py`
- `clients/viewer/src/browser-host/index.js`
- OpenAI Secure MCP Tunnel: https://developers.openai.com/api/docs/guides/secure-mcp-tunnels
- MCP authorization spec: https://modelcontextprotocol.io/specification/draft/basic/authorization

# Backlog
- `item_847_make_the_tunnel_url_and_bearer_token_durable_across_restarts` (Obsolete: holds the durable-URL and token-persistence research)
- `item_848_give_the_connector_a_chatgpt_native_oauth_front_door` (Obsolete: holds the OAuth front-door research)

# Provenance
- Origin: `agent`
- Actor: `operator`
- Approval: required before implementation starts.
