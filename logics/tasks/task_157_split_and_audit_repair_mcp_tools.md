## task_157_split_and_audit_repair_mcp_tools - Split and audit repair MCP tools
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
- `item_356_split_and_audit_repair_mcp_tools`

# Acceptance criteria
- AC1: `split_request` exposes canonical request split behavior through MCP.
- AC2: `split_backlog` exposes canonical backlog split behavior through MCP.
- AC3: `autofix_ac_traceability` exposes the existing deterministic audit traceability autofix.
- AC4: `autofix_structure` exposes supported deterministic structure repair behavior.
- AC5: Split and repair operations return created or modified paths, validation status, and diff summaries.

# Request AC Traceability
- AC5 -> This task. Proof: implements deterministic audit repair tools for traceability and structure fixes.
- AC6 -> This task. Proof: implements canonical request and backlog split operations.
- AC7 -> This task. Proof: exposes split and audit repair behavior through canonical CLI-backed operations.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_157_split_and_audit_repair_mcp_tools.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement split and audit repair mcp tools.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_192_expand_local_chatgpt_mcp_action_surface`
- Product brief(s): `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`
- Architecture decision(s): (none yet)
