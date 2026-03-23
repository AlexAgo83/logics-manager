# Changelog (`1.10.8 -> 1.11.0`)

## Major Highlights

- Added first-class Codex workspace overlay support across the extension, including repository diagnostics, overlay-aware bootstrap readiness, and multi-project runtime guidance.
- Turned common overlay remediation paths into direct VS Code actions, so the plugin can update the canonical Logics kit, sync overlays, and propose startup repair prompts without forcing operators into manual shell flows.
- Updated terminal Codex handoff to respect the detected Python launcher and added direct terminal launch from the extension instead of relying only on copied commands.

## Version 1.11.0

### Codex overlay-aware plugin runtime

- Added overlay-aware environment inspection so `Logics: Check Environment` now reports repo-local readiness separately from Codex runtime overlay readiness.
- Surfaced overlay issues, stale states, and missing-manager conditions directly in extension diagnostics and post-bootstrap messaging.
- Adapted plugin and bootstrap flows to the new multi-project `CODEX_HOME` overlay model without changing `logics/skills` as the repository source of truth.

### Direct remediation and startup guidance

- Added supported plugin actions to update the canonical `logics/skills` submodule when the repository is safe for automated remediation.
- Added direct overlay sync from the plugin once the bundled kit contains `logics_codex_workspace.py`, with guarded fallbacks for unsupported repository layouts.
- Added startup-time VS Code prompts that can proactively offer `Update Logics Kit` or `Sync Codex Overlay` once per unresolved repository state.

### Terminal handoff and Python launcher correctness

- Fixed overlay sync and run commands shown by the plugin so they use the detected launcher such as `python3`, `python`, or `py -3` instead of assuming `python` exists.
- Added direct `Launch Codex in Terminal` handoff when the overlay runtime is healthy, while keeping clipboard fallback for manual reuse.
- Added regression coverage for launcher-sensitive overlay commands and the new terminal-handoff path.

### Bundled Logics kit and workflow maintenance

- Updated the bundled Logics kit baseline to `v1.1.0`, bringing Codex workspace overlay management, cross-platform publication fallback handling, and overlay lifecycle validation into the shipped kit.
- Added kit support for Mermaid signature refresh and stronger task-wave governance so commit and documentation checkpoints remain part of the delivered workflow contract.
- Refreshed plugin documentation to point to the canonical `cdx-logics-kit` repository and explain the new overlay remediation model.

### Validation

- `npm run lint`
- `npm run test`
- `npm run release:changelog:validate`
- `npm run package`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
- `python3 logics/skills/logics-flow-manager/scripts/workflow_audit.py --group-by-doc`
