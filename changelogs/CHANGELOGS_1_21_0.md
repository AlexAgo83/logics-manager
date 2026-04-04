# Changelog (`1.20.0 -> 1.21.0`)

## Major Highlights

- The plugin now exposes the shared kit release workflow directly in the Tools panel with dedicated `Prepare Release` and `Publish Release` actions.
- `Publish Release` now warns when the kit reports that a local `release` branch exists but is behind the current branch before asking for final confirmation.
- Hybrid assist surfaces were expanded and typed more rigorously across the VS Code client, including payload parsing, controller wiring, and release-aware UI messaging.
- The bundled Logics kit submodule was updated to `v1.9.0`.

## Release workflow from the plugin

- Added `Prepare Release` and `Publish Release` actions to the Assist section of the Tools panel.
- `Prepare Release` now routes through the shared kit prep flow so changelog generation, README badge refresh, and prep commits can stay in the kit runtime.
- `Publish Release` now uses the shared publish flow end to end instead of leaving release publication as a shell-only task.
- When the publish payload reports a stale local `release` branch, the plugin surfaces a non-blocking warning before the publish confirmation.

## Hybrid assist client improvements

- Expanded `HybridPublishReleaseResult` typing to include `release_branch` metadata and safer payload parsing in the extension.
- Refined hybrid-assist controller completion messaging around release readiness and publish outcomes.
- Added or tightened runtime launcher, provider insights, and hybrid assist UI wiring so the plugin remains a thin client over the shared kit runtime.

## Bundled kit update

- Updated the `logics/skills` submodule to the released kit version `v1.9.0`.
- The bundled kit now includes the split `prepare-release` / `publish-release` flow and stale-`release`-branch guidance used by the plugin.

## Validation

- `npm run lint:ts`
- `npm run test`
- `npm run release:changelog:validate`
