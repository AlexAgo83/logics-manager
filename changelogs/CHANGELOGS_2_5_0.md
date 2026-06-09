# Changelog (`2.4.0 -> 2.5.0`)

Release `2.5.0` makes the local Logics viewer a stronger operations cockpit, with CDX runtime visibility, Git badge counters, configurable refresh controls, and a denser status table aligned with the `cdx status` terminal output.

## Highlights

- Added a read-only CDX status cockpit to the local viewer.
- Added Git badge counters for unpushed commits and uncommitted files.
- Replaced the direct Refresh button with a compact refresh menu containing Auto, interval selection, and Now.
- Reworked the CDX screen into a scan-friendly table using the same core fields as `cdx status`.
- Added regression coverage for CDX status rows, refresh controls, Git badge updates, and open status-panel refresh behavior.

## What Changed

### CDX Status Cockpit

- Added the `/api/cdx-status` local viewer endpoint backed by `cdx status --json`.
- Added the `CDX` topbar action and refresh integration so an open CDX screen updates when the viewer refreshes.
- Rendered sessions with CLI-aligned labels: `SESSION`, `PROV.`, `STATUS`, `AUTH`, `OK`, `5H`, `WEEK`, `BLOCK`, `CR`, `RESET 5H`, `RESET WEEK`, and `UPDATED`.
- Sorted sessions by known remaining availability from highest to lowest, placing unknown availability after known values.
- Formatted reset and updated timestamps as relative values where possible.
- Rounded CDX credits to two decimal places.
- Kept unavailable, timeout, command failure, invalid JSON, and stale endpoint states user-readable.

### Git Signals

- Added Git badge counters to the local viewer topbar.
- Showed unpushed commit and uncommitted-file counts directly on the Git button.
- Refreshed Git badge counters on initial load and manual refresh.
- Preserved Git and CDX panel contents when a refresh is triggered while those panels are open.

### Refresh Controls

- Moved refresh behavior into a small Refresh menu.
- Kept `Now` as the manual refresh action.
- Added an `Auto` checkbox and an interval selector using the configured refresh interval as its initial value.
- Bounded client-side refresh interval choices from 5 to 60 seconds.

## Upgrade Notes

- If the `CDX` button appears but `/api/cdx-status` returns `404`, restart the local viewer so the running backend matches the updated frontend assets.
- The refresh interval selector changes the active viewer session only; restart the viewer or pass `--refresh-interval` to change the startup default.

## Validation and Regression Evidence

- `npm test`
- `npm run lint`
- `npm run release:changelog:validate`
- `npm run package`
- `logics-manager audit`
