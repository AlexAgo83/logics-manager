# Changelog (`1.9.2 -> 1.10.0`)

## Major Highlights

- Turned the webview into a faster cockpit with keyboard navigation, instant search, richer list navigation, and workspace-scoped UI persistence.
- Added triage-oriented signals and views: attention filter, recent activity panel, suggested-action badges, and stronger health cues.
- Improved ergonomics across the whole surface with default filters, filter reset, compact previews, lifecycle confirmations, onboarding help, and cleaner responsive behavior.

## Version 1.10.0

### Navigation and layout

- Added full keyboard navigation for board and list cards, including directional movement and `Enter` / `Shift+Enter` / `Cmd/Ctrl+Enter` activation flows.
- Added horizontal scrolling for board columns.
- Added collapsible groups in list mode.
- Forced list mode below `500px` width and preserved the user preference outside the forced responsive state.
- Defaulted secondary detail sections to collapsed for a denser, calmer details panel.

### Filtering, search, and review workflows

- Enabled filter defaults by default and added a `Reset` action in the filter panel.
- Added instant local search across title, id, stage, relationship metadata, and indicators.
- Added explicit grouping and sorting controls for richer review workflows in list mode and predictable ordering in board mode.
- Added an `Attention` filter for blocked, orphaned, unprocessed, or inconsistent items.

### Guidance and signals

- Added compact item previews directly on cards.
- Added a recent activity panel for fast context recovery.
- Added suggested-action badges such as `Promote` and `Add docs`.
- Added stronger health signals for blocked, orphaned, and done-mismatch items, with clear visual precedence.
- Added lightweight onboarding help and more actionable empty states.

### Safety and tooling

- Added confirmation before `Done` and `Obsolete` lifecycle actions.
- Removed the deprecated Vite CJS Node API warning from test runs by switching Vitest config to ESM.
- Improved workspace-scoped UI persistence for selection, search, grouping, sorting, collapses, and scroll state.

### Validation

- `npm run ci:check`
- `npm run release:changelog:validate`
- `npm run package`
