# Changelog (`v1.26.0` -> `v1.26.1`)

## Major Highlights

- Corrected the Logics kit compatibility ceiling so the shipped `1.13.0` kit no longer appears as "newer than the tested maximum" in environment diagnostics.
- Kept the environment warning flow aligned with the supported upper bound by moving the tested max to `v1.13.x`.
- Prepared the repository for a corrective `1.26.1` release with matching version metadata.

## Compatibility And Diagnostics

- Updated the kit version bound in the plugin constants so `1.13.x` is accepted as supported.
- Adjusted the version-gating tests to keep `1.14.0` as the first unsupported "too new" case.
- Refreshed the release-facing README badge to show `v1.26.1`.

## Validation

- `npm test -- --run tests/logicsKitVersionSupport.test.ts tests/logicsViewProviderSupport.more.test.ts`
- `npm run lint:ts -- --noEmit`
- `npm run release:changelog:validate`
