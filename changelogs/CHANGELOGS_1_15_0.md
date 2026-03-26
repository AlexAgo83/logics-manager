# Changelog (`1.14.0 -> 1.15.0`)

## Major Highlights

- Added proactive user feedback around hybrid-assist calls so long-running Ollama-backed actions surface in-progress state and backend-aware outcome notifications directly in VS Code.
- Hardened the hybrid runtime contract between the plugin and the bundled Logics kit so local Ollama runs stop echoing schema prompts, preserve bounded diagnostics on fallback, and accept normalized confidence values.
- Tightened bootstrap convergence around the shared global Codex kit so the plugin no longer reports bootstrap completion before the global publication path is actually ready.
- Advanced the bundled `logics/skills` submodule to the published `v1.4.1` kit line so the plugin release ships the latest hybrid runtime fixes and global-kit readiness behavior.

## Version 1.15.0

### Hybrid assist execution feedback in VS Code

- Added progress UI for plugin-driven hybrid assist actions while backend work is still running.
- Added backend-aware success and failure notifications so operators can see whether a result came from Ollama, Codex, or a degraded fallback path.
- Kept the TypeScript layer thin by continuing to call the shared `logics.py flow assist` runtime instead of duplicating orchestration logic in the extension host.

### Global kit bootstrap readiness

- Tightened bootstrap behavior so a healthy repo-local kit now attempts to converge all the way to a ready global publication before reporting success.
- Improved partial-failure and blocked-state messaging when the repo-local source is healthy but the shared global kit is missing, stale, or not yet publishable.
- Kept environment and migration surfaces aligned with the shared-kit publication model under `~/.codex`.

### Bundled hybrid runtime hardening

- Bundled the `v1.4.1` kit line with improved Ollama prompt framing, normalized local confidence handling, and bounded diagnostics when local payload validation fails.
- Added regression coverage around bootstrap publication outcomes, hybrid assist notifications, and semantic local-runtime validation.
- Preserved the plugin/runtime boundary while shipping a more reliable local-first hybrid execution path.

## Validation

- `npm run release:changelog:validate`
- `npm run compile`
- `npm run lint`
- `npm run test`
- `npm run test:smoke`
- `npm run lint:logics`
- `npm run package`
