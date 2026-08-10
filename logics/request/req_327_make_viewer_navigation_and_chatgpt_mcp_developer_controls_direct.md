## req_327_make_viewer_navigation_and_chatgpt_mcp_developer_controls_direct - Make viewer navigation and ChatGPT MCP developer controls direct
> From version: 2.21.3
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Viewer navigation and local ChatGPT MCP workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Make viewer navigation and ChatGPT MCP developer controls direct
- Keywords: request-chain-scaffold, make viewer navigation and chatgpt mcp developer controls direct, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make viewer navigation and ChatGPT MCP developer controls direct.
- Skip when: The change is unrelated to this scaffolded request chain.

# Needs
- Show a selected workflow document's bounded request-to-task chain directly at the start of its detail page.
- Replace the growing Settings popover with a clear, navigable viewer screen that retains every existing control.
- Let an operator start and stop the per-project ChatGPT developer-mode MCP connection from the viewer and copy its usable HTTPS MCP URL without terminal archaeology.

# Context
- The viewer already resolves bounded chain graphs through /api/chain-graph, but makes the user leave the document to see one.
- The Settings popover already contains refresh, guides, terminals, server, corpus, VS Code, and version controls, so it has outgrown a popover.
- The MCP CLI already provides local HTTP serving, tunnel setup, bearer-token handling, health checks, and copyable ChatGPT developer-mode connection details. The missing work is a truthful per-project viewer control surface.
- Earlier ChatGPT MCP launcher and quick-command work is complete. This request must reuse that server and tunnel lifecycle rather than add a second transport or publish anything automatically.

# Acceptance criteria
- Opening a request, backlog item, or task shows its bounded linked chain at the top of the detail page; graph nodes open their referenced document and documents without a chain remain readable.
- The former Graph action is removed once the inline chain is available, and the viewer never performs a full-corpus graph scan to render it.
- Settings opens a dedicated viewer screen with all existing controls grouped into understandable sections and no control is lost for browser or embedded VS Code users.
- The viewer provides an explicit per-project ChatGPT MCP ON action, an OFF action, visible running state, and a one-click copy action for the HTTPS /mcp URL when a tunnel is ready.
- Starting MCP does not expose a service until the operator explicitly chooses ON; stopping it terminates the viewer-owned local server and tunnel and clears transient connection secrets from the displayed state.
- Focused browser-host, MCP lifecycle, and viewer API tests cover the three surfaces, including failed startup and unavailable public URL behavior.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_071_direct_viewer_operations_for_workflow_chains_and_chatgpt_mcp`
- Architecture decision(s): (none yet)

# References
- clients/viewer/index.html
- clients/viewer/src/browser-host/graph.js
- clients/viewer/src/browser-host/index.js
- clients/viewer/src/browser-host/render.js
- logics_manager/mcp.py
- logics_manager/viewer.py
- logics/backlog/item_357_local_mcp_connector_launcher_for_chatgpt_developer_mode.md
- logics/backlog/item_360_add_quick_commands_for_local_mcp_server_and_tunnel_launch.md
- logics/tasks/task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle.md

# Backlog
- `item_681_embed_the_bounded_workflow_chain_in_document_detail`
- `item_682_promote_viewer_settings_into_a_dedicated_screen`
- `item_683_add_per_project_chatgpt_mcp_controls_to_the_viewer`
