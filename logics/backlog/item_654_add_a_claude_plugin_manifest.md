## item_654_add_a_claude_plugin_manifest - Add a .claude-plugin manifest
> From version: 2.21.1
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 67%
> Complexity: Medium
> Theme: Plugin packaging
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The repository already bundles skills (skill_assets/) and an MCP server (`logics-manager mcp serve`), but has no .claude-plugin/plugin.json, so it cannot be installed as a Claude Code plugin through the standard marketplace/plugin flow.
- Without a manifest, the only install path is the bespoke `skills install --all-profiles` CLI command, which a plugin manifest would make redundant for Claude Code users specifically.

# Scope
- In:
  - A .claude-plugin/plugin.json declaring the plugin name, version (sourced from VERSION), the bundled skills directory, and an MCP server entry pointing at `logics-manager mcp serve`.
  - A marketplace.json if the plugin.json schema requires one for local/manual installation; otherwise document why it is skipped.
  - A manual or scripted install check demonstrating the plugin loads with all skills and the MCP server visible in a Claude Code session.
  - Documentation update noting the plugin install path alongside the existing `skills install` path, without deprecating the latter (Codex has no plugin manifest concept).
- Out:
  - Publishing to a public plugin marketplace listing.
  - Changing the MCP server's transport, tools, or auth.
  - A Codex-specific plugin manifest; no such mechanism exists to target.

# Acceptance criteria
- AC1: .claude-plugin/plugin.json exists, is valid JSON, and declares all bundled skills including the four new ones from this request.
- AC2: The manifest declares the MCP server entry point (`logics-manager mcp serve`).
- AC3: A documented install check confirms the plugin loads with all skills and the MCP server available in a Claude Code session.
- AC4: The existing `skills install --all-profiles` CLI path is unchanged and still documented for Codex.
- AC5: The plugin version is sourced from VERSION rather than hardcoded a second time.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: .claude-plugin/plugin.json exists, is valid JSON, and declares all bundled skills including the four new ones from this request.
- request-AC7 -> This backlog slice. Proof: AC2: The manifest declares the MCP server entry point (`logics-manager mcp serve`).
- request-AC8 -> This backlog slice. Proof: AC3: A documented install check confirms the plugin loads with all skills and the MCP server available in a Claude Code session.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_066_full_lifecycle_skill_coverage_packaged_as_a_claude_code_plugin`
- Architecture decision(s): (none yet)
- Request: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- Primary task(s): `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`

# AI Context
- Summary: Add a .claude-plugin manifest
- Keywords: scaffolded-backlog, add a .claude-plugin manifest, implementation-ready
- Use when: Implementing the scaffolded slice for Add a .claude-plugin manifest.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - unlocks the standard Claude Code plugin install flow for everything else in this request
- Rationale: Set by scaffold input or defaulted for grooming.
