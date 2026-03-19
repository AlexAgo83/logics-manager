# Changelog (`1.10.7 -> 1.10.8`)

## Major Highlights

- Added prerequisite-aware environment diagnostics and recovery guidance so bootstrap and workflow actions fail earlier with actionable Windows-safe messaging.
- Normalized packaging and release validation around cross-platform npm and VSIX flows, with Windows CI and release gates now part of the supported contract.
- Refreshed the bundled Logics kit and operator docs for Windows-safe command paths, partial-bootstrap recovery coverage, and a finish-task verification fix in the flow manager.

## Version 1.10.8

### Environment checks and guarded workflow actions

- Added `Logics: Check Environment` so users can see whether the workspace is currently in read-only, workflow-capable, or bootstrap-capable mode.
- Hardened bootstrap, create, promote, and fix flows with prerequisite-aware recovery messages for missing Git, missing Python, or incomplete Logics kit state.
- Kept the extension usable in navigation/read-only scenarios even when workflow prerequisites are missing.

### Cross-platform packaging and release validation

- Normalized repository scripts and VSIX install/package flows so the documented commands work across Windows, macOS, and Linux shells.
- Added Windows CI and release validation lanes alongside the existing Ubuntu path, including smoke checks, Logics linting, and VSIX packaging validation.
- Kept line-ending handling explicit through repository attributes and release documentation instead of relying on shell-specific behavior.

### Bundled kit and documentation

- Updated the bundled Logics kit to `1.0.4`, including Windows-safe launcher guidance, temp-path-agnostic maintainer docs, and explicit labeling for platform-specific helpers.
- Added regression coverage for self-healing workflow directories and fixed the flow-manager finish-task verification path so Mermaid signature refs do not create false missing-link errors.
- Corrected the documented extension compatibility baseline so it matches the released bundled kit line.

### Validation

- `npm run ci:check`
- `npm run release:changelog:validate`
- `npm run package`
