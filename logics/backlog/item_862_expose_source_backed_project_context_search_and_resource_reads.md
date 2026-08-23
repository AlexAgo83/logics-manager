## item_862_expose_source_backed_project_context_search_and_resource_reads - Expose source-backed project context search and resource reads
> From version: 2.22.4
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Connector onboarding
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-23 11:56:04

# AI Context
- Summary: Provide bounded follow-up MCP reads so onboarding source pointers can be searched and opened without broad repository access.
- Keywords: expose, source, backed, project, context, search, resource, reads
- Use when: Adding `search_project_context`, `read_project_resource`, source-pointer round trips, or bounded project-context reads.
- Skip when: The work only changes the initial onboarding payload or project registry.

# Problem
- A one-call onboarding payload cannot include every detail. The model needs a safe way to deepen one topic and read the exact resource behind an onboarding claim without asking the operator to paste files.

# Scope
- In:
  - Expose `search_project_context` as a semantic wrapper over existing Logics search/context-pack primitives, returning bounded snippets and source pointers.
  - Expose `read_project_resource` for approved resource types: Logics refs/docs, context-pack entries, recent-activity source pointers, and safe repo-relative source previews if an existing safe preview primitive is available.
  - Keep all reads bounded by max chars and existing repo-root/path traversal protections.
  - Make onboarding advertise these follow-up commands with short descriptions and expected arguments.
  - Add focused MCP tests proving a model can search, read a returned source pointer, and stay within bounds.
- Out:
  - Unbounded arbitrary file reads.
  - Vector search or a new indexing backend.
  - Writing, deleting, renaming, or lifecycle-changing documents.

# Acceptance criteria
- AC1: `search_project_context` returns bounded, source-backed results for a query over Logics docs/context packs.
- AC2: `read_project_resource` can read a source pointer returned by onboarding/search with max-char bounds.
- AC3: Path traversal, absolute paths, and unsupported resource types are rejected with existing MCP error patterns.
- AC4: The docs/tool descriptions tell connector clients to deepen context through search/read rather than claiming unsupported visibility.
- AC5: Focused MCP tests and corpus validation pass.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: `search_project_context` returns bounded, source-backed results for a query over Logics docs/context packs.
- request-AC6 -> This backlog slice. Proof: AC2: `read_project_resource` can read a source pointer returned by onboarding/search with max-char bounds.
- request-AC7 -> This backlog slice. Proof: AC3: Path traversal, absolute paths, and unsupported resource types are rejected with existing MCP error patterns.
- request-AC8 -> This backlog slice. Proof: AC4: The docs/tool descriptions tell connector clients to deepen context through search/read rather than claiming unsupported visibility.
- request-AC9 -> This backlog slice. Proof: AC5: Focused MCP tests and corpus validation pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_111_connector_project_onboarding_context`
- Architecture decision(s): (none yet)
- Request: `req_382_make_the_chatgpt_mcp_connector_self_onboard_onto_any_logics_project`
- Primary task(s): `task_394_orchestrate_connector_project_onboarding_context`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
