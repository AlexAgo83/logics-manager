# Changelog (`2.5.1 -> 2.5.2`)

Release `2.5.2` improves the local viewer Git cockpit and fixes the stacked details layout used when the viewer docks the details panel below the main content.

## Highlights

- Fixed the stacked details panel so it uses the full available width in the local viewer.
- Made the Git diff preview easier to scan with line-level coloring for additions, deletions, hunk headers, and metadata.
- Added per-file `+N/-M` line-change counters in the Git Changes list.
- Kept packaged viewer assets synchronized with the source viewer assets.

## What Changed

### Local Viewer Layout

- The shared stacked layout now explicitly gives the bottom-docked details panel `width: 100%`.
- The regression test for collapsed details layout now asserts that stacked details fill the available width.

### Git Diff Preview

- The local viewer now renders diff lines with stable classes for additions, deletions, hunk headers, metadata, and context.
- Additions and deletions use distinct foreground and background colors while preserving escaped diff content.

### Git Change Counts

- The `/api/git-status` endpoint now enriches changed file entries with read-only `git diff --numstat` additions and deletions.
- The Git Changes list displays compact `+N/-M` counters next to file names when stats are available.
- Staged, worktree, and renamed files use the appropriate staged/worktree numstat source.

## Upgrade Notes

- Restart any already-running `logics-manager view` server so the browser uses the updated backend and viewer assets.
- Untracked files without Git numstat data may still show no `+/-` badge until they are tracked or staged.

## Validation and Regression Evidence

- `npx vitest run tests/webview.layout-collapse.test.ts`
- `npx vitest run tests/viewer.browser-host.test.ts`
- `node scripts/run-python.mjs -m pytest tests/python/test_logics_manager_cli.py -k "viewer_git"`
- `npm run lint:ts -- --pretty false`
