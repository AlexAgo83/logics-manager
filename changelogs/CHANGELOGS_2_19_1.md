# Logics Manager 2.19.1

## Viewer filter fixes

- Makes `Clear filters` reveal completed and processed documents instead of restoring the default hidden state.
- Keeps the local viewer filter badge off after clearing hide toggles, while preserving the badge for real active filters like search, sort, group, and viewer presets.

## Viewer toolbar polish

- Removes reserved space from toolbar controls that are hidden in Activity or Project mode so buttons stay left-aligned without visual gaps.

## Validation

- `npm test -- tests/webview.chrome.test.ts tests/viewer.browser-host.test.ts`
- `npm run build:assets`
- `npm run test:viewer-smoke`
