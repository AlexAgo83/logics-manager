# Changelog (`2.3.3 -> 2.4.0`)

Release `2.4.0` makes the local Logics viewer a more complete operator surface for day-to-day corpus work, with actionable insights, reliable activity history, Git status visibility, and browser smoke coverage in CI.

## Highlights

- Added actionable local viewer insights that can apply existing filters, open Health, or open safe Logics document previews.
- Added reliable local activity snapshots so status-change markers are based on a previous known document state rather than first-load noise.
- Added a read-only Git status screen to the local viewer.
- Added deterministic local viewer visual smoke coverage across desktop, tablet, and mobile viewports.
- Closed the viewer delivery workflow corpus and refreshed the generated Logics index.

## What Changed

### Local Viewer Insights

- Reworked Insights sections to render compact document rows instead of dense comma-separated lists.
- Added bounded reveal controls for long Insights lists while preserving sort order.
- Added operator actions that either apply a matching local viewer filter, open Health, or open a relevant document preview.
- Preserved normal viewer filtering behavior when users clear insight-derived filters.

### Activity History

- Added a minimal local activity snapshot keyed by repo-relative document path.
- Marked `Status changed` only when a previous known status differs from the refreshed status.
- Kept first load and newly discovered documents as general updates.
- Bounded local activity history in `localStorage` and added a clear-history control that does not erase unrelated viewer preferences.

### Git Status

- Added a read-only `/api/git-status` backend endpoint using only local, non-mutating Git commands.
- Added the `Git` topbar button between `Refresh` and `Insights`.
- Rendered branch, tracking branch, ahead/behind counts, clean/dirty state, file-change counts, grouped changed files, and latest commit summary.
- Added safe messages for Git-unavailable, non-worktree, command-failure, and stale-viewer-server states.
- Sanitized Git ref display so credentials embedded in remote-style strings are not shown.

### Validation And CI

- Added `npm run test:viewer-smoke` for a local viewer browser smoke test.
- Integrated the viewer smoke into `scripts/ci-check.mjs`.
- Captured desktop, tablet, and mobile smoke artifacts under `artifacts/local-viewer-smoke/` when the smoke is run locally.
- Added Python and browser-host regression coverage for Git payload collection, topbar placement, stale endpoint handling, insight actions, and activity snapshots.

## Upgrade Notes

- If the `Git` button appears but `/api/git-status` returns `404`, restart the local viewer so the running backend matches the updated frontend assets.
- The local activity clear control only removes viewer activity snapshot/history data; filters, selection, and unrelated viewer preferences remain intact.

## Validation and Regression Evidence

- `python3 -m logics_manager lint --require-status`
- `python3 -m logics_manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`
- `python3 -m pytest tests/python/test_logics_manager_cli.py -q`
- `npm run test -- tests/viewer.browser-host.test.ts`
- `npm run test:viewer-smoke`
- `node scripts/ci-check.mjs`
