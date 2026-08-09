## task_317_orchestrate_the_bounded_chain_graph_view - Orchestrate the bounded chain graph view
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 13:37:34

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Build the structural-link chain resolver, with the prose-vs-structural test reproducing the req_319/item_649 case found while scoping this request.
- [ ] 2. Build createGraphScreen consuming the resolver's output, reusing the existing Mermaid runtime and the existing screen factory pattern.
- [ ] 3. Wire click-to-open using the viewer's existing doc-open action, and add the "Graph" entry point to the per-document context menu (request/backlog/task cards).
- [ ] 4. Verify a 0-item, 1-item, and many-item chain each render correctly.
- [ ] 5. Validate and index.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_660_resolve_one_request_s_chain_from_structural_link_sections`
- `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_660_resolve_one_request_s_chain_from_structural_link_sections`. Proof deferred to slice closeout.
- request-AC2 -> `item_660_resolve_one_request_s_chain_from_structural_link_sections`. Proof deferred to slice closeout.
- request-AC3 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof deferred to slice closeout.
- request-AC4 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof deferred to slice closeout.
- request-AC5 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof deferred to slice closeout.
- request-AC6 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof deferred to slice closeout.
- request-AC7 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate the bounded chain graph view
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_320_render_a_bounded_chain_graph_view_in_the_browser_viewer`
- Product brief(s): `prod_068_a_bounded_chain_graph_inside_the_viewer_without_a_new_dependency`
- Architecture decision(s): (none yet)
