## item_851_tell_the_operator_which_transport_their_client_needs - Tell the operator which transport their client needs
> From version: 2.22.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 80%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer MCP connector UX
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-16 00:45:03

# AI Context
- Summary: The connector screen names the transport for the client at hand and, for the ChatGPT path, walks the operator from a bare machine to a connected plugin. It is a self-repairing diagnostic, not a wizard: `tunnel-client doctor` already names every check, so the screen renders that output as rows with one action each, and disappears once everything is met.
- Keywords: transport guidance, guided setup, doctor output, progressive disclosure, key validation, connected confirmation
- Use when: Changing what the ChatGPT Developer Mode screen shows or lets the operator do.
- Skip when: Changing what the connector actually launches -- that is `item_850_run_chatgpt_through_openais_secure_mcp_tunnel`.

# Problem
- The connector screen was built around one answer: a public URL and a bearer token to paste. Under `adr_031_one_mcp_transport_per_client_class` that answer is wrong for every client except the one being retired -- local clients need a stdio command, ChatGPT needs a tunnel, and hosted web clients are not supported at all.
- Getting the ChatGPT path working end to end on 2026-08-15 took seven steps -- install the binary, create a tunnel, create a runtime API key, create a tunnel-client profile, write the key to a config file, run the daemon, create the plugin in ChatGPT -- none of which were reachable from the viewer. An operator repeating that today has no screen to do it from.
- Three of those seven steps happen on OpenAI's own web (tunnel creation, key creation, plugin creation) and cannot be automated at all. The screen's job is to open the right page at the right moment, say what to click there, and take the result back -- that return leg is what makes it a loop instead of a dead end.

# Scope
- In:
  - The connector card naming the transport per client class: stdio for clients that launch the server themselves, Secure MCP Tunnel for ChatGPT, and an explicit "not supported yet" for hosted web clients, pointing at the public-HTTPS-door request that `adr_031_one_mcp_transport_per_client_class` names.
  - A copy-ready stdio command for local clients (`logics-manager mcp serve --repo-root <root>`), correct whether or not anything is running here.
  - A tunnel row that takes a pasted `tunnel_id` (with a link to the page that creates one), the dropdown being a later refinement rather than a prerequisite for shipping this slice.
  - A prerequisite list for the ChatGPT path -- binary, API key, tunnel, profile, plugin -- each row carrying its state and at most one action, rendered from `tunnel-client doctor --profile <profile>` rather than from a state machine of our own. Nothing about the operator's progress is persisted: an operator who completes a step by hand in a terminal sees the screen agree on its next read.
  - Exactly one actionable row at a time. The steps have a forced order, so later rows render reachable-but-inactive rather than hidden: the remaining path stays visible, the wrong order is not offered.
  - The whole prerequisite block disappearing once every row is met, leaving the ON/OFF toggle and a live state line. Setup is scaffolding; it is also why no screen is left that could render a `tunnel_id` or a key.
  - Validating the API key against the control plane the moment it is saved, and reporting a refusal inline as a refused key. `tunnel-client doctor` only checks that the variable is set -- observed 2026-08-15, it passed on a key the control plane then rejected as 401 for as long as the daemon ran.
  - The key entered through a masked field, written to the machine config file with owner-only permissions, and never rendered again: the row shows "configured" plus a Replace action.
  - The final row activating only once the connector is running, opening ChatGPT's connector settings, and flipping from "waiting for ChatGPT" to "connected" on the first command the dispatcher forwards -- the log line already exists, and it is the moment the operator learns it worked rather than hoping.
  - Tests covering: each client class rendering its own instructions, a refused key rendering as refused, the prerequisite block collapsing when everything is met, and no secret reaching the rendered output.
- Out:
  - A wizard engine, an embedded browser, or any persisted progress state.
  - Detecting which client the operator uses; they pick.
  - Automating the three steps that happen on OpenAI's web.
  - Any redesign of the Settings screen beyond this card.

# Acceptance criteria
- The connector card presents the three client classes and gives each the setup it actually needs, with the stdio command copy-ready and correct for this repository.
- An operator starting with nothing installed reaches a connected ChatGPT plugin using only this card and the OpenAI pages it opens, without being handed a shell command to run by hand.
- Every prerequisite row reflects the machine's real state on load, derived from `tunnel-client doctor`, including state the operator produced outside the viewer.
- A key the control plane refuses is reported as a refused key at the moment it is saved, not as a connector that appears to have started.
- Once every prerequisite is met the setup rows are gone, leaving the toggle and a live state line; neither the `tunnel_id` nor the API key is rendered at any point.
- The final row confirms the connection itself, flipping to connected on the first request ChatGPT actually makes.
- Hosted web clients are named as unsupported with a pointer to the request that would change that, instead of being silently absent.

# Open questions
- Can the tunnel list be read from the API with a Tunnels Read key? Unverified as of 2026-08-15, and deliberately off the critical path: the tunnel row ships as a pasted `tunnel_id`, which works whatever the answer and stays the fallback when the key lacks the scope or the API is unreachable. If the endpoint exists, the same row gains a dropdown later without changing anything around it -- seven steps become five. Worth ten minutes during `item_850_run_chatgpt_through_openais_secure_mcp_tunnel`, not a gate on starting.

# AC Traceability
- request-The connector screen names the transport for the client the operator is connecting and gives that client's setup verbatim -- the stdio command for local clients, the tunnel steps for ChatGPT -- and says plainly that hosted web clients are not supported yet. -> This backlog slice. Proof: The connector card presents the three client classes and gives each the setup it actually needs, with the stdio command copy-ready and correct for this repository.
- request-As an operator starting from a machine with none of it installed, I need to reach a working ChatGPT connector from the viewer itself, without being handed a sequence of shell commands to run by hand. -> This backlog slice. Proof: An operator starting with nothing installed reaches a connected ChatGPT plugin using only this card and the OpenAI pages it opens, without being handed a shell command to run by hand.

# Decision framing
- Product framing: Not needed
- Architecture framing: `adr_031_one_mcp_transport_per_client_class`
- 2026-08-16: the hosted-web-clients row states 'not supported yet' with no explanation. AC7 asked for a pointer to the request that would change that; the operator removed it on sight -- a corpus ref reads as noise on a connector screen. The pointer survives in adr_031_one_mcp_transport_per_client_class, which is where someone asking why would look.

# Links
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): `adr_031_one_mcp_transport_per_client_class`
- Request: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
- Primary task(s): `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`

# Priority
- Priority: High
- Rationale: Without it the ChatGPT path is only reachable by an operator willing to run seven manual steps in a terminal.

# Validation
- 2026-08-16: npx vitest run -- 976 passed; pytest -- 1442 passed. tests/viewer.browser-host.test.ts covers the three client classes with the stdio command copy-ready for this repository (AC1), the five setup rows in order with exactly one actionable and the masked key never rendered back (AC5), the block disappearing once every row is met, and hosted web clients named as unsupported with req_377 (AC7). tests/python/test_mcp_tunnel.py covers the row ordering and a key the control plane refuses being reported as refused at save time (AC4). AC6's connected flip is driven by the marker serve_stdio prints on the first client request; it is asserted at the viewer boundary only -- confirming it end to end needs tunnel-client on the machine, which the suite deliberately does not require. Commit 36f327c2.

# Tasks
- `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`

# Notes
- Task `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector` was finished via `logics-manager flow finish task` on 2026-08-16.
