## task_317_orchestrate_the_bounded_chain_graph_view - Orchestrate the bounded chain graph view
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-09 16:54:08
> Owner: claude

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Build the structural-link chain resolver, with the prose-vs-structural test reproducing the req_319/item_649 case found while scoping this request.
- [x] 2. Build createGraphScreen consuming the resolver's output, reusing the existing Mermaid runtime and the existing screen factory pattern.
- [x] 3. Wire click-to-open using the viewer's existing doc-open action, and add the "Graph" entry point to the document panel's action toolbar (request/backlog/task docs) - corrected from the originally-cited `.column__menu-item`, which turned out to belong to the separate VS Code Kanban webview, not this viewer.
- [x] 4. Verify a 0-item, 1-item, and many-item chain each render correctly.
- [x] 5. Validate and index.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_660_resolve_one_request_s_chain_from_structural_link_sections`
- `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_660_resolve_one_request_s_chain_from_structural_link_sections`. Proof: see that item's AC Traceability.
- request-AC2 -> `item_660_resolve_one_request_s_chain_from_structural_link_sections`. Proof: see that item's AC Traceability.
- request-AC3 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof: see that item's AC Traceability.
- request-AC4 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof: see that item's AC Traceability.
- request-AC5 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof: see that item's AC Traceability.
- request-AC6 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof: see that item's AC Traceability.
- request-AC7 -> `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`. Proof: see that item's AC Traceability.

# Validation
- pytest full suite (1218 tests) + vitest (831 tests) + tsc --noEmit + npm run check:line-budget + npm run check:status-constants + npm run lint:es all passed on 2026-08-09.
- pytest full suite (1218 tests) + vitest (831 tests) + tsc --noEmit + npm run check:line-budget + npm run check:status-constants + npm run lint:es all passed on 2026-08-09
- Finish workflow executed on 2026-08-09.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-09.
- Linked backlog item(s): `item_660_resolve_one_request_s_chain_from_structural_link_sections`, `item_661_render_the_chain_as_a_mermaid_flowchart_with_click_to_open`
- Related request(s): `req_320_render_a_bounded_chain_graph_view_in_the_browser_viewer`

# AI Context
- Summary: Orchestrate the bounded chain graph view
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_320_render_a_bounded_chain_graph_view_in_the_browser_viewer`
- Product brief(s): `prod_068_a_bounded_chain_graph_inside_the_viewer_without_a_new_dependency`
- Architecture decision(s): (none yet)
