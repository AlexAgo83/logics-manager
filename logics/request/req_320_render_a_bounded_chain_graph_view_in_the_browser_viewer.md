## req_320_render_a_bounded_chain_graph_view_in_the_browser_viewer - Render a bounded chain graph view in the browser viewer
> From version: 2.21.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer visualization
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Let an operator see one request's chain (request, product brief, backlog items, tasks) as an actual navigable diagram inside the viewer, instead of reading nested lists across separate screens.
- Resolve that chain's nodes and edges from each doc's own structural link sections (Backlog/Links), not a full-text ref scan, so a ref mentioned only as a prose example never produces a false edge.
- Reuse the Mermaid runtime already loaded in the viewer for embedded doc diagrams, instead of adding a graph-visualization dependency.
- Let clicking a node open that doc in the viewer, consistent with how existing doc lists already behave.

# Context
- The viewer already loads mermaid.min.js and calls `window.mermaid.run({ nodes })` (clients/viewer/src/browser-host/index.js) to render `.mermaid` blocks already embedded in doc content, such as the flowcharts inside generated product briefs. That same runtime can render a dynamically-generated flowchart string, not only content baked statically into a doc.
- The viewer's screen architecture is a factory-function-per-screen pattern: `createCdxScreen`, `createWorkshopScreen`, and `createGitScreen` (clients/viewer/src/browser-host/{cdx,workshop,git}.js) are each wired into the shared core the same way. A new `createGraphScreen` would follow that same pattern rather than invent a new one.
- `logics-manager sync context-pack <ref> --format json` resolves a neighborhood via `linked_refs`, but its ref-extraction is a full-text scan over doc bodies. While scoping this very corpus, a ref mentioned only as a prose example inside req_319's own Context section (`item_649_add_the_lifecycle_ops_skill`, cited there purely to illustrate the ref-quoting format) was returned by `context-pack` as a linked ref of req_319, even though the two are unrelated - req_319 is about the Obsidian projection, item_649 belongs to req_318's lifecycle-ops skill. This is expected behavior for a full-text scanner, not a bug to fix in context-pack, but it means a graph feature must not treat `linked_refs` as ground truth for edges.
- Each doc already carries its real structural links in dedicated sections instead: a request's own `# Backlog` list, a backlog item's own `# Links` section (Product brief(s)/Request/Primary task(s)), and a task's own `# Backlog` and `# Links`. These are the same sections `flow` commands already write and keep current. Reading them directly, rather than through context-pack's broader neighborhood resolution, is both simpler and avoids the false-edge risk just observed.
- This is deliberately scoped to one request's chain at a time. The corpus this repository is already managing itself runs over a thousand docs (audit reports 1282); a single diagram covering the whole corpus is a different tool with different requirements (pan/zoom/force layout, likely a new dependency like cytoscape.js), considered and set aside as a separate, larger, not-yet-scoped effort.

# Acceptance criteria
- AC1: A resolver reads one request's chain - the request, its product brief, its backlog items, and each item's task - purely from each doc's own structural link sections, and returns a deterministic node list (ref, kind, title, status) and edge list (parent -> child).
- AC2: A ref mentioned only in prose, not inside a structural Backlog/Links section, never produces a node or edge - covered by a test using the exact req_319/item_649 case observed while scoping this request.
- AC3: A new "Graph" view in the browser viewer renders that chain as a Mermaid flowchart, reusing the already-loaded Mermaid runtime; no new frontend dependency is added.
- AC4: Clicking a node in the rendered graph opens that doc in the viewer, consistent with existing doc-opening behavior elsewhere in the UI.
- AC5: The graph view is added as its own screen module (`createGraphScreen`), following the existing `createCdxScreen`/`createWorkshopScreen`/`createGitScreen` factory pattern.
- AC6: Rendering a chain with zero, one, and many backlog items each produces a correct, readable diagram.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_068_a_bounded_chain_graph_inside_the_viewer_without_a_new_dependency`
- Architecture decision(s): (none yet)

# References

# AI Context
- Summary: Render a bounded chain graph view in the browser viewer
- Keywords: request-chain-scaffold, render a bounded chain graph view in the browser viewer, development-ready
- Use when: You need to implement or review the scaffolded workflow for Render a bounded chain graph view in the browser viewer.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_660_resolve_one_request_s_chain_from_structural_link_sections`
- `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`
