## item_354_closure_and_deterministic_maintenance_mcp_tools - Closure and deterministic maintenance MCP tools
> From version: 2.0.5
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: MCP workflow ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The first ChatGPT MCP test proved that manual status edits can leave the Logics request, backlog, and task chain inconsistent. ChatGPT needs closure and maintenance tools that call canonical Logics commands instead of changing Markdown indicators directly.

# Scope
- In:
  - CLI-backed MCP tools `finish_task`, `close_workflow_doc`, `close_eligible_requests`, and `refresh_mermaid_signatures`;
  - validation and diff summaries after write operations;
  - dirty tracked-source conflict checks;
  - tests for task -> backlog -> request closure consistency.
- Out:
  - free-form status editing;
  - non-deterministic document rewrites;
  - arbitrary repair operations.

# Acceptance criteria
- AC1: `finish_task` exposes canonical `flow finish task` behavior through MCP.
- AC2: `close_workflow_doc` exposes canonical `flow close` behavior for request, backlog, and task docs.
- AC3: `close_eligible_requests` exposes canonical eligible-request sync behavior.
- AC4: `refresh_mermaid_signatures` refreshes deterministic Mermaid signatures through a bounded MCP operation.
- AC5: All write operations return changed paths, validation status, and diff summaries.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: finish and close tools preserve workflow closure consistency.
- request-AC5 -> This backlog slice. Proof: Mermaid refresh covers deterministic document maintenance.
- request-AC7 -> This backlog slice. Proof: MCP wrappers call canonical CLI operations.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`
- Architecture decision(s): (none yet)
- Request: `logics/request/req_192_expand_local_chatgpt_mcp_action_surface.md`
- Primary task(s): `logics/tasks/task_155_closure_and_deterministic_maintenance_mcp_tools.md`

# AI Context
- Summary: Closure and deterministic maintenance MCP tools
- Keywords: backlog, promote, slice, closure and deterministic maintenance mcp tools
- Use when: You need a bounded backlog item for Closure and deterministic maintenance MCP tools.
- Skip when: The change should go straight to implementation detail.

# Priority
- Impact:
- Urgency:

# Notes
- Generated locally by logics-manager.

# Tasks
- `task_155_closure_and_deterministic_maintenance_mcp_tools`
