# Changelog (`1.12.1 -> 1.13.0`)

## Major Highlights

- Added the shared hybrid assist runtime across the bundled Logics kit and exposed its first bounded operator actions directly in the plugin: `Check Hybrid Runtime`, `Commit All Changes`, `Suggest Next Step`, and `Summarize Validation`.
- Added cross-agent and cross-platform groundwork so the hybrid runtime can stay compatible with Codex, Claude-oriented bridges, Ollama local backends, and Windows-safe command surfaces.
- Polished the plugin UI around the new assist surfaces with icon-led toolbar controls, improved stacked activity behavior, more precise recent `Updated` timestamps, and agent-neutral `Context pack for AI assistants` wording.
- Advanced the bundled `logics/skills` submodule to the `1.3.0` release line so the extension now ships the deterministic dispatcher, hybrid assist portfolio, and curated DeepSeek/Qwen local model profile support.

## Version 1.13.0

### Hybrid assist runtime and plugin exposure

- Exposed shared hybrid-assist runtime status in environment checks and the Tools menu without reimplementing backend policy in TypeScript.
- Added direct plugin entrypoints for bounded assist flows such as runtime health checks, commit planning, next-step suggestion, and validation summaries.
- Kept the plugin as a thin client over `python logics/skills/logics.py flow assist ...`, with backend provenance, fallback logic, audit, and degraded-mode policy still owned by the kit.

### Hybrid runtime governance, portability, and bundled kit upgrade

- Bundled the new hybrid assist governance/runtime portfolio from the Logics kit, including deterministic dispatch surfaces, shared assist flows, repo-native config, incremental indexing, and transactional mutation safeguards.
- Added curated local model profile support for both `deepseek-coder` and `qwen-coder`, and aligned the plugin/runtime stack with the new `1.3.0` kit release.
- Preserved Windows-safe launchers and explicit Claude/Codex boundary handling in the shared runtime contract and environment diagnostics.

### Plugin UX polish

- In stacked vertical layout, opening `Activity` now collapses the bottom details panel to avoid competing for the same viewport slice.
- Replaced visible `Activity`, `Attention`, and view-mode labels with accessible icon-led controls while preserving tooltips, ARIA labels, and active-state clarity.
- Made recent `Updated` values more precise under 24 hours and renamed the shared handoff surface to `Context pack for AI assistants`, while keeping Codex-specific injection actions explicitly labeled as such.

## Validation

- `npm run release:changelog:validate`
- `npm run lint`
- `npm run test`
- `npm run test:smoke`
- `npm run lint:logics`
- `npm run package:ci`
