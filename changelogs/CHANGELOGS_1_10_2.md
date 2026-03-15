# Changelog (`1.10.1 -> 1.10.2`)

## Major Highlights

- Fixed the request `processed` heuristic so the board now reflects real workflow closure in mature repositories instead of leaving most completed requests looking unprocessed.
- Brought the extension indexer back in line with historical Logics docs by recognizing `Progress: 100%`, `Archived`, `Derived from request ...`, and bare `item_...md` backlog links.
- Added regression coverage for the exact indexing cases that were breaking against real project data.

## Version 1.10.2

### Request processing and workflow linkage

- Treated linked backlog/task items with `Progress: 100%` as processed even when legacy docs omit `Status`.
- Counted `Archived` linked workflow items as processed so closed historical flows no longer block request promotion state.
- Recognized `Derived from request \`...\`` backlinks in addition to the narrower older `Derived from \`...\`` pattern.
- Normalized bare managed-doc filename references such as `item_525_example.md` into their canonical `logics/backlog/...` paths during indexing.

### Regression coverage

- Added request-processing tests for `Progress: 100%` without `Status`.
- Added request-processing tests for archived linked backlog items.
- Added indexing regression tests for `Derived from request` backlinks and bare `.md` backlog references.

### Validation

- `npm test`
- `npm run test:smoke`
- `npm run release:changelog:validate`
- `npm run package`
