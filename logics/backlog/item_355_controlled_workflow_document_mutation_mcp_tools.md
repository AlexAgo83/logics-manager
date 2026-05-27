## item_355_controlled_workflow_document_mutation_mcp_tools - Controlled workflow document mutation MCP tools
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
ChatGPT needs to refine workflow docs after reading them, but allowing arbitrary Markdown edits would bypass Logics structure, lint, and audit expectations. The MCP surface needs controlled mutation tools that only touch approved indicators and sections.

# Scope
- In:
  - CLI-canonical structured update operations where missing;
  - MCP tools `update_workflow_indicators`, `append_report_entry`, `append_validation_note`, and `append_decision_note`;
  - bounded text inputs and approved target sections;
  - validation and diff summaries after writes;
  - tests for dirty conflicts and unsupported section/path rejection.
- Out:
  - generic `edit_document`;
  - arbitrary section replacement;
  - writes outside approved workflow and companion docs.

# Acceptance criteria
- AC1: `update_workflow_indicators` can update approved indicators such as status, progress, understanding, confidence, theme, and complexity.
- AC2: `append_report_entry` appends bounded content to `# Report` for approved workflow docs.
- AC3: `append_validation_note` appends bounded content to `# Validation` or creates the section where allowed.
- AC4: `append_decision_note` appends bounded rationale to an approved decision or notes section.
- AC5: Mutation tools reject unsupported fields, unsupported paths, oversized text, and dirty tracked-source conflicts.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: controlled indicator and note tools avoid free-form Markdown edits.
- request-AC7 -> This backlog slice. Proof: mutation capabilities require canonical CLI equivalents and write summaries.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`
- Architecture decision(s): (none yet)
- Request: `logics/request/req_192_expand_local_chatgpt_mcp_action_surface.md`
- Primary task(s): `logics/tasks/task_156_controlled_workflow_document_mutation_mcp_tools.md`

# AI Context
- Summary: Controlled workflow document mutation MCP tools
- Keywords: backlog, promote, slice, controlled workflow document mutation mcp tools
- Use when: You need a bounded backlog item for Controlled workflow document mutation MCP tools.
- Skip when: The change should go straight to implementation detail.

# Priority
- Impact:
- Urgency:

# Notes
- Generated locally by logics-manager.
- Task `task_156_controlled_workflow_document_mutation_mcp_tools` was finished via `logics-manager flow finish task` on 2026-05-27.

# Tasks
- `task_156_controlled_workflow_document_mutation_mcp_tools`
