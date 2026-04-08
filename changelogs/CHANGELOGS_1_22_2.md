# Changelog (`1.22.1 -> 1.22.2`)

## Major Highlights

- `Update Logics Kit` now handles repositories where `logics/` is ignored or where the bundled kit cannot be refreshed through the usual submodule path, with clearer fallback behavior and stronger operator guidance.
- The extension ships a larger plugin regression net around bootstrap, kit update, runtime diagnostics, provider behavior, and Windows-specific Python execution paths.
- The bundled `logics/skills` kit is updated through `v1.11.0`, bringing the latest flow-manager modularization wave, coverage work, and dispatch/export fixes into the extension.
- Contributor-facing repository guidance now includes RTK and code-review-graph instructions so Codex- and Claude-style operator flows have a clearer documented baseline.

## Kit Update Fallbacks And Repo Detection

- Improved kit-update behavior when repositories keep `logics/` out of Git tracking, so the extension can explain what is happening and choose a safer fallback instead of failing opaquely.
- Added planning and delivery coverage around adaptive kit update strategy, direct-clone fallback, and gitignore-aware detection for standalone clone versus submodule installs.
- Tightened bootstrap and migration messaging so recovery paths are more explicit when the canonical kit layout is missing or partially managed.

## Test Coverage And Structural Hardening

- Added dedicated plugin coverage reporting scripts for `src` and `media`, making it easier to track source coverage separately from webview/runtime coverage.
- Split several oversized extension and webview modules into smaller support files, reducing the concentration of bootstrap, orchestration, and interaction logic in single files.
- Expanded regression coverage with targeted suites for bootstrap/startup, kit update and migration, runtime diagnostics, provider utilities, workflow controller behavior, and webview state handling.

## Windows And Runtime Reliability

- Fixed the Windows coverage command so coverage runs are reliable in CI and local validation.
- Fixed the Python runtime behavior test on Windows.
- Improved provider and runtime support code alongside stronger tests to catch platform-sensitive failures earlier.

## Bundled Kit And Contributor Workflow Updates

- Bumped the bundled `logics/skills` submodule through the `v1.10.1` and `v1.11.0` release line, including the latest coverage work, modularization, RTK configuration, dispatch entrypoint fix, and helper export fix.
- Added repository-level `AGENTS.md`, `RTK.md`, and `CODE_REVIEW_GRAPH.md` guidance so day-to-day maintenance flows are easier to execute consistently.

## Validation

- `npm run lint:ts`
- `npm run test`
- `npm run test:lifecycle`
- `npm run test:coverage`
- `npm run release:changelog:validate`
