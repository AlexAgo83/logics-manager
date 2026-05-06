# Changelog (`2.0.4 -> 2.0.5`)

Release `2.0.5` sharpens the CLI surface, finishes the legacy runtime cleanup, and fixes the last CI mismatches around workflow-controller mocks.

## Why `2.0.5`

- The CLI help output is now easier to scan, and the command tree is more explicit for operators.
- The workflow manager gained a native listing command for still-active docs.
- Legacy `logics/skills` and `cdx-logics-kit` compatibility surfaces were removed from the active runtime path.
- CI still needed one final mock alignment after the runtime rename.

## Highlights

- Added `logics-manager flow list` to enumerate active workflow docs.
- Added structured and colored CLI help output across the main command tree.
- Removed the remaining legacy runtime compatibility shim from the active controller path.
- Fixed the workflow-controller Vitest mocks so the runtime update command export matches production code.

## What Changed

### CLI and Workflow UX

- Expanded the CLI help screens for the root command and the major subcommands.
- Added colorized help rendering with terminal-aware output controls.
- Introduced `flow list` to inspect open requests, backlog items, and tasks without digging through the corpus manually.

### Legacy Runtime Cleanup

- Removed the remaining active references to `logics/skills` and `cdx-logics-kit` compatibility paths.
- Kept the bundled Logics runtime path as the default update route for the controller and bootstrap flows.
- Preserved the migration-related doc history while converging the active runtime behavior.

### CI and Test Fixes

- Updated the Python CLI regression tests to match the current help/version contract.
- Fixed the Vitest mock for the runtime update command export used by workflow-controller coverage.
- Kept the supported CI validation green on both Ubuntu and Windows.

## Upgrade Notes

- `logics-manager --help` now prints a richer summary than the raw argparse help.
- `logics-manager flow list` is the new way to inspect active docs in the workflow corpus.
- If you were relying on legacy runtime compatibility text in tests or scripts, update those expectations to the new `buildLogicsRuntimeUpdateCommand` naming.

## Validation and Regression Evidence

- `python3.11 -m pytest python_tests -q`
- `npm run lint:ts`
- `npm test -- tests/logicsCodexWorkflowController.test.ts tests/logicsProviderUtils.test.ts tests/logicsViewProvider-bootstrap-and-startup.test.ts tests/logicsViewProvider-runtime-and-diagnostics.test.ts tests/logicsViewProvider-kit-update-and-migration.test.ts`

