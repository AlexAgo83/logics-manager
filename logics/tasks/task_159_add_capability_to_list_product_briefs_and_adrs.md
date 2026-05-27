## task_159_add_capability_to_list_product_briefs_and_adrs - Add capability to list product briefs and ADRs
> From version: 2.1.1
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

# Report
- Implementation complete.

# AI Context
- Summary: Implement add capability to list product briefs and adrs.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_194_add_capability_to_list_product_briefs_and_adrs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
