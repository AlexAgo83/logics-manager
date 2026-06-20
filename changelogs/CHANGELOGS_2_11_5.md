# Logics Manager 2.11.5

## Improvements

- Renamed the CDX Status navigation surface to Sessions for clearer operator wording.
- Added compact Mission stats for available missions, available sessions, plan preview state, and run output state.
- Refined the Mission setup layout with a compact icon-only configuration control, shared Plan preview / Run output panel switching, and clearer runner labels.
- Added unread change badges for CDX Missions, Reports, and History, including top-level CDX aggregation and per-screen acknowledgement.
- Added live progress feedback for CDX mission runs launched in a terminal, with start summary, heartbeat, idle/activity state, verbose/watch modes, and final success/failure summaries.
- Prepared and closed the Logics workflow corpus for the CDX Missions, Reports, History, and terminal progress work.

## Validation

- `rtk npm exec -- vitest run tests/viewer.browser-host.test.ts`
- `rtk python -m pytest tests/python/test_logics_manager_cli.py -k cdx_mission`
- `logics-manager lint --require-status`
- `logics-manager audit`
