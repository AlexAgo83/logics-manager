## req_192_expand_local_chatgpt_mcp_action_surface - Expand local ChatGPT MCP action surface
> From version: 2.0.5
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Complexity: High
> Theme: MCP workflow ergonomics
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Expand the local ChatGPT MCP action surface so a user can inspect, refine, split, repair, and close Logics workflow documents without giving ChatGPT arbitrary shell or file-edit access.
- Keep the CLI as the canonical runtime: any new business capability exposed through MCP must have an equivalent CLI operation first, except transport-only behavior such as MCP protocol handling or HTTP auth.
- Preserve the option-A local-first model where each user runs their own local MCP server against their own repository.

# Context
- The first ChatGPT MCP proof created and promoted workflow docs through a temporary tunnel, proving transport and core guardrails.
- That first surface is too narrow for regular use because ChatGPT can create/promote documents but cannot read existing docs, build compact context, search, apply controlled updates, close work, repair standard doc issues, or split oversized scopes.
- The product framing is captured in `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`.

# Acceptance criteria
- AC1: The MCP surface can read a precise Logics document by approved ref or repo-relative path and return title, status, key sections, linked refs, and bounded content.
- AC2: The MCP surface can build compact context and list/search Logics docs by bounded criteria without exposing arbitrary repository reads.
- AC3: The MCP surface can update controlled workflow indicators and append bounded notes to approved sections without free-form Markdown editing.
- AC4: The MCP surface can close and finish workflow docs through canonical Logics commands, including eligible-request closure.
- AC5: The MCP surface can run deterministic document repair flows such as Mermaid signature refresh and supported audit autofixes.
- AC6: The MCP surface can split oversized requests and backlog items through canonical Logics commands.
- AC7: All new MCP business capabilities have canonical CLI equivalents first and return validation and diff summaries for writes.
- AC8: The local connector experience remains usable for option-A ChatGPT developer-mode setup.

# AC Traceability
- AC1 -> Backlog: `item_353_read_list_search_and_context_mcp_tools`. Proof: the read/context slice includes `read_logics_doc`.
- AC1 -> Task: `task_154_read_list_search_and_context_mcp_tools`. Proof: the implementation task covers precise bounded document reads.
- AC2 -> Backlog: `item_353_read_list_search_and_context_mcp_tools`. Proof: the read/context slice includes `build_context_pack`, `list_logics_docs`, and `search_logics_docs`.
- AC2 -> Task: `task_154_read_list_search_and_context_mcp_tools`. Proof: the implementation task covers compact context and bounded discovery.
- AC3 -> Backlog: `item_355_controlled_workflow_document_mutation_mcp_tools`. Proof: the controlled mutation slice includes indicator updates and section-scoped append operations.
- AC3 -> Task: `task_156_controlled_workflow_document_mutation_mcp_tools`. Proof: the implementation task covers controlled mutations without free-form Markdown edits.
- AC4 -> Backlog: `item_354_closure_and_deterministic_maintenance_mcp_tools`. Proof: the closure slice includes finish, close, and eligible request closure tools.
- AC4 -> Task: `task_155_closure_and_deterministic_maintenance_mcp_tools`. Proof: the implementation task covers canonical closure operations.
- AC5 -> Backlog: `item_354_closure_and_deterministic_maintenance_mcp_tools` and `item_356_split_and_audit_repair_mcp_tools`. Proof: deterministic maintenance and audit repair are split across these slices.
- AC5 -> Task: `task_155_closure_and_deterministic_maintenance_mcp_tools` and `task_157_split_and_audit_repair_mcp_tools`. Proof: the implementation tasks cover Mermaid refresh and supported audit autofixes.
- AC6 -> Backlog: `item_356_split_and_audit_repair_mcp_tools`. Proof: the split/repair slice includes request and backlog split tools.
- AC6 -> Task: `task_157_split_and_audit_repair_mcp_tools`. Proof: the implementation task covers split operations through canonical commands.
- AC7 -> Backlog: `item_353_read_list_search_and_context_mcp_tools`, `item_354_closure_and_deterministic_maintenance_mcp_tools`, `item_355_controlled_workflow_document_mutation_mcp_tools`, and `item_356_split_and_audit_repair_mcp_tools`. Proof: each business-capability slice preserves the CLI-first MCP adapter rule.
- AC7 -> Task: `task_154_read_list_search_and_context_mcp_tools`, `task_155_closure_and_deterministic_maintenance_mcp_tools`, `task_156_controlled_workflow_document_mutation_mcp_tools`, and `task_157_split_and_audit_repair_mcp_tools`. Proof: each implementation task must add CLI equivalents before MCP exposure.
- AC8 -> Backlog: `item_357_local_mcp_connector_launcher_for_chatgpt_developer_mode`. Proof: the launcher slice covers option-A setup ergonomics.
- AC8 -> Task: `task_158_local_mcp_connector_launcher_for_chatgpt_developer_mode`. Proof: the implementation task covers the local connector launcher.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md`
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow.py`
- `logics_manager/assist.py`
- `python_tests/test_logics_manager_cli.py`

# AI Context
- Summary: Draft a bounded request for expand local chatgpt mcp action surface.
- Keywords: request-draft, logics-manager, python runtime, bundled CLI
- Use when: You need a new bounded request doc for the Logics workflow.
- Skip when: The work already has an existing request or should go straight to a backlog slice.

# Backlog
- `item_353_read_list_search_and_context_mcp_tools`
- `item_354_closure_and_deterministic_maintenance_mcp_tools`
- `item_355_controlled_workflow_document_mutation_mcp_tools`
- `item_356_split_and_audit_repair_mcp_tools`
- `item_357_local_mcp_connector_launcher_for_chatgpt_developer_mode`

# Tasks
- `task_154_read_list_search_and_context_mcp_tools`
- `task_155_closure_and_deterministic_maintenance_mcp_tools`
- `task_156_controlled_workflow_document_mutation_mcp_tools`
- `task_157_split_and_audit_repair_mcp_tools`
- `task_158_local_mcp_connector_launcher_for_chatgpt_developer_mode`
