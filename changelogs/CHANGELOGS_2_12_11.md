# Logics Manager 2.12.11

## Viewer

- Added a behind-commits badge in the viewer Git surfaces so stale local checkouts are visible next to the existing ahead badge.
- Made manual Git-screen refresh fetch the remote before reloading status, keeping ahead/behind badges current on demand without adding background network work.
- Fixed workshop terminal startup sizing by passing the measured PTY dimensions before exec, preventing first-frame TUI layout ghosting.

## Maintenance

- Split more pure viewer helpers and constants out of the large browser-host/viewer modules, tightening line-budget guards while preserving behavior.

## Validation

- `rtk npm run release:changelog:validate`
- `rtk npm run ci:check`
- `rtk git diff --check`
