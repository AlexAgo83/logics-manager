## prod_068_a_bounded_chain_graph_inside_the_viewer_without_a_new_dependency - A bounded chain graph inside the viewer, without a new dependency
> Date: 2026-08-09
> Status: Proposed
> Related request: `req_320_render_a_bounded_chain_graph_view_in_the_browser_viewer`
> Related backlog: `item_660_resolve_one_request_s_chain_from_structural_link_sections`, `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`
> Related task: `task_317_orchestrate_the_bounded_chain_graph_view`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Let an operator see one request's chain visually inside the existing browser viewer, reusing the Mermaid runtime already loaded for embedded doc diagrams and the existing per-screen factory architecture, resolved from each doc's own structural link sections rather than a broader full-text ref scan that can produce false edges from prose mentions.

# Goals
- A visual, clickable chain view for one request at a time.
- Zero new frontend dependencies.
- Correct edges only from structural sections, proven against the exact false-edge case found while scoping this request.
- Consistent with the viewer's existing screen architecture.

# Non-goals
- A whole-corpus interactive graph explorer covering hundreds of docs at once; that is a separate, larger, deliberately unscoped effort.
- Any Obsidian-related work; that is req_319, an unrelated surface.
- Changing context-pack's own ref-resolution behavior.
- Pan, zoom, or force-directed layout beyond what Mermaid provides natively.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `req_320_render_a_bounded_chain_graph_view_in_the_browser_viewer`
- Task back-reference: `task_317_orchestrate_the_bounded_chain_graph_view`
