# Changelog (`1.10.4 -> 1.10.5`)

## Major Highlights

- Added a shared relationship reasoning layer that powers a new Codex context pack, explicit attention explanations, and a bounded dependency map in the details panel.
- Completed a second modularization pass across the extension host, webview, and Logics workflow helpers to reduce oversized responsibility hubs without changing behavior.
- Kept the release pipeline green with compile, lint, tests, smoke checks, VSIX packaging, and curated changelog resolution aligned to `1.10.5`.

## Version 1.10.5

### Codex context pack and dependency insight

- Added a preview-first `Context pack for Codex` flow so the current item, linked workflow neighbors, companion docs, and open questions can be reviewed before injection.
- Added explicit `Attention Explain` reasons with remediation guidance instead of relying on opaque attention-only signals.
- Added a bounded `Dependency map` in the details panel so related requests, backlog items, tasks, companion docs, and specs can be explored from the selected item.

### Modularization and code ownership

- Extracted relationship and graph logic into `media/logicsModel.js` and reused it from selectors and details rendering instead of duplicating traversal behavior.
- Split remaining host-side responsibilities out of `src/logicsViewProvider.ts` into focused modules for document actions and webview HTML generation.
- Split remaining webview DOM wiring out of `media/main.js` into `media/mainInteractions.js` while preserving a readable orchestration entrypoint.

### Packaging and manifest

- Added the missing view-level `icon` declaration for `logics.orchestrator` in `package.json` so the VS Code extension manifest satisfies the current schema checks in the editor and packaging flow.

### Validation

- `npm run ci:check`
- `npm run release:changelog:validate`
