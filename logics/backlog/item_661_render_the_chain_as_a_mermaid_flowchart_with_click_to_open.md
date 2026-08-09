## item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open - Render the chain as a Mermaid flowchart with click-to-open
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer screen
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The viewer has no graph screen. Its Mermaid runtime today only renders diagrams already written into a doc's content, never a diagram generated dynamically from resolved data.
- Every other viewer feature of this shape (CDX, Workshop, Git) is its own screen module following one factory pattern; a graph view should not invent a second pattern.

# Scope
- In:
  - A new `createGraphScreen` module in clients/viewer/src/browser-host/, following the existing `createCdxScreen`/`createWorkshopScreen`/`createGitScreen` factory pattern and wiring into the shared core the same way.
  - Build a `flowchart TD` string from the resolver's node/edge list (previous slice), feed it to the already-loaded `window.mermaid.run`.
  - Wire Mermaid's `click <id> callback` syntax to the viewer's existing doc-open action, so clicking a node opens that doc.
  - Handle a chain with zero, one, and many backlog items, each producing a correct, readable diagram (verified for each case, not only the common middle case).
- Out:
  - Any pan, zoom, or force-directed layout beyond what Mermaid provides natively.
  - A whole-corpus graph covering hundreds of docs at once; separate, larger, deliberately unscoped effort.
  - Changing how Mermaid renders existing embedded doc diagrams elsewhere in the viewer.

# Acceptance criteria
- AC3: A new "Graph" view in the browser viewer renders that chain as a Mermaid flowchart, reusing the already-loaded Mermaid runtime; no new frontend dependency is added.
- AC4: Clicking a node in the rendered graph opens that doc in the viewer, consistent with existing doc-opening behavior elsewhere in the UI.
- AC5: The graph view is added as its own screen module (`createGraphScreen`), following the existing `createCdxScreen`/`createWorkshopScreen`/`createGitScreen` factory pattern.
- AC6: Rendering a chain with zero, one, and many backlog items each produces a correct, readable diagram.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: A new "Graph" view in the browser viewer renders that chain as a Mermaid flowchart, reusing the already-loaded Mermaid runtime; no new frontend dependency is added.
- request-AC4 -> This backlog slice. Proof: AC4: Clicking a node in the rendered graph opens that doc in the viewer, consistent with existing doc-opening behavior elsewhere in the UI.
- request-AC5 -> This backlog slice. Proof: AC5: The graph view is added as its own screen module (`createGraphScreen`), following the existing `createCdxScreen`/`createWorkshopScreen`/`createGitScreen` factory pattern.
- request-AC6 -> This backlog slice. Proof: AC6: Rendering a chain with zero, one, and many backlog items each produces a correct, readable diagram.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_068_a_bounded_chain_graph_inside_the_viewer_without_a_new_dependency`
- Architecture decision(s): (none yet)
- Request: `req_320_render_a_bounded_chain_graph_view_in_the_browser_viewer`
- Primary task(s): `task_317_orchestrate_the_bounded_chain_graph_view`

# AI Context
- Summary: Render the chain as a Mermaid flowchart with click-to-open
- Keywords: scaffolded-backlog, render the chain as a mermaid flowchart with click-to-open, implementation-ready
- Use when: Implementing the scaffolded slice for Render the chain as a Mermaid flowchart with click-to-open.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - this is the actual visible feature; the resolver alone is invisible to an operator
- Rationale: Set by scaffold input or defaulted for grooming.
