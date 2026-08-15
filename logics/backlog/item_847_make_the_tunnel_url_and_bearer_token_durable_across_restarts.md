## item_847_make_the_tunnel_url_and_bearer_token_durable_across_restarts - Make the tunnel URL and bearer token durable across restarts
> From version: 2.22.0
> Schema version: 1.0
> Status: Obsolete
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Connector durability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-16 00:28:32

# AI Context
- Summary: launch_tunnel picks a random localtunnel subdomain and a fresh bearer token on every launch, so every stop/start invalidates whatever the operator already gave ChatGPT -- observed directly this session across three consecutive restarts of the same repo.
- Keywords: localtunnel subdomain, persisted bearer token, gitignore, file permissions, token rotation
- Use when: Touching launch_tunnel's subdomain or token generation.
- Skip when: Anything about how the token is checked once issued -- that stays unchanged.

# Problem
- launch_tunnel picks a random localtunnel subdomain every launch and generates a fresh secrets.token_urlsafe(32) every launch, so every stop/start cycle invalidates whatever the operator already gave ChatGPT.

# Scope
- In:
  - A stable, chosen localtunnel subdomain passed via --subdomain, derived deterministically per repository so different projects do not collide.
  - A persisted bearer token file (gitignored, restricted permissions) that launch_tunnel reads before generating a new one, and a rotate path (a flag or deleting the file) that forces a fresh token.
  - Tests covering: same subdomain/token across two launches, a missing token file falling back to generation, and rotation actually invalidating the old token.
- Out:
  - Reserved subdomains or custom domains through a paid tunnel provider.
  - Multi-project token storage beyond one token per repository.

# Acceptance criteria
- Two consecutive launch_tunnel calls against the same repository produce the same localtunnel subdomain and the same bearer token.
- The persisted token file is listed in .gitignore and created with owner-only read/write permissions.
- Deleting the persisted token file (or passing an explicit rotate option) causes the next launch to generate and persist a new token, and the old token no longer authenticates.

# AC Traceability
- request-Stopping and starting the connector any number of times keeps the same public URL and the same bearer token, so a ChatGPT connector configured once keeps working without edits. -> This backlog slice. Proof: Two consecutive launch_tunnel calls against the same repository produce the same localtunnel subdomain and the same bearer token.
- request-The persisted bearer token lives outside version control, with file permissions restricted to the operator, and can be rotated on demand without editing any file by hand. -> This backlog slice. Proof: The persisted token file is listed in .gitignore and created with owner-only read/write permissions.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): (none yet)
- Request: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
- Primary task(s): (none — obsoleted by `adr_031_one_mcp_transport_per_client_class` before any of it was built. Keeping the old link would make this Obsolete slice report a Done task to the Draft request that inherited its research, and put that request's ACs due.)
- Superseded by: the public-HTTPS-door request named in `adr_031_one_mcp_transport_per_client_class` (supersession, not delivery: linking the slug here would tie that Draft request's ACs to this Done task)

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
