# Logics Manager 2.12.7

## Features

- Added project favorites to the viewer project selector so operators can pin and quickly reach frequently used projects.
- Added a CDX session config action and made the launch settings (permission level) editable and persistent across sessions.
- Surfaced the active CDX permission in session status rows via a clear label and moved permission editing into the session config modal.

## Fixes

- Forced `Ctrl+C` to send ETX in the Workshop terminal so interrupts reach the running process reliably.
- Kept the Workshop terminal grid in sync with the PTY and scoped resize hysteresis to the `ResizeObserver`, fixing stale width that previously needed `Ctrl+L` to redraw.
- Added resize hysteresis (10 cols / 5 rows) to avoid unnecessary terminal redraws on minor moves.
- Stopped reopening a closed CDX status screen on background `cdx` events.
- Added a force-exit watchdog so `Ctrl+C` always stops the viewer server.

## Validation

- `rtk npm exec -- vitest run tests/viewer.browser-host.test.ts`
- `rtk npm run ci:check`
