## task_159_add_capability_to_list_product_briefs_and_adrs - Add capability to list product briefs and ADRs
> From version: 2.1.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Backlog
- `item_358_add_capability_to_list_product_briefs_and_adrs`

# Acceptance criteria
- AC1: An MCP action can list product briefs with a limit parameter and returns at least ref, path, title, status, and related links when available.
- AC2: An MCP action can list ADRs or architecture decision documents with a limit parameter and returns at least ref, path, title, status, and related links when available.
- AC3: The capability may be exposed either as two dedicated tools or as a generic list_companion_docs tool accepting product, architecture, or all as the companion document type.
- AC4: Responses are bounded, deterministic, and do not require approximate text search to discover companion documents.
- AC5: Untracked documents that exist under the relevant Logics paths are visible when current MCP rules allow them to be surfaced.
- AC6: Tool descriptions or documentation explicitly distinguish workflow documents from companion documents.
- AC7: A smoke test confirms that after creating a product brief, listing product briefs returns that document without using show_git_diff.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_159_add_capability_to_list_product_briefs_and_adrs.md` after implementation.
- Finish workflow executed on 2026-05-27.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-05-27.
- Linked backlog item(s): `item_358_add_capability_to_list_product_briefs_and_adrs`
- Related request(s): `req_194_add_capability_to_list_product_briefs_and_adrs`

# AI Context
- Summary: Implement add capability to list product briefs and adrs.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_194_add_capability_to_list_product_briefs_and_adrs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- AC1 -> `list_companion_docs(kind="product")`. Proof: `python_tests/test_logics_manager_mcp.py::test_mcp_lists_companion_docs` asserts product brief listing returns the created product ref with structured metadata.
- AC2 -> `list_companion_docs(kind="all"|"architecture")`. Proof: `test_mcp_lists_companion_docs` asserts the created architecture decision appears in the companion inventory.
- AC3 -> Generic `list_companion_docs` MCP tool. Proof: `logics_manager/mcp.py` exposes `kind` enum values `all`, `product`, and `architecture`.
- AC4 -> Bounded deterministic scan. Proof: `_list_companion_docs` sorts paths, applies the `limit`, and avoids search-based discovery.
- AC5 -> Filesystem-backed scan. Proof: `_list_companion_docs` reads current files under `logics/product` and `logics/architecture`, including untracked files present on disk.
- AC6 -> Tool description distinguishes companion documents. Proof: the MCP tool description says "companion documents such as product briefs and architecture decisions".
- AC7 -> Smoke coverage. Proof: `test_mcp_lists_companion_docs` creates a product brief and then lists product companion docs without using `show_git_diff`.
