## item_356_split_and_audit_repair_mcp_tools - Split and audit repair MCP tools
> From version: 2.0.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: MCP workflow ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
ChatGPT is useful for decomposing oversized ideas and interpreting audit failures, but it should apply only canonical split and repair operations. The MCP surface needs bounded tools for scope decomposition and deterministic audit repair.

# Scope
- In:
  - MCP tools `split_request`, `split_backlog`, `autofix_ac_traceability`, and `autofix_structure`;
  - canonical CLI equivalents for each business operation;
  - validation and diff summaries for write operations;
  - tests for split targets, generated paths, and repair guardrails.
- Out:
  - model-generated free-form rewrites;
  - broad audit autofix behavior that is not deterministic;
  - repairs outside approved Logics docs.

# Acceptance criteria
- AC1: `split_request` exposes canonical request split behavior through MCP.
- AC2: `split_backlog` exposes canonical backlog split behavior through MCP.
- AC3: `autofix_ac_traceability` exposes the existing deterministic audit traceability autofix.
- AC4: `autofix_structure` exposes supported deterministic structure repair behavior.
- AC5: Split and repair operations return created or modified paths, validation status, and diff summaries.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: deterministic repair tools cover standard document repair flows.
- request-AC6 -> This backlog slice. Proof: split tools cover request and backlog decomposition.
- request-AC7 -> This backlog slice. Proof: split and repair capabilities require canonical CLI equivalents.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`
- Architecture decision(s): (none yet)
- Request: `logics/request/req_192_expand_local_chatgpt_mcp_action_surface.md`
- Primary task(s): `logics/tasks/task_157_split_and_audit_repair_mcp_tools.md`

# AI Context
- Summary: Split and audit repair MCP tools
- Keywords: backlog, promote, slice, split and audit repair mcp tools
- Use when: You need a bounded backlog item for Split and audit repair MCP tools.
- Skip when: The change should go straight to implementation detail.

# Priority
- Impact:
- Urgency:

# Notes
- Generated locally by logics-manager.
- Task `task_157_split_and_audit_repair_mcp_tools` was finished via `logics-manager flow finish task` on 2026-05-27.

# Tasks
- `task_157_split_and_audit_repair_mcp_tools`
