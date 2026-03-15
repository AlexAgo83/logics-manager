# Changelog (`1.10.2 -> 1.10.3`)

## Major Highlights

- Fixed the webview-side `processed request` heuristic so the board matches the extension indexer on mature repositories.
- Removed the stale mismatch that left large numbers of already-closed requests visible when `Hide processed requests` was enabled.
- Added regression coverage for webview filtering based on `usedBy`, `Progress: 100%`, and `Archived` workflow states.

## Version 1.10.3

### Webview request processing parity

- Updated the webview model to treat linked backlog/task items as processed when they are `Ready`, `In progress`, `Blocked`, `Done`, or `Archived`.
- Recognized linked workflow completion through `Progress: 100%` even when `Status` is absent.
- Normalized request linkage through `usedBy` rel-paths and bare item ids so the UI resolves the same backlog/task relationships as the extension indexer.

### Regression coverage

- Added harness coverage to ensure processed requests stay hidden when processing is inferred through `usedBy` links.
- Added harness coverage to ensure processed requests stay hidden when linked backlog items are closed only via `Progress: 100%`.
- Added harness coverage to ensure processed requests stay hidden when linked backlog items are `Archived`.

### Validation

- `npm test -- tests/logicsIndexer.test.ts tests/webview.harness-details-and-filters.test.ts`
- `npm run compile`
- `npm run release:changelog:validate`
