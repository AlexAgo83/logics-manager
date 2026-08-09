## item_660_resolve_one_request_s_chain_from_structural_link_sections - Resolve one request's chain from structural link sections
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Chain resolution
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 16:54:08

# Problem
- No existing endpoint returns a clean node/edge list for one request's chain built only from structural sections. `context-pack`'s `linked_refs` is the closest existing thing, but its full-text scan can produce a false edge from a ref mentioned only as a prose example - observed directly while scoping this request (item_649, cited in req_319's Context section purely as an illustration, came back as a linked ref of req_319).

# Scope
- In:
  - A resolver (viewer-internal or CLI-backed) that reads a request's `# Backlog` list, each backlog item's `# Links` section (Product brief(s)/Request/Primary task(s)), and each task's `# Backlog`/`# Links`.
  - Return a deterministic node list (ref, kind, title, status) and an edge list (parent -> child) built only from those structural sections.
  - Skip, rather than error on, a ref listed in a structural section that does not resolve to an actual doc on disk (a dangling link) - report it, do not crash the resolution.
  - A test reproducing the exact req_319/item_649 case: a ref mentioned only in a Context bullet must not appear as a node or edge for that request's chain.
- Out:
  - Resolving roadmap, architecture, or spec docs into the chain; this bounded view covers request/product/backlog/task only.
  - Any change to `context-pack`'s own resolution behavior; this is a separate, narrower resolver built for this feature.

# Acceptance criteria
- AC1: A resolver reads one request's chain - the request, its product brief, its backlog items, and each item's task - purely from each doc's own structural link sections, and returns a deterministic node list (ref, kind, title, status) and edge list (parent -> child).
- AC2: A ref mentioned only in prose, not inside a structural Backlog/Links section, never produces a node or edge - covered by a test using the exact req_319/item_649 case observed while scoping this request.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `logics_manager/chain_graph.py`'s `resolve_request_chain()` reads only `# Backlog`/`# Links`/`# Companion docs` via `section_lines`+`extract_refs`; `test_resolves_full_chain_from_the_request` and `test_resolves_from_a_task_ref_by_walking_up_to_the_request`/`test_resolves_from_a_backlog_item_ref_by_walking_up_to_the_request` passed (tests/python/test_chain_graph.py). Also confirmed live against this repo's real req_319 (`python3 -c "from logics_manager.chain_graph import resolve_request_chain..."`): resolves req_319 -> prod_067 -> item_658/item_659 -> task_316, with an empty `dangling` list.
- request-AC2 -> This backlog slice. Proof: `test_prose_only_ref_never_becomes_a_node_or_edge` reproduces the exact req_319/item_649 case and passed; the live check above against the real req_319 doc also confirms `item_649` never appears.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_068_a_bounded_chain_graph_inside_the_viewer_without_a_new_dependency`
- Architecture decision(s): (none yet)
- Request: `req_320_render_a_bounded_chain_graph_view_in_the_browser_viewer`
- Primary task(s): `task_317_orchestrate_the_bounded_chain_graph_view`

# AI Context
- Summary: Resolve one request's chain from structural link sections
- Keywords: scaffolded-backlog, resolve one request's chain from structural link sections, implementation-ready
- Use when: Implementing the scaffolded slice for Resolve one request's chain from structural link sections.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the rendering step in the second slice has nothing correct to draw without this
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_317_orchestrate_the_bounded_chain_graph_view`

# Notes
- Task `task_317_orchestrate_the_bounded_chain_graph_view` was finished via `logics-manager flow finish task` on 2026-08-09.
