# Changelog (`1.10.3 -> 1.10.4`)

## Major Highlights

- Reworked the `Activity` mode so it behaves like a true primary workspace view instead of stacking above the board/list and breaking the details pane layout.
- Fixed several responsive webview regressions across details rendering, activity entry wrapping, and toolbar alignment on narrower panel widths.
- Expanded the Logics kit documentation for AI-oriented usage and prepared the first curated Claude Code bridge request, backlog item, and task docs.

## Version 1.10.4

### Activity workspace and details behavior

- Made `Activity` replace the main board/list pane so the existing details panel keeps its normal splitter behavior on desktop and stacked layouts.
- Fixed activity selection so clicking an activity row updates the details panel even when the selected item is filtered out of the board.
- Added layout safeguards so the board stays fully hidden when `Activity` is active instead of bleeding through at intermediate widths.

### Responsive layout and rendering fixes

- Fixed details reference and `Used by` rendering so long labels and action buttons no longer force horizontal overflow in the details panel.
- Kept the primary toolbar action groups aligned on one line for more realistic VS Code panel widths before wrapping.
- Fixed activity cards so long titles and metadata wrap correctly without collapsing the entry content.

### Documentation and release prep

- Added a `Why This Matters For AI Projects` section to the Logics kit README so the kit value proposition is clearer outside the VS Code plugin context.
- Promoted the Claude Code bridge request into curated backlog/task docs with cleaner scope, acceptance traceability, and ownership rules.
- Added the curated release changelog contract needed for the `1.10.4` package and GitHub release flow.

### Validation

- `npm run test -- tests/webview.harness-core.test.ts tests/webview.harness-details-and-filters.test.ts tests/webview.layout-collapse.test.ts`
- `npm run compile`
- `npm run lint:logics`
- `npm run release:changelog:validate`
- `npm run package`
