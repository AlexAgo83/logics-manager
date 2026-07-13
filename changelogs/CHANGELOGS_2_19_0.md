# Logics Manager 2.19.0

## Viewer workflow updates

- Adds a roadmap-aware workflow model across Logics docs so long-running work can be planned as staged versions instead of only request/backlog/task chains.
- Shows roadmap documents in the viewer board and details surfaces, including demo coverage and default filter behavior.
- Refreshes the Getting Started screen around request, product brief, roadmap, backlog, task, closeout, theme, and i18n workflows.

## Viewer usability fixes

- Fixes project Theme detection for monorepos and keeps non-color theme groups readable.
- Moves Focus out of the filter panel into its own menu and keeps the active filter badge aligned with real non-default filters.
- Splits Settings into a compact accordion while keeping About visible with version and Getting Started access.
- Keeps quota gauge columns and colors aligned with the available quota windows.

## Workflow closeout guidance

- Documents and reinforces closeout expectations for settled or superseded product briefs and other planning docs.
- Keeps commit-by-wave/task guidance visible in the current workflow onboarding.

## Validation

- `npm test -- tests/viewer.browser-host.test.ts`
- `npm run check:viewer-host`
- `npm run build:assets`
