## task_156_controlled_workflow_document_mutation_mcp_tools - Controlled workflow document mutation MCP tools
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
- `item_355_controlled_workflow_document_mutation_mcp_tools`

# Acceptance criteria
- AC1: `update_workflow_indicators` can update approved indicators such as status, progress, understanding, confidence, theme, and complexity.
- AC2: `append_report_entry` appends bounded content to `# Report` for approved workflow docs.
- AC3: `append_validation_note` appends bounded content to `# Validation` or creates the section where allowed.
- AC4: `append_decision_note` appends bounded rationale to an approved decision or notes section.
- AC5: Mutation tools reject unsupported fields, unsupported paths, oversized text, and dirty tracked-source conflicts.

# Request AC Traceability
- AC3 -> This task. Proof: implements controlled indicator updates and section-scoped append operations without free-form Markdown editing.
- AC7 -> This task. Proof: adds CLI-backed mutation operations before exposing them through MCP.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_156_controlled_workflow_document_mutation_mcp_tools.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement controlled workflow document mutation mcp tools.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_192_expand_local_chatgpt_mcp_action_surface`
- Product brief(s): `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`
- Architecture decision(s): (none yet)
