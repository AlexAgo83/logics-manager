# Logics Manager 2.9.6

## Improvements

- Workshop terminals are now usable on mobile viewports, with tighter phone font tiers, a portrait rotate-device state, landscape list-first layout, and full visible viewport sizing for screen views.
- Mobile viewer layout hides the details panel and splitter, distributes topbar actions evenly, centers action labels and badges, and keeps the mobile grid layout active through landscape phone widths.
- Local viewer LAN access can now be served over HTTPS with `--tls` / `--tls-cert` / `--tls-key`.
- LAN mutations are protected behind explicit device pairing with a PIN when `--lan-rw` is enabled.

## Fixes

- Cross-origin mutation attempts are rejected before they can affect the viewer.
- Workshop terminal buffers replay and refresh correctly when sessions remount or reactivate.
- The LAN banner hides once the device is paired.
- Workshop terminal panes keep enough vertical room on mobile and no longer leave stale preview messaging in the topbar.

## Docs

- Documented the `--tls`, `--lan-rw`, and pairing security model for the local viewer.

## Validation

- `logics-manager audit`
- `logics-manager lint`
- `npm run release:changelog:validate`
- `npm run ci:check`
- `git diff --check`
