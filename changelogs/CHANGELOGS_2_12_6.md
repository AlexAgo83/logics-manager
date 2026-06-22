# Logics Manager 2.12.6

## Improvements

- Improved the CDX browser viewer controls so operators can work with clearer navigation and focus behavior.
- Kept packaged viewer assets in sync with the source viewer implementation for installed `logics-manager view` usage.

## Validation

- `rtk npm exec -- vitest run tests/viewer.browser-host.test.ts`
- `rtk npm run ci:check`
