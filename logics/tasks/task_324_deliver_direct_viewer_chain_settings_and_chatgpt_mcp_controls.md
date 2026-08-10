## task_324_deliver_direct_viewer_chain_settings_and_chatgpt_mcp_controls - Deliver direct viewer chain, settings, and ChatGPT MCP controls
> From version: 2.21.3
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-10 12:53:21
> Owner: codex

# AI Context
- Summary: Deliver direct viewer chain, settings, and ChatGPT MCP controls
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Map the existing graph rendering and document-detail lifecycle, then embed the bounded chain in a visible, compact, height-limited, viewer-styled Mermaid frame and remove the separate action.
- [x] 2. Promote the existing Settings controls into a dedicated card-based screen without changing their ownership or embedded-viewer guards.
- [x] 3. Expose the existing MCP lifecycle through Settings > ChatGPT Developer Mode with deliberate per-project ON/OFF, keeping public exposure and secrets explicit.
- [x] 4. Run focused browser-host, MCP, and viewer API checks; validate the request chain and record closeout evidence.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_681_embed_the_bounded_workflow_chain_in_document_detail`
- `item_682_promote_viewer_settings_into_a_dedicated_screen`
- `item_683_add_per_project_chatgpt_mcp_controls_to_the_viewer`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-Opening a request, backlog item, or task shows its bounded linked chain at the top of the detail page; graph nodes open their referenced document and documents without a chain remain readable. -> `item_681_embed_the_bounded_workflow_chain_in_document_detail`. Proof deferred to slice closeout.
- request-The former Graph action is removed once the inline chain is available, and the viewer never performs a full-corpus graph scan to render it. -> `item_681_embed_the_bounded_workflow_chain_in_document_detail`. Proof deferred to slice closeout.
- request-Focused browser-host, MCP lifecycle, and viewer API tests cover the three surfaces, including failed startup and unavailable public URL behavior. -> `item_681_embed_the_bounded_workflow_chain_in_document_detail`. Proof deferred to slice closeout.
- request-Settings opens a dedicated viewer screen with all existing controls grouped into understandable sections and no control is lost for browser or embedded VS Code users. -> `item_682_promote_viewer_settings_into_a_dedicated_screen`. Proof deferred to slice closeout.
- request-Focused browser-host, MCP lifecycle, and viewer API tests cover the three surfaces, including failed startup and unavailable public URL behavior. -> `item_682_promote_viewer_settings_into_a_dedicated_screen`. Proof deferred to slice closeout.
- request-The viewer provides an explicit per-project ChatGPT MCP ON action, an OFF action, visible running state, and a one-click copy action for the HTTPS /mcp URL when a tunnel is ready. -> `item_683_add_per_project_chatgpt_mcp_controls_to_the_viewer`. Proof deferred to slice closeout.
- request-Starting MCP does not expose a service until the operator explicitly chooses ON; stopping it terminates the viewer-owned local server and tunnel and clears transient connection secrets from the displayed state. -> `item_683_add_per_project_chatgpt_mcp_controls_to_the_viewer`. Proof deferred to slice closeout.
- request-Focused browser-host, MCP lifecycle, and viewer API tests cover the three surfaces, including failed startup and unavailable public URL behavior. -> `item_683_add_per_project_chatgpt_mcp_controls_to_the_viewer`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)
- command: `npm run test:viewer-smoke; npm exec vitest run tests/viewer.browser-host.test.ts tests/chainGraphScreen.test.ts; npm run lint:ts; python3.11 -m pytest tests/python/test_viewer_cli.py::test_viewer_mcp_connector_captures_url_and_token tests/python/test_viewer_cli.py::test_viewer_project_switch_endpoint_uses_known_project_allowlist tests/python/test_viewer_cli.py::test_viewer_chain_graph_endpoint_resolves_structural_links_only -q` | result: passed | date: 2026-08-10
- Finish workflow executed on 2026-08-10.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-10.
- Linked backlog item(s): `item_681_embed_the_bounded_workflow_chain_in_document_detail`, `item_682_promote_viewer_settings_into_a_dedicated_screen`, `item_683_add_per_project_chatgpt_mcp_controls_to_the_viewer`
- Related request(s): `req_327_make_viewer_navigation_and_chatgpt_mcp_developer_controls_direct`

# Links
- Request: `req_327_make_viewer_navigation_and_chatgpt_mcp_developer_controls_direct`
- Product brief(s): `prod_071_direct_viewer_operations_for_workflow_chains_and_chatgpt_mcp`
- Architecture decision(s): (none yet)
