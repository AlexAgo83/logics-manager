## item_589_bound_the_served_mcp_tool_surface_by_profile_and_by_allow_and_deny_lists - Bound the served MCP tool surface by profile and by allow and deny lists
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: MCP surface control
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The MCP server exposes its entire tool set with no filtering, including tools that delete, rename, split, and auto-fix documents.
- An integration that only needs status reading and light capture must either accept every destructive tool as standing surface or write and maintain a wrapper server that re-exports a curated subset, which is what an external orchestrator did for twelve tools.

# Scope
- In:
  - Classify every exposed tool with a capability level distinguishing read-only, mutating, and destructive behavior.
  - Add a profile option selecting a named capability subset, and allow and deny options accepting name patterns.
  - Report the selected profile and the resulting tool list through the tool-definition command and through server startup diagnostics.
  - Apply the same selection to every transport the server supports.
- Out:
  - Per-caller or per-session authorization.
  - Runtime reconfiguration of the surface without a restart.
  - Redesigning the tools themselves.

# Acceptance criteria
- AC1: Every tool carries a capability classification, and the classification is visible in the tool-definition output.
- AC2: Starting the server with a read-only profile exposes no mutating or destructive tool.
- AC3: Allow and deny patterns compose predictably, with deny taking precedence, and an unmatched pattern is reported rather than silently ignored.
- AC4: Starting the server with no selection options exposes the current full surface unchanged.
- AC5: Tests cover each profile, pattern composition, deny precedence, unmatched patterns, and default behavior.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Every tool carries a capability classification, and the classification is visible in the tool-definition output.
- request-AC9 -> This backlog slice. Proof: AC2: Starting the server with a read-only profile exposes no mutating or destructive tool.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)
- Request: `req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories`
- Primary task(s): `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery`

# AI Context
- Summary: Bound the served MCP tool surface by profile and by allow and deny lists
- Keywords: scaffolded-backlog, bound the served mcp tool surface by profile and by allow and deny lists, implementation-ready
- Use when: Implementing the scaffolded slice for Bound the served MCP tool surface by profile and by allow and deny lists.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - removes the largest category of external glue
- Rationale: Set by scaffold input or defaulted for grooming.
