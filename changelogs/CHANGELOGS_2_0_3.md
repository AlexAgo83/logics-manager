# Changelog (`2.0.2 -> 2.0.3`)

Release `2.0.3` removes the last repo-local assumptions around Claude runtime publication and keeps the bootstrap path aligned with a content-only client checkout.

## Why `2.0.3`

- The Claude runtime path still treated the repo checkout as the publication source, even though the client repo should not carry `logics/skills`.
- Bootstrap and diagnostics needed to agree on a global-home Claude runtime model instead of a repo-local bridge model.
- The release exists to keep the client repository free of `logics/skills` while preserving Claude runtime availability through global artifacts.

## Highlights

- Moved Claude runtime publication to the global Claude home instead of the repo checkout.
- Reworked environment checks to read Claude runtime health from the global manifest.
- Removed the last bootstrap and diagnostics assumptions that required repo-local Claude bridge files.

## What Changed

### Claude Runtime Publication

- `repairClaudeBridgeFiles(root)` now writes Claude runtime bridge artifacts to the global Claude home.
- `publishClaudeGlobalKit(root)` now resolves health from the global manifest instead of repo-local skill files.
- Launcher and diagnostics logic now treat the global Claude runtime as the authoritative source.

### Bootstrap and Diagnostics

- Bootstrap convergence continues to ignore root-level config files and focuses on the `logics/` corpus.
- `Repair Logics setup on this branch` should no longer be suggested for content-only repositories after bootstrap.
- Claude-related environment labels were updated to reflect the global runtime model.

### Release Metadata

- Bumped the extension, Python package, npm package, and lockfile version surfaces to `2.0.3`.
- Updated the README version badge so the documented release target matches the repo version.

## Upgrade Notes

- If you were relying on repo-local Claude bridge files, the runtime now publishes into the global Claude home.
- The client repo remains free of `logics/skills`; Claude support is now backed by generated global artifacts.

## Validation and Regression Evidence

- `npm test`
- `npm run lint:ts`
- `npm run package`
