## item_666_add_a_per_repo_viewer_registry_so_any_surface_reuses_a_live_instance - Add a per-repo viewer registry so any surface reuses a live instance
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Cross-process reuse
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- No process family detects whether a viewer is already serving a given repo root. Two VS Code windows on the same repo spawn two independent processes (each on its own OS-assigned port, since `--port 0` is used per window, viewerServerManager.ts:58-60); a manual `logics-manager view` from a terminal is equally blind to either.
- There is no shared registry, lock file, or pidfile anywhere in the codebase for this purpose - the only existing lock (release.py:335) guards an unrelated file.

# Scope
- In:
  - A small per-repo registry recording the live viewer's repo root, port, and a liveness-checkable identifier (not a bare pid, which can be reused by an unrelated process) - stored alongside the existing viewer state dir (`_viewer_state_dir()`, viewer.py:2754, which already holds devices.json and tls/ material) rather than inventing a new location.
  - Before binding, `logics-manager view` and `ViewerServerManager.getOrStart()` both consult the registry for the target repo root; if a live entry answers a health probe, reuse its URL instead of spawning.
  - If a registry entry exists but its server no longer answers, treat it as stale, replace it, and start fresh - never block a start because of a dead record.
  - A test that starts the manager (or the equivalent CLI path) twice against the same root, simulating two independent windows/invocations, and asserts the same port comes back both times.
- Out:
  - Applying the same registry/reuse pattern to MCP's HTTP server; its profile varies per invocation, so multiple concurrent instances for one repo remain legitimate - out of scope here.
  - Any active scan-and-kill of orphaned processes; discoverability via the registry is the fix, not termination.
  - A UI for browsing or managing registry entries.

# Acceptance criteria
- AC3: A per-repo registry lets any invocation - CLI `logics-manager view`, or a VS Code window's `ViewerServerManager.getOrStart()` - detect a live viewer already serving that exact repo root and reuse it (return its existing URL) instead of spawning a duplicate.
- AC4: A registry entry whose recorded server no longer responds to a liveness check is treated as stale and replaced, rather than blocking a fresh start or being trusted blindly.
- AC5: Opening the same repo from two independent VS Code windows results in one shared viewer server, not two - verified by a test that starts the manager twice against the same root (simulating two windows) and gets back the same port both times.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: A per-repo registry lets any invocation - CLI `logics-manager view`, or a VS Code window's `ViewerServerManager.getOrStart()` - detect a live viewer already serving that exact repo root and reuse it (return its existing URL) instead of spawning a duplicate.
- request-AC4 -> This backlog slice. Proof: AC4: A registry entry whose recorded server no longer responds to a liveness check is treated as stale and replaced, rather than blocking a fresh start or being trusted blindly.
- request-AC5 -> This backlog slice. Proof: AC5: Opening the same repo from two independent VS Code windows results in one shared viewer server, not two - verified by a test that starts the manager twice against the same root (simulating two windows) and gets back the same port both times.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_070_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Architecture decision(s): (none yet)
- Request: `req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Primary task(s): `task_319_orchestrate_coordinated_viewer_mcp_server_lifecycle`

# AI Context
- Summary: Add a per-repo viewer registry so any surface reuses a live instance
- Keywords: scaffolded-backlog, add a per-repo viewer registry so any surface reuses a live instance, implementation-ready
- Use when: Implementing the scaffolded slice for Add a per-repo viewer registry so any surface reuses a live instance.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - this is the actual fix for "several VS Code windows, several servers"
- Rationale: Set by scaffold input or defaulted for grooming.
