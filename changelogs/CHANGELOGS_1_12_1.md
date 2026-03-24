# Changelog (`1.12.0 -> 1.12.1`)

## Major Highlights

- Added a direct `Launch Codex` action in the Tools menu so operators can start a terminal Codex session for the active repository without first running a separate overlay sync step by hand.
- Simplified board-card action badges by hiding noisy `Promote` and `Add docs` suggestions while preserving the companion-doc and health signals that still help triage.
- Updated the bundled `logics/skills` submodule beyond `v1.2.0` to include the skill-frontmatter fix for block-scalar descriptions, reducing breakage for shipped or newly authored skill metadata.
- Added the next runtime-scaling planning portfolio in Logics docs so the repository backlog, request, and task state stays aligned with the current kit direction.

## Version 1.12.1

### Codex launch and workflow UX

- Added `Tools > Launch Codex`, wired through the webview host API and extension provider.
- Launches terminal Codex immediately when the repository overlay is already healthy, or syncs the overlay first and then launches automatically.
- Added regression coverage for both the direct-launch and sync-then-launch paths.

### Board signal cleanup

- Removed `Promote` and `Add docs` suggested-action badges from delivery cards to keep board scanning focused on higher-signal health and companion-document context.
- Kept the existing companion badges (`PROD`, `ADR`, `SPEC`) and health badges unchanged.

### Bundled kit and planning alignment

- Advanced the bundled `logics/skills` submodule to include the post-`v1.2.0` fix for block-scalar YAML descriptions in `SKILL.md` frontmatter.
- Added the runtime-scaling planning portfolio documents for repo-native config, unified CLI routing, machine-readable outputs, incremental indexing, transactional bulk mutations, and slice-split governance.

## Validation

- `npm run release:changelog:validate`
- `npm run package:ci`
- `npm run test`
