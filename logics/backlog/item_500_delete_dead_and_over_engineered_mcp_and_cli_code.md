## item_500_delete_dead_and_over_engineered_mcp_and_cli_code - Delete dead and over-engineered MCP and CLI code
> From version: 2.12.12
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Over-engineering cleanup
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The MCP readOnlyHint/idempotentHint/destructiveHint annotations on ~35 tools are never read, call_tool is a 363-line chain of 30+ if branches, and cli.py hardcodes subcommand validators that argparse already enforces.

# Scope
- In:
  - Remove the unused MCP tool annotations
  - Replace the call_tool if-chain with a name-to-handler dispatch table
  - Drop the hardcoded subcommand validators in cli.py and rely on argparse
- Out:
  - Behavior or public-surface changes to MCP tools or CLI commands
  - The broader Python helper-deduplication effort (handled by a sibling slice)

# Acceptance criteria
- AC1: The dead MCP annotations are removed and call_tool dispatches via a handler table.
- AC2: The hardcoded CLI validators are gone and argparse still rejects invalid subcommands.
- AC3: MCP and CLI behavior is unchanged and the suites pass.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: The dead MCP annotations are removed and call_tool dispatches via a handler table.
- request-AC11 -> This backlog slice. Proof: AC2: The hardcoded CLI validators are gone and argparse still rejects invalid subcommands.
- request-AC12 -> This backlog slice. Proof: AC3: MCP and CLI behavior is unchanged and the suites pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Delete dead and over-engineered MCP and CLI code
- Keywords: scaffolded-backlog, delete dead and over-engineered mcp and cli code, implementation-ready
- Use when: Implementing the scaffolded slice for Delete dead and over-engineered MCP and CLI code.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
