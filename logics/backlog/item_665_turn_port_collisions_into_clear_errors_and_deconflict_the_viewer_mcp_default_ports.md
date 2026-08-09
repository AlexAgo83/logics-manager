## item_665_turn_port_collisions_into_clear_errors_and_deconflict_the_viewer_mcp_default_ports - Turn port collisions into clear errors, and deconflict the viewer/MCP default ports
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Collision handling
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 15:17:57

# Problem
- A bind collision on the viewer's or MCP's default port today raises an uncaught OSError with a raw traceback - `LogicsViewerServer.__init__` (viewer.py:1591) and `serve_http()`'s server construction (mcp.py:1736) sit outside any try/except that would produce a clean message.
- The viewer and MCP serve-http/tunnel/connect all default to the same port, 8765, chosen independently for two unrelated tools - running both against the same repo with default flags collides by accident, not by any deliberate shared-port design.

# Scope
- In:
  - Wrap the bind call in both the viewer (viewer.py) and MCP serve-http (mcp.py) in a try/except that catches the address-in-use case and prints a clear, actionable message (which port, which command likely holds it, how to pick another with --port).
  - Give MCP's HTTP family (serve-http/tunnel/connect) its own default port distinct from the viewer's 8765, so the two can run concurrently against the same repo with no flags.
  - Update docs/cli.md's existing --port 0 advice to also mention the new distinct defaults.
- Out:
  - Any registry or reuse-detection; this item only makes an already-failing collision fail clearly, and removes the accidental shared default. Actual reuse detection is the next slice.
  - Changing the viewer's own default port.

# Acceptance criteria
- AC1: A bind collision on the viewer's or MCP serve-http's default port produces a clear, actionable error identifying which default port conflicted and how to resolve it, instead of a raw Python traceback.
- AC2: The viewer and `mcp serve-http`/`mcp tunnel`/`mcp connect` no longer share the same default port; each family has its own default, so both can run concurrently against the same repo without a naming collision.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A bind collision on the viewer's or MCP serve-http's default port produces a clear, actionable error identifying which default port conflicted and how to resolve it, instead of a raw Python traceback.
- request-AC2 -> This backlog slice. Proof: AC2: The viewer and `mcp serve-http`/`mcp tunnel`/`mcp connect` no longer share the same default port; each family has its own default, so both can run concurrently against the same repo without a naming collision.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_070_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Architecture decision(s): (none yet)
- Request: `req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Primary task(s): `task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle`

# AI Context
- Summary: Turn port collisions into clear errors, and deconflict the viewer/MCP default ports
- Keywords: scaffolded-backlog, turn port collisions into clear errors, and deconflict the viewer/mcp default ports, implementation-ready
- Use when: Implementing the scaffolded slice for Turn port collisions into clear errors, and deconflict the viewer/MCP default ports.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a shipped defect (raw traceback on collision) affecting anyone who runs the viewer and MCP together today
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle`

# Notes
- Task `task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle` was finished via `logics-manager flow finish task` on 2026-08-09.
