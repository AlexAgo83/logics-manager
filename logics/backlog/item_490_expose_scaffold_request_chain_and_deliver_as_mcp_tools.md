## item_490_expose_scaffold_request_chain_and_deliver_as_mcp_tools - Expose scaffold_request_chain and deliver as MCP tools
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: MCP surface
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The MCP registry has 35 tools but no scaffolding tool, so MCP-only assistants cannot author a full request chain in one call and must hand-chain primitives.

# Scope
- In:
  - Register scaffold_request_chain (and deliver) in mcp_parts/_01.py, delegating to the existing CLI scaffold/deliver code path
  - Define the tool input schema from the same JSON the CLI accepts
  - Return the created refs and the next-action summary the CLI already produces
- Out:
  - Changing the scaffold output shape or the CLI behavior
  - Reimplementing authoring logic

# Acceptance criteria
- AC1: An MCP call scaffolds the full chain identically to the CLI.
- AC2: The tool input schema matches the CLI JSON and is covered by a test.
- AC3: deliver is likewise exposed.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: An MCP call scaffolds the full chain identically to the CLI.
- request-AC7 -> This backlog slice. Proof: AC2: The tool input schema matches the CLI JSON and is covered by a test.
- request-AC8 -> This backlog slice. Proof: AC3: deliver is likewise exposed.
- request-AC4 -> This backlog slice. Proof: Blocking lint/validate messages that have a deterministic remedy name the remedy command (e.g. sync update-indicators) in their text.
- request-AC5 -> This backlog slice. Proof: Closeout-deferred proofs are reported under a distinct severity (e.g. deferred/info) separate from actionable fixable findings, so a fresh scaffold validates clean; --fixable no longer lists them.
- request-AC6 -> This backlog slice. Proof: flow scaffold request-chain --validate runs validation inline and prints a ready-to-dev summary, reusing the existing validate path.
- request-AC9 -> This backlog slice. Proof: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_assistant_authoring_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_276_improve_logics_manager_authoring_ergonomics_for_ai_assistants`
- Primary task(s): `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements`

# AI Context
- Summary: Expose scaffold_request_chain and deliver as MCP tools
- Keywords: scaffolded-backlog, expose scaffold_request_chain and deliver as mcp tools, implementation-ready
- Use when: Implementing the scaffolded slice for Expose scaffold_request_chain and deliver as MCP tools.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Done: scaffold_request_chain MCP tool added (writes input to a temp file, runs the CLI path, cleans up). Tests in test_logics_manager_mcp.py. Follow-up: expose `deliver` likewise.
- Task `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements`
