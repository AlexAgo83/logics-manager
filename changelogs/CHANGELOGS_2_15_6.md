# Logics Manager 2.15.6

## Viewer update notices

- Shows the local viewer update notice as a persistent yellow warning banner when a newer `logics-manager` release is available.
- Adds the same viewer notice path for `cdx` updates when `cdx update --check --json` reports a newer version.
- Caches the viewer-side `cdx` update check so auto-refresh does not repeatedly hit the release API.

## Validation

- `python3 -m pytest tests/python/test_viewer_cli.py -k 'cdx_update_info or cdx_status_payload_reports_structured_status'`
- `npm test -- tests/viewer.browser-host.test.ts -t "renders update availability"`
- `npm run check:viewer-host`
- `logics-manager lint --require-status`
