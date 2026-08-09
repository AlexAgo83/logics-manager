## prod_066_full_lifecycle_skill_coverage_packaged_as_a_claude_code_plugin - Full-lifecycle skill coverage, packaged as a Claude Code plugin
> Date: 2026-08-09
> Status: Proposed
> Related request: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
> Related backlog: `item_649_add_the_lifecycle_ops_skill`, `item_650_add_the_roadmap_deliver_skill`, `item_651_add_the_closeout_repair_skill`, `item_652_add_the_project_health_skill`, `item_653_close_the_test_gap_on_existing_skills_and_generalize_the_skill_test_suite`, `item_654_add_a_claude_plugin_manifest`
> Related task: `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Extend logics-manager's bundled agent skills from the current create -> build -> review happy path to the full CLI lifecycle (lifecycle edge operations, roadmap-to-delivery, closeout troubleshooting, read-only diagnostics), and package the result as an installable Claude Code plugin so the existing skills and MCP server are discoverable through the standard plugin flow rather than only through the skills-install CLI command.

# Goals
- One skill per remaining lifecycle surface, matching the depth and format of the four existing skills.
- A clear, non-overlapping boundary between the new project-health skill and review-project.
- A working .claude-plugin manifest that exposes the bundled skills and the MCP server.
- Zero changes to the behavior of the four existing skills.

# Non-goals
- A skill for release, obsidian, fleet, or design tooling: those are occasional or human-driven, not agentic workflow steps.
- A skill for the viewer (`cdx view`): it is an interactive human surface, not a task an agent orchestrates.
- Publishing the plugin to a public marketplace listing; this covers the manifest and local installability only.
- Changing the MCP server's tool surface or transport.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `req_318_cover_the_remaining_logics_lifecycle_in_bundled_skills_and_package_as_a_claude_code_plugin`
- Task back-reference: `task_315_orchestrate_skill_coverage_expansion_and_claude_code_plugin_packaging`
