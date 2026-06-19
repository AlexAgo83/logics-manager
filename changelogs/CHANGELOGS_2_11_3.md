# Logics Manager 2.11.3

## Fixes

- Fixed LAN read/write status changes for product, architecture, and spec documents by resolving the same Logics document families that the viewer exposes.
- Kept LAN read/write status updates authenticated with the paired device token when the share token is also present.
- Added a direct `view:lan-rw` npm script for starting the local viewer in LAN read/write mode without TLS.
- Synced packaged viewer assets with the client viewer changes.

## Validation

- `python3 -m pytest tests/python/test_logics_manager_cli.py -k 'update_status or mutating_routes or post_routes' -q`
- `npm run test -- tests/viewer.browser-host.test.ts`
- `npm run check:viewer-assets`
- `npm run docs:check`
- `python3 -m pytest tests/python/test_release_contract_schema.py -q`
- `node scripts/ci-check.mjs`
- `git diff --check`
