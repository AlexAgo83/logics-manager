## item_358_add_capability_to_list_product_briefs_and_adrs - Add capability to list product briefs and ADRs
> From version: 2.1.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Allow assistants and operators to list Logics companion documents such as product briefs and architecture decision records without relying on text search or Git diff workarounds.
Expose an explicit, bounded MCP capability that returns a reliable inventory of existing product briefs and ADRs.
Make companion documents discoverable with their references, paths, titles, statuses, and primary links when available.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: An MCP action can list product briefs with a limit parameter and returns at least ref, path, title, status, and related links when available.
- AC2: An MCP action can list ADRs or architecture decision documents with a limit parameter and returns at least ref, path, title, status, and related links when available.
- AC3: The capability may be exposed either as two dedicated tools or as a generic list_companion_docs tool accepting product, architecture, or all as the companion document type.
- AC4: Responses are bounded, deterministic, and do not require approximate text search to discover companion documents.
- AC5: Untracked documents that exist under the relevant Logics paths are visible when current MCP rules allow them to be surfaced.
- AC6: Tool descriptions or documentation explicitly distinguish workflow documents from companion documents.
- AC7: A smoke test confirms that after creating a product brief, listing product briefs returns that document without using show_git_diff.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: An MCP action can list product briefs with a limit parameter and returns at least ref, path, title, status, and related links when available.
- request-AC2 -> This backlog slice. Proof: AC2: An MCP action can list ADRs or architecture decision documents with a limit parameter and returns at least ref, path, title, status, and related links when available.
- request-AC3 -> This backlog slice. Proof: AC3: The capability may be exposed either as two dedicated tools or as a generic list_companion_docs tool accepting product, architecture, or all as the companion document type.
- request-AC4 -> This backlog slice. Proof: AC4: Responses are bounded, deterministic, and do not require approximate text search to discover companion documents.
- request-AC5 -> This backlog slice. Proof: AC5: Untracked documents that exist under the relevant Logics paths are visible when current MCP rules allow them to be surfaced.
- request-AC6 -> This backlog slice. Proof: AC6: Tool descriptions or documentation explicitly distinguish workflow documents from companion documents.
- request-AC7 -> This backlog slice. Proof: AC7: A smoke test confirms that after creating a product brief, listing product briefs returns that document without using show_git_diff.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_194_add_capability_to_list_product_briefs_and_adrs.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Add capability to list product briefs and ADRs
- Keywords: backlog-groom, request, add capability to list product briefs and adrs, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Add capability to list product briefs and ADRs.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_194_add_capability_to_list_product_briefs_and_adrs` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_194_add_capability_to_list_product_briefs_and_adrs.md`.
- Generated locally by logics-manager.
- Task `task_159_add_capability_to_list_product_briefs_and_adrs` was finished via `logics-manager flow finish task` on 2026-05-27.

# Tasks
- `task_159_add_capability_to_list_product_briefs_and_adrs`
