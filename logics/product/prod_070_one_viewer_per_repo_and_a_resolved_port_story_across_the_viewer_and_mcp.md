## prod_070_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp - One viewer per repo, and a resolved port story across the viewer and MCP
> Date: 2026-08-09
> Status: Proposed
> Related request: `req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
> Related backlog: `item_665_turn_port_collisions_into_clear_errors_and_deconflict_the_viewer_mcp_default_ports`, `item_666_add_a_per_repo_viewer_registry_so_any_surface_reuses_a_live_instance`, `item_667_harden_vs_code_deactivation_and_reconcile_prod_020_s_port_selection_claim`
> Related task: `task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Replace three independent, uncoordinated server lifecycles - the CLI viewer, one viewer per VS Code window, and the MCP HTTP server - none of which detect an existing instance and two of which share a default port by accident - with a per-repo registry the CLI and every VS Code window consult before spawning, and a port assignment that no longer collides across tool families by default.

# Goals
- One live viewer per repo root, reused across CLI invocations and VS Code windows, not duplicated.
- A stale or dead registry entry never blocks a fresh start.
- A port collision produces a clear, actionable message, never a raw traceback.
- The viewer and the MCP HTTP server never collide on a shared default port.
- Product docs describe what the code actually does, not an aspirational port-selection story that was never implemented.

# Non-goals
- Extending the same reuse-registry to `mcp serve-http`/`mcp tunnel`; their exposed-tool profile (read-only/curated/full) legitimately varies per invocation, unlike the viewer, so multiple concurrent instances remain a valid use.
- Force-killing orphaned processes; a live-but-orphaned viewer becomes reusable once discoverable via the registry, not something to hunt down and kill.
- A GUI dashboard of running servers.
- Changing the CLI viewer's default port away from 8765; only the collision behavior and the accidental viewer/MCP clash are addressed.

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
- Product back-reference: `req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Task back-reference: `task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle`
