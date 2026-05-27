## task_154_read_list_search_and_context_mcp_tools - Read list search and context MCP tools
> From version: 2.0.5
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_353_read_list_search_and_context_mcp_tools`

# Acceptance criteria
- AC1: `read_logics_doc` returns title, kind, status, linked refs, selected sections, and bounded content for one approved Logics doc.
- AC2: `build_context_pack` exposes canonical context-pack behavior for a selected ref.
- AC3: `list_logics_docs` supports bounded listing by kind, status, ref prefix, and limit.
- AC4: `search_logics_docs` supports bounded text search with snippets inside approved Logics docs.
- AC5: Reads reject absolute paths, traversal, unsupported directories, and oversized responses.

# Request AC Traceability
- AC1 -> This task. Proof: implements precise bounded document reads through `read_logics_doc`.
- AC2 -> This task. Proof: implements compact context and bounded document discovery through `build_context_pack`, `list_logics_docs`, and `search_logics_docs`.
- AC7 -> This task. Proof: adds CLI equivalents before MCP exposure for read, list, search, and context behavior.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_154_read_list_search_and_context_mcp_tools.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement read list search and context mcp tools.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_192_expand_local_chatgpt_mcp_action_surface`
- Product brief(s): `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`
- Architecture decision(s): (none yet)
