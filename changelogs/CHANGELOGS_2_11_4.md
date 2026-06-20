# Logics Manager 2.11.4

## Improvements

- Refined CDX report views by removing the redundant request creation action from run reports.
- Renamed the CDX runs surface to Reports and added token usage display in both report lists and individual run reports.
- Added a CDX History view backed by `cdx history --json`, with launch details, token usage, artifact actions, configurable columns, session filtering, and summary stats.
- Improved CDX Reports tables with session filters, summary stats, clearer token cells, and more explicit report/artifact actions.
- Replaced the inline CDX mission list with a modal mission selector while keeping mission configuration visible in the main workflow.

## Validation

- `npm test -- tests/viewer.browser-host.test.ts`
- `python3 -m pytest -q tests/python/test_logics_manager_cli.py`
- `npm run check:viewer-assets`
