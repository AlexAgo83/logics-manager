# Logics Manager 2.12.8

## Fixes

- Broadened Recent activity deduplication in the local viewer so repeated activity for the same workflow item within the same minute is stored once instead of creating near-identical rows.
- Kept the packaged browser-host asset in sync with the viewer source so CLI-served viewers and source tests share the same activity behavior.

## Validation

- `rtk npm test -- tests/viewer.browser-host.test.ts`
