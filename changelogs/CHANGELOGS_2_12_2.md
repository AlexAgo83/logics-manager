# Logics Manager 2.12.2

## Improvements

- Added GitLab remote support to the local viewer so repository actions can open project remotes outside GitHub.
- Added an embedded project folder picker and bootstrap prompt so the viewer can recover when a selected folder cannot be opened directly.
- Added viewer server restart controls and getting-started guidance for first-run or recovery flows.
- Enriched viewer recent activity with timestamped Git history and commit events.
- Added a bootstrap-managed local assistant bridge through `LOGICS.md`, `AGENTS.md`, and `.gitignore` refresh handling, with release, lifecycle, viewer, MCP, and document hygiene guidance refreshed from the CLI.
- Kept the viewer bootstrap action available for already-bootstrapped projects so generated Logics assistant bridge files can be refreshed without showing the first-run prompt.

## Fixes

- Fixed long-running CLI wrapper and viewer shutdown handling so repeated `SIGINT` delivery does not interrupt an already-running shutdown path.
- Fixed viewer restart execution and LAN pairing reset behavior.
- Fixed viewer modal width overflow and terminal rename handling.
- Made CDX session toggles update optimistically while preserving project-scoped viewer activity.

## Validation

- `node scripts/ci-check.mjs`
- `rtk npm test -- --run tests/logicsManagerNpmWrapper.test.ts`
- `rtk python3 -m pytest tests/python/test_viewer_cli.py -q`
