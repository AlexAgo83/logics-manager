## req_194_add_capability_to_list_product_briefs_and_adrs - Add capability to list product briefs and ADRs
> From version: 2.1.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Allow assistants and operators to list Logics companion documents such as product briefs and architecture decision records without relying on text search or Git diff workarounds.
- Expose an explicit, bounded MCP capability that returns a reliable inventory of existing product briefs and ADRs.
- Make companion documents discoverable with their references, paths, titles, statuses, and primary links when available.

# Context
- The current Logics connector exposes actions to create product briefs and architecture decision documents, but it does not expose a dedicated action to list them.
- During a smoke test, listing product briefs required a workaround through search_logics_docs and show_git_diff, and that did not provide a complete reliable inventory.
- Companion documents live outside the request/backlog/task workflow document surface, so list_logics_docs is not sufficient if its scope remains limited to workflow document kinds.
- The new capability should remain bounded and consistent with Logics constraints: no unrestricted repository browsing, limited responses, and explicit criteria.

# Acceptance criteria
- AC1: An MCP action can list product briefs with a limit parameter and returns at least ref, path, title, status, and related links when available.
- AC2: An MCP action can list ADRs or architecture decision documents with a limit parameter and returns at least ref, path, title, status, and related links when available.
- AC3: The capability may be exposed either as two dedicated tools or as a generic list_companion_docs tool accepting product, architecture, or all as the companion document type.
- AC4: Responses are bounded, deterministic, and do not require approximate text search to discover companion documents.
- AC5: Untracked documents that exist under the relevant Logics paths are visible when current MCP rules allow them to be surfaced.
- AC6: Tool descriptions or documentation explicitly distinguish workflow documents from companion documents.
- AC7: A smoke test confirms that after creating a product brief, listing product briefs returns that document without using show_git_diff.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow.py`
- `logics_manager/assist.py`
- `python_tests/test_logics_manager_cli.py`

# AI Context
- Summary: Draft a bounded request for add capability to list product briefs and adrs.
- Keywords: request-draft, logics-manager, python runtime, bundled CLI
- Use when: You need a new bounded request doc for the Logics workflow.
- Skip when: The work already has an existing request or should go straight to a backlog slice.

# Backlog
- none
- `item_358_add_capability_to_list_product_briefs_and_adrs`
