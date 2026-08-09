## req_322_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp - One viewer per repo, and a resolved port story across the viewer and MCP
> From version: 2.21.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Server lifecycle coordination
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 14:26:23

# Needs
- Detect a viewer already running for a given repo root - from any surface (CLI, or any VS Code window) - and reuse it instead of spawning a duplicate.
- Turn a port-bind collision into a clear, actionable error, instead of a raw Python traceback.
- Stop the viewer and MCP's HTTP server from sharing the same default port by accident, so both can run concurrently against the same repo.
- Reconcile `prod_020`'s existing "available localhost port" and "clear shutdown and port-selection story" language with what the code actually does today.
- Make VS Code's extension deactivation explicitly stop tracked viewer servers, not rely solely on subscription disposal.

# Context
- Audited directly, file:line cited: three independent process families exist for the same repo - the standalone CLI viewer (`logics-manager view`, logics_manager/viewer.py), one viewer server per VS Code window (`ViewerServerManager`, clients/vscode/src/viewerServerManager.ts), and the MCP HTTP server (`mcp serve-http`/`mcp tunnel`, logics_manager/mcp.py). None of the three detects whether an equivalent process is already running for the same repo. There is no shared registry, lock file, or pidfile anywhere in the codebase - the only real lock in the repo (`fcntl.flock` in logics_manager/release.py:335) guards a release-state file, unrelated to any server.
- The CLI viewer defaults to a FIXED port 8765 (viewer.py:3018, viewer.py:2636), not an OS-assigned one. `mcp serve-http`/`mcp tunnel`/`mcp connect` also default to 8765 (mcp.py:1734, 1940, 1962, 1971) - the same number, chosen independently for two unrelated tools. Running the viewer and an MCP HTTP server against the same repo with default flags collides.
- A bind collision on either family raises an uncaught OSError with a raw traceback: `LogicsViewerServer.__init__` (viewer.py:1591) and `serve_http()`'s `ThreadingHTTPServer(...)` construction (mcp.py:1736) both sit outside any try/except that would produce a clean message. docs/cli.md:526 only advises `--port 0` as a manual workaround; it is not the default and a collision is not diagnosed for the user.
- VS Code's `ViewerServerManager` (viewerServerManager.ts:30, 41-44) dedupes by repo root, but only within one instance's in-memory `servers` array - and that instance is a per-window singleton, created once in `activate()` (extension.ts:69, logicsViewProvider.ts:110). Two VS Code windows on the same repo therefore spawn two independent viewer processes, each on its own OS-assigned port (`--port 0`, viewerServerManager.ts:58-60), each unaware of the other.
- Cleanup on graceful shutdown works: `viewer.py:3194-3253` installs real SIGINT/SIGTERM handling with a force-exit watchdog, and VS Code's `Disposable` (logicsViewProvider.ts:111) calls `stopAll()` on extension-host disposal. But `deactivate()` itself (extension.ts:95) is empty, and on a force-quit, extension-host crash, or SIGKILL, the disposable never runs - the spawned `logics-manager view` child (spawned without `detached`, viewerServerManager.ts:64-73) survives as an orphan, still bound to its port, invisible to any later 'Stop'/'Restart Viewer' command (extension.ts:77-83), which only ever inspects the current window's own in-memory list.
- `prod_020_local_web_viewer_for_cli_driven_logics_work.md` already states the CLI "starts a local server on an available localhost port" and lists "a clear shutdown and port-selection story" as in-scope - neither matches the actual fixed-8765-plus-traceback-on-collision behavior found in the code. The shutdown half of that sentence is genuinely delivered; the port-selection half is not.
- The registry itself must not introduce the exact race it is meant to close: two processes starting near-simultaneously for the same repo root could both read an empty registry, both decide to spawn, and both write their own entry - the second write silently orphaning the first, the same failure mode as today. Claiming a repo root's registry slot needs to be atomic, not read-then-write. `fcntl.flock` already exists in this codebase for exactly this kind of exclusive-claim problem (release.py:335, guarding a release-state file) and is the primitive to reuse here, not a new one to invent.

# Acceptance criteria
- AC1: A bind collision on the viewer's or MCP serve-http's default port produces a clear, actionable error identifying which default port conflicted and how to resolve it, instead of a raw Python traceback.
- AC2: The viewer and `mcp serve-http`/`mcp tunnel`/`mcp connect` no longer share the same default port; each family has its own default, so both can run concurrently against the same repo without a naming collision.
- AC3: A per-repo registry lets any invocation - CLI `logics-manager view`, or a VS Code window's `ViewerServerManager.getOrStart()` - detect a live viewer already serving that exact repo root and reuse it (return its existing URL) instead of spawning a duplicate.
- AC4: A registry entry whose recorded server no longer responds to a liveness check is treated as stale and replaced, rather than blocking a fresh start or being trusted blindly.
- AC5: Opening the same repo from two independent VS Code windows results in one shared viewer server, not two - verified by a test that starts the manager twice against the same root (simulating two windows) and gets back the same port both times.
- AC5b: Claiming a repo root's registry slot is atomic (using the same `fcntl.flock` exclusive-lock primitive already used in release.py), so two processes starting within the same instant for the same repo root cannot both spawn and silently overwrite each other's registry entry - covered by a test that starts two claims concurrently and asserts exactly one server wins the slot.
- AC6: `deactivate()` in the VS Code extension explicitly stops every tracked viewer server, not only via subscription disposal - matching the intent already stated in `item_527`.
- AC7: `prod_020`'s "available localhost port" and "port-selection story" language is reconciled with the actual behavior after this request - either the doc is corrected to describe the real default-plus-fallback behavior, or the behavior is changed to match what was already promised; whichever direction, the two stop contradicting each other.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_070_one_viewer_per_repo_and_a_resolved_port_story_across_the_viewer_and_mcp`
- Architecture decision(s): (none yet)

# References

# AI Context
- Summary: One viewer per repo, and a resolved port story across the viewer and MCP
- Keywords: request-chain-scaffold, one viewer per repo, and a resolved port story across the viewer and mcp, development-ready
- Use when: You need to implement or review the scaffolded workflow for One viewer per repo, and a resolved port story across the viewer and MCP.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_665_turn_port_collisions_into_clear_errors_and_deconflict_the_viewer_mcp_default_ports`
- `item_666_add_a_per_repo_viewer_registry_so_any_surface_reuses_a_live_instance`
- `item_667_harden_vs_code_deactivation_and_reconcile_prod_020_s_port_selection_claim`
