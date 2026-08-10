# Logics Manager 2.21.4

The viewer now opens the workflow context directly where operators use it: chain
graphs sit inside document detail, Settings is a full screen instead of a
crowded menu, ChatGPT developer-mode MCP controls are one click away, and the
README shows the operational Health and Insights screens from a safe demo
corpus.

## Direct viewer operations

Document detail now embeds the linked workflow graph at the top of supported
request, backlog, and task documents. The graph keeps Mermaid as the renderer,
but adds explicit node styling for request, product, backlog, and task nodes so
the chain reads as a workflow, not a plain text diagram.

The old graph button is gone. Opening a document fetches the chain graph in the
background, renders it in a bounded frame, and keeps document reading available
if the graph endpoint cannot resolve a chain.

## Settings screen and ChatGPT MCP controls

Settings is now a dedicated viewer screen with grouped controls for refresh,
corpus actions, ChatGPT Developer Mode, server diagnostics, and VS Code-hosted
actions when the viewer is embedded.

The ChatGPT Developer Mode screen starts and stops a viewer-owned per-project
MCP tunnel explicitly. When the tunnel is ready, the viewer exposes copy actions
for both the HTTPS `/mcp` URL and the existing bearer token printed by the MCP
tunnel command, then clears both from viewer state when the connector is
stopped.

## Compact Logics identity

The viewer topbar uses the Logics icon as the product identity instead of the
text label. A visually hidden `h1` keeps the page name accessible without adding
height to the header.

## Health and Insights documentation

The README now includes cropped Health and Insights screenshots generated from
the real viewer after switching to the synthetic demo corpus. The Health image
shows validation findings and the styled Apply fixes action; the Insights image
shows corpus shape, operator actions, and workflow health signals without
publishing local project work.

## Validation

- `npm run test:viewer-smoke`
- `npm exec vitest run tests/viewer.browser-host.test.ts tests/chainGraphScreen.test.ts`
- `npm run lint:ts`
- `python3.11 -m pytest tests/python/test_viewer_cli.py::test_viewer_mcp_connector_captures_url_and_token tests/python/test_viewer_cli.py::test_viewer_project_switch_endpoint_uses_known_project_allowlist tests/python/test_viewer_cli.py::test_viewer_chain_graph_endpoint_resolves_structural_links_only -q`
- `logics-manager lint --require-status`
- `logics-manager audit --group-by-doc`
