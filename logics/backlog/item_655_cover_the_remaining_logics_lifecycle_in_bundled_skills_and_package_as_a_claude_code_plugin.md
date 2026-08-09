## item_655_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin - Close the MCP tool parity gap for lifecycle, roadmap, closeout-repair, and health commands
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: MCP tool parity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The MCP surface (logics_manager/mcp.py) does not mirror the CLI. It has tools for promote, split, close, finish, ac-traceability, and mermaid, but none for withdraw, progress, roadmap show/validate, deliver, validate-closeout, gates, links, doctor, or insights.
- This is a harder limit than the skill-documentation gap the sibling backlog items address: no skill can route an agent to a lifecycle, roadmap, closeout-repair, or health capability that has no MCP tool behind it. An MCP-only agent is capped below what the CLI can do, regardless of documentation.

# Scope
- In:
  - Add MCP tools for: withdraw, progress task, roadmap show, roadmap validate, deliver, validate-closeout, repair gates, repair links, doctor, insights.
  - Each new tool thinly wraps the existing CLI/library implementation, matching the input/output shape conventions of the current tools (e.g. `close_workflow_doc`, `refresh_mermaid_signatures`).
  - Test coverage for each new tool matching the style of existing MCP tool tests.
- Out:
  - Changing the behavior of any existing MCP tool or the CLI commands being wrapped.
  - Documenting these tools in the skills from this request; that is each skill's own scope, not this item's.
  - Any tool for release, obsidian, fleet, design, or the viewer — those stay CLI/human-only, matching the decision already made for skills.

# Acceptance criteria
- AC10: The MCP surface gains tools for withdraw, progress, roadmap show/validate, deliver, validate-closeout, gates repair, links repair, doctor, and insights — the CLI commands with no MCP equivalent today — each with test coverage matching the style of the existing MCP tool tests.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC10: The MCP surface gains tools for withdraw, progress, roadmap show/validate, deliver, validate-closeout, gates repair, links repair, doctor, and insights — the CLI commands with no MCP equivalent today — each with test coverage matching the style of the existing MCP tool tests.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Close the MCP tool parity gap for lifecycle, roadmap, closeout-repair, and health commands
- Keywords: backlog-groom, request, mcp, tool parity, withdraw, progress, roadmap, deliver, closeout-repair, doctor, insights
- Use when: Use when implementing or reviewing MCP tool coverage for this delivery slice.
- Skip when: Skip when the change is unrelated to the MCP tool surface or its linked request.

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin.md`.
- Generated locally by logics-manager.
