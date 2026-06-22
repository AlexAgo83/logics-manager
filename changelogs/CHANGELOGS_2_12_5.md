# Logics Manager 2.12.5

## Fixes

- Restored Workshop terminal height after moving screen tabs into the document header; the terminal panel now fills the available document viewport again.
- Kept the packaged viewer assets in sync with the source viewer so installed `logics-manager view` instances receive the same terminal layout fix.

## Validation

- `rtk npm exec -- vitest run tests/viewer.browser-host.test.ts`
