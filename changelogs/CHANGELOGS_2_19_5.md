# Logics Manager 2.19.5

## VS Code viewer state

The embedded VS Code viewer kept project recency across restarts, but favorite
projects still lived only in the viewer origin. When VS Code restarted the
embedded viewer on a different localhost port, the origin changed and the star
state disappeared.

- Persists favorite project IDs through the VS Code webview state bridge.
- Restores favorite stars when the embedded viewer reloads or restarts on a new
  origin.
- Keeps star toggles from switching projects while updating the stored favorite
  order.

## CDX Memory readability

The CDX Memory screen rendered the useful cleaned handoff as a code block with
line numbers, mixed with diagnostic fields before the content. That made the
screen hard to scan when the operator just needed readable memory context.

- Shows the cleaned memory as Markdown under a primary `Useful Handoff` section.
- Keeps `Raw Memory` available as a code view for diagnostics.
- Reduces the summary cards to the useful state: memory scope, status, cleaned
  size, and noise ratio.

## Validation

- `git diff --check`
- `npm exec -- vitest tests/viewer.browser-host.test.ts tests/logicsHtml.test.ts --run`
- `npm run check:viewer-host`
- `node scripts/ci-check.mjs`
