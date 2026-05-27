## item_353_read_list_search_and_context_mcp_tools - Read list search and context MCP tools
> From version: 2.0.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: MCP workflow ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
ChatGPT can create and promote Logics documents through MCP, but it cannot yet inspect existing workflow docs or build compact grounding context without relying on previews returned by earlier write actions. Operators need a bounded read surface that lets ChatGPT understand the current Logics corpus without broad filesystem access.

# Scope
- In:
  - CLI-canonical read/list/search operations for approved Logics docs;
  - MCP tools `read_logics_doc`, `build_context_pack`, `list_logics_docs`, and `search_logics_docs`;
  - bounded content and snippet limits;
  - ref and repo-relative path validation;
  - tests proving arbitrary repository files cannot be read.
- Out:
  - free-form repository browsing;
  - arbitrary glob reads;
  - write operations.

# Acceptance criteria
- AC1: `read_logics_doc` returns title, kind, status, linked refs, selected sections, and bounded content for one approved Logics doc.
- AC2: `build_context_pack` exposes canonical context-pack behavior for a selected ref.
- AC3: `list_logics_docs` supports bounded listing by kind, status, ref prefix, and limit.
- AC4: `search_logics_docs` supports bounded text search with snippets inside approved Logics docs.
- AC5: Reads reject absolute paths, traversal, unsupported directories, and oversized responses.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: read_logics_doc covers precise document reads with bounded content.
- request-AC2 -> This backlog slice. Proof: build_context_pack, list_logics_docs, and search_logics_docs cover compact context and bounded discovery.
- request-AC7 -> This backlog slice. Proof: new MCP read capabilities must have canonical CLI equivalents first.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`
- Architecture decision(s): (none yet)
- Request: `logics/request/req_192_expand_local_chatgpt_mcp_action_surface.md`
- Primary task(s): `logics/tasks/task_154_read_list_search_and_context_mcp_tools.md`

# AI Context
- Summary: Read list search and context MCP tools
- Keywords: backlog, promote, slice, read list search and context mcp tools
- Use when: You need a bounded backlog item for Read list search and context MCP tools.
- Skip when: The change should go straight to implementation detail.

# Priority
- Impact:
- Urgency:

# Notes
- Generated locally by logics-manager.
- Task `task_154_read_list_search_and_context_mcp_tools` was finished via `logics-manager flow finish task` on 2026-05-27.

# Tasks
- `task_154_read_list_search_and_context_mcp_tools`
