## item_850_run_chatgpt_through_openais_secure_mcp_tunnel - Run ChatGPT through OpenAI's Secure MCP Tunnel
> From version: 2.22.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: ChatGPT developer-mode MCP operations
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-16 00:27:12

# AI Context
- Summary: Replace the public-URL connector path for ChatGPT with OpenAI's Secure MCP Tunnel: `tunnel-client` runs locally, connects outbound, and drives `logics-manager mcp serve` -- no public URL, no bearer token in the loop, and a `tunnel_id` that never changes.
- Keywords: tunnel-client, tunnel_id, secure mcp tunnel, mcp serve, stdio, outbound only, CONTROL_PLANE_API_KEY
- Use when: Starting or stopping the ChatGPT connector, or touching how the viewer launches it.
- Skip when: Anything about the public HTTPS door for hosted web clients -- `adr_031_one_mcp_transport_per_client_class` names the request holding it.

# Problem
- The viewer starts the ChatGPT connector by running `logics_manager mcp tunnel` (logics_manager/viewer.py:1940), which launches an HTTP server plus a localtunnel process and hands the operator a public URL and a bearer token to paste into ChatGPT. Every restart changes both, and the machine is publicly reachable for as long as it runs.
- OpenAI's Secure MCP Tunnel removes all of that for ChatGPT specifically, and it was available before this corpus started designing around it.

# Scope
- In:
  - A connector mode that runs `tunnel-client run --profile <profile>`, the profile having been created once by `tunnel-client init --profile <name> --tunnel-id <id> --mcp-command "logics-manager mcp serve --repo-root <root>"`, and makes it the default for the ChatGPT path. The profile owns the `tunnel_id`; logics-manager holds only the profile name, so there is one source of truth.
  - Reading the profile name and the API key from machine-level configuration (`~/.config/logics-manager/tunnel.env`, owner-only), with environment variables taking precedence -- never from a project file, never from a versioned file, never printed to a log or a screen. One connector serves every project on the machine, so its credentials are not per-repository.
  - Delegating the prerequisite check to `tunnel-client doctor --profile <profile>` rather than re-deriving it: it already reports each check by name, and returns exit code 2 with a FAILED_CHECKS line naming the culprit. Verified 2026-08-15 on this machine -- everything passed except `control_plane_api_key`.
  - Distinguishing the three ways this fails before it starts -- `tunnel-client` not installed, no profile created, no API key -- and resolving each rather than only naming it: install the missing binary on the operator's confirmation by delegating to `brew install openai/tools/tunnel-client` (the official tap; it also installs the bundled `cloudflared` and companion manifest), falling back to naming the GitHub release binary or the `ghcr.io/openai/tunnel-client` image where Homebrew is absent -- offered and confirmed, never silent, and send the operator to the one field to fill for the other two.
  - Creating the machine config file with owner-only permissions on first use if it does not exist, so the operator has somewhere obvious to put the key rather than being told a path that is not there.
  - Creating the tunnel-client profile from the viewer too (`tunnel-client init`, with the `tunnel_id` the operator pastes and the MCP command derived from the open repository), not assuming a profile someone already made by hand. Every step between a fresh machine and a working connector belongs to the operator's flow: install the binary, create the profile, hold the key, run.
  - Surfacing a rejected key as such. `tunnel-client doctor` only checks that the variable is set; a wrong or unscoped key still passes it and fails later as a repeating 401 from the control plane. The connector must read that 401 and say the key is refused, rather than looking like it started.
  - Keeping the existing `mcp tunnel` (localtunnel) path working and reachable, since it stays the fallback for anything that is not ChatGPT.
  - Tests that pass on a machine where `tunnel-client` is not installed: the binary is an optional external tool -- the same status `npx localtunnel` already has in `launch_tunnel` -- so the suite asserts on the command that would be built and on each missing-prerequisite branch, and never shells out to the real binary. CI on the fleet must not need a `brew install`.
  - Tests covering: the tunnel-client command built from configuration, each of the three missing-prerequisite cases reporting its own cause, and the connector's running state reflecting the child process.
- Out:
  - Installing `tunnel-client` without the operator's confirmation, and vendoring it into this repository.
  - Making `tunnel-client` a hard dependency of logics-manager at any level -- packaging (it is a Go binary, not a Python package), runtime (the tool works fully without it), or test (see above). It serves one transport out of three, and clients that speak stdio must never be made to install it.
  - Writing our own downloader (architecture detection, signature verification, PATH placement, updates): that is what the Homebrew tap already owns.
  - Any change to which tools exist. Which capability profile the tunnel serves is an explicit choice at launch (`mcp serve --profile {curated,full,read-only}`), decided 2026-08-15 in favour of write access; the flag already exists and this slice only has to pass it deliberately rather than by default.
  - Multi-tunnel or multi-organization support: one tunnel per machine.
  - Making the MCP surface itself multi-project (a project selector on every tool), which is what a single connector covering the machine's whole registry would additionally need -- see `adr_031_one_mcp_transport_per_client_class`.

# Acceptance criteria
- Starting the connector in tunnel mode launches `tunnel-client` against the configured `tunnel_id` with the Logics stdio server as its MCP command, and no public URL is created.
- Stopping and starting the connector any number of times leaves the `tunnel_id` unchanged, so the ChatGPT-side connector keeps working with no edit.
- A missing `tunnel-client` binary, a missing profile, and a missing API key each produce a distinct outcome the operator can act on from where they are: the binary is offered for install and installed once confirmed, and the two credentials point at the exact file and field to fill.
- The machine config file is created with owner-only permissions when it is missing, and the connector reads it from every project on the machine.
- An operator with none of it -- no binary, no profile, no key -- reaches a running connector without leaving the viewer and without being handed a shell command to run by hand.
- A key that is set but refused by the control plane (repeating 401) is reported as a rejected key, not as a started connector.
- The `tunnel_id` (held in the tunnel-client profile) and the API key appear in no versioned file, no project file, no log line, and no viewer screen.
- The existing localtunnel path still starts and still works when explicitly selected.

# AC Traceability
- request-An operator can bring the ChatGPT connector up from the viewer without any public URL being created and without copying a URL or token into ChatGPT. -> This backlog slice. Proof: Starting the connector in tunnel mode launches `tunnel-client` against the configured `tunnel_id` with the Logics stdio server as its MCP command, and no public URL is created.
- request-Stopping and starting the connector any number of times leaves the ChatGPT-side configuration untouched: the `tunnel_id` is what ChatGPT holds, and it does not change. -> This backlog slice. Proof: Stopping and starting the connector any number of times leaves the `tunnel_id` unchanged, so the ChatGPT-side connector keeps working with no edit.
- request-Whatever `tunnel-client` needs and does not have (a missing `tunnel_id`, a missing API key, the binary not installed) is resolved from the connector screen -- the binary offered for install, the credentials pointing at the one file to fill -- not merely reported as a generic failure. -> This backlog slice. Proof: A missing `tunnel-client` binary, a missing `tunnel_id`, and a missing API key each produce a distinct outcome the operator can act on from where they are: the binary is offered for install and installed once confirmed, and the two credentials point at the exact file and field to fill.

# Decision framing
- Product framing: Not needed
- Architecture framing: `adr_031_one_mcp_transport_per_client_class`

# Links
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): `adr_031_one_mcp_transport_per_client_class`
- Request: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
- Primary task(s): `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`

# Priority
- Priority: High
- Rationale: Carries the request's whole reason for existing, and removes the public exposure the old approach required.

# Validation
- 2026-08-16: pytest tests/python -- 1442 passed; npx vitest run -- 976 passed. tests/python/test_mcp_tunnel.py covers the run/init commands built from configuration (AC1/AC2), the owner-only config file with environment-over-file precedence (AC4), each of the three missing prerequisites reporting its own cause (AC3), no message carrying the key (AC7), and the viewer spawning no child when a prerequisite is missing (AC3/AC5). A refused key is read as refused rather than as a started connector (AC6). The localtunnel path stays covered in test_viewer_cli.py, now selecting it by name (AC8). tunnel-client is never invoked by the suite. Commit 36f327c2.

# Tasks
- `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`

# Notes
- Task `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector` was finished via `logics-manager flow finish task` on 2026-08-16.
